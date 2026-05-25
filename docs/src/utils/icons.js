// 平面化 UI 图标工具

const SVG_NS = 'http://www.w3.org/2000/svg';

export const ICON_PATHS = {
    app: '<path d="M6 4h9l3 3v13H6z"></path><path d="M15 4v4h4"></path><path d="M9 12h6"></path><path d="M9 16h4"></path>',
    file: '<path d="M4 6h6l2 2h8v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"></path>',
    clipboard: '<rect x="6" y="5" width="12" height="16" rx="2"></rect><path d="M9 5a3 3 0 0 1 6 0"></path><path d="M9 11h6"></path><path d="M9 15h5"></path>',
    bot: '<rect x="5" y="7" width="14" height="11" rx="3"></rect><path d="M12 3v4"></path><path d="M8 12h.01"></path><path d="M16 12h.01"></path><path d="M10 16h4"></path>',
    library: '<path d="M5 4h4v16H5z"></path><path d="M10 4h4v16h-4z"></path><path d="M15 5l4 1v14l-4-1z"></path>',
    folderOpen: '<path d="M3 7h7l2 2h9l-2 10H5z"></path><path d="M3 7v10"></path>',
    target: '<circle cx="12" cy="12" r="8"></circle><circle cx="12" cy="12" r="4"></circle><path d="M12 2v4"></path><path d="M12 18v4"></path><path d="M2 12h4"></path><path d="M18 12h4"></path>',
    settings: '<circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.2a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v.1a1.7 1.7 0 0 0 1.5 1h.1a2 2 0 1 1 0 4h-.2a1.7 1.7 0 0 0-1.4 1z"></path>',
    palette: '<path d="M12 3a9 9 0 0 0 0 18h1.5a1.5 1.5 0 0 0 1-2.6 1.2 1.2 0 0 1 .8-2.1H17a4 4 0 0 0 4-4A9 9 0 0 0 12 3z"></path><circle cx="8" cy="10" r="1"></circle><circle cx="10.5" cy="7.5" r="1"></circle><circle cx="14" cy="7.5" r="1"></circle><circle cx="16" cy="10" r="1"></circle>',
    tool: '<path d="M14.7 6.3a4 4 0 0 0-5 5L4 17v3h3l5.7-5.7a4 4 0 0 0 5-5l-2.5 2.5-3-3z"></path>',
    save: '<path d="M5 4h12l2 2v14H5z"></path><path d="M8 4v6h8V4"></path><path d="M8 20v-6h8v6"></path>',
    rocket: '<path d="M14 4c3 1 5 3 6 6l-5 5-6-6z"></path><path d="M9 15l-4 4"></path><path d="M8 10l-4 1 1-4"></path><path d="M14 16l-1 4 4-1"></path><circle cx="15" cy="9" r="1.5"></circle>',
    lightbulb: '<path d="M9 18h6"></path><path d="M10 22h4"></path><path d="M8 14a6 6 0 1 1 8 0c-.8.7-1 1.5-1 2H9c0-.5-.2-1.3-1-2z"></path>',
    dice: '<rect x="4" y="4" width="16" height="16" rx="3"></rect><circle cx="8" cy="8" r="1"></circle><circle cx="16" cy="8" r="1"></circle><circle cx="12" cy="12" r="1"></circle><circle cx="8" cy="16" r="1"></circle><circle cx="16" cy="16" r="1"></circle>',
    sparkle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"></path><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"></path>',
    brain: '<path d="M9 5a3 3 0 0 0-3 3v1a3 3 0 0 0 0 6v1a3 3 0 0 0 5 2.2V5.8A3 3 0 0 0 9 5z"></path><path d="M15 5a3 3 0 0 1 3 3v1a3 3 0 0 1 0 6v1a3 3 0 0 1-5 2.2V5.8A3 3 0 0 1 15 5z"></path>',
    message: '<path d="M5 5h14v10H8l-3 4z"></path>',
    edit: '<path d="M4 20h4l11-11-4-4L4 16z"></path><path d="M14 6l4 4"></path>',
    trash: '<path d="M4 7h16"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M6 7l1 14h10l1-14"></path><path d="M9 7V4h6v3"></path>',
    search: '<circle cx="11" cy="11" r="7"></circle><path d="M16 16l4 4"></path>',
    export: '<path d="M12 3v12"></path><path d="M7 8l5-5 5 5"></path><path d="M5 15v5h14v-5"></path>',
    import: '<path d="M12 3v12"></path><path d="M7 10l5 5 5-5"></path><path d="M5 15v5h14v-5"></path>',
    document: '<path d="M6 3h9l3 3v15H6z"></path><path d="M15 3v4h4"></path><path d="M9 12h6"></path><path d="M9 16h6"></path>',
    chart: '<path d="M4 19h16"></path><path d="M7 16V9"></path><path d="M12 16V5"></path><path d="M17 16v-4"></path>',
    clock: '<circle cx="12" cy="12" r="8"></circle><path d="M12 7v5l3 2"></path>',
    eye: '<path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6-10-6-10-6z"></path><circle cx="12" cy="12" r="3"></circle>',
    warning: '<path d="M12 3l10 18H2z"></path><path d="M12 9v5"></path><path d="M12 17h.01"></path>',
    info: '<circle cx="12" cy="12" r="9"></circle><path d="M12 11v6"></path><path d="M12 7h.01"></path>',
    success: '<circle cx="12" cy="12" r="9"></circle><path d="M8 12l3 3 5-6"></path>',
    error: '<circle cx="12" cy="12" r="9"></circle><path d="M9 9l6 6"></path><path d="M15 9l-6 6"></path>',
    pending: '<circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path>',
    refresh: '<path d="M20 12a8 8 0 1 1-2.3-5.7"></path><path d="M20 4v6h-6"></path>',
    trophy: '<path d="M8 4h8v4a4 4 0 0 1-8 0z"></path><path d="M8 6H5a3 3 0 0 0 3 3"></path><path d="M16 6h3a3 3 0 0 1-3 3"></path><path d="M12 12v5"></path><path d="M9 20h6"></path>',
    star: '<path d="M12 3l2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"></path>',
    thumbsUp: '<path d="M7 10v10H4V10z"></path><path d="M7 10l4-7 1 1v5h6a2 2 0 0 1 2 2l-2 7a3 3 0 0 1-3 2H7"></path>',
    strength: '<path d="M7 14c2-5 5-7 9-7h2v5h-3l3 3v5H8a4 4 0 0 1-1-6z"></path>',
    bookOpen: '<path d="M4 5h7a3 3 0 0 1 3 3v13a3 3 0 0 0-3-3H4z"></path><path d="M20 5h-7a3 3 0 0 0-3 3v13a3 3 0 0 1 3-3h7z"></path>'
};

export function icon(name = 'info', label = '', extraClass = '') {
    const key = ICON_PATHS[name] ? name : 'info';
    const aria = label ? `role="img" aria-label="${escapeAttr(label)}"` : 'aria-hidden="true"';
    return `<span class="ui-icon ui-icon-${key}${extraClass ? ` ${extraClass}` : ''}" ${aria}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICON_PATHS[key]}</svg></span>`;
}

export function textIcon(name, text, label = '') {
    return `${icon(name, label)}<span>${text}</span>`;
}

export const EMOJI_ICON_MAP = {
    '📝': 'app',
    '📁': 'file',
    '📋': 'clipboard',
    '🤖': 'bot',
    '📚': 'library',
    '📂': 'folderOpen',
    '🎯': 'target',
    '⚙️': 'settings',
    '🎨': 'palette',
    '🔧': 'tool',
    '💾': 'save',
    '🚀': 'rocket',
    '💡': 'lightbulb',
    '🎲': 'dice',
    '✨': 'sparkle',
    '🧠': 'brain',
    '💬': 'message',
    '✏️': 'edit',
    '🗑️': 'trash',
    '🔍': 'search',
    '📤': 'export',
    '📥': 'import',
    '📄': 'document',
    '📊': 'chart',
    '🕐': 'clock',
    '👁️': 'eye',
    '⚠️': 'warning',
    'ℹ️': 'info',
    '✅': 'success',
    '❌': 'error',
    '⏳': 'pending',
    '🔄': 'refresh',
    '🏆': 'trophy',
    '🌟': 'star',
    '👍': 'thumbsUp',
    '💪': 'strength',
    '📖': 'bookOpen',
    '🎉': 'success'
};

export function iconNameFromEmoji(value, fallback = 'info') {
    return EMOJI_ICON_MAP[value] || fallback;
}

export function iconElement(name = 'info', label = '', extraClass = '') {
    const span = document.createElement('span');
    span.className = `ui-icon ui-icon-${ICON_PATHS[name] ? name : 'info'}${extraClass ? ` ${extraClass}` : ''}`;
    if (label) {
        span.setAttribute('role', 'img');
        span.setAttribute('aria-label', label);
    } else {
        span.setAttribute('aria-hidden', 'true');
    }
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.innerHTML = ICON_PATHS[ICON_PATHS[name] ? name : 'info'];
    span.appendChild(svg);
    return span;
}

export function iconPlaceholder(name = 'info', label = '', extraClass = '') {
    const key = ICON_PATHS[name] ? name : 'info';
    const aria = label ? `role="img" aria-label="${escapeAttr(label)}"` : 'aria-hidden="true"';
    return `<span class="ui-icon-placeholder${extraClass ? ` ${extraClass}` : ''}" data-ui-icon="${key}" ${aria}></span>`;
}

export function hydrateIcons(root = document) {
    const scope = root && typeof root.querySelectorAll === 'function' ? root : document;
    scope.querySelectorAll('.ui-icon-placeholder[data-ui-icon]').forEach(node => {
        const name = node.getAttribute('data-ui-icon') || 'info';
        const label = node.getAttribute('aria-label') || '';
        const extraClass = Array.from(node.classList).filter(cls => cls !== 'ui-icon-placeholder').join(' ');
        const iconNode = iconElement(name, label, extraClass);
        node.replaceWith(iconNode);
    });
}

export function initIconHydration() {
    hydrateIcons(document);
    replaceEmojiTextNodes(document.body);
    const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
                if (node instanceof Text) {
                    replaceEmojiTextNode(node);
                    return;
                }
                if (!(node instanceof HTMLElement)) return;
                if (node.matches?.('.ui-icon-placeholder[data-ui-icon]')) {
                    hydrateIcons(node.parentElement || document);
                } else if (node.querySelector?.('.ui-icon-placeholder[data-ui-icon]')) {
                    hydrateIcons(node);
                }
                replaceEmojiTextNodes(node);
            });
        });
    });
    observer.observe(document.body, { childList: true, subtree: true });
}

function replaceEmojiTextNodes(root) {
    if (!root || shouldSkipEmojiReplace(root)) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
            if (!node.nodeValue || !hasMappedEmoji(node.nodeValue) || shouldSkipEmojiReplace(node.parentElement)) {
                return NodeFilter.FILTER_REJECT;
            }
            return NodeFilter.FILTER_ACCEPT;
        }
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(replaceEmojiTextNode);
}

function replaceEmojiTextNode(textNode) {
    const text = textNode?.nodeValue || '';
    if (!text || !hasMappedEmoji(text) || shouldSkipEmojiReplace(textNode.parentElement)) return;
    const fragment = document.createDocumentFragment();
    let rest = text;
    const tokens = Object.keys(EMOJI_ICON_MAP).sort((a, b) => b.length - a.length);
    while (rest) {
        let hit = null;
        let hitIndex = -1;
        for (const token of tokens) {
            const index = rest.indexOf(token);
            if (index !== -1 && (hitIndex === -1 || index < hitIndex)) {
                hit = token;
                hitIndex = index;
            }
        }
        if (!hit) {
            fragment.appendChild(document.createTextNode(rest));
            break;
        }
        if (hitIndex > 0) fragment.appendChild(document.createTextNode(rest.slice(0, hitIndex)));
        fragment.appendChild(iconElement(EMOJI_ICON_MAP[hit]));
        rest = rest.slice(hitIndex + hit.length);
    }
    textNode.replaceWith(fragment);
}

function hasMappedEmoji(text) {
    return Object.keys(EMOJI_ICON_MAP).some(token => text.includes(token));
}

function shouldSkipEmojiReplace(node) {
    if (!node) return true;
    return !!node.closest?.('svg, .ui-icon, script, style, textarea, input, pre, code, .example-code, #questionText, #analysisContent, #aiChatMessages');
}

function escapeAttr(value) {
    return String(value)
        .replace(/&/g, '&')
        .replace(/"/g, '"')
        .replace(/</g, '<')
        .replace(/>/g, '>');
}
