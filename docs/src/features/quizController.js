// 答题流程控制器 - 从 main.js 提取的答题编排逻辑

import { $ } from '../utils/dom.js';
import {
    startQuiz as quizStart,
    renderQuestion,
    prevQuestion,
    nextQuestion,
    showResult,
    reviewQuestion,
    confirmExit,
    resetImport,
    setQuestions,
    getCurrentIndex,
    getQuestions,
    getUserAnswers,
    getIsReviewMode,
    jumpToIndex
} from './quiz.js';
import { showView, showReadyPanel, resetToSetupPanel, setTab } from './viewManager.js';
import { showAlert } from '../components/Dialog.js';
import {
    toggleAIChatPanel,
    activateAIChatSessionForQuestion,
    renderAIChatSession,
    clearAIChatCache
} from './aiChat.js';
import { normalizeQuestions } from '../core/dataProcessor.js';
import { updateBankResults } from './questionBank.js';
import { activeBankId, setActiveBankId, updateSaveBankBtnVisibility } from '../state.js';
import { resetSelectedPreset } from './formatManager.js';

// 完成解析
export function finishParsing(parsed) {
    const normalized = normalizeQuestions(parsed);
    if (!normalized.length) {
        showAlert('题目数据无效，请检查格式后重试', '⚠️');
        return false;
    }

    setActiveBankId(null);
    setQuestions(normalized);
    showReadyPanel(normalized.length);
    updateSaveBankBtnVisibility();
    return true;
}

// 开始答题
export function startQuizGame() {
    const shuffleQuestionsChecked = $('shuffleQuestions')?.checked || false;
    const shuffleOptionsChecked = $('shuffleOptions')?.checked || false;

    if (quizStart(shuffleQuestionsChecked, shuffleOptionsChecked)) {
        clearAIChatCache();
        showView('quizView');
        renderQuestion();
        activateAIChatSessionForQuestion(getCurrentIndex(), true);
    }
}

// 题目导航弹窗
export function toggleQuestionMap() {
    const popup = $('questionMapPopup');
    if (!popup) return;
    const isOpen = popup.classList.toggle('active');
    if (isOpen) renderQuestionMap();
}

export function renderQuestionMap() {
    const grid = $('questionMapGrid');
    if (!grid) return;
    const qs = getQuestions();
    const answers = getUserAnswers();
    const curIdx = getCurrentIndex();
    const fragment = document.createDocumentFragment();

    qs.forEach((q, i) => {
        const dot = document.createElement('div');
        dot.className = 'qmap-dot';
        dot.dataset.index = String(i);
        dot.textContent = i + 1;

        if (i === curIdx) {
            dot.classList.add('current');
        }
        if (answers[i] !== null) {
            dot.classList.add(answers[i] === q.answer ? 'correct' : 'wrong');
        }
        fragment.appendChild(dot);
    });
    grid.replaceChildren(fragment);
}

export function jumpToQuestion(idx) {
    const qs = getQuestions();
    if (idx < 0 || idx >= qs.length) return;
    const isReview = getIsReviewMode();
    if (isReview) {
        reviewQuestion(idx);
    } else {
        jumpToIndex(idx);
        renderQuestion();
    }
    $('questionMapPopup')?.classList.remove('active');
    activateAIChatSessionForQuestion(idx);
}

export function prevQ() {
    prevQuestion();
    const aiChatPanel = $('aiChatPanel');
    if (aiChatPanel?.classList.contains('active')) {
        const session = activateAIChatSessionForQuestion(getCurrentIndex());
        renderAIChatSession(session);
    }
}

export function nextQ() {
    const result = nextQuestion();
    if (result.action === 'result') {
        showResultView();
    } else {
        const aiChatPanel = $('aiChatPanel');
        if (aiChatPanel?.classList.contains('active')) {
            const session = activateAIChatSessionForQuestion(getCurrentIndex());
            renderAIChatSession(session);
        }
    }
}

// 回调，由 main.js 注入，避免循环依赖
let _onExitToBank = null;
export function setOnExitToBankCallback(fn) { _onExitToBank = fn; }
let _onReset = null;
export function setOnResetCallback(fn) { _onReset = fn; }

export async function confirmExitQuiz() {
    const result = await confirmExit();
    if (result.confirmed) {
        if (result.isReview) {
            showResultView();
        } else {
            const fromBank = !!activeBankId;
            if (fromBank) {
                updateBankResults(activeBankId, getUserAnswers(), getQuestions());
            }
            resetImportData();
            if (fromBank && typeof _onExitToBank === 'function') {
                _onExitToBank();
            }
        }
    }
}

export function showResultView() {
    showView('resultView');
    showResult();
    if (activeBankId) {
        updateBankResults(activeBankId, getUserAnswers(), getQuestions());
    }
    updateSaveBankBtnVisibility();
}

export function reviewQuestionAt(idx) {
    reviewQuestion(idx);
    showView('quizView');
    const session = activateAIChatSessionForQuestion(idx);
    const aiChatPanel = $('aiChatPanel');
    if (aiChatPanel?.classList.contains('active')) {
        renderAIChatSession(session);
    }
}

export function resetImportData() {
    clearAIChatCache();
    resetImport();
    setActiveBankId(null);
    resetSelectedPreset();
    resetToSetupPanel();
    showView('homeView');
    if (typeof _onReset === 'function') _onReset();
}

