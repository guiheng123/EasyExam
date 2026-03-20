// AI 聊天面板模块
import { $, escapeHtml } from '../utils/dom.js';
import { getAIConfig } from './ai.js';
import { fetchWithTimeout } from '../utils/api.js';
import { getCurrentQuestion, getCurrentIndex, getQuestions, getUserAnswers } from './quiz.js';

// AI 聊天状态
let aiChatSessions = Object.create(null);
let aiChatCurrentSessionKey = 'global';
let aiChatPanelPinnedPosition = null;
let aiChatPanelDragging = false;
let aiChatRequesting = false;
let aiChatRequestVersion = 0;

// 获取当前题目的会话 key
function getAIChatSessionKey(index = getCurrentIndex()) {
    const quizView = $('quizView');
    const quizActive = quizView && quizView.classList.contains('active');
    if (!quizActive || !getQuestions().length) return 'global';
    const safeIndex = Number.isInteger(index) ? index : getCurrentIndex();
    return `q_${Math.max(0, safeIndex)}`;
}

// 创建欢迎消息
function createAIChatWelcomeText() {
    return '你好，我是 AI 解析助手。\n你可以点击"解析当前题目"，或直接输入问题。';
}

// 确保会话存在
function ensureAIChatSession(key, forceNew) {
    if (forceNew || !aiChatSessions[key]) {
        aiChatSessions[key] = {
            messages: [{ role: 'assistant', text: createAIChatWelcomeText(), extraClass: '' }],
            history: []
        };
    }
    return aiChatSessions[key];
}

// 取消待处理的请求
function cancelAIChatPendingRequest() {
    aiChatRequestVersion++;
    aiChatRequesting = false;
    const sendBtn = $('aiChatSendBtn');
    if (sendBtn) sendBtn.disabled = false;
    document.querySelectorAll('#aiChatMessages .ai-chat-msg.loading').forEach(node => node.remove());
}

// 激活题目的聊天会话
export function activateAIChatSessionForQuestion(index, forceNew = false) {
    const nextKey = getAIChatSessionKey(index);
    if (aiChatCurrentSessionKey !== nextKey) {
        cancelAIChatPendingRequest();
    }
    aiChatCurrentSessionKey = nextKey;
    return ensureAIChatSession(nextKey, forceNew);
}

// 渲染聊天会话
export function renderAIChatSession(session) {
    if (!session || !Array.isArray(session.messages)) return;
    const wrap = $('aiChatMessages');
    if (!wrap) return;
    wrap.innerHTML = '';
    session.messages.forEach(msg => {
        appendAIChatMessage(msg.role, msg.text, msg.extraClass, { skipCache: true, sessionKey: aiChatCurrentSessionKey });
    });
    scrollAIChatToBottom();
}

// 清除聊天缓存
export function clearAIChatCache() {
    cancelAIChatPendingRequest();
    aiChatSessions = Object.create(null);
    aiChatCurrentSessionKey = 'global';
    aiChatPanelPinnedPosition = null;
    const wrap = $('aiChatMessages');
    if (wrap) wrap.innerHTML = '';
    const input = $('aiChatInput');
    if (input) input.value = '';
    toggleAIChatPanel(false);
}

// 更新聊天面板位置
export function updateAIChatPanelPosition(forceAuto) {
    const fab = $('aiAnalyzeFab');
    const panel = $('aiChatPanel');
    if (!fab || !panel || !panel.classList.contains('active')) return;
    if (aiChatPanelDragging) return;

    const viewportPadding = 12;
    const panelRect = panel.getBoundingClientRect();
    const panelWidth = panelRect.width || Math.min(360, window.innerWidth - viewportPadding * 2);
    const panelHeight = panelRect.height || Math.min(520, window.innerHeight - 120);

    const clampPosition = (left, top) => ({
        left: Math.max(viewportPadding, Math.min(left, window.innerWidth - panelWidth - viewportPadding)),
        top: Math.max(viewportPadding, Math.min(top, window.innerHeight - panelHeight - viewportPadding))
    });

    if (!forceAuto && aiChatPanelPinnedPosition) {
        const pinned = clampPosition(aiChatPanelPinnedPosition.left, aiChatPanelPinnedPosition.top);
        aiChatPanelPinnedPosition = pinned;
        panel.style.left = pinned.left + 'px';
        panel.style.top = pinned.top + 'px';
        panel.style.right = 'auto';
        panel.style.bottom = 'auto';
        return;
    }

    const gap = 10;
    const fabRect = fab.getBoundingClientRect();
    const shouldPlaceAbove = fabRect.top >= panelHeight + gap + viewportPadding;
    let top = shouldPlaceAbove
        ? (fabRect.top - panelHeight - gap)
        : (fabRect.bottom + gap);
    const preferredLeft = fabRect.right - panelWidth;
    const autoPos = clampPosition(preferredLeft, top);

    panel.style.left = autoPos.left + 'px';
    panel.style.top = autoPos.top + 'px';
    panel.style.right = 'auto';
    panel.style.bottom = 'auto';
}

// 切换聊天面板
export function toggleAIChatPanel(open) {
    const panel = $('aiChatPanel');
    if (!panel) return;
    const willOpen = typeof open === 'boolean' ? open : !panel.classList.contains('active');
    panel.classList.toggle('active', willOpen);
    if (!willOpen) return;

    const session = activateAIChatSessionForQuestion(getCurrentIndex());
    renderAIChatSession(session);
    requestAnimationFrame(() => updateAIChatPanelPosition());
    const input = $('aiChatInput');
    if (input) input.focus();
}

// 数学公式渲染 - 提取数学块并用 KaTeX 渲染
function renderMathInText(text) {
    if (typeof window.katex === 'undefined') return text;
    const mathBlocks = [];
    let idx = 0;
    const replacer = (display) => (_, expr) => {
        const placeholder = `\x00MATH_${idx++}\x00`;
        mathBlocks.push({ expr: expr.trim(), display });
        return placeholder;
    };
    // 块级：$$...$$ 和 \[...\]，行内：$...$ 和 \(...\)
    const withPlaceholders = text
        .replace(/\$\$([\s\S]+?)\$\$/g, replacer(true))
        .replace(/\\\[([\s\S]+?)\\\]/g, replacer(true))
        .replace(/\$([^\$\n]+?)\$/g, replacer(false))
        .replace(/\\\((.+?)\\\)/g, replacer(false));
    if (!mathBlocks.length) return text;
    return { text: withPlaceholders, mathBlocks };
}

function restoreMathBlocks(html, mathBlocks) {
    if (!mathBlocks || !mathBlocks.length) return html;
    for (let i = 0; i < mathBlocks.length; i++) {
        const { expr, display } = mathBlocks[i];
        let rendered;
        try {
            rendered = window.katex.renderToString(expr, {
                displayMode: display,
                throwOnError: false,
                output: 'html'
            });
        } catch (_) {
            rendered = escapeHtml(display ? `$$${expr}$$` : `$${expr}$`);
        }
        const tag = display
            ? `<div class="math-block">${rendered}</div>`
            : `<span class="math-inline">${rendered}</span>`;
        html = html.replace(`\x00MATH_${i}\x00`, tag);
    }
    return html;
}

// Markdown 渲染
function formatInlineMarkdown(rawText) {
    return rawText
        .replace(/`([^`]+?)`/g, '<code>$1</code>')
        .replace(/\*\*\*([^*]+?)\*\*\*/g, '<strong><em>$1</em></strong>')
        .replace(/___([^_]+?)___/g, '<strong><em>$1</em></strong>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/__(.+?)__/g, '<strong>$1</strong>')
        .replace(/(^|[^*])\*([^*]+?)\*(?!\*)/g, '$1<em>$2</em>')
        .replace(/(^|[^_])_([^_]+?)_(?!_)/g, '$1<em>$2</em>')
        .replace(/~~(.+?)~~/g, '<del>$1</del>')
        .replace(/\[([^\]]+?)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
}

function renderMarkdownToHtml(markdownText) {
    const raw = String(markdownText || '');
    // 提取数学公式（在 HTML 转义之前）
    const mathResult = renderMathInText(raw);
    let mathBlocks = null;
    let textForMarkdown = raw;
    if (mathResult && mathResult.mathBlocks) {
        mathBlocks = mathResult.mathBlocks;
        textForMarkdown = mathResult.text;
    }

    const source = escapeHtml(textForMarkdown).replace(/\r\n?/g, '\n');
    const lines = source.split('\n');
    const html = [];
    let listType = '';
    let inCodeBlock = false;
    let codeBlockLanguage = '';
    let codeBlockLines = [];
    let inBlockquote = false;

    const closeList = () => {
        if (listType) {
            html.push(`</${listType}>`);
            listType = '';
        }
    };

    const openList = (nextType) => {
        if (listType === nextType) return;
        closeList();
        html.push(`<${nextType}>`);
        listType = nextType;
    };

    const closeBlockquote = () => {
        if (!inBlockquote) return;
        closeList();
        html.push('</blockquote>');
        inBlockquote = false;
    };

    const closeCodeBlock = () => {
        if (!inCodeBlock) return;
        closeBlockquote();
        closeList();
        const languageClass = codeBlockLanguage ? ` class="language-${codeBlockLanguage}"` : '';
        html.push(`<pre><code${languageClass}>${codeBlockLines.join('\n')}</code></pre>`);
        inCodeBlock = false;
        codeBlockLanguage = '';
        codeBlockLines = [];
    };

    for (const rawLine of lines) {
        const line = rawLine.trimEnd();
        const trimmed = line.trim();
        const codeFenceMatch = trimmed.match(/^```\s*([A-Za-z0-9_-]+)?\s*$/);

        if (codeFenceMatch) {
            if (inCodeBlock) {
                closeCodeBlock();
            } else {
                closeBlockquote();
                closeList();
                inCodeBlock = true;
                codeBlockLanguage = (codeFenceMatch[1] || '').trim();
                codeBlockLines = [];
            }
            continue;
        }

        if (inCodeBlock) {
            codeBlockLines.push(line);
            continue;
        }

        if (!trimmed) {
            closeList();
            closeBlockquote();
            continue;
        }

        const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
        if (headingMatch) {
            closeList();
            closeBlockquote();
            const level = headingMatch[1].length;
            html.push(`<h${level}>${formatInlineMarkdown(headingMatch[2])}</h${level}>`);
            continue;
        }

        if (/^-{3,}$/.test(trimmed)) {
            closeList();
            closeBlockquote();
            html.push('<hr>');
            continue;
        }

        const blockquoteMatch = line.match(/^>\s?(.*)$/);
        if (blockquoteMatch) {
            closeList();
            if (!inBlockquote) {
                html.push('<blockquote>');
                inBlockquote = true;
            }
            const quoteText = blockquoteMatch[1].trim();
            if (quoteText) {
                html.push(`<p>${formatInlineMarkdown(quoteText)}</p>`);
            }
            continue;
        }
        closeBlockquote();

        const unorderedListMatch = trimmed.match(/^[-*]\s+(.+)$/);
        if (unorderedListMatch) {
            openList('ul');
            html.push(`<li>${formatInlineMarkdown(unorderedListMatch[1])}</li>`);
            continue;
        }

        const orderedListMatch = trimmed.match(/^\d+[.)]\s+(.+)$/);
        if (orderedListMatch) {
            openList('ol');
            html.push(`<li>${formatInlineMarkdown(orderedListMatch[1])}</li>`);
            continue;
        }

        closeList();
        html.push(`<p>${formatInlineMarkdown(trimmed)}</p>`);
    }

    closeCodeBlock();
    closeList();
    closeBlockquote();
    let result = html.join('');
    // 还原数学公式为 KaTeX 渲染结果
    result = restoreMathBlocks(result, mathBlocks);
    return result;
}

// 添加聊天消息
function appendAIChatMessage(role, text, extraClass, options) {
    const opts = options || {};
    const sessionKey = opts.sessionKey || aiChatCurrentSessionKey || getAIChatSessionKey(getCurrentIndex());
    const shouldCache = !opts.skipCache && extraClass !== 'loading';

    if (shouldCache) {
        const session = ensureAIChatSession(sessionKey);
        session.messages.push({ role, text, extraClass: extraClass || '' });
    }

    if (opts.skipRender || sessionKey !== aiChatCurrentSessionKey) {
        return null;
    }

    const wrap = $('aiChatMessages');
    if (!wrap) return null;
    const row = document.createElement('div');
    row.className = 'ai-chat-msg ' + role + (extraClass ? (' ' + extraClass) : '');

    const enableMarkdown = role === 'assistant' && extraClass !== 'loading';
    if (enableMarkdown) {
        row.classList.add('markdown');
        row.innerHTML = renderMarkdownToHtml(text);
    } else {
        row.textContent = text;
    }

    wrap.appendChild(row);
    scrollAIChatToBottom();
    return row;
}

// 滚动到底部
function scrollAIChatToBottom() {
    const wrap = $('aiChatMessages');
    if (!wrap) return;
    wrap.scrollTop = wrap.scrollHeight;
}

// 流式渲染时的智能滚动：仅在用户未手动上滚时自动滚到底部
function smartScrollToBottom() {
    const wrap = $('aiChatMessages');
    if (!wrap) return;
    const threshold = 80;
    if (wrap.scrollHeight - wrap.scrollTop - wrap.clientHeight < threshold) {
        wrap.scrollTop = wrap.scrollHeight;
    }
}

// 在流式渲染的 HTML 末尾插入光标（插入到最后一个闭合标签之前，保持光标与文字同行）
function addStreamCursor(html) {
    const cursor = '<span class="streaming-cursor"></span>';
    if (!html) return cursor;
    const trailing = /(<\/[^>]+>\s*)+$/;
    const m = html.match(trailing);
    if (m) return html.slice(0, m.index) + cursor + html.slice(m.index);
    return html + cursor;
}

// 获取当前题目快照
export function getCurrentQuestionSnapshot() {
    const questions = getQuestions();
    const currentIndex = getCurrentIndex();
    if (!questions || !questions.length || !questions[currentIndex]) return null;
    const q = questions[currentIndex];
    const userAnswers = getUserAnswers();
    const selected = (userAnswers && userAnswers[currentIndex]) || '未作答';
    const options = q.options.map(opt => `${opt.letter}. ${opt.text}`).join('\n');
    return {
        question: q.question,
        options,
        answer: q.answer,
        explanation: q.explanation || '',
        selected
    };
}

// 请求当前题目解析
export function askCurrentQuestionAnalysis() {
    const snap = getCurrentQuestionSnapshot();
    if (!snap) {
        appendAIChatMessage('assistant', '当前没有可解析的题目，请先开始答题。');
        toggleAIChatPanel(true);
        return;
    }
    const prompt = `请解析这道题，并说明各选项差异，最后给出记忆方法：\n题目：${snap.question}\n${snap.options}\n我的选择：${snap.selected}`;
    sendAIChatMessage(prompt);
}

// 发送聊天消息
export async function sendAIChatMessage(customText) {
    if (aiChatRequesting) return;
    const input = $('aiChatInput');
    const sendBtn = $('aiChatSendBtn');
    if (!sendBtn) return;

    const sourceText = typeof customText === 'string'
        ? customText
        : (input ? input.value : '');
    const text = String(sourceText || '').trim();
    if (!text) return;

    if (input && typeof customText !== 'string') input.value = '';
    toggleAIChatPanel(true);

    const sessionKey = aiChatCurrentSessionKey;
    const session = ensureAIChatSession(sessionKey);
    appendAIChatMessage('user', text, '', { sessionKey });

    aiChatRequesting = true;
    sendBtn.disabled = true;
    const requestVersion = ++aiChatRequestVersion;
    const loadingNode = appendAIChatMessage('assistant', '正在思考中...', 'loading', { sessionKey });

    let streamNode = null;
    try {
        const snap = getCurrentQuestionSnapshot();
        const aiConfig = getAIConfig();
        const hasApi = !!(aiConfig.apiUrl && aiConfig.apiToken && aiConfig.model);
        let replyText = '';
        if (!hasApi) {
            if (snap) {
                replyText = snap.explanation
                    ? `参考题目解析：\n${snap.explanation}`
                    : `当前未配置 AI API。\n你可在设置中填写 API 后获得更详细解析。\n\n临时建议：关注题干关键词，逐项对照定义与场景。`;
            } else {
                replyText = '当前未配置 AI API，且没有题目上下文。请先开始答题，或在设置中配置 API。';
            }
        } else {
            const context = snap
                ? `\n\n【当前题目上下文】\n题目：${snap.question}\n${snap.options}\n标准答案：${snap.answer}\n我的答案：${snap.selected}\n已有解析：${snap.explanation || '无'}`
                : '';

            const messages = [
                { role: 'system', content: '你是一个简洁、准确的答题解析助手。回答要聚焦题目，中文输出，先结论再理由。' },
                ...session.history.slice(-8),
                { role: 'user', content: text + context }
            ];

            const requestBody = {
                model: aiConfig.model,
                messages,
                temperature: 0.4,
                stream: true
            };

            const response = await fetchWithTimeout(aiConfig.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${aiConfig.apiToken}`
                },
                body: JSON.stringify(requestBody)
            }, 30000);

            if (!response.ok) {
                const rawErrorText = await response.text();
                let apiErrorMessage = rawErrorText ? rawErrorText.trim() : '';
                try {
                    const parsedError = rawErrorText ? JSON.parse(rawErrorText) : null;
                    const preferredError = parsedError?.error?.message || parsedError?.message || parsedError?.detail;
                    if (preferredError) {
                        apiErrorMessage = String(preferredError).trim();
                    }
                } catch (_) {}

                const statusSummary = `${response.status} ${response.statusText || ''}`.trim();
                throw new Error(
                    apiErrorMessage
                        ? `AI 请求失败（${statusSummary}）：${apiErrorMessage}`
                        : `AI 请求失败（${statusSummary}）`
                );
            }

            const contentType = (response.headers.get('content-type') || '').toLowerCase();
            const isStreamResponse = !!response.body && (contentType.includes('text/event-stream') || contentType.includes('application/x-ndjson'));

            if (isStreamResponse) {
                // 流式读取响应
                if (loadingNode && loadingNode.parentNode) loadingNode.remove();
                streamNode = appendAIChatMessage('assistant', '', 'streaming', { sessionKey, skipCache: true });

                const reader = response.body.getReader();
                const decoder = new TextDecoder('utf-8');
                let buffer = '';
                let streamedContent = '';
                let rafId = null;
                let pendingRender = false;

                // 使用 requestAnimationFrame 节流渲染，避免每个 chunk 都重建 DOM
                const doRender = () => {
                    if (streamNode) {
                        streamNode.innerHTML = addStreamCursor(renderMarkdownToHtml(streamedContent));
                        smartScrollToBottom();
                    }
                    pendingRender = false;
                };

                const scheduleRender = () => {
                    pendingRender = true;
                    if (rafId === null) {
                        rafId = requestAnimationFrame(() => {
                            rafId = null;
                            if (pendingRender) doRender();
                        });
                    }
                };

                const flushRender = () => {
                    if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
                    if (pendingRender) doRender();
                };

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    if (requestVersion !== aiChatRequestVersion || sessionKey !== aiChatCurrentSessionKey) {
                        if (rafId !== null) cancelAnimationFrame(rafId);
                        if (streamNode && streamNode.parentNode) streamNode.remove();
                        reader.cancel();
                        return;
                    }

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || '';

                    for (const line of lines) {
                        const trimmed = line.trim();
                        if (!trimmed || !trimmed.startsWith('data:')) continue;
                        const dataStr = trimmed.slice(5).trim();
                        if (dataStr === '[DONE]') continue;

                        try {
                            const chunk = JSON.parse(dataStr);
                            const delta = chunk.choices?.[0]?.delta?.content || '';
                            if (delta) {
                                streamedContent += delta;
                                scheduleRender();
                            }
                        } catch (_) { /* 忽略非 JSON 行 */ }
                    }
                }

                if (buffer.trim().startsWith('data:')) {
                    const dataStr = buffer.trim().slice(5).trim();
                    if (dataStr && dataStr !== '[DONE]') {
                        try {
                            const chunk = JSON.parse(dataStr);
                            const delta = chunk.choices?.[0]?.delta?.content || '';
                            if (delta) {
                                streamedContent += delta;
                                scheduleRender();
                            }
                        } catch (_) {}
                    }
                }

                // 确保最后一帧内容已渲染
                flushRender();

                replyText = streamedContent.trim();
                if (!replyText) {
                    throw new Error('AI 返回为空');
                }

                // 就地更新流式节点为正式消息，避免删除再创建导致的闪烁
                if (streamNode) {
                    streamNode.classList.remove('streaming');
                    streamNode.innerHTML = renderMarkdownToHtml(replyText);
                    scrollAIChatToBottom();
                }
            } else {
                const rawText = await response.text();
                let parsedText = rawText.trim();
                try {
                    const parsed = rawText ? JSON.parse(rawText) : null;
                    parsedText = String(
                        parsed?.choices?.[0]?.message?.content
                        || parsed?.choices?.[0]?.text
                        || parsed?.message?.content
                        || parsed?.message
                        || parsed?.content
                        || rawText
                    ).trim();
                } catch (_) {}

                replyText = parsedText;
                if (!replyText) {
                    throw new Error('AI 返回为空');
                }
            }

            // 缓存到会话
            session.messages.push({ role: 'assistant', text: replyText, extraClass: '' });
        }

        if (requestVersion !== aiChatRequestVersion || sessionKey !== aiChatCurrentSessionKey) return;

        // 非流式路径：移除加载提示并显示回复（流式路径已就地更新，无需重复）
        if (!streamNode) {
            if (loadingNode && loadingNode.parentNode) loadingNode.remove();
            appendAIChatMessage('assistant', replyText, '', { sessionKey });
        }
        session.history.push({ role: 'user', content: text });
        session.history.push({ role: 'assistant', content: replyText });
        if (session.history.length > 20) session.history = session.history.slice(-20);
    } catch (error) {
        if (requestVersion !== aiChatRequestVersion || sessionKey !== aiChatCurrentSessionKey) return;
        if (streamNode && streamNode.parentNode) streamNode.remove();
        if (loadingNode && loadingNode.parentNode) loadingNode.remove();
        appendAIChatMessage('assistant', `解析失败：${error.message || '未知错误'}`, '', { sessionKey });
    } finally {
        if (requestVersion !== aiChatRequestVersion) return;
        aiChatRequesting = false;
        sendBtn.disabled = false;
        if (input) input.focus();
    }
}

// 初始化 AI 聊天面板
export function initAIAnalysisWidget() {
    const input = $('aiChatInput');
    if (input) {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendAIChatMessage();
            }
        });
    }

    const panel = $('aiChatPanel');
    const header = panel ? panel.querySelector('.ai-chat-header') : null;
    if (!panel || !header) return;

    let dragging = false;
    let pointerId = null;
    let startX = 0;
    let startY = 0;
    let originLeft = 0;
    let originTop = 0;
    let lastClamped = null;

    const clampPos = (left, top) => {
        const rect = panel.getBoundingClientRect();
        const width = rect.width || panel.offsetWidth || Math.min(360, window.innerWidth - 24);
        const height = rect.height || panel.offsetHeight || Math.min(520, window.innerHeight - 120);
        return {
            left: Math.max(12, Math.min(left, window.innerWidth - width - 12)),
            top: Math.max(12, Math.min(top, window.innerHeight - height - 12))
        };
    };

    const updateDragPosition = (clientX, clientY) => {
        const dx = clientX - startX;
        const dy = clientY - startY;
        const clamped = clampPos(originLeft + dx, originTop + dy);
        lastClamped = clamped;
        panel.style.transform = 'translate(' + (clamped.left - originLeft) + 'px,' + (clamped.top - originTop) + 'px)';
    };

    const beginDrag = (e) => {
        if (!panel.classList.contains('active')) return;
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        if (e.target.closest('.ai-chat-close')) return;

        dragging = true;
        aiChatPanelDragging = true;
        pointerId = e.pointerId;
        panel.classList.add('dragging');

        const rect = panel.getBoundingClientRect();
        startX = e.clientX;
        startY = e.clientY;
        originLeft = rect.left;
        originTop = rect.top;
        lastClamped = { left: originLeft, top: originTop };

        panel.style.left = originLeft + 'px';
        panel.style.top = originTop + 'px';
        panel.style.right = 'auto';
        panel.style.bottom = 'auto';
        panel.style.transform = 'translate(0px,0px)';

        if (header.setPointerCapture && Number.isInteger(pointerId)) {
            try { header.setPointerCapture(pointerId); } catch (_) {}
        }

        e.preventDefault();
    };

    const moveDrag = (e) => {
        if (!dragging || e.pointerId !== pointerId) return;
        updateDragPosition(e.clientX, e.clientY);
        e.preventDefault();
    };

    const endDrag = (e) => {
        if (!dragging) return;
        if (e && e.pointerId !== pointerId) return;

        dragging = false;
        aiChatPanelDragging = false;
        panel.classList.remove('dragging');

        const finalPos = lastClamped || clampPos(originLeft, originTop);
        panel.style.transform = 'translate(0px,0px)';
        panel.style.left = finalPos.left + 'px';
        panel.style.top = finalPos.top + 'px';
        aiChatPanelPinnedPosition = { left: finalPos.left, top: finalPos.top };

        if (header.releasePointerCapture && Number.isInteger(pointerId)) {
            try { header.releasePointerCapture(pointerId); } catch (_) {}
        }

        pointerId = null;
        lastClamped = null;
    };

    header.addEventListener('pointerdown', beginDrag);
    header.addEventListener('pointermove', moveDrag);
    header.addEventListener('pointerup', endDrag);
    header.addEventListener('pointercancel', endDrag);

    document.addEventListener('pointermove', moveDrag);
    document.addEventListener('pointerup', endDrag);
    document.addEventListener('pointercancel', endDrag);
}
