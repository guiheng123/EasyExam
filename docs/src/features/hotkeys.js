// 快捷键系统模块

import { $ } from '../utils/dom.js';
import { safeLocalStorageGet, safeLocalStorageSet, safeJsonParse } from '../core/storage.js';
import { showAlert } from '../components/Dialog.js';

// 快捷键状态
let hotkeyEnabled = false;
let hotkeyMap = {
    optA: '1',
    optB: '2',
    optC: '3',
    optD: '4',
    prev: 'ArrowLeft',
    next: 'ArrowRight'
};
let recordingTarget = null;
let recordingInput = null;
let hotkeyHintTimer = null;

// 回调函数（由 main.js 注入）
let _callbacks = {};

// 加载快捷键设置
export function loadHotkeySettings() {
    try {
        const savedRaw = safeLocalStorageGet('hotkeySettings');
        const saved = savedRaw ? safeJsonParse(savedRaw) : null;
        if (saved && typeof saved === 'object') {
            hotkeyEnabled = !!saved.enabled;
            if (saved.map && typeof saved.map === 'object') {
                hotkeyMap = { ...hotkeyMap, ...saved.map };
            }
        }
    } catch(e) {
        console.warn('读取快捷键配置失败，已回退默认配置:', e);
    }
    const toggleEl = $('hotkeyToggle');
    if (toggleEl) toggleEl.checked = hotkeyEnabled;
    toggleHotkeys();
    syncHotkeyInputs();
}

// 保存快捷键设置
function saveHotkeySettings() {
    safeLocalStorageSet('hotkeySettings', JSON.stringify({
        enabled: hotkeyEnabled,
        map: hotkeyMap
    }));
}

// 切换快捷键启用状态
export function toggleHotkeys() {
    const toggleEl = $('hotkeyToggle');
    const panel = $('hotkeySettings');
    hotkeyEnabled = !!(toggleEl && toggleEl.checked);
    if (!panel) {
        saveHotkeySettings();
        return;
    }
    if (hotkeyEnabled) {
        panel.classList.remove('disabled');
    } else {
        panel.classList.add('disabled');
    }
    saveHotkeySettings();
}

// 按键显示名称
function getKeyDisplayName(key) {
    const names = {
        'ArrowLeft': '←',
        'ArrowRight': '→',
        'ArrowUp': '↑',
        'ArrowDown': '↓',
        ' ': '空格',
        'Enter': '回车',
        'Escape': 'Esc',
        'Backspace': '退格',
        'Tab': 'Tab',
        'Delete': 'Del'
    };
    return names[key] || key.toUpperCase();
}

// 同步快捷键输入框显示
function syncHotkeyInputs() {
    Object.keys(hotkeyMap).forEach(action => {
        const input = $('hk_' + action);
        if (input) input.value = getKeyDisplayName(hotkeyMap[action]);
    });
}

// 开始录制快捷键
export function startRecordHotkey(inputEl, action) {
    if (recordingInput && recordingInput !== inputEl) {
        recordingInput.classList.remove('recording');
    }
    recordingTarget = action;
    recordingInput = inputEl;
    inputEl.classList.add('recording');
    inputEl.value = '按键...';
}

// 重置快捷键
export function resetHotkey(action, defaultKey) {
    hotkeyMap[action] = defaultKey;
    const input = $('hk_' + action);
    if (input) {
        input.value = getKeyDisplayName(defaultKey);
        input.classList.remove('recording');
    }
    if (recordingTarget === action) {
        recordingTarget = null;
        recordingInput = null;
    }
    saveHotkeySettings();
}

// 快捷键动作名称
function getHotkeyActionName(action) {
    const names = {
        optA: '选项A', optB: '选项B', optC: '选项C', optD: '选项D',
        prev: '上一题', next: '下一题'
    };
    return names[action] || action;
}

// 显示快捷键提示
export function showHotkeyHint(text) {
    const hint = $('hotkeyHint');
    if (!hint) return;
    hint.textContent = text;
    hint.classList.add('show');
    clearTimeout(hotkeyHintTimer);
    hotkeyHintTimer = setTimeout(() => hint.classList.remove('show'), 1200);
}

// 取消录制（关闭设置时调用）
export function cancelRecording() {
    if (recordingInput) {
        recordingInput.classList.remove('recording');
        syncHotkeyInputs();
        recordingTarget = null;
        recordingInput = null;
    }
}

// 初始化快捷键系统
export function initHotkeySystem(callbacks) {
    _callbacks = callbacks || {};

    document.addEventListener('keydown', function(e) {
        // 录制模式
        if (recordingTarget) {
            e.preventDefault();
            const key = e.key;
            if (key === 'Escape') {
                if (recordingInput) {
                    recordingInput.classList.remove('recording');
                    syncHotkeyInputs();
                }
                recordingTarget = null;
                recordingInput = null;
                return;
            }
            // 检测按键冲突
            const conflictAction = Object.keys(hotkeyMap).find(a => a !== recordingTarget && hotkeyMap[a] === key);
            if (conflictAction) {
                showAlert('此按键已被"' + getHotkeyActionName(conflictAction) + '"使用，请选择其他按键', '⚠️');
                return;
            }
            hotkeyMap[recordingTarget] = key;
            recordingInput.value = getKeyDisplayName(key);
            recordingInput.classList.remove('recording');
            recordingTarget = null;
            recordingInput = null;
            saveHotkeySettings();
            return;
        }

        // ESC 键处理
        if (e.key === 'Escape') {
            if (typeof _callbacks.onEscape === 'function') {
                _callbacks.onEscape();
            }
            return;
        }

        // 答题快捷键
        if (!hotkeyEnabled) return;
        if (typeof _callbacks.hasModalOpen === 'function' && _callbacks.hasModalOpen()) return;

        // 只在答题页面生效
        if (typeof _callbacks.isQuizActive === 'function' && !_callbacks.isQuizActive()) return;

        // 不在输入框中响应
        if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) return;

        const key = e.key;

        if (key === hotkeyMap.optA) {
            e.preventDefault();
            if (typeof _callbacks.triggerOption === 'function') _callbacks.triggerOption(0);
        } else if (key === hotkeyMap.optB) {
            e.preventDefault();
            if (typeof _callbacks.triggerOption === 'function') _callbacks.triggerOption(1);
        } else if (key === hotkeyMap.optC) {
            e.preventDefault();
            if (typeof _callbacks.triggerOption === 'function') _callbacks.triggerOption(2);
        } else if (key === hotkeyMap.optD) {
            e.preventDefault();
            if (typeof _callbacks.triggerOption === 'function') _callbacks.triggerOption(3);
        } else if (key === hotkeyMap.prev) {
            e.preventDefault();
            if (typeof _callbacks.prevQuestion === 'function') _callbacks.prevQuestion();
            showHotkeyHint('⬅ 上一题');
        } else if (key === hotkeyMap.next) {
            e.preventDefault();
            if (typeof _callbacks.nextQuestion === 'function') _callbacks.nextQuestion();
        }
    });
}
