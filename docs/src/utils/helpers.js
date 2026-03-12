// 通用辅助函数

// 渲染文本中的数学公式（$..$ 行内, $$...$$ 块级）
export function renderMathInElement(el) {
    if (typeof window.katex === 'undefined' || !el) return;
    const text = el.textContent || '';
    // 支持 $...$ $$...$$ \(...\) \[...\]
    if (!/[\$]|\\[(\[]/.test(text)) return;

    const parts = [];
    let lastIndex = 0;
    // 匹配顺序：$$...$$ | \[...\] | $...$ | \(...\)
    const regex = /\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]|\$([^\$\n]+?)\$|\\\((.+?)\\\)/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
        if (match.index > lastIndex) {
            parts.push(document.createTextNode(text.slice(lastIndex, match.index)));
        }
        const isDisplay = match[1] != null || match[2] != null;
        const expr = (match[1] || match[2] || match[3] || match[4]).trim();
        const span = document.createElement(isDisplay ? 'div' : 'span');
        span.className = isDisplay ? 'math-block' : 'math-inline';
        try {
            window.katex.render(expr, span, { displayMode: isDisplay, throwOnError: false });
        } catch (_) {
            span.textContent = expr;
        }
        parts.push(span);
        lastIndex = match.index + match[0].length;
    }
    if (!parts.length) return;
    if (lastIndex < text.length) {
        parts.push(document.createTextNode(text.slice(lastIndex)));
    }
    el.textContent = '';
    for (const node of parts) el.appendChild(node);
}

// 文件下载
export function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 100);
}

// 数组打乱
export function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
}
