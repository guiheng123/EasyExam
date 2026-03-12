// 题库管理模块 - 题库的增删改查和答题状态追踪

import { safeLocalStorageGet, safeLocalStorageSet, safeJsonParse } from '../core/storage.js';
import { escapeHtml } from '../utils/dom.js';

const STORAGE_KEY = 'questionBanks';
let banks = [];

export function loadQuestionBanks() {
    const raw = safeLocalStorageGet(STORAGE_KEY);
    banks = raw ? (safeJsonParse(raw) || []) : [];
    for (const bank of banks) {
        if (!bank.results) bank.results = {};
    }
    return banks;
}

function saveBanks() {
    return safeLocalStorageSet(STORAGE_KEY, JSON.stringify(banks));
}

export function getQuestionBanks() { return banks; }

// 检查题库名称是否已存在
export function bankNameExists(name) {
    return banks.some(b => b.name === name);
}

export function addQuestionBank(name, questions) {
    const sourceQuestions = Array.isArray(questions) ? questions : [];
    const finalName = name || ('题库 ' + (banks.length + 1));
    const newQs = sourceQuestions
        .filter(q => q && typeof q.question === 'string' && Array.isArray(q.options) && q.options.length > 0)
        .map(q => ({
            question: q.question,
            options: q.options
                .filter(o => o && typeof o.letter === 'string')
                .map(o => ({ letter: o.letter, text: o.text || '' })),
            answer: q.answer,
            explanation: q.explanation || ''
        }))
        .filter(q => q.options.length > 0);

    if (newQs.length === 0) {
        return { bank: null, merged: false, added: 0, total: 0, saved: false, reason: 'empty' };
    }

    // 同名题库合并
    const existing = banks.find(b => b.name === finalName);
    if (existing) {
        const existingTexts = new Set(existing.questions.map(q => q.question));
        let added = 0;
        for (const q of newQs) {
            if (!existingTexts.has(q.question)) {
                existing.questions.push(q);
                existingTexts.add(q.question);
                added++;
            }
        }
        const saved = saveBanks();
        return { bank: existing, merged: true, added, total: existing.questions.length, saved };
    }

    const bank = {
        id: Date.now(),
        name: finalName,
        questions: newQs,
        createdAt: Date.now(),
        results: {}
    };
    banks.unshift(bank);
    const saved = saveBanks();
    return { bank, merged: false, added: newQs.length, total: newQs.length, saved };
}

export function deleteQuestionBank(id) {
    banks = banks.filter(b => b.id !== id);
    return saveBanks();
}

export function clearAllBanks() {
    banks = [];
    return saveBanks();
}

export function updateBankResults(bankId, userAnswers, questions) {
    const bank = banks.find(b => b.id === bankId);
    if (!bank || !Array.isArray(userAnswers) || !Array.isArray(questions)) return false;

    for (let i = 0; i < questions.length; i++) {
        const currentQuestion = questions[i];
        if (!currentQuestion) continue;

        const ua = userAnswers[i];
        if (ua === null || ua === undefined) continue;

        const origIdx = currentQuestion._bankIndex;
        const idx = origIdx !== undefined ? origIdx : i;
        const bankQuestion = bank.questions[idx];
        if (!bankQuestion) continue;

        let normalizedUserAnswer = ua;
        if (Array.isArray(currentQuestion.options) && Array.isArray(bankQuestion.options)) {
            const selectedOption = currentQuestion.options.find(opt => opt && opt.letter === ua);
            if (selectedOption) {
                const originalOption = bankQuestion.options.find(opt => opt && opt.text === selectedOption.text);
                if (originalOption?.letter) {
                    normalizedUserAnswer = originalOption.letter;
                }
            }
        }

        bank.results[idx] = {
            status: ua === currentQuestion.answer ? 'correct' : 'wrong',
            userAnswer: normalizedUserAnswer
        };
    }

    return saveBanks();
}

export function resetBankResults(bankId) {
    const bank = banks.find(b => b.id === bankId);
    if (!bank) return false;
    bank.results = {};
    return saveBanks();
}

export function getBankStats(bank) {
    const total = bank.questions.length;
    let correct = 0, wrong = 0;
    for (const key in bank.results) {
        if (bank.results[key].status === 'correct') correct++;
        else wrong++;
    }
    return { total, correct, wrong, pending: total - correct - wrong };
}

export function getCorrectQuestions(bank) {
    const out = [];
    for (const key in bank.results) {
        if (bank.results[key].status === 'correct') {
            const idx = Number(key);
            if (bank.questions[idx]) out.push({ ...bank.questions[idx], _bankIndex: idx, _userAnswer: bank.results[key].userAnswer });
        }
    }
    return out;
}

export function getWrongQuestions(bank) {
    const out = [];
    for (const key in bank.results) {
        if (bank.results[key].status === 'wrong') {
            const idx = Number(key);
            if (bank.questions[idx]) out.push({ ...bank.questions[idx], _bankIndex: idx, _userAnswer: bank.results[key].userAnswer });
        }
    }
    return out;
}

export function getPendingQuestions(bank) {
    const out = [];
    for (let i = 0; i < bank.questions.length; i++) {
        if (!bank.results[i]) out.push({ ...bank.questions[i], _bankIndex: i });
    }
    return out;
}

// 获取题目列表HTML（用于查看详情）
export function renderQuestionDetail(questions, title, bank) {
    if (!questions.length) return '<div class="bank-detail-empty">暂无题目</div>';
    let html = '<div class="bank-detail-title">' + escapeHtml(title) + ' (' + questions.length + '题)</div>';
    html += '<div class="bank-detail-list">';
    for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const idx = q._bankIndex !== undefined ? q._bankIndex : i;
        const result = bank && bank.results[idx];
        const statusClass = result ? (result.status === 'correct' ? 'detail-correct' : 'detail-wrong') : 'detail-pending';
        const statusIcon = result ? (result.status === 'correct' ? '✅' : '❌') : '⏳';

        html += '<div class="bank-detail-item ' + statusClass + '">'
            + '<div class="bank-detail-q">'
            + '<span class="bank-detail-idx">' + (i + 1) + '.</span> '
            + escapeHtml(q.question)
            + '</div>'
            + '<div class="bank-detail-options">';
        for (const opt of q.options) {
            let optClass = '';
            if (result) {
                if (opt.letter === q.answer) optClass = 'opt-correct';
                else if (opt.letter === result.userAnswer) optClass = 'opt-wrong';
            }
            html += '<div class="bank-detail-opt ' + optClass + '">' + opt.letter + '. ' + escapeHtml(opt.text) + '</div>';
        }
        html += '</div>';
        html += '<div class="bank-detail-meta">'
            + '<span>正确答案: ' + q.answer + '</span>'
            + (result ? ' <span>| 你的答案: ' + result.userAnswer + ' ' + statusIcon + '</span>' : ' <span>' + statusIcon + ' 未作答</span>');
        if (q.explanation) {
            html += '<div class="bank-detail-explain">💡 ' + escapeHtml(q.explanation) + '</div>';
        }
        html += '</div></div>';
    }
    html += '</div>';
    return html;
}

export function renderBankList(container) {
    if (!container) return;
    if (banks.length === 0) {
        container.innerHTML = '<div class="bank-empty">'
            + '<div style="font-size:36px;margin-bottom:10px">📚</div>'
            + '<div style="color:var(--text-secondary);font-size:14px">暂无题库</div>'
            + '<div style="color:#94a3b8;font-size:12px;margin-top:4px">通过文件导入、文本粘贴或AI出题添加题库</div>'
            + '</div>';
        return;
    }
    const fragment = document.createDocumentFragment();
    for (const bank of banks) {
        const s = getBankStats(bank);
        const pct = s.total > 0 ? Math.round(((s.correct + s.wrong) / s.total) * 100) : 0;
        const card = document.createElement('div');
        card.className = 'bank-card';
        card.dataset.bankId = bank.id;

        let footerBtns = '<button class="bank-start-btn" data-bank-action="startAll" data-bank-id="' + bank.id + '">📝 全部答题</button>';
        if (s.wrong > 0) {
            footerBtns += '<button class="bank-start-btn bank-start-wrong" data-bank-action="startWrong" data-bank-id="' + bank.id + '">❌ 错题重做 (' + s.wrong + ')</button>';
        }
        if (s.pending > 0) {
            footerBtns += '<button class="bank-start-btn bank-start-pending" data-bank-action="startPending" data-bank-id="' + bank.id + '">⏳ 继续未完成 (' + s.pending + ')</button>';
        }

        card.innerHTML = '<div class="bank-card-header">'
            + '<div class="bank-card-title">' + escapeHtml(bank.name) + '</div>'
            + '<div class="bank-card-actions">'
            + '<button class="bank-action-btn" data-bank-action="reset" data-bank-id="' + bank.id + '" title="重置记录">🔄</button>'
            + '<button class="bank-action-btn bank-action-delete" data-bank-action="delete" data-bank-id="' + bank.id + '" title="删除题库">🗑️</button>'
            + '</div></div>'
            + '<div class="bank-card-stats">'
            + '<div class="bank-stat bank-stat-clickable" data-bank-action="viewAll" data-bank-id="' + bank.id + '"><span class="bank-stat-num">' + s.total + '</span><span class="bank-stat-label">总题数</span></div>'
            + '<div class="bank-stat bank-stat-correct bank-stat-clickable" data-bank-action="viewCorrect" data-bank-id="' + bank.id + '"><span class="bank-stat-num">' + s.correct + '</span><span class="bank-stat-label">已完成</span></div>'
            + '<div class="bank-stat bank-stat-wrong bank-stat-clickable" data-bank-action="viewWrong" data-bank-id="' + bank.id + '"><span class="bank-stat-num">' + s.wrong + '</span><span class="bank-stat-label">错题</span></div>'
            + '<div class="bank-stat bank-stat-pending bank-stat-clickable" data-bank-action="viewPending" data-bank-id="' + bank.id + '"><span class="bank-stat-num">' + s.pending + '</span><span class="bank-stat-label">未完成</span></div>'
            + '</div>'
            + '<div class="bank-progress-bar"><div class="bank-progress-fill" style="width:' + pct + '%"></div></div>'
            + '<div class="bank-card-footer">' + footerBtns + '</div>';

        fragment.appendChild(card);
    }
    container.replaceChildren(fragment);
}
