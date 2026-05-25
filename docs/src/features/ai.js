// AI 功能模块 - AI 出题和 AI 解析

import { $, escapeAttr, escapeHtml } from '../utils/dom.js';
import { fetchWithTimeout, isValidApiUrl } from '../utils/api.js';
import { safeLocalStorageGet, safeLocalStorageSet, safeJsonParse, obfuscateToken, deobfuscateToken, safeLocalStorageSetWithCheck } from '../core/storage.js';
import { showAlert, showDialog } from '../components/Dialog.js';
import { parseTextWithConfig } from '../core/parser.js';
import { PRESET_FORMATS } from '../config/presets.js';
import { normalizeQuestions, questionsToText } from '../core/dataProcessor.js';

// AI 配置状态
let aiEnabled = false;
let aiConfig = { apiUrl: '', apiToken: '', model: '' };
let aiConfigs = []; // 多配置列表
let activeConfigId = 1; // 当前激活的配置 ID
let aiGeneratedQuestions = [];
let aiHistory = [];
let aiAvailableModels = [];
let aiModelDropdownVisible = false;

// 默认 Prompt 常量
export const DEFAULT_ANALYSIS_PROMPT = '你是一个简洁、准确的答题解析助手。回答要聚焦题目，中文输出，先结论再理由。';
export const DEFAULT_GENERATE_PROMPT = '你是一个专业的出题助手。请根据用户要求生成选择题。';

// 用户自定义 Prompt 配置
let customPrompts = {
    analysis: '',  // 空字符串 = 使用默认值
    generate: ''
};

// 获取解析 Prompt（优先返回用户自定义值）
export function getAnalysisPrompt() {
    return customPrompts.analysis.trim() || DEFAULT_ANALYSIS_PROMPT;
}

// 获取出题 Prompt（优先返回用户自定义值）
export function getGeneratePrompt() {
    return customPrompts.generate.trim() || DEFAULT_GENERATE_PROMPT;
}

// 保存自定义 Prompt 到 localStorage
export function saveCustomPrompts() {
    const analysisInput = document.getElementById('aiAnalysisPrompt');
    const generateInput = document.getElementById('aiGeneratePrompt');
    if (analysisInput) customPrompts.analysis = analysisInput.value;
    if (generateInput) customPrompts.generate = generateInput.value;
    safeLocalStorageSet('aiCustomPrompts', JSON.stringify(customPrompts));
}

// 从 localStorage 加载自定义 Prompt
export function loadCustomPrompts() {
    try {
        const raw = safeLocalStorageGet('aiCustomPrompts');
        if (raw) {
            const parsed = safeJsonParse(raw);
            if (parsed && typeof parsed === 'object') {
                customPrompts.analysis = parsed.analysis || '';
                customPrompts.generate = parsed.generate || '';
            }
        }
    } catch (e) {
        console.warn('读取自定义 Prompt 失败:', e);
    }
    // 回填到表单
    const analysisInput = document.getElementById('aiAnalysisPrompt');
    const generateInput = document.getElementById('aiGeneratePrompt');
    if (analysisInput) analysisInput.value = customPrompts.analysis;
    if (generateInput) generateInput.value = customPrompts.generate;
}

// setTab 回调，由 main.js 注入
let _setTabCallback = null;
export function setSetTabCallback(fn) {
    _setTabCallback = fn;
}

// 创建默认配置
function createDefaultConfig(id = 1, name = '默认配置') {
    return { id, name, apiUrl: '', apiToken: '', model: '' };
}

// 获取当前激活配置对象
function getActiveConfig() {
    return aiConfigs.find(c => c.id === activeConfigId) || aiConfigs[0] || createDefaultConfig();
}

// 将配置对象应用到 aiConfig
function applyConfig(target) {
    aiConfig = { apiUrl: target.apiUrl, apiToken: target.apiToken, model: target.model };
}

// 迁移旧版单配置到多配置格式
function migrateOldSettings(saved) {
    if (saved.configs && Array.isArray(saved.configs)) return null; // 已是新格式
    const config = createDefaultConfig();
    if (saved.config && typeof saved.config === 'object') {
        config.apiUrl = saved.config.apiUrl || '';
        config.apiToken = saved.config.apiToken || '';
        config.model = saved.config.model || '';
    }
    return { enabled: !!saved.enabled, configs: [config], activeConfigId: 1 };
}

// 渲染配置选择器下拉框
function renderConfigSelector() {
    const select = $('aiConfigSelect');
    if (!select) return;
    select.innerHTML = aiConfigs.map(c =>
        `<option value="${c.id}"${c.id === activeConfigId ? ' selected' : ''}>${escapeHtml(c.name)}</option>`
    ).join('');
    // 只有一个配置时禁用删除
    const delBtn = $('aiConfigDelete');
    if (delBtn) delBtn.disabled = aiConfigs.length <= 1;
}

// 将当前表单值同步到 aiConfig 和 aiConfigs 中对应项
function syncFormToActiveConfig() {
    const apiUrlInput = $('aiApiUrl');
    const tokenInput = $('aiApiToken');
    const modelInput = $('aiModel');
    aiConfig.apiUrl = apiUrlInput ? apiUrlInput.value.trim() : '';
    aiConfig.apiToken = tokenInput ? tokenInput.value.trim() : '';
    aiConfig.model = modelInput ? modelInput.value.trim() : '';
    const idx = aiConfigs.findIndex(c => c.id === activeConfigId);
    if (idx !== -1) {
        aiConfigs[idx].apiUrl = aiConfig.apiUrl;
        aiConfigs[idx].apiToken = aiConfig.apiToken;
        aiConfigs[idx].model = aiConfig.model;
    }
}

// 将 aiConfig 填充到表单
function fillFormFromConfig() {
    const apiUrlInput = $('aiApiUrl');
    const tokenInput = $('aiApiToken');
    const modelInput = $('aiModel');
    if (apiUrlInput) apiUrlInput.value = aiConfig.apiUrl || '';
    if (tokenInput) tokenInput.value = aiConfig.apiToken || '';
    if (modelInput) modelInput.value = aiConfig.model || '';
}

// 切换到指定配置
export function switchConfig(id) {
    syncFormToActiveConfig(); // 先保存当前表单
    if (id === undefined) {
        const select = $('aiConfigSelect');
        id = select ? Number(select.value) : undefined;
    }
    const target = aiConfigs.find(c => c.id === id);
    if (!target) return;
    activeConfigId = id;
    applyConfig(target);
    fillFormFromConfig();
    renderConfigSelector();
    renderModelDropdown();
    saveAISettings();
}

// 新增配置
export async function addConfig() {
    const name = await promptConfigName('新增 API 配置', `配置 ${aiConfigs.length + 1}`);
    if (name === null) return;
    syncFormToActiveConfig();
    const maxId = aiConfigs.reduce((m, c) => Math.max(m, c.id), 0);
    const newConfig = createDefaultConfig(maxId + 1, name);
    aiConfigs.push(newConfig);
    activeConfigId = newConfig.id;
    aiConfig = { apiUrl: '', apiToken: '', model: '' };
    fillFormFromConfig();
    renderConfigSelector();
    renderModelDropdown();
    saveAISettings();
}

// 删除当前配置
export async function deleteConfig() {
    if (aiConfigs.length <= 1) {
        await showAlert('至少需要保留一个配置', '⚠️');
        return;
    }
    const current = aiConfigs.find(c => c.id === activeConfigId);
    const confirmed = await showDialog({
        icon: '🗑️',
        title: '删除配置',
        message: `确定删除配置「${escapeHtml(current?.name || '')}」吗？`,
        buttons: [
            { text: '取消', type: 'cancel', value: false },
            { text: '确定删除', type: 'danger', value: true }
        ]
    });
    if (!confirmed) return;
    aiConfigs = aiConfigs.filter(c => c.id !== activeConfigId);
    activeConfigId = aiConfigs[0].id;
    applyConfig(aiConfigs[0]);
    fillFormFromConfig();
    renderConfigSelector();
    renderModelDropdown();
    saveAISettings();
}

// 重命名当前配置
export async function renameConfig() {
    const current = aiConfigs.find(c => c.id === activeConfigId);
    if (!current) return;
    const name = await promptConfigName('重命名配置', current.name);
    if (name === null) return;
    current.name = name;
    renderConfigSelector();
    saveAISettings();
}

// 弹出输入配置名称的对话框
async function promptConfigName(title, defaultName) {
    return new Promise(resolve => {
        const overlay = document.createElement('div');
        overlay.className = 'ai-config-name-overlay';
        overlay.innerHTML = `
            <div class="ai-config-name-dialog">
                <div class="ai-config-name-title">${escapeHtml(title)}</div>
                <input type="text" class="ai-config-name-input" value="${escapeAttr(defaultName)}" maxlength="30" placeholder="输入配置名称">
                <div class="ai-config-name-actions">
                    <button type="button" class="ai-config-name-btn cancel">取消</button>
                    <button type="button" class="ai-config-name-btn confirm">确定</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        const input = overlay.querySelector('.ai-config-name-input');
        input.focus();
        input.select();
        const close = (val) => { overlay.remove(); resolve(val); };
        overlay.querySelector('.cancel').addEventListener('click', () => close(null));
        overlay.querySelector('.confirm').addEventListener('click', () => {
            const v = input.value.trim();
            close(v || defaultName);
        });
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { const v = input.value.trim(); close(v || defaultName); }
            if (e.key === 'Escape') close(null);
        });
        overlay.addEventListener('click', (e) => { if (e.target === overlay) close(null); });
    });
}

// 加载 AI 设置
export function loadAISettings() {
    try {
        const savedRaw = safeLocalStorageGet('aiSettings');
        const saved = savedRaw ? safeJsonParse(savedRaw) : null;
        if (saved && typeof saved === 'object') {
            aiEnabled = !!saved.enabled;
            // 检查是否需要迁移旧格式
            const migrated = migrateOldSettings(saved);
            const data = migrated || saved;
            if (Array.isArray(data.configs) && data.configs.length > 0) {
                aiConfigs = data.configs.map(c => ({
                    id: c.id || 1,
                    name: c.name || '默认配置',
                    apiUrl: c.apiUrl || '',
                    apiToken: deobfuscateToken(c.apiToken || ''),
                    model: c.model || ''
                }));
                activeConfigId = data.activeConfigId || aiConfigs[0].id;
            } else {
                aiConfigs = [createDefaultConfig()];
                activeConfigId = 1;
            }
            applyConfig(getActiveConfig());
        } else {
            aiConfigs = [createDefaultConfig()];
            activeConfigId = 1;
            aiConfig = { apiUrl: '', apiToken: '', model: '' };
        }
    } catch(e) {
        console.warn('读取 AI 配置失败，已回退默认配置:', e);
        aiConfigs = [createDefaultConfig()];
        activeConfigId = 1;
        aiConfig = { apiUrl: '', apiToken: '', model: '' };
    }
    const toggle = $('aiToggle');
    if (toggle) toggle.checked = aiEnabled;
    fillFormFromConfig();
    renderConfigSelector();
    renderModelDropdown();
    // 直接更新 UI 状态，避免调用 toggleAI() 触发不必要的 saveAISettings()
    const panel = $('aiSettings');
    if (panel) panel.classList.toggle('disabled', !aiEnabled);
    const aiTabBtn = $('aiTabBtn');
    if (aiTabBtn) aiTabBtn.style.display = aiEnabled ? 'block' : 'none';
    loadAIHistory();
    loadCustomPrompts();
}

function setResultBoxState(resultDiv, type, html) {
    if (!resultDiv) return;

    const stateMap = {
        loading: { background: '#f0f9ff', border: '#bae6fd', color: '#0c4a6e' },
        success: { background: '#d1fae5', border: '#6ee7b7', color: '#065f46' },
        error: { background: '#fee2e2', border: '#fca5a5', color: '#991b1b' }
    };
    const state = stateMap[type] || stateMap.loading;

    resultDiv.style.display = 'block';
    resultDiv.style.background = state.background;
    resultDiv.style.border = `1px solid ${state.border}`;
    resultDiv.style.color = state.color;
    resultDiv.innerHTML = html;
}

function handleAISettingsSaveFailure() {
    const resultDiv = $('apiTestResult');
    setResultBoxState(resultDiv, 'error', '⚠️ AI 设置保存失败：本地存储空间不足或浏览器限制了存储');
}

function escapeModelName(model) {
    return escapeHtml(typeof model === 'string' ? model : '');
}

function setModelDropdownVisible(visible) {
    const dropdown = $('aiModelDropdown');
    const toggleBtn = $('aiModelDropdownToggle');
    aiModelDropdownVisible = !!visible;

    if (dropdown) {
        dropdown.classList.toggle('show', aiModelDropdownVisible);
    }
    if (toggleBtn) {
        toggleBtn.classList.toggle('active', aiModelDropdownVisible);
        toggleBtn.setAttribute('aria-expanded', aiModelDropdownVisible ? 'true' : 'false');
    }
}

function renderModelDropdown(items = aiAvailableModels) {
    const dropdown = $('aiModelDropdown');
    if (!dropdown) return;

    const models = Array.isArray(items) ? items.filter(item => typeof item === 'string' && item.trim()) : [];
    aiAvailableModels = models;

    if (!models.length) {
        dropdown.innerHTML = '<button type="button" class="ai-model-dropdown-item empty" disabled>空列表</button>';
        return;
    }

    dropdown.innerHTML = models.map(model => `
        <button type="button" class="ai-model-dropdown-item" data-model-name="${escapeAttr(model)}">${escapeModelName(model)}</button>
    `).join('');
}

export function hideModelDropdown() {
    setModelDropdownVisible(false);
}

export async function loadAvailableModels() {
    const apiUrlInput = $('aiApiUrl');
    const apiTokenInput = $('aiApiToken');
    const dropdown = $('aiModelDropdown');

    if (!apiUrlInput || !apiTokenInput || !dropdown) {
        return [];
    }

    const apiUrl = apiUrlInput.value.trim();
    const apiToken = apiTokenInput.value.trim();

    if (!apiUrl || !apiToken || !isValidApiUrl(apiUrl)) {
        renderModelDropdown([]);
        setModelDropdownVisible(true);
        return [];
    }

    renderModelDropdown(['加载中...']);
    setModelDropdownVisible(true);

    try {
        const parsedUrl = new URL(apiUrl);
        // 从用户填写的 API 地址中提取基础路径（保留 /v1 之前的自定义前缀）
        const pathname = parsedUrl.pathname;
        const v1Index = pathname.indexOf('/v1');
        const basePath = v1Index !== -1 ? pathname.substring(0, v1Index) : '';
        const modelsUrl = `${parsedUrl.origin}${basePath}/v1/models`;
        const response = await fetchWithTimeout(modelsUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiToken}`
            }
        }, 12000);

        if (!response.ok) {
            renderModelDropdown([]);
            return [];
        }

        const data = await response.json();
        const modelNames = Array.isArray(data?.data)
            ? data.data
                .map(item => (item && typeof item.id === 'string' ? item.id.trim() : ''))
                .filter(Boolean)
            : [];

        renderModelDropdown(modelNames);
        return modelNames;
    } catch (error) {
        console.warn('获取模型列表失败:', error);
        renderModelDropdown([]);
        return [];
    }
}

export function handleModelDropdownSelect(event) {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const button = target.closest('.ai-model-dropdown-item');
    if (!button || button.classList.contains('empty') || button.disabled) return;

    const modelName = button.getAttribute('data-model-name') || button.textContent || '';
    const modelInput = $('aiModel');
    if (modelInput) {
        modelInput.value = modelName.trim();
    }
    saveAISettings();
    hideModelDropdown();
}

// 保存 AI 设置
export function saveAISettings() {
    syncFormToActiveConfig();

    const configsToSave = aiConfigs.map(c => ({
        id: c.id,
        name: c.name,
        apiUrl: c.apiUrl,
        apiToken: obfuscateToken(c.apiToken),
        model: c.model
    }));

    const saved = safeLocalStorageSet('aiSettings', JSON.stringify({
        enabled: aiEnabled,
        configs: configsToSave,
        activeConfigId
    }));

    if (!saved) {
        console.warn('AI 配置保存失败：当前仅做可逆混淆，不提供真正的安全加密');
        handleAISettingsSaveFailure();
    }

    return saved;
}

// 切换 AI 启用状态
export function toggleAI() {
    const toggle = $('aiToggle');
    const panel = $('aiSettings');
    const aiTabBtn = $('aiTabBtn');
    aiEnabled = !!(toggle && toggle.checked);

    if (panel) panel.classList.toggle('disabled', !aiEnabled);
    if (aiTabBtn) aiTabBtn.style.display = aiEnabled ? 'block' : 'none';

    if (!aiEnabled) {
        const aiArea = $('area-ai');
        if (aiArea && aiArea.classList.contains('active')) {
            if (typeof _setTabCallback === 'function') _setTabCallback('file');
        }
    }
    saveAISettings();
}

// 测试 API 连接
export async function testAPIConnection() {
    const apiUrlInput = $('aiApiUrl');
    const apiTokenInput = $('aiApiToken');
    const modelInput = $('aiModel');
    const resultDiv = $('apiTestResult');
    const testBtn = $('testApiBtn');

    if (!apiUrlInput || !apiTokenInput || !modelInput || !resultDiv || !testBtn) {
        return;
    }

    const apiUrl = apiUrlInput.value.trim();
    const apiToken = apiTokenInput.value.trim();
    const model = modelInput.value.trim();

    if (!apiUrl || !apiToken || !model) {
        setResultBoxState(resultDiv, 'error', '❌ 请先填写完整的 API 配置信息');
        return;
    }

    if (!isValidApiUrl(apiUrl)) {
        setResultBoxState(resultDiv, 'error', '❌ API 地址格式无效，请使用 http:// 或 https:// 开头的完整地址');
        return;
    }

    testBtn.disabled = true;
    testBtn.textContent = '测试中..';
    setResultBoxState(resultDiv, 'loading', '⏳ 正在测试 API 连接...');

    try {
        const startTime = Date.now();
        const response = await fetchWithTimeout(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiToken}`
            },
            body: JSON.stringify({
                model: model,
                messages: [{ role: 'user', content: '测试连接，请回复"OK"' }],
                max_tokens: 10,
                temperature: 0.5
            })
        }, 15000);

        const responseTime = Date.now() - startTime;

        if (!response.ok) {
            let errorDetail = '';
            try {
                const errorData = await response.json();
                errorDetail = JSON.stringify(errorData, null, 2);
            } catch (e) {
                errorDetail = await response.text();
            }

            const safeStatusText = escapeHtml(response.statusText || '');
            const safeErrorDetail = escapeHtml(errorDetail || '');
            setResultBoxState(resultDiv, 'error', `
                <div style="font-weight: 600; margin-bottom: 8px;">❌ API 测试失败</div>
                <div style="margin-bottom: 6px;"><strong>HTTP 状态码:</strong> ${response.status} ${safeStatusText}</div>
                <div style="margin-bottom: 6px;"><strong>响应时间:</strong> ${responseTime}ms</div>
                <details style="margin-top: 8px;">
                    <summary style="cursor: pointer; font-weight: 600; margin-bottom: 6px;">📋 查看详细错误信息</summary>
                    <pre style="background: #1e293b; color: #e2e8f0; padding: 10px; border-radius: 6px; overflow-x: auto; font-size: 11px; margin-top: 6px; white-space: pre-wrap; word-wrap: break-word;">${safeErrorDetail}</pre>
                </details>
            `);
            return;
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '无响应内容';

        const safeModel = escapeHtml(data.model || model);
        const safeContent = escapeHtml(content);
        setResultBoxState(resultDiv, 'success', `
            <div style="font-weight: 600; margin-bottom: 8px;">✅ API 连接成功</div>
            <div style="margin-bottom: 4px;"><strong>响应时间:</strong> ${responseTime}ms</div>
            <div style="margin-bottom: 4px;"><strong>模型:</strong> ${safeModel}</div>
            <div style="margin-bottom: 4px;"><strong>AI 回复:</strong> ${safeContent}</div>
        `);

    } catch (error) {
        const safeErrorMsg = escapeHtml(error.message || '未知错误');
        setResultBoxState(resultDiv, 'error', `
            <div style="font-weight: 600; margin-bottom: 8px;">❌ 连接失败</div>
            <div style="margin-bottom: 6px;"><strong>错误信息:</strong> ${safeErrorMsg}</div>
        `);
    } finally {
        if (testBtn) {
            testBtn.disabled = false;
            testBtn.textContent = '🔍 测试 API 连接';
        }
    }
}

// AI 出题相关函数
export function openAIModal() {
    if (!aiConfig.apiUrl || !aiConfig.apiToken || !aiConfig.model) {
        showAlert('请先在设置中配置 AI API 信息', '⚠️');
        return;
    }
    if (!isValidApiUrl(aiConfig.apiUrl)) {
        showAlert('API 地址格式无效，请使用 http:// 或 https:// 开头', '⚠️');
        return;
    }
    const modal = $('aiModal');
    const resultBox = $('aiResultBox');
    const actionButtons = $('aiActionButtons');
    if (!modal || !resultBox || !actionButtons) return;
    modal.classList.add('active');
    resultBox.classList.remove('show');
    actionButtons.style.display = 'none';
}

export function closeAIModal() {
    const modal = $('aiModal');
    if (modal) modal.classList.remove('active');
}

export async function generateAIQuestions() {
    const countInput = $('aiQuestionCount');
    const promptInput = $('aiPrompt');
    const btn = $('aiGenerateBtn');
    const resultBox = $('aiResultBox');
    const resultContent = $('aiResultContent');

    if (!countInput || !promptInput || !btn || !resultBox || !resultContent) return;

    const count = Number.parseInt(countInput.value, 10);
    const prompt = promptInput.value.trim();

    if (!prompt) {
        await showAlert('请输入出题要求', '📝');
        return;
    }
    if (!Number.isInteger(count) || count < 1 || count > 999) {
        await showAlert('题目数量必须是 1-999 的整数', '⚠️');
        return;
    }
    if (!isValidApiUrl(aiConfig.apiUrl)) {
        await showAlert('API 地址格式无效，请先在设置中修改', '⚠️');
        return;
    }

    btn.disabled = true;
    btn.textContent = '生成中..';
    resultBox.classList.add('show');
    resultContent.innerHTML = `
        <div class="ai-loading"><div class="ai-loading-spinner"></div>AI 正在生成题目，请稍候..</div>
        <details class="ai-stream-details">
            <summary class="ai-stream-summary">📄 查看生成详情</summary>
            <pre class="ai-stream-content" id="aiStreamContent"></pre>
        </details>
    `;

    let streamedContent = '';
    try {
        const standardFormat = PRESET_FORMATS[0];
        const formatExample = standardFormat.example.replace(/\\n/g, '\n');
        
        const generateBasePrompt = getGeneratePrompt();
        const systemPrompt = `${generateBasePrompt}

输出格式要求：
请严格按照以下格式输出题目，每道题之间用 --- 分隔：

${formatExample}

格式说明：
- 题目以 "Q: " 开头
- 选项使用 "A: " "B: " "C: " "D: " 格式
- 答案使用 "答案: " 开头，只写字母（如：答案: B）
- 解析使用 "解析: " 开头（可选）
- 每道题之间用 "---" 分隔

请直接输出题目文本，不要使用 JSON 或其他格式。`;

        const response = await fetchWithTimeout(aiConfig.apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${aiConfig.apiToken}`
            },
            body: JSON.stringify({
                model: aiConfig.model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: `请生成 ${count} 道题目。要求：${prompt}` }
                ],
                temperature: 0.7,
                stream: true
            })
        }, 120000);

        if (!response.ok) {
            throw new Error(`API 请求失败: ${response.status} ${response.statusText}`);
        }

        // 流式读取响应
        const streamEl = $('aiStreamContent');
        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

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
                        if (streamEl) {
                            streamEl.textContent = streamedContent;
                            streamEl.scrollTop = streamEl.scrollHeight;
                        }
                    }
                } catch (_) { /* 忽略非 JSON 行 */ }
            }
        }
        
        const content = streamedContent;
        if (!content.trim()) {
            throw new Error('AI 返回内容为空');
        }

        const parsed = parseTextWithConfig(content, standardFormat.config);

        if (parsed.length === 0) {
            throw new Error('未能解析出有效的题目，AI 可能未按照指定格式输出');
        }

        aiGeneratedQuestions = parsed;
        addToAIHistory(aiGeneratedQuestions, prompt);

        resultContent.innerHTML = `
            <div style="color: var(--correct-text); font-size: 14px; margin-bottom: 8px;">✅ 生成成功</div>
            <div style="font-size: 13px; color: var(--text-secondary); line-height: 1.6;">
                已成功生成 <strong style="color: var(--primary-color);">${aiGeneratedQuestions.length}</strong> 道题目<br>
                您可以选择导出题目或直接导入开始答题
            </div>
            <details class="ai-stream-details">
                <summary class="ai-stream-summary">📄 查看生成详情</summary>
                <pre class="ai-stream-content">${escapeHtml(content)}</pre>
            </details>
        `;
        $('aiActionButtons').style.display = 'block';

    } catch (error) {
        console.error('AI生成失败:', error);
        const safeErrorMessage = escapeHtml(error.message || '未知错误');
        const detailsHtml = streamedContent.trim() ? `
            <details class="ai-stream-details" style="margin-top: 10px;">
                <summary class="ai-stream-summary">📄 查看生成详情</summary>
                <pre class="ai-stream-content">${escapeHtml(streamedContent)}</pre>
            </details>
        ` : '';
        resultContent.innerHTML = `
            <div style="color: var(--wrong-text); font-size: 14px; margin-bottom: 8px;">❌ 生成失败</div>
            <div style="font-size: 13px; color: var(--text-secondary); line-height: 1.6;">
                ${safeErrorMessage}
            </div>
            ${detailsHtml}
        `;
    } finally {
        btn.disabled = false;
        btn.textContent = '🚀 生成题目';
    }
}

// AI 历史记录
function loadAIHistory() {
    try {
        const saved = safeJsonParse(safeLocalStorageGet('aiHistory', '[]'), []);
        aiHistory = Array.isArray(saved) ? saved : [];
    } catch(e) {
        aiHistory = [];
    }
    renderAIHistory();
}

function saveAIHistory() {
    const source = Array.isArray(aiHistory) ? aiHistory : [];
    const snapshots = [source, source.slice(0, 10), source.slice(0, 5), source.slice(0, 1), []];

    for (const candidate of snapshots) {
        const historyJson = JSON.stringify(candidate);
        const saved = safeLocalStorageSetWithCheck('aiHistory', historyJson, 1024) || safeLocalStorageSet('aiHistory', historyJson);
        if (saved) {
            aiHistory = candidate;
            return true;
        }
    }

    console.error('保存历史记录失败: 存储空间不足且降级保存失败');
    return false;
}

function addToAIHistory(questions, prompt) {
    const historyItem = {
        id: Date.now(),
        model: aiConfig.model || '未知模型',
        questionCount: questions.length,
        prompt: prompt,
        questions: questions,
        createdAt: new Date().toISOString()
    };
    
    aiHistory.unshift(historyItem);
    
    if (aiHistory.length > 20) {
        aiHistory = aiHistory.slice(0, 20);
    }
    
    const saved = saveAIHistory();
    if (!saved) {
        console.warn('历史记录已自动清理以释放空间');
        showAlert('AI 历史记录保存失败，可能是本地存储空间不足', '⚠️');
    }
    renderAIHistory();
}

function renderAIHistory() {
    const container = $('aiHistoryList');
    const clearBtn = $('clearHistoryBtn');
    if (!container) return;

    if (!aiHistory || aiHistory.length === 0) {
        container.innerHTML = '<div class="ai-history-empty">暂无历史记录</div>';
        if (clearBtn) clearBtn.style.display = 'none';
        return;
    }

    if (clearBtn) clearBtn.style.display = 'block';
    container.innerHTML = '';

    aiHistory.forEach(item => {
        const card = document.createElement('div');
        card.className = 'ai-history-card';
        
        const preview = item.questions.slice(0, 2)
            .map((q, idx) => `${idx + 1}. ${q.question}`)
            .join(' ');
        const safeModel = escapeHtml(item.model || '未知模型');
        const safePreview = escapeHtml(preview);
        const safeId = Number(item.id) || 0;
        
        const date = new Date(item.createdAt);
        const timeStr = date.toLocaleString('zh-CN', {
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        card.innerHTML = `
            <div class="ai-history-card-header">
                <div class="ai-history-card-info">
                    <div class="ai-history-card-model">🤖 ${safeModel}</div>
                    <div class="ai-history-card-meta">
                        <span>📝 ${item.questionCount} 道题</span>
                        <span>🕐 ${timeStr}</span>
                    </div>
                </div>
            </div>
            <div class="ai-history-card-preview">${safePreview}</div>
            <div class="ai-history-card-actions">
                <button class="ai-history-btn ai-history-btn-import" data-history-action="import" data-history-id="${safeId}">
                    📥 导入
                </button>
                <button class="ai-history-btn ai-history-btn-view" data-history-action="view" data-history-id="${safeId}">
                    👁️ 查看
                </button>
                <button class="ai-history-btn ai-history-btn-delete" data-history-action="delete" data-history-id="${safeId}">
                    🗑️
                </button>
            </div>
        `;
        
        container.appendChild(card);
    });
}

export function toggleAIHistory() {
    const content = $('aiHistoryContent');
    const toggleBtn = $('aiHistoryToggleBtn');
    if (!content || !toggleBtn) return;

    if (content.classList.contains('expanded')) {
        content.classList.remove('expanded');
        toggleBtn.classList.remove('expanded');
    } else {
        content.classList.add('expanded');
        toggleBtn.classList.add('expanded');
    }
}

// 导出供全局使用的函数
export function getAIGeneratedQuestions() {
    return aiGeneratedQuestions;
}

export function getAIHistory() {
    return aiHistory;
}

export function setAIHistory(newHistory) {
    aiHistory = Array.isArray(newHistory) ? newHistory : [];
    const saved = saveAIHistory();
    renderAIHistory();
    return saved;
}

export function isAIEnabled() {
    return aiEnabled;
}

export function getAIConfig() {
    return { ...aiConfig };
}

// 查看历史记录详情
export function viewHistoryQuestions(id) {
    const item = aiHistory.find(h => h.id === id);
    if (!item) {
        showAlert('历史记录不存在', '⚠️');
        return;
    }

    const questionsText = item.questions.map((q, idx) => {
        let text = `${idx + 1}. ${q.question}\n`;
        q.options.forEach(opt => {
            text += `   ${opt.letter}. ${opt.text}\n`;
        });
        text += `   答案: ${q.answer}\n`;
        if (q.explanation) {
            text += `   解析: ${q.explanation}\n`;
        }
        return text;
    }).join('\n');

    const safeModel = escapeHtml(item.model || '未知模型');
    const safePrompt = escapeHtml(item.prompt || '无');
    const safeQuestionsText = escapeHtml(questionsText);
    const safeId = Number(item.id) || 0;

    const modalTitle = $('modalTitle');
    const modalBody = $('modalBody');
    if (modalTitle) modalTitle.textContent = `📚 历史记录详情 - ${item.model}`;
    if (modalBody) {
        modalBody.innerHTML = `
            <div class="example-section">
                <div class="example-title">📊 基本信息</div>
                <div style="font-size:13px;line-height:1.8;color:var(--text-secondary);margin-bottom:15px;">
                    • 模型: ${safeModel}<br>
                    • 题目数量: ${item.questionCount} 道<br>
                    • 生成时间: ${new Date(item.createdAt).toLocaleString('zh-CN')}<br>
                    • 提示词: ${safePrompt}
                </div>
            </div>
            <div class="example-section">
                <div class="example-title">📝 题目内容</div>
                <div class="example-code" style="max-height: 400px; overflow-y: auto;">${safeQuestionsText}</div>
                <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px;">
                    <button class="copy-example-btn" data-history-action="copy" data-history-id="${safeId}" style="flex: 1; min-width: 140px;">
                        📋 复制文本
                    </button>
                    <button class="copy-example-btn" data-history-action="export" data-history-id="${safeId}" style="flex: 1; min-width: 140px; background: #10b981; color: white;">
                        📤 导出文件
                    </button>
                    <button class="copy-example-btn" data-history-action="importAndClose" data-history-id="${safeId}" style="flex: 1; min-width: 140px; background: var(--primary-color);">
                        📥 导入题目
                    </button>
                </div>
            </div>
        `;
    }
    const exampleModal = $('exampleModal');
    if (exampleModal) exampleModal.classList.add('active');
}

// 复制历史记录题目文本
export async function copyHistoryQuestions(id) {
    const item = aiHistory.find(h => h.id === id);
    if (!item) return;
    try {
        await navigator.clipboard.writeText(questionsToText(item.questions));
        await showAlert('✅ 已复制到剪贴板！', '🎉');
    } catch (e) {
        await showAlert('❌ 复制失败，请检查浏览器权限', '⚠️');
    }
}

// 导出历史记录题目
export async function exportHistoryQuestions(id, exportFn) {
    const item = aiHistory.find(h => h.id === id);
    if (!item) {
        await showAlert('历史记录不存在', '⚠️');
        return;
    }
    if (typeof exportFn === 'function') {
        await exportFn(item.questions, `history_${item.id}`);
    }
}
