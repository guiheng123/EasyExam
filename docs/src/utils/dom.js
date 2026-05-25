// DOM 操作工具函数

// DOM 快捷访问
export const $ = id => document.getElementById(id);
export const $$ = selector => document.querySelectorAll(selector);

// HTML 转义
export function escapeHtml(value) {
    if (value == null) return '';
    const str = String(value);
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// HTML 属性值转义
export function escapeAttr(value) {
    return escapeHtml(value)
        .replace(/"/g, String.fromCharCode(38, 35, 51, 52, 59))
        .replace(/'/g, String.fromCharCode(38, 35, 51, 57, 59));
}

// 无障碍操作处理
export function handleAccessibleAction(event, action, contextEl) {
    if (!event) return;
    const key = event.key;
    if (key !== 'Enter' && key !== ' ' && key !== 'Spacebar') return;
    event.preventDefault();
    if (typeof action === 'function') {
        action.call(contextEl || null);
    }
}

// 检测动画偏好
export const MOTION_REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
