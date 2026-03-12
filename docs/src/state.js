// 应用共享状态

import { Modal } from './components/Modal.js';
import { Sidebar } from './components/Sidebar.js';

// 全局状态
export let activeBankId = null;
export let hasInitialized = false;

export function setActiveBankId(id) { activeBankId = id; }
export function setHasInitialized(val) { hasInitialized = val; }

// 组件实例
export const settingsSidebar = new Sidebar('settingsPanel');
export const aiModal = new Modal('aiModal');
export const exampleModal = new Modal('exampleModal');

// 保存按钮可见性（依赖 activeBankId，放在 state 中避免循环依赖）
export function updateSaveBankBtnVisibility() {
    const btn = document.getElementById('saveToBankBtn');
    if (btn) btn.style.display = activeBankId ? 'none' : '';
}
