// 题库操作控制器 - 从 main.js 提取的题库编排逻辑

import { $, escapeHtml } from '../utils/dom.js';
import { showAlert, confirmAction, showPrompt } from '../components/Dialog.js';
import {
    loadQuestionBanks,
    addQuestionBank,
    deleteQuestionBank,
    clearAllBanks,
    updateBankResults,
    resetBankResults,
    getQuestionBanks,
    getCorrectQuestions,
    getWrongQuestions,
    getPendingQuestions,
    renderBankList,
    renderQuestionDetail
} from './questionBank.js';
import { setQuestions, getQuestions, getUserAnswers } from './quiz.js';
import { showReadyPanel, setTab } from './viewManager.js';
import { activeBankId, setActiveBankId, updateSaveBankBtnVisibility } from '../state.js';

// 保存到题库
export function saveToBankAction() {
    const qs = getQuestions();
    if (!qs || !qs.length) {
        showAlert('没有可保存的题目', '⚠️');
        return;
    }
    openQuestionSelectModal(qs);
}

export function openQuestionSelectModal(qs) {
    const overlay = $('questionSelectOverlay');
    const list = $('questionSelectList');
    const selectAll = $('selectAllQuestions');
    const bankNameInput = $('bankNameInput');
    const bankNameSelect = $('bankNameSelect');
    if (!overlay || !list || !selectAll || !bankNameInput) {
        console.warn('打开题库保存弹窗失败：缺少必要 DOM 节点');
        return false;
    }

    // 填充已有题库下拉列表
    if (bankNameSelect) {
        const existingBanks = getQuestionBanks();
        bankNameSelect.innerHTML = '<option value="">— 选择已有题库 —</option>';
        existingBanks.forEach(bank => {
            const opt = document.createElement('option');
            opt.value = bank.name;
            opt.textContent = bank.name + '（' + bank.questions.length + ' 题）';
            bankNameSelect.appendChild(opt);
        });
        bankNameSelect.value = '';
        bankNameSelect.onchange = () => {
            if (bankNameSelect.value) bankNameInput.value = bankNameSelect.value;
        };
    }

    bankNameInput.value = '题库 ' + new Date().toLocaleDateString();
    selectAll.checked = true;

    const fragment = document.createDocumentFragment();
    qs.forEach((q, i) => {
        const item = document.createElement('label');
        item.className = 'qs-item';
        item.innerHTML =
            `<input type="checkbox" class="qs-check" data-index="${i}" checked>` +
            `<span class="qs-item-num">${i + 1}</span>` +
            `<span class="qs-item-text">${escapeHtml(q.question)}</span>`;
        fragment.appendChild(item);
    });
    list.replaceChildren(fragment);
    updateSelectCount();
    overlay.classList.add('active');
    return true;
}

export function updateSelectCount() {
    const checks = document.querySelectorAll('.qs-check');
    const checked = document.querySelectorAll('.qs-check:checked');
    const selectCount = $('selectCount');
    if (!selectCount) return;
    selectCount.textContent = `已选 ${checked.length}/${checks.length} 题`;
}

export async function confirmSaveToBank() {
    const qs = getQuestions();
    const checks = document.querySelectorAll('.qs-check:checked');
    const bankNameInput = $('bankNameInput');
    if (!checks.length) {
        await showAlert('请至少选择一道题目', '⚠️');
        return;
    }
    if (!Array.isArray(qs) || !qs.length || !bankNameInput) {
        await showAlert('保存题库失败，当前数据或界面状态无效', '⚠️');
        return;
    }

    const selectedQs = [];
    const selectedAnswerIndices = [];
    checks.forEach(cb => {
        const idx = Number(cb.dataset.index);
        if (!Number.isInteger(idx) || idx < 0 || idx >= qs.length || !qs[idx]) return;
        selectedQs.push(qs[idx]);
        selectedAnswerIndices.push(idx);
    });

    if (!selectedQs.length) {
        await showAlert('未找到有效题目，请重新选择', '⚠️');
        return;
    }

    let bankName = bankNameInput.value.trim();
    if (!bankName) bankName = '题库 ' + new Date().toLocaleDateString();

    const result = addQuestionBank(bankName, selectedQs);
    if (!result.bank) {
        await showAlert('保存失败：没有可写入的有效题目', '⚠️');
        return;
    }
    if (!result.saved) {
        await showAlert('保存失败：本地存储空间不足或浏览器限制了存储', '⚠️');
        return;
    }

    setActiveBankId(result.bank.id);

    const answers = getUserAnswers();
    if (answers && answers.some(a => a !== null && a !== undefined)) {
        const selectedAnswers = selectedAnswerIndices.map(i => answers[i]);
        const resultSaved = updateBankResults(activeBankId, selectedAnswers, selectedQs);
        if (!resultSaved) {
            await showAlert('题库已创建，但答题记录保存失败', '⚠️');
        }
    }

    updateSaveBankBtnVisibility();
    closeQuestionSelectModal();

    if (result.merged) {
        await showAlert('已合并到题库「' + bankName + '」，新增 ' + result.added + ' 题，共 ' + result.total + ' 题', '📚');
    } else {
        await showAlert('已保存到题库「' + bankName + '」，共 ' + result.total + ' 题', '📚');
    }
}

export function closeQuestionSelectModal() {
    const overlay = $('questionSelectOverlay');
    if (overlay) overlay.classList.remove('active');
}

export function refreshBankList() {
    renderBankList($('bankListContainer'));
    closeBankDetail();
}

export function viewBankQuestions(bankId, mode) {
    const banks = getQuestionBanks();
    const bank = banks.find(b => b.id === bankId);
    if (!bank) return false;

    let qs, title;
    if (mode === 'correct') {
        qs = getCorrectQuestions(bank);
        title = '✅ 已完成题目';
    } else if (mode === 'wrong') {
        qs = getWrongQuestions(bank);
        title = '❌ 错题';
    } else if (mode === 'pending') {
        qs = getPendingQuestions(bank);
        title = '⏳ 未完成题目';
    } else {
        qs = bank.questions.map((q, i) => {
            const r = bank.results[i];
            return { ...q, _bankIndex: i, _userAnswer: r ? r.userAnswer : undefined };
        });
        title = '📝 全部题目';
    }

    const detailPanel = $('bankDetailPanel');
    const listContainer = $('bankListContainer');
    const headerEl = document.querySelector('.bank-panel-header');
    const content = $('bankDetailContent');

    if (!detailPanel || !listContainer || !content) {
        console.warn('查看题库详情失败：缺少必要 DOM 节点');
        return false;
    }

    content.innerHTML = renderQuestionDetail(qs, bank.name + ' - ' + title, bank);
    listContainer.style.display = 'none';
    if (headerEl) headerEl.style.display = 'none';
    detailPanel.style.display = 'block';
    return true;
}

export function closeBankDetail() {
    const detailPanel = $('bankDetailPanel');
    const listContainer = $('bankListContainer');
    const headerEl = document.querySelector('.bank-panel-header');
    if (detailPanel) detailPanel.style.display = 'none';
    if (listContainer) listContainer.style.display = '';
    if (headerEl) headerEl.style.display = '';
}

export async function deleteBankAction(id) {
    const confirmed = await confirmAction({
        title: '删除题库',
        message: '确定要删除这个题库吗？此操作不可恢复。',
        confirmText: '确定删除',
        danger: true
    });
    if (!confirmed) return;
    const deleted = deleteQuestionBank(id);
    if (!deleted) {
        await showAlert('删除失败：本地存储写入失败', '⚠️');
        return;
    }
    refreshBankList();
    await showAlert('✅ 已删除题库', '🗑️');
}

export async function resetBankAction(id) {
    const confirmed = await confirmAction({
        icon: '🔄',
        title: '重置记录',
        message: '确定要重置该题库的答题记录吗？题目不会被删除。',
        confirmText: '确定重置'
    });
    if (!confirmed) return;
    const reset = resetBankResults(id);
    if (!reset) {
        await showAlert('重置失败：本地存储写入失败', '⚠️');
        return;
    }
    refreshBankList();
    await showAlert('✅ 已重置答题记录', '🔄');
}

export async function clearAllBanksAction() {
    const banks = getQuestionBanks();
    if (banks.length === 0) {
        await showAlert('暂无题库', '📚');
        return;
    }
    const confirmed = await confirmAction({
        title: '清空全部题库',
        message: '确定要清空所有 ' + banks.length + ' 个题库吗？此操作不可恢复。',
        confirmText: '确定清空',
        danger: true
    });
    if (!confirmed) return;
    const cleared = clearAllBanks();
    if (!cleared) {
        await showAlert('清空失败：本地存储写入失败', '⚠️');
        return;
    }
    refreshBankList();
    await showAlert('✅ 已清空所有题库', '🗑️');
}

export async function exportWrongToBank() {
    const qs = getQuestions();
    const answers = getUserAnswers();
    if (!qs.length || !answers.length) return;

    const wrongQs = qs.filter((q, i) => answers[i] !== null && answers[i] !== q.answer);
    if (!wrongQs.length) {
        await showAlert('没有错题可导入', '✅');
        return;
    }

    const bankName = await showPrompt({
        icon: '❌',
        title: '导入错题到题库',
        message: `共 ${wrongQs.length} 道错题，同名题库将自动合并`,
        placeholder: '输入题库名称',
        defaultValue: '错题集',
        confirmText: '导入'
    });
    if (!bankName) return;

    const result = addQuestionBank(bankName, wrongQs);
    if (!result.bank || !result.saved) {
        await showAlert('导入失败：存储空间不足或无有效题目', '⚠️');
        return;
    }
    if (result.merged) {
        await showAlert(`已合并到「${bankName}」，新增 ${result.added} 题，共 ${result.total} 题`, '📚');
    } else {
        await showAlert(`已导入到「${bankName}」，共 ${result.total} 题`, '📚');
    }
}

export function startBankQuiz(bankId, mode) {
    const banks = getQuestionBanks();
    const bank = banks.find(b => b.id === bankId);
    if (!bank) {
        showAlert('题库不存在', '⚠️');
        return;
    }

    let qs;
    if (mode === 'wrong') {
        qs = getWrongQuestions(bank);
        if (!qs.length) { showAlert('没有错题', '✅'); return; }
    } else if (mode === 'pending') {
        qs = getPendingQuestions(bank);
        if (!qs.length) { showAlert('没有未完成的题目', '✅'); return; }
    } else {
        qs = bank.questions.map((q, i) => ({ ...q, _bankIndex: i }));
    }

    setActiveBankId(bankId);
    setQuestions(qs);
    showReadyPanel(qs.length);
    updateSaveBankBtnVisibility();
}
