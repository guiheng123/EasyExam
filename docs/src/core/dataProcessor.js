// 数据处理模块 - 题目数据的标准化和转换


// 标准化题目数据
export function normalizeQuestions(rawQuestions) {
    if (!Array.isArray(rawQuestions)) return [];
    
    const results = [];
    for (const rawQuestion of rawQuestions) {
        if (!rawQuestion || typeof rawQuestion !== 'object') continue;

        const question = String(rawQuestion.question || rawQuestion.q || rawQuestion.title || '').trim();
        if (!question) continue;

        const sourceOptions = Array.isArray(rawQuestion.options) ? rawQuestion.options : [];
        const options = [];
        
        for (let i = 0; i < sourceOptions.length; i++) {
            const rawOption = sourceOptions[i];
            let opt = null;
            
            if (typeof rawOption === 'string') {
                const text = rawOption.trim();
                if (text) {
                    opt = { letter: String.fromCharCode(65 + i), text };
                }
            } else if (rawOption && typeof rawOption === 'object') {
                const text = String(rawOption.text || rawOption.content || '').trim();
                if (text) {
                    const letter = String(rawOption.letter || '').trim().toUpperCase().charAt(0);
                    opt = {
                        letter: /^[A-Z]$/.test(letter) ? letter : String.fromCharCode(65 + i),
                        text
                    };
                }
            }
            
            if (opt) options.push(opt);
        }

        if (options.length < 2) continue;

        // 确保字母唯一性
        const usedLetters = new Set();
        for (let i = 0; i < options.length; i++) {
            const opt = options[i];
            const fallbackLetter = String.fromCharCode(65 + i);
            if (usedLetters.has(opt.letter)) {
                opt.letter = fallbackLetter;
            }
            usedLetters.add(opt.letter);
        }

        let answer = String(rawQuestion.answer || rawQuestion.a || '').trim().toUpperCase().charAt(0);
        if (!answer || !usedLetters.has(answer)) {
            const numericAnswer = Number(rawQuestion.answer);
            if (Number.isInteger(numericAnswer) && numericAnswer >= 1 && numericAnswer <= options.length) {
                answer = options[numericAnswer - 1].letter;
            }
        }
        if (!answer || !usedLetters.has(answer)) continue;

        const explanation = String(rawQuestion.explanation || rawQuestion.explain || rawQuestion.analysis || '').trim();
        results.push({ question, options, answer, explanation });
    }
    
    return results;
}

// 将题目数组转为标准 TXT 格式文本
export function questionsToText(qs) {
    const lines = [];
    qs.forEach((q, idx) => {
        if (idx > 0) lines.push('---');
        lines.push(`Q: ${q.question}`);
        q.options.forEach(opt => lines.push(`${opt.letter}: ${opt.text}`));
        lines.push(`答案: ${q.answer}`);
        if (q.explanation) lines.push(`解析: ${q.explanation}`);
    });
    return lines.join('\n');
}

// 通用导出流程
export async function exportQuestions(qs, filenamePrefix, { showDialog, showAlert, downloadFile }) {
    if (!qs || qs.length === 0) {
        await showAlert('没有可导出的题目', '⚠️');
        return;
    }
    
    const format = await showDialog({
        icon: '📤',
        title: '选择导出方式',
        message: '请选择要导出的格式',
        buttons: [
            { text: '📋 复制到剪贴板', type: 'confirm', value: 'clipboard' },
            { text: '💾 下载 JSON 文件', type: 'confirm', value: 'json' },
            { text: '💾 下载 TXT 文件', type: 'confirm', value: 'txt' },
            { text: '取消', type: 'cancel', value: false }
        ]
    });
    
    if (!format) return;

    if (format === 'clipboard') {
        try {
            await navigator.clipboard.writeText(questionsToText(qs));
            await showAlert(`✅ 已复制 ${qs.length} 道题目到剪贴板！`, '🎉');
        } catch (e) {
            await showAlert('❌ 复制失败，请检查浏览器权限', '⚠️');
        }
        return;
    }

    const isJson = format === 'json';
    const content = isJson ? JSON.stringify(qs, null, 2) : questionsToText(qs);
    const ext = isJson ? 'json' : 'txt';
    const mime = isJson ? 'application/json' : 'text/plain';
    const filename = `${filenamePrefix}_${qs.length}题.${ext}`;

    try {
        downloadFile(content, filename, mime);
        await showAlert(`✅ 题目已导出为 ${filename}`, '🎉');
    } catch (error) {
        await showAlert('❌ 导出失败: ' + error.message, '⚠️');
    }
}
