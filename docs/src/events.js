// 事件绑定模块 - 从 main.js 提取的 DOM 事件监听

import { $, handleAccessibleAction } from './utils/dom.js';

// 组件
import { settingsSidebar, aiModal, exampleModal } from './state.js';

// features
import {
    toggleHotkeys,
    startRecordHotkey,
    resetHotkey,
    cancelRecording
} from './features/hotkeys.js';
import {
    saveAISettings,
    toggleAI,
    testAPIConnection,
    openAIModal,
    closeAIModal,
    generateAIQuestions,
    toggleAIHistory,
    loadAvailableModels,
    hideModelDropdown,
    handleModelDropdownSelect,
    switchConfig,
    addConfig,
    deleteConfig,
    renameConfig,
    saveCustomPrompts,
    DEFAULT_ANALYSIS_PROMPT,
    DEFAULT_GENERATE_PROMPT
} from './features/ai.js';
import { selectAnswer } from './features/quiz.js';
import {
    setTab,
    setSubTab,
    setCustomMode
} from './features/viewManager.js';
import {
    handleFileSelect,
    parseWithSelectedPreset
} from './features/fileImport.js';
import {
    selectPreset,
    showExample,
    copyExample,
    closeExampleModal,
    fillTemplate,
    saveSimpleFormat,
    saveAdvancedFormat,
    useCustomFormat,
    editCustomFormat,
    deleteCustomFormat
} from './features/formatManager.js';
import {
    sendAIChatMessage,
    askCurrentQuestionAnalysis,
    toggleAIChatPanel
} from './features/aiChat.js';

// controllers
import {
    startQuizGame,
    toggleQuestionMap,
    jumpToQuestion,
    prevQ,
    nextQ,
    confirmExitQuiz,
    reviewQuestionAt,
    resetImportData
} from './features/quizController.js';
import {
    saveToBankAction,
    updateSelectCount,
    confirmSaveToBank,
    closeQuestionSelectModal,
    refreshBankList,
    viewBankQuestions,
    closeBankDetail,
    deleteBankAction,
    resetBankAction,
    clearAllBanksAction,
    startBankQuiz,
    exportWrongToBank
} from './features/bankController.js';
import {
    exportAIQuestions,
    importAIQuestions,
    importHistoryQuestions,
    deleteHistoryItem,
    clearAIHistory,
    handleAIHistoryAction
} from './features/aiController.js';

function closeSettings() {
    cancelRecording();
    settingsSidebar.close();
}

function openSettings() {
    settingsSidebar.open();
}

export { openSettings, closeSettings };

/**
 * 工具函数：若元素存在则绑定 click 事件
 * @param {string|Element} idOrEl - 元素 ID 字符串或 DOM 元素
 * @param {Function} handler
 */
function bindClick(idOrEl, handler) {
    const el = typeof idOrEl === 'string' ? $(idOrEl) : idOrEl;
    if (el) el.addEventListener('click', handler);
}

// 初始化所有事件监听
export function initEventListeners() {
    // 选项点击事件
    const optionsContainer = $('optionsContainer');
    if (optionsContainer) {
        optionsContainer.addEventListener('click', (e) => {
            const item = e.target.closest('.option-item');
            if (!item || item.classList.contains('disabled')) return;
            const letter = item.dataset.letter;
            if (letter) selectAnswer(letter);
        });
    }

    // 结果网格点击事件
    const resultGrid = $('resultGrid');
    if (resultGrid) {
        resultGrid.addEventListener('click', (e) => {
            const dot = e.target.closest('.grid-dot');
            if (!dot) return;
            const idx = Number(dot.dataset.index);
            if (Number.isInteger(idx) && idx >= 0) reviewQuestionAt(idx);
        });
    }

    // 错题卡片点击 → 导入到题库
    const statWrongCard = document.querySelector('.stat-card.wrong');
    if (statWrongCard) {
        statWrongCard.addEventListener('click', () => exportWrongToBank());
    }

    // 模态框点击关闭
    aiModal.onClose(() => closeAIModal());
    exampleModal.onClose(() => closeExampleModal());

    const settingsPanelEl = $('settingsPanel');
    if (settingsPanelEl) {
        settingsPanelEl.addEventListener('click', function (e) {
            if (e.target === this) closeSettings();
        });
    }

    // Tab 切换
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const mode = btn.dataset.tab;
            if (mode) setTab(mode);
        });
    });

    document.querySelectorAll('.sub-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const mode = btn.dataset.subtab;
            if (mode) setSubTab(mode);
        });
    });

    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const mode = btn.dataset.mode;
            if (mode) setCustomMode(mode);
        });
    });

    // 文件上传
    const fileInput = $('fileInput');
    if (fileInput) {
        fileInput.addEventListener('change', (e) => handleFileSelect(e));
    }

    // 预设格式
    const presetList = $('presetList');
    if (presetList) {
        presetList.addEventListener('click', (e) => {
            const card = e.target.closest('.preset-card');
            if (!card) return;
            const id = card.dataset.presetId;
            if (id) selectPreset(id);
        });
    }

    const parseBtn = $('parseBtn') || $('parsePresetBtn');
    if (parseBtn) {
        parseBtn.addEventListener('click', () => parseWithSelectedPreset());
    }

    // 示例模态框
    const showExampleBtn = $('showExampleBtn');
    if (showExampleBtn) {
        showExampleBtn.addEventListener('click', () => showExample());
    }

    const copyExampleBtn = $('copyExampleBtn');
    if (copyExampleBtn) {
        copyExampleBtn.addEventListener('click', () => copyExample());
    }

    // 模板填充（事件委托）
    const simpleFormatBuilder = document.querySelector('.simple-format-builder');
    if (simpleFormatBuilder) {
        simpleFormatBuilder.addEventListener('click', (e) => {
            const chip = e.target.closest('.template-chip[data-action="fillTemplate"]');
            if (!chip) return;
            const field = chip.dataset.field;
            const value = chip.dataset.value;
            if (field && value) fillTemplate(field, value);
        });
    }

    // 自定义格式
    const saveSimpleFormatBtn = $('saveSimpleFormatBtn');
    if (saveSimpleFormatBtn) {
        saveSimpleFormatBtn.addEventListener('click', () => saveSimpleFormat());
    }

    const saveAdvancedFormatBtn = $('saveAdvancedFormatBtn');
    if (saveAdvancedFormatBtn) {
        saveAdvancedFormatBtn.addEventListener('click', () => saveAdvancedFormat());
    }

    // 自定义格式列表（事件委托）
    const customFormatList = $('customFormatList');
    if (customFormatList) {
        customFormatList.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-format-action]');
            if (!btn) return;
            const action = btn.dataset.formatAction;
            const id = btn.dataset.formatId;
            if (action === 'use') useCustomFormat(id);
            else if (action === 'edit') editCustomFormat(id);
            else if (action === 'delete') deleteCustomFormat(id);
        });
    }

    // 题库面板
    const bankListContainer = $('bankListContainer');
    if (bankListContainer) {
        bankListContainer.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-bank-action]');
            if (!btn) return;
            const action = btn.dataset.bankAction;
            const id = Number(btn.dataset.bankId);
            if (action === 'delete') deleteBankAction(id);
            else if (action === 'reset') resetBankAction(id);
            else if (action === 'startAll') startBankQuiz(id, 'all');
            else if (action === 'startWrong') startBankQuiz(id, 'wrong');
            else if (action === 'startPending') startBankQuiz(id, 'pending');
            else if (action === 'viewAll') viewBankQuestions(id, 'all');
            else if (action === 'viewCorrect') viewBankQuestions(id, 'correct');
            else if (action === 'viewWrong') viewBankQuestions(id, 'wrong');
            else if (action === 'viewPending') viewBankQuestions(id, 'pending');
        });
    }

    bindClick('bankDetailBackBtn', () => closeBankDetail());
    bindClick('startQuizBtn', () => startQuizGame());
    bindClick('resetImportBtn', () => resetImportData());
    bindClick('saveToBankBtn', () => saveToBankAction());

    // 答题页
    const quizBackBtn = $('quizBackBtn');
    if (quizBackBtn) {
        quizBackBtn.addEventListener('click', () => confirmExitQuiz());
        quizBackBtn.addEventListener('keydown', (e) => handleAccessibleAction(e, confirmExitQuiz, quizBackBtn));
    }

    // 题目序号点击
    const progressText = $('progressText');
    if (progressText) {
        progressText.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleQuestionMap();
        });
        progressText.addEventListener('keydown', (e) => handleAccessibleAction(e, toggleQuestionMap, progressText));
    }

    // 点击其他区域关闭弹窗
    document.addEventListener('click', (e) => {
        const popup = $('questionMapPopup');
        if (popup?.classList.contains('active') && !popup.contains(e.target) && e.target.id !== 'progressText') {
            popup.classList.remove('active');
        }
    });

    // 题目导航弹窗中的题目点击
    const questionMapGrid = $('questionMapGrid');
    if (questionMapGrid) {
        questionMapGrid.addEventListener('click', (e) => {
            const dot = e.target.closest('.qmap-dot');
            if (!dot) return;
            const idx = Number(dot.dataset.index);
            jumpToQuestion(idx);
        });
    }

    const prevBtn = $('prevBtn');
    if (prevBtn) {
        prevBtn.addEventListener('click', () => prevQ());
    }

    const nextBtn = $('nextBtn');
    if (nextBtn) {
        nextBtn.addEventListener('click', () => nextQ());
    }

    // 题目选择弹窗
    const closeQuestionSelectBtn = $('closeQuestionSelectBtn');
    if (closeQuestionSelectBtn) {
        closeQuestionSelectBtn.addEventListener('click', () => closeQuestionSelectModal());
    }

    const questionSelectOverlay = $('questionSelectOverlay');
    if (questionSelectOverlay) {
        questionSelectOverlay.addEventListener('click', (e) => {
            if (e.target === questionSelectOverlay) closeQuestionSelectModal();
        });
    }

    const selectAllQuestions = $('selectAllQuestions');
    if (selectAllQuestions) {
        selectAllQuestions.addEventListener('change', () => {
            document.querySelectorAll('.qs-check').forEach(cb => {
                cb.checked = selectAllQuestions.checked;
            });
            updateSelectCount();
        });
    }

    const questionSelectList = $('questionSelectList');
    if (questionSelectList) {
        questionSelectList.addEventListener('change', (e) => {
            if (e.target.classList.contains('qs-check')) {
                const all = document.querySelectorAll('.qs-check');
                const checked = document.querySelectorAll('.qs-check:checked');
                $('selectAllQuestions').checked = all.length === checked.length;
                updateSelectCount();
            }
        });
    }

    bindClick('confirmSaveBankBtn', () => confirmSaveToBank());

    // 清空题库
    bindClick('clearAllBanksBtn', () => clearAllBanksAction());

    // AI 聊天
    const aiChatSendBtn = $('aiChatSendBtn');
    if (aiChatSendBtn) {
        aiChatSendBtn.addEventListener('click', () => sendAIChatMessage());
    }

    const aiChatInput = $('aiChatInput');
    if (aiChatInput) {
        aiChatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendAIChatMessage();
            }
        });
    }

    const aiChatAnalyzeBtn = $('aiChatAnalyzeBtn');
    if (aiChatAnalyzeBtn) {
        aiChatAnalyzeBtn.addEventListener('click', () => askCurrentQuestionAnalysis());
    }

    bindClick('aiChatCloseBtn', () => toggleAIChatPanel(false));

    // AI 配置
    const aiConfigSelect = $('aiConfigSelect');
    if (aiConfigSelect) {
        aiConfigSelect.addEventListener('change', () => switchConfig());
    }
    bindClick('aiConfigAdd', () => addConfig());
    bindClick('aiConfigDelete', () => deleteConfig());
    bindClick('aiConfigRename', () => renameConfig());

    // AI 设置
    const aiToggle = $('aiToggle');
    if (aiToggle) {
        aiToggle.addEventListener('change', () => toggleAI());
    }

    const aiApiUrl = $('aiApiUrl');
    if (aiApiUrl) {
        aiApiUrl.addEventListener('input', () => saveAISettings());
    }

    const aiApiToken = $('aiApiToken');
    if (aiApiToken) {
        aiApiToken.addEventListener('input', () => saveAISettings());
    }

    const aiModel = $('aiModel');
    if (aiModel) {
        aiModel.addEventListener('input', () => saveAISettings());
        aiModel.addEventListener('focus', () => hideModelDropdown());
    }

    const aiModelDropdownToggle = $('aiModelDropdownToggle');
    if (aiModelDropdownToggle) {
        aiModelDropdownToggle.addEventListener('click', async (event) => {
            event.stopPropagation();
            await loadAvailableModels();
        });
    }

    const aiModelDropdown = $('aiModelDropdown');
    if (aiModelDropdown) {
        aiModelDropdown.addEventListener('click', (event) => {
            event.stopPropagation();
            handleModelDropdownSelect(event);
        });
    }

    document.addEventListener('click', (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;
        if (target.closest('#aiModelDropdown') || target.closest('#aiModelDropdownToggle')) return;
        hideModelDropdown();
    });

    const testApiBtn = $('testApiBtn');
    if (testApiBtn) {
        testApiBtn.addEventListener('click', () => testAPIConnection());
    }

    // 自定义 Prompt 事件绑定
    const aiAnalysisPrompt = $('aiAnalysisPrompt');
    if (aiAnalysisPrompt) {
        aiAnalysisPrompt.addEventListener('input', () => saveCustomPrompts());
    }

    const aiGeneratePrompt = $('aiGeneratePrompt');
    if (aiGeneratePrompt) {
        aiGeneratePrompt.addEventListener('input', () => saveCustomPrompts());
    }

    const resetAnalysisPromptBtn = $('resetAnalysisPromptBtn');
    if (resetAnalysisPromptBtn) {
        resetAnalysisPromptBtn.addEventListener('click', () => {
            const el = $('aiAnalysisPrompt');
            if (el) { el.value = DEFAULT_ANALYSIS_PROMPT; saveCustomPrompts(); }
        });
    }

    const resetGeneratePromptBtn = $('resetGeneratePromptBtn');
    if (resetGeneratePromptBtn) {
        resetGeneratePromptBtn.addEventListener('click', () => {
            const el = $('aiGeneratePrompt');
            if (el) { el.value = DEFAULT_GENERATE_PROMPT; saveCustomPrompts(); }
        });
    }

    // 快捷键设置
    const hotkeyToggle = $('hotkeyToggle');
    if (hotkeyToggle) {
        hotkeyToggle.addEventListener('change', () => toggleHotkeys());
    }

    // AI 出题模态框
    const closeAIModalBtn = $('closeAIModalBtn');
    if (closeAIModalBtn) {
        closeAIModalBtn.addEventListener('click', () => closeAIModal());
        closeAIModalBtn.addEventListener('keydown', (e) => handleAccessibleAction(e, closeAIModal, closeAIModalBtn));
    }

    bindClick('aiGenerateBtn', () => generateAIQuestions());
    bindClick('exportAIQuestionsBtn', () => exportAIQuestions());
    bindClick('importAIQuestionsBtn', () => importAIQuestions());

    // AI 历史记录列表（事件委托）
    const aiHistoryList = $('aiHistoryList');
    if (aiHistoryList) {
        aiHistoryList.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-history-action]');
            if (!btn) return;
            const histAction = btn.dataset.historyAction;
            const id = Number(btn.dataset.historyId);
            handleAIHistoryAction(histAction, id);
        });
    }

    // === 以下为补充的遗漏绑定 ===

    // 打开 AI 出题入口
    const openAIModalBtn = $('openAIModalBtn');
    if (openAIModalBtn) {
        openAIModalBtn.addEventListener('click', () => openAIModal());
    }

    // AI 历史记录展开/折叠
    const aiHistoryToggleBtn = $('aiHistoryToggleBtn');
    if (aiHistoryToggleBtn) {
        aiHistoryToggleBtn.addEventListener('click', () => toggleAIHistory());
    }

    // 清空 AI 历史
    const clearHistoryBtn = $('clearHistoryBtn');
    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener('click', () => clearAIHistory());
    }

    // 关闭设置面板
    const closeSettingsBtn = $('closeSettingsBtn');
    if (closeSettingsBtn) {
        closeSettingsBtn.addEventListener('click', () => closeSettings());
        closeSettingsBtn.addEventListener('keydown', (e) => handleAccessibleAction(e, closeSettings, closeSettingsBtn));
    }

    // 结果页返回首页
    bindClick('resultBackBtn', () => resetImportData());

    // 关闭示例模态框
    const closeExampleModalBtn = $('closeExampleModalBtn');
    if (closeExampleModalBtn) {
        closeExampleModalBtn.addEventListener('click', () => closeExampleModal());
        closeExampleModalBtn.addEventListener('keydown', (e) => handleAccessibleAction(e, closeExampleModal, closeExampleModalBtn));
    }

    // 快捷键录制和重置（事件委托）
    const settingsContent = document.querySelector('.settings-content');
    if (settingsContent) {
        settingsContent.addEventListener('click', (e) => {
            const target = e.target.closest('[data-action]');
            if (!target) return;
            const action = target.dataset.action;
            const hotkey = target.dataset.hotkey;
            if (action === 'startRecordHotkey' && hotkey) {
                // startRecordHotkey 需要 (inputEl, action)
                const inputEl = target.tagName === 'INPUT' ? target : $('hk_' + hotkey);
                if (inputEl) startRecordHotkey(inputEl, hotkey);
            } else if (action === 'resetHotkey' && hotkey) {
                resetHotkey(hotkey, target.dataset.default);
            }
        });
    }
}
