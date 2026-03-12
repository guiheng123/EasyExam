// Modal 组件 - 通用模态框

import { $ } from '../utils/dom.js';

export class Modal {
    constructor(modalId) {
        this.modalId = modalId;
        this.modal = $(modalId);
        this.closeHandlers = [];

        if (this.modal) {
            this.modal.addEventListener('click', (e) => {
                const clickedClose = e.target.closest('.modal-close');
                const clickedBackdrop = e.target === this.modal;
                if (clickedClose || clickedBackdrop) {
                    this.closeHandlers.forEach((handler) => {
                        try {
                            handler();
                        } catch (err) {
                            console.error('Modal close handler 执行失败:', err);
                        }
                    });
                }
            });
        }
    }

    onClose(handler) {
        if (typeof handler === 'function') {
            this.closeHandlers.push(handler);
        }
    }

    open() {
        if (this.modal) {
            this.modal.classList.add('active');
        }
    }

    close() {
        if (this.modal) {
            this.modal.classList.remove('active');
        }
    }
}
