// 应用入口文件 - 初始化和模块组装

import { $ } from './utils/dom.js';
import { APP_CONFIG } from './config/app.config.js';
import { settingsSidebar, aiModal, exampleModal, setHasInitialized, hasInitialized } from './state.js';

// 初始化函数
import { initDialogSystem, closeDialog } from './components/Dialog.js';
import { loadCustomFormats, renderPresets, closeExampleModal } from './features/formatManager.js';
import { loadHotkeySettings, initHotkeySystem, showHotkeyHint, cancelRecording } from './features/hotkeys.js';
import { loadAISettings, closeAIModal, setSetTabCallback } from './features/ai.js';
import { loadQuestionBanks } from './features/questionBank.js';
import { initFileUpload, setFinishParsingCallback } from './features/fileImport.js';
import { initAIAnalysisWidget, toggleAIChatPanel, activateAIChatSessionForQuestion, updateAIChatPanelPosition } from './features/aiChat.js';
import { initDragFunctionality } from './utils/drag.js';
import { setTab, showView, setOnBankTabCallback } from './features/viewManager.js';
import { getCurrentIndex, getQuestions, getIsReviewMode } from './features/quiz.js';

// 控制器
import { finishParsing, showResultView, nextQ, prevQ, setOnExitToBankCallback, setOnResetCallback } from './features/quizController.js';
import { refreshBankList } from './features/bankController.js';
import { initEventListeners, openSettings, closeSettings } from './events.js';

// 初始化应用
function init() {
    if (hasInitialized) return;
    setHasInitialized(true);

    console.log(`${APP_CONFIG.name} v${APP_CONFIG.version} 初始化中...`);

    // 注册回调
    setFinishParsingCallback(finishParsing);
    setSetTabCallback(setTab);
    setOnExitToBankCallback(() => {
        setTab('bank');
        refreshBankList();
    });
    setOnBankTabCallback(() => {
        refreshBankList();
    });
    setOnResetCallback(() => {
        refreshBankList();
    });

    // 初始化各个系统
    initDialogSystem();
    loadCustomFormats();
    renderPresets();
    loadHotkeySettings();
    loadAISettings();
    loadQuestionBanks();
    initFileUpload();
    initAIAnalysisWidget();
    initDragFunctionality({
        onToggleAIChatPanel: toggleAIChatPanel,
        onUpdateAIChatPanelPosition: updateAIChatPanelPosition,
        onOpenSettings: openSettings
    });

    // 初始化快捷键系统
    initHotkeySystem({
        onEscape: () => {
            if (closeDialog()) return true;

            if (aiModal.modal?.classList.contains('active')) {
                closeAIModal();
                return true;
            }
            if (settingsSidebar.isOpen()) {
                closeSettings();
                return true;
            }
            if (exampleModal.modal?.classList.contains('active')) {
                closeExampleModal();
                return true;
            }
            const aiChatPanel = $('aiChatPanel');
            if (aiChatPanel?.classList.contains('active')) {
                toggleAIChatPanel(false);
                return true;
            }
            return false;
        },
        hasModalOpen: () => {
            const dialogOverlay = $('dialogOverlay');

            if (dialogOverlay?.classList.contains('active')) return true;
            if (settingsSidebar.isOpen()) return true;
            if (aiModal.modal?.classList.contains('active')) return true;
            if (exampleModal.modal?.classList.contains('active')) return true;
            return false;
        },
        isQuizActive: () => {
            const quizView = $('quizView');
            return quizView?.classList.contains('active') || false;
        },
        triggerOption: (index) => {
            const options = document.querySelectorAll('#optionsContainer .option-item');
            if (index >= options.length) return;
            if (options[index].classList.contains('disabled')) return;
            const labels = ['A', 'B', 'C', 'D'];
            showHotkeyHint('选择 ' + (labels[index] || (index + 1)));
            options[index].click();
        },
        prevQuestion: prevQ,
        nextQuestion: () => {
            const isLast = getCurrentIndex() === getQuestions().length - 1;
            if (getIsReviewMode()) {
                showResultView();
                showHotkeyHint('📊 返回结果');
            } else if (isLast) {
                showResultView();
                showHotkeyHint('📊 提交');
            } else {
                nextQ();
                showHotkeyHint('➡ 下一题');
            }
        }
    });

    // 初始化事件监听
    initEventListeners();

    // 初始化题库列表
    refreshBankList();

    console.log('应用初始化完成');
}

// 页面加载完成后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
