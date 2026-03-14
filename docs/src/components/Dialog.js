// 对话框系统模块

import { $ } from '../utils/dom.js';

let dialogResolve = null;

// 显示对话框
export function showDialog({ icon, title, message, buttons }) {
    return new Promise(resolve => {
        const overlay = $('dialogOverlay');
        const iconEl = $('dialogIcon');
        const titleEl = $('dialogTitle');
        const messageEl = $('dialogMessage');
        const btnContainer = $('dialogButtons');

        if (!overlay || !iconEl || !titleEl || !messageEl || !btnContainer) {
            resolve(false);
            return;
        }

        if (typeof dialogResolve === 'function') {
            dialogResolve(false);
        }

        let finalized = false;
        const finalize = (value) => {
            if (finalized) return;
            finalized = true;
            overlay.classList.remove('active');
            dialogResolve = null;
            resolve(value);
        };

        dialogResolve = finalize;
        iconEl.textContent = icon || '💬';
        titleEl.textContent = title || '提示';
        messageEl.textContent = message || '';
        btnContainer.innerHTML = '';

        const normalizedButtons = Array.isArray(buttons) && buttons.length
            ? buttons
            : [{ text: '确定', type: 'confirm', value: true }];

        normalizedButtons.forEach(btn => {
            const el = document.createElement('button');
            el.className = 'dialog-btn';
            if (btn.type === 'cancel') el.classList.add('dialog-btn-cancel');
            else if (btn.type === 'danger') el.classList.add('dialog-btn-danger');
            else el.classList.add('dialog-btn-confirm');
            el.textContent = btn.text;
            el.onclick = () => finalize(btn.value !== undefined ? btn.value : true);
            btnContainer.appendChild(el);
        });

        overlay.classList.add('active');
    });
}

// 显示提示框
export function showAlert(message, icon) {
    return showDialog({
        icon: icon || 'ℹ️',
        title: '提示',
        message,
        buttons: [{ text: '确定', type: 'confirm', value: true }]
    });
}

// 显示危险确认框
export function showDangerConfirm(message) {
    return showDialog({
        icon: '⚠️',
        title: '警告',
        message,
        buttons: [
            { text: '取消', type: 'cancel', value: false },
            { text: '确定', type: 'danger', value: true }
        ]
    });
}

// 初始化对话框事件
export function initDialogSystem() {
    const dialogOverlayEl = $('dialogOverlay');
    if (dialogOverlayEl) {
        dialogOverlayEl.addEventListener('click', function(e) {
            if (e.target === this) {
                this.classList.remove('active');
                if (dialogResolve) { 
                    dialogResolve(false); 
                    dialogResolve = null; 
                }
            }
        });
    }
}

// 关闭对话框（用于 ESC 键）
export function closeDialog() {
    const dialogOverlay = $('dialogOverlay');
    if (dialogOverlay && dialogOverlay.classList.contains('active')) {
        dialogOverlay.classList.remove('active');
        if (dialogResolve) { 
            dialogResolve(false); 
            dialogResolve = null; 
        }
        return true;
    }
    return false;
}

// 带输入框的提示框，返回输入内容或 null（取消）
export function showPrompt({ title = '请输入', message = '', icon = '✏️', placeholder = '', defaultValue = '', confirmText = '确定' } = {}) {
    return new Promise(resolve => {
        const overlay = $('dialogOverlay');
        const iconEl = $('dialogIcon');
        const titleEl = $('dialogTitle');
        const messageEl = $('dialogMessage');
        const btnContainer = $('dialogButtons');

        if (!overlay || !iconEl || !titleEl || !messageEl || !btnContainer) {
            resolve(null);
            return;
        }

        if (typeof dialogResolve === 'function') {
            dialogResolve(false);
        }

        let finalized = false;
        const finalize = (value) => {
            if (finalized) return;
            finalized = true;
            overlay.classList.remove('active');
            messageEl.textContent = '';
            dialogResolve = null;
            resolve(value);
        };

        dialogResolve = () => finalize(null);
        iconEl.textContent = icon;
        titleEl.textContent = title;

        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'dialog-prompt-input';
        input.placeholder = placeholder;
        input.value = defaultValue;

        messageEl.textContent = '';
        if (message) {
            const p = document.createElement('div');
            p.textContent = message;
            p.style.marginBottom = '12px';
            messageEl.appendChild(p);
        }
        messageEl.appendChild(input);

        btnContainer.innerHTML = '';
        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'dialog-btn dialog-btn-cancel';
        cancelBtn.textContent = '取消';
        cancelBtn.onclick = () => finalize(null);

        const confirmBtn = document.createElement('button');
        confirmBtn.className = 'dialog-btn dialog-btn-confirm';
        confirmBtn.textContent = confirmText;
        confirmBtn.onclick = () => finalize(input.value.trim() || defaultValue);

        btnContainer.appendChild(cancelBtn);
        btnContainer.appendChild(confirmBtn);

        overlay.classList.add('active');
        setTimeout(() => input.focus(), 100);
    });
}

// 通用确认对话框
export async function confirmAction({ title = '提示', message = '', icon = '⚠️', confirmText = '确定', danger = false } = {}) {
    return showDialog({
        icon,
        title,
        message,
        buttons: [
            { text: '取消', type: 'cancel', value: false },
            { text: confirmText, type: danger ? 'danger' : 'confirm', value: true }
        ]
    });
}
