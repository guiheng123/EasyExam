// 视图管理模块 - 界面切换和面板显示

import { $, $$ } from '../utils/dom.js';

let onBankTabCallback = null;
export function setOnBankTabCallback(cb) { onBankTabCallback = cb; }

// tab 顺序与 HTML 中 .tab-btn 排列一致
const TAB_ORDER = ['file', 'paste', 'ai', 'bank'];

// 界面切换
export function setTab(mode) {
    const btns = $$('.tab-group .tab-btn');
    const areas = {
        file: $('area-file'),
        paste: $('area-paste'),
        ai: $('area-ai'),
        bank: $('area-bank')
    };

    btns.forEach(b => b.classList.remove('active'));
    Object.values(areas).forEach(area => area && area.classList.remove('active'));

    const modeIndex = TAB_ORDER.indexOf(mode);
    if (modeIndex !== -1 && btns[modeIndex]) {
        btns[modeIndex].classList.add('active');
    }
    if (areas[mode]) {
        areas[mode].classList.add('active');
    }

    if (mode === 'bank' && onBankTabCallback) onBankTabCallback();
    hideErrors();
}

export function setSubTab(mode) {
    document.querySelectorAll('#area-paste .sub-tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('#area-paste > .input-area').forEach(a => a.classList.remove('active'));
    const tabs = document.querySelectorAll('#area-paste .sub-tab-btn');
    if (mode === 'preset') {
        if (tabs[0]) tabs[0].classList.add('active');
        const subPreset = $('sub-preset');
        if (subPreset) subPreset.classList.add('active');
    } else {
        if (tabs[1]) tabs[1].classList.add('active');
        const subCustom = $('sub-custom');
        if (subCustom) subCustom.classList.add('active');
    }
    hideErrors();
}

export function setCustomMode(mode) {
    const modeButtons = document.querySelectorAll('.mode-btn');
    modeButtons.forEach(b => b.classList.remove('active'));

    const activeBtn = document.querySelector(`.mode-btn:nth-child(${mode === 'simple' ? 1 : 2})`);
    if (activeBtn) activeBtn.classList.add('active');

    const simpleModePanel = document.querySelector('.custom-simple-mode');
    const advancedModePanel = document.querySelector('.custom-advanced-mode');
    if (simpleModePanel) simpleModePanel.classList.toggle('active', mode === 'simple');
    if (advancedModePanel) advancedModePanel.classList.toggle('active', mode === 'advanced');
}

// 显示视图
export function showView(viewId) {
    document.querySelectorAll('.view-section').forEach(v => v.classList.remove('active'));
    const view = $(viewId);
    if (view) view.classList.add('active');
}

// 显示准备面板
export function showReadyPanel(questionCount) {
    const qCount = $('qCount');
    const setupPanel = $('setup-panel');
    const readyPanel = $('ready-panel');

    if (!qCount || !setupPanel || !readyPanel) {
        console.warn('显示准备面板失败：缺少必要 DOM 节点');
        return false;
    }

    qCount.textContent = questionCount;
    setupPanel.style.display = 'none';
    readyPanel.style.display = 'block';
    return true;
}

// 重置到设置面板
export function resetToSetupPanel() {
    const setupPanel = $('setup-panel');
    const readyPanel = $('ready-panel');
    const fileInput = $('fileInput');

    if (!setupPanel || !readyPanel || !fileInput) {
        console.warn('重置导入面板失败：缺少必要 DOM 节点');
        return false;
    }

    setupPanel.style.display = 'block';
    readyPanel.style.display = 'none';
    fileInput.value = '';
    document.querySelectorAll('.preset-card').forEach(c => c.classList.remove('selected'));
    hideErrors();
    return true;
}

// 错误提示
export function hideErrors() {
    const fileError = $('fileError');
    const pasteError = $('pasteError');
    if (fileError) fileError.style.display = 'none';
    if (pasteError) pasteError.style.display = 'none';
}

export function showError(msg, target) {
    const el = $(target === 'paste' ? 'pasteError' : 'fileError');
    if (el) {
        el.textContent = msg;
        el.style.display = 'block';
    }
}
