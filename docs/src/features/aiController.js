// AI 操作控制器 - 从 main.js 提取的 AI 编排逻辑

import { showAlert, showDialog, confirmAction } from '../components/Dialog.js';
import { downloadFile } from '../utils/helpers.js';
import {
    getAIGeneratedQuestions,
    getAIHistory,
    setAIHistory,
    closeAIModal,
    viewHistoryQuestions,
    copyHistoryQuestions,
    exportHistoryQuestions
} from './ai.js';
import { exportQuestions } from '../core/dataProcessor.js';
import { finishParsing } from './quizController.js';
import { exampleModal } from '../state.js';

// 导出 AI 出题结果
export async function exportAIQuestions() {
    const questions = getAIGeneratedQuestions();
    await exportQuestions(questions, `ai_${Date.now()}`, {
        showDialog,
        showAlert,
        downloadFile
    });
}

// 导入 AI 出题结果
export function importAIQuestions() {
    const questions = getAIGeneratedQuestions();
    if (questions.length === 0) {
        showAlert('没有可导入的题目', '⚠️');
        return;
    }
    finishParsing(questions);
    closeAIModal();
    showAlert(`✅ 已导入 ${questions.length} 道题目，可以开始答题了！`, '🎉');
}

// 导入历史记录中的题目
export function importHistoryQuestions(id) {
    const history = getAIHistory();
    const item = history.find(h => h.id === id);
    if (!item) {
        showAlert('历史记录不存在', '⚠️');
        return;
    }

    finishParsing(item.questions);
    showAlert(`✅ 已导入 ${item.questionCount} 道题目，可以开始答题了！`, '🎉');
}

// 删除历史记录
export async function deleteHistoryItem(id) {
    const confirmed = await confirmAction({
        title: '警告',
        message: '确定要删除这条历史记录吗？',
        confirmText: '确定',
        danger: true
    });
    if (!confirmed) return;

    const history = getAIHistory();
    const newHistory = history.filter(h => h.id !== id);
    setAIHistory(newHistory);
    await showAlert('✅ 已删除', '🗑️');
}

// 清空 AI 历史
export async function clearAIHistory() {
    const history = getAIHistory();
    if (history.length === 0) return;

    const confirmed = await confirmAction({
        title: '警告',
        message: `确定要清空所有 ${history.length} 条历史记录吗？此操作不可恢复。`,
        confirmText: '确定',
        danger: true
    });
    if (!confirmed) return;

    setAIHistory([]);
    await showAlert('✅ 已清空所有历史记录', '🗑️');
}

// AI 历史列表事件处理
export function handleAIHistoryAction(histAction, id) {
    if (histAction === 'import') importHistoryQuestions(id);
    else if (histAction === 'view') viewHistoryQuestions(id);
    else if (histAction === 'delete') deleteHistoryItem(id);
    else if (histAction === 'copy') copyHistoryQuestions(id);
    else if (histAction === 'export') {
        exportHistoryQuestions(id, (qs, name) => exportQuestions(qs, name, { showDialog, showAlert, downloadFile }));
    }
    else if (histAction === 'importAndClose') {
        importHistoryQuestions(id);
        exampleModal.close();
    }
}
