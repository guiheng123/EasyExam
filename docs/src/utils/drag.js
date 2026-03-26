// 拖拽功能模块 - 处理悬浮按钮的拖拽

/**
 * @param {{ onToggleAIChatPanel: Function, onUpdateAIChatPanelPosition: Function, onOpenSettings: Function }} callbacks
 */
export function initDragFunctionality(callbacks = {}) {
    createDraggableFab({
        element: document.querySelector('.ai-analyze-fab'),
        defaultBottom: 76,
        onMoveFrame: callbacks.onUpdateAIChatPanelPosition,
        onSnapComplete: callbacks.onUpdateAIChatPanelPosition,
        onClick: callbacks.onToggleAIChatPanel
    });

    createDraggableFab({
        element: document.getElementById('settingsFab'),
        defaultBottom: 24,
        onClick: callbacks.onOpenSettings
    });
}

function createDraggableFab({ element, defaultBottom = 24, onMoveFrame, onSnapComplete, onClick } = {}) {
    const fab = element;
    if (!fab) return;

    let isDragging = false;
    let hasMoved = false;
    let startX = 0;
    let startY = 0;
    let originX = 0;
    let originY = 0;
    let snapTimer = null;
    let dragRafId = 0;
    let pendingX = 0;
    let pendingY = 0;
    let resizeTimer = null;
    const snapInset = parseFloat(getComputedStyle(fab).right) || 24;

    function runPanelUpdate() {
        if (typeof onMoveFrame === 'function') {
            onMoveFrame();
        }
    }

    function clamp(x, y) {
        const w = fab.offsetWidth;
        const h = fab.offsetHeight;
        return {
            x: Math.max(0, Math.min(x, window.innerWidth - w)),
            y: Math.max(0, Math.min(y, window.innerHeight - h))
        };
    }

    function applyDockPosition(rect) {
        const centerX = rect.left + rect.width / 2;
        const isLeft = centerX < window.innerWidth / 2;
        const curRight = window.innerWidth - rect.left - rect.width;
        const curBottom = window.innerHeight - rect.top - rect.height;
        const safeBottom = Math.max(12, Math.min(curBottom, window.innerHeight - rect.height - 12));
        const targetRight = isLeft ? window.innerWidth - rect.width - snapInset : snapInset;

        fab.style.transform = 'none';
        fab.style.left = 'auto';
        fab.style.top = 'auto';
        fab.style.right = curRight + 'px';
        fab.style.bottom = safeBottom + 'px';
        fab.offsetHeight;
        fab.classList.add('snapping');
        fab.style.right = targetRight + 'px';
    }

    function onStart(ex, ey) {
        isDragging = true;
        hasMoved = false;
        if (snapTimer) {
            clearTimeout(snapTimer);
            snapTimer = null;
        }

        fab.classList.remove('snapping');
        fab.classList.add('dragging');
        const rect = fab.getBoundingClientRect();
        originX = rect.left;
        originY = rect.top;
        startX = ex;
        startY = ey;
        fab.style.right = 'auto';
        fab.style.bottom = 'auto';
        fab.style.left = originX + 'px';
        fab.style.top = originY + 'px';
        fab.style.transform = 'none';
    }

    function onMove(ex, ey) {
        if (!isDragging) return;
        pendingX = ex;
        pendingY = ey;
        if (dragRafId) return;

        dragRafId = requestAnimationFrame(() => {
            dragRafId = 0;
            const dx = pendingX - startX;
            const dy = pendingY - startY;
            if (Math.abs(dx) > 3 || Math.abs(dy) > 3) hasMoved = true;
            const clamped = clamp(originX + dx, originY + dy);
            fab.style.transform = 'translate(' + (clamped.x - originX) + 'px,' + (clamped.y - originY) + 'px)';
            runPanelUpdate();
        });
    }

    function onEnd() {
        if (!isDragging) return;
        isDragging = false;

        if (dragRafId) {
            cancelAnimationFrame(dragRafId);
            dragRafId = 0;
        }

        fab.classList.remove('dragging');
        applyDockPosition(fab.getBoundingClientRect());

        snapTimer = setTimeout(() => {
            fab.classList.remove('snapping');
            snapTimer = null;
            if (typeof onSnapComplete === 'function') {
                onSnapComplete();
            }
        }, 350);

        runPanelUpdate();
        if (typeof onSnapComplete === 'function') {
            requestAnimationFrame(() => {
                requestAnimationFrame(onSnapComplete);
            });
        }

        if (!hasMoved && typeof onClick === 'function') {
            onClick();
        }
    }

    function handleResize() {
        if (isDragging) return;

        const rect = fab.getBoundingClientRect();
        const maxBottom = Math.max(12, window.innerHeight - rect.height - 12);
        const inlineBottom = parseFloat(fab.style.bottom);
        const currentBottom = Number.isFinite(inlineBottom) ? inlineBottom : defaultBottom;
        const safeBottom = Math.max(12, Math.min(currentBottom, maxBottom));
        const isLeft = (rect.left + rect.width / 2) < window.innerWidth / 2;
        const targetRight = isLeft ? Math.max(12, window.innerWidth - rect.width - snapInset) : snapInset;

        fab.style.left = 'auto';
        fab.style.top = 'auto';
        fab.style.right = targetRight + 'px';
        fab.style.bottom = safeBottom + 'px';
        if (typeof onSnapComplete === 'function') onSnapComplete();
    }

    function onMouseDown(e) { e.preventDefault(); onStart(e.clientX, e.clientY); }
    function onMouseMove(e) { onMove(e.clientX, e.clientY); }
    function onMouseUp() { onEnd(); }
    function onTouchStart(e) { const t = e.touches[0]; if (!t) return; onStart(t.clientX, t.clientY); }
    function onTouchMove(e) { if (!isDragging) return; e.preventDefault(); const t = e.touches[0]; if (!t) return; onMove(t.clientX, t.clientY); }
    function onTouchEnd() { onEnd(); }
    function onClickCapture(e) { if (hasMoved) e.stopPropagation(); }
    function onResize() { clearTimeout(resizeTimer); resizeTimer = setTimeout(handleResize, 120); }

    fab.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    fab.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd);
    fab.addEventListener('click', onClickCapture);
    window.addEventListener('resize', onResize);

    // 返回清理函数，供调用方按需销毁监听
    return function destroy() {
        fab.removeEventListener('mousedown', onMouseDown);
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        fab.removeEventListener('touchstart', onTouchStart);
        document.removeEventListener('touchmove', onTouchMove);
        document.removeEventListener('touchend', onTouchEnd);
        fab.removeEventListener('click', onClickCapture);
        window.removeEventListener('resize', onResize);
        if (dragRafId) { cancelAnimationFrame(dragRafId); dragRafId = 0; }
        if (snapTimer) { clearTimeout(snapTimer); snapTimer = null; }
        if (resizeTimer) { clearTimeout(resizeTimer); resizeTimer = null; }
    };
}
