// 格式管理模块 - 预设渲染、自定义格式的增删改查、示例模态框

import { $, escapeHtml } from '../utils/dom.js';
import { safeJsonParse, safeLocalStorageGet, safeLocalStorageSet } from '../core/storage.js';
import { PRESET_FORMATS } from '../config/presets.js';
import { setSubTab, setCustomMode } from './viewManager.js';
import { showAlert, showDialog } from '../components/Dialog.js';

let selectedPreset = null;
let currentCustomMode = 'simple';
let editingCustomFormatId = null;

// 获取自定义格式列表
function getCustomFormats() {
    try {
        const data = safeJsonParse(safeLocalStorageGet('customFormats', '[]'), []);
        return Array.isArray(data) ? data : [];
    } catch (e) {
        console.warn('读取自定义格式失败，已回退为空列表:', e);
        return [];
    }
}

// 获取所有格式（预设 + 自定义）
export function getAllFormats() {
    return [...PRESET_FORMATS, ...getCustomFormats()];
}

// 获取选中的预设 ID
export function getSelectedPreset() {
    return selectedPreset;
}

export function getCurrentCustomMode() {
    return currentCustomMode;
}

export function getEditingCustomFormatId() {
    return editingCustomFormatId;
}

export function setEditingCustomFormatId(id) {
    editingCustomFormatId = id;
}

// 渲染预设列表
export function renderPresets() {
    const container = $('presetList');
    if (!container) return;

    container.innerHTML = '';
    PRESET_FORMATS.forEach(preset => {
        const card = document.createElement('div');
        card.className = 'preset-card';
        card.dataset.presetId = preset.id;
        card.innerHTML = `
            <div class="preset-card-title">${preset.name}</div>
            <div class="preset-card-desc">${preset.desc}</div>
            <div class="preset-card-example-btn" data-action="showExample" data-preset-id="${preset.id}">📖 查看例题</div>
        `;
        container.appendChild(card);
    });

    const customFormats = getCustomFormats();
    customFormats.forEach(format => {
        const card = document.createElement('div');
        card.className = 'preset-card';
        card.style.borderColor = '#d1fae5';
        card.dataset.presetId = format.id;
        card.innerHTML = `
            <div class="preset-card-title">✨ ${escapeHtml(format.name)}</div>
            <div class="preset-card-desc">自定义格式 ${format.mode === 'advanced' ? '(高级)' : ''}</div>
        `;
        container.appendChild(card);
    });

    // 事件委托：点击预设卡片
    container.onclick = (e) => {
        const exampleBtn = e.target.closest('[data-action="showExample"]');
        if (exampleBtn) {
            showExample(exampleBtn.dataset.presetId, e);
            return;
        }
        const card = e.target.closest('.preset-card[data-preset-id]');
        if (card) selectPreset(card.dataset.presetId);
    };
}

export function selectPreset(id) {
    selectedPreset = id;
    const cards = document.querySelectorAll('.preset-card');
    cards.forEach(c => c.classList.remove('selected'));
    const allFormats = [...PRESET_FORMATS, ...getCustomFormats()];
    const idx = allFormats.findIndex(f => f.id === id);
    if (idx >= 0 && cards[idx]) cards[idx].classList.add('selected');
}

// 加载自定义格式列表到 UI
export function loadCustomFormats() {
    const formats = getCustomFormats();
    const container = $('savedFormatsList');
    if (!container) return;

    container.innerHTML = '';
    if (!formats.length) {
        container.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-secondary);font-size:13px;">暂无保存的格式</div>';
        return;
    }
    formats.forEach(format => {
        const item = document.createElement('div');
        item.className = 'saved-format-item';
        const safeId = escapeHtml(String(format.id));
        item.innerHTML = `
            <div class="saved-format-info">
                <div class="saved-format-name">${escapeHtml(format.name)}</div>
                <div class="saved-format-meta">${format.mode === 'advanced' ? '高级模式' : '简单模式'} · ${new Date(format.createdAt).toLocaleDateString()}</div>
            </div>
            <div class="saved-format-actions">
                <button class="icon-btn primary" data-format-action="use" data-format-id="${safeId}">使用</button>
                <button class="icon-btn" data-format-action="edit" data-format-id="${safeId}">编辑</button>
                <button class="icon-btn" data-format-action="delete" data-format-id="${safeId}">删除</button>
            </div>
        `;
        container.appendChild(item);
    });

    // 事件委托
    container.onclick = (e) => {
        const btn = e.target.closest('[data-format-action]');
        if (!btn) return;
        const id = btn.dataset.formatId;
        const action = btn.dataset.formatAction;
        if (action === 'use') useCustomFormat(id);
        else if (action === 'edit') editCustomFormat(id);
        else if (action === 'delete') deleteCustomFormat(id);
    };
}

// 示例模态框
export function showExample(presetId, event) {
    if (event) event.stopPropagation();
    const preset = PRESET_FORMATS.find(p => p.id === presetId);
    if (!preset || !preset.example) return;
    $('modalTitle').textContent = `${preset.name} - 格式示例`;
    const safePresetId = escapeHtml(presetId);
    const modalBody = $('modalBody');
    modalBody.innerHTML = `
        <div class="example-section">
            <div class="example-title">📝 示例题目</div>
            <div class="example-code">${preset.example.replace(/\\n/g, '\n')}</div>
            <button class="copy-example-btn" data-action="copyExample" data-preset-id="${safePresetId}">📋 复制示例到粘贴框</button>
        </div>
        <div class="example-section">
            <div class="example-title">💡 格式说明</div>
            <div style="font-size:13px;line-height:1.8;color:var(--text-secondary);">${getFormatDescription(preset)}</div>
        </div>
    `;
    // 事件委托
    modalBody.onclick = (e) => {
        const btn = e.target.closest('[data-action="copyExample"]');
        if (btn) copyExample(btn.dataset.presetId);
    };
    $('exampleModal').classList.add('active');
}

function getFormatDescription(preset) {
    const c = preset.config, lines = [];
    if (c.questionMarkers && c.questionMarkers.length) lines.push(`• 题目标记: ${c.questionMarkers.join(' 或 ')}`);
    if (c.questionPattern) lines.push(`• 题目模式: 正则匹配`);
    if (c.optionPattern) lines.push(`• 选项格式: 自动识别 A-D 开头`);
    if (c.answerMarkers) lines.push(`• 答案标记: ${c.answerMarkers.join(' 或 ')}`);
    if (c.explanationMarkers && c.explanationMarkers.length) lines.push(`• 解析标记: ${c.explanationMarkers.join(' 或 ')} (可选)`);
    if (c.separators) lines.push(`• 题目分隔: ${c.separators.join(' 或 ')}`);
    return lines.join('<br>');
}

export function copyExample(presetId) {
    const preset = PRESET_FORMATS.find(p => p.id === presetId);
    if (!preset) return;
    const text = preset.example.replace(/\\n/g, '\n');
    navigator.clipboard.writeText(text).then(() => {
        closeExampleModal();
        selectPreset(presetId);
        $('presetInput').value = text;
        $('presetInput').focus();
    }).catch(() => {
        $('presetInput').value = text;
        closeExampleModal();
        selectPreset(presetId);
    });
}

export function closeExampleModal() {
    const modal = $('exampleModal');
    if (modal) modal.classList.remove('active');
}

// 模板填充
export function fillTemplate(field, value) {
    const map = {
        question: 'simpleQuestionMarker',
        option: 'simpleOptionMarker',
        answer: 'simpleAnswerMarker',
        explanation: 'simpleExplanationMarker',
        separator: 'simpleSeparator'
    };
    if (map[field]) {
        $(map[field]).value = (value === '空行') ? '\\n\\n' : (value === '序号') ? '1.' : value;
    }
}

// 保存简单格式
export async function saveSimpleFormat() {
    const name = $('simpleFormatName').value.trim();
    const qm = $('simpleQuestionMarker').value.trim();
    const am = $('simpleAnswerMarker').value.trim();
    const em = $('simpleExplanationMarker').value.trim();
    const sep = $('simpleSeparator').value.trim();

    if (!name) { await showAlert('请输入格式名称', '⚠️'); return; }
    if (!am) { await showAlert('请至少填写答案标记', '⚠️'); return; }

    const config = {
        questionMarkers: qm ? [qm] : [],
        optionPattern: '^[A-Da-d][.、:\\uff1a]\\s*',
        answerMarkers: [am],
        explanationMarkers: em ? [em] : [],
        separators: sep ? [sep] : ['---']
    };

    saveFormatToStorage(name, config, 'simple', editingCustomFormatId);
    editingCustomFormatId = null;
    await showAlert('格式已保存', '✅');
    loadCustomFormats();
    renderPresets();
}

// 保存高级格式
export async function saveAdvancedFormat() {
    const name = $('advancedFormatName').value.trim();
    const qr = $('advancedQuestionRegex').value.trim();
    const or_ = $('advancedOptionRegex').value.trim();
    const ar = $('advancedAnswerRegex').value.trim();
    const er = $('advancedExplanationRegex').value.trim();
    const sr = $('advancedSeparator').value.trim();

    if (!name) { await showAlert('请输入格式名称', '⚠️'); return; }
    if (!or_) { await showAlert('请至少填写选项正则', '⚠️'); return; }

    // 验证正则
    try {
        if (qr) new RegExp(qr);
        new RegExp(or_);
        if (ar) new RegExp(ar);
        if (er) new RegExp(er);
        if (sr) new RegExp(sr);
    } catch (e) {
        await showAlert('正则表达式格式错误: ' + e.message, '⚠️');
        return;
    }

    const config = {
        questionPattern: qr || undefined,
        optionPattern: or_,
        answerPattern: ar || undefined,
        explanationPattern: er || undefined,
        separatorPattern: sr || undefined,
        answerMarkers: ['答案:', '答案：'],
        explanationMarkers: ['解析:', '解析：'],
        separators: ['---']
    };

    saveFormatToStorage(name, config, 'advanced', editingCustomFormatId);
    editingCustomFormatId = null;
    await showAlert('格式已保存', '✅');
    loadCustomFormats();
    renderPresets();
}

function saveFormatToStorage(name, config, mode, targetId = null) {
    const formats = getCustomFormats();
    const id = targetId || ('custom_' + Date.now());
    const idx = formats.findIndex(f => f.id === id);

    if (idx >= 0) {
        const old = formats[idx] || {};
        formats[idx] = {
            id,
            name,
            config,
            mode,
            createdAt: old.createdAt || new Date().toISOString()
        };
    } else {
        formats.push({ id, name, config, mode, createdAt: new Date().toISOString() });
    }

    safeLocalStorageSet('customFormats', JSON.stringify(formats));
}

export function useCustomFormat(id) {
    setSubTab('preset');
    selectPreset(id);
}

export function editCustomFormat(id) {
    const formats = getCustomFormats();
    const format = formats.find(f => f.id === id);
    if (!format) return;
    if (format.mode === 'advanced') {
        setCustomMode('advanced');
        $('advancedFormatName').value = format.name;
        $('advancedQuestionRegex').value = format.config.questionPattern || '';
        $('advancedOptionRegex').value = format.config.optionPattern || '';
        $('advancedAnswerRegex').value = format.config.answerPattern || '';
        $('advancedExplanationRegex').value = format.config.explanationPattern || '';
        $('advancedSeparator').value = format.config.separatorPattern || '';
    } else {
        setCustomMode('simple');
        $('simpleFormatName').value = format.name;
        const c = format.config;
        $('simpleQuestionMarker').value = (c.questionMarkers && c.questionMarkers[0]) || '';
        $('simpleOptionMarker').value = '';
        $('simpleAnswerMarker').value = (c.answerMarkers && c.answerMarkers[0]) || '';
        $('simpleExplanationMarker').value = (c.explanationMarkers && c.explanationMarkers[0]) || '';
        $('simpleSeparator').value = (c.separators && c.separators[0]) || '';
    }
    editingCustomFormatId = id;
}

export async function deleteCustomFormat(id) {
    const confirmed = await showDialog({
        icon: '⚠️',
        title: '警告',
        message: '确定要删除这个自定义格式吗？',
        buttons: [
            { text: '取消', type: 'cancel', value: false },
            { text: '确定', type: 'danger', value: true }
        ]
    });
    if (!confirmed) return;
    deleteCustomFormatSilent(id);
    await showAlert('格式已删除', '🗑️');
}

function deleteCustomFormatSilent(id) {
    let formats = getCustomFormats();
    formats = formats.filter(f => f.id !== id);
    if (editingCustomFormatId === id) editingCustomFormatId = null;
    safeLocalStorageSet('customFormats', JSON.stringify(formats));
    loadCustomFormats();
    renderPresets();
}
