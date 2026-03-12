// Sidebar 组件 - 侧边栏（设置面板）

import { $ } from '../utils/dom.js';

export class Sidebar {
    constructor(panelId) {
        this.panelId = panelId;
        this.panel = $(panelId);
    }

    open() {
        if (this.panel) {
            this.panel.classList.add('active');
        }
    }

    close() {
        if (this.panel) {
            this.panel.classList.remove('active');
        }
    }

    toggle() {
        if (this.panel) {
            this.panel.classList.toggle('active');
        }
    }

    isOpen() {
        return this.panel?.classList.contains('active') || false;
    }
}
