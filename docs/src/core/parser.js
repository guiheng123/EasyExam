// 格式解析模块 - 处理不同格式的题目文本解析

import { normalizeQuestions } from './dataProcessor.js';

// 创建解析器
function createParser(config) {
    const optionRe = config.optionPattern ? new RegExp(config.optionPattern, 'i') : null;
    const questionRe = config.questionPattern ? new RegExp(config.questionPattern, 'i') : null;
    const answerRe = config.answerPattern ? new RegExp(config.answerPattern, 'i') : null;
    const explanationRe = config.explanationPattern ? new RegExp(config.explanationPattern, 'i') : null;
    const separatorRe = config.separatorPattern ? new RegExp(config.separatorPattern, 'm') : null;

    const hasBlankLineSeparator = !!(config.separators && config.separators.includes('\\n\\n'));

    const isSeparator = (line) => {
        const t = line.trim();
        if (separatorRe && separatorRe.test(line)) return true;
        return config.separators ? config.separators.some(s => s !== '\\n\\n' && t === s) : false;
    };
    
    const isQuestion = (line) => {
        const t = line.trim();
        if (config.questionMarkers && config.questionMarkers.length)
            return config.questionMarkers.some(m => t.startsWith(m));
        if (questionRe)
            return questionRe.test(t);
        return false;
    };
    
    const getQuestionText = (line) => {
        const t = line.trim();
        if (config.questionMarkers && config.questionMarkers.length) {
            for (const m of config.questionMarkers) {
                if (t.startsWith(m)) return t.slice(m.length).trim();
            }
        }
        if (questionRe) {
            const m = t.match(questionRe);
            if (m && m[1] !== undefined) return String(m[1]).trim();
            return t.replace(questionRe, '').trim();
        }
        return t;
    };
    
    const isOption = (line) => optionRe ? optionRe.test(line.trim()) : false;
    const getOptionText = (line) => {
        const t = line.trim();
        if (!optionRe) return t;
        const m = t.match(optionRe);
        if (m && m[1] !== undefined) return String(m[1]).trim();
        return t.replace(optionRe, '').trim();
    };
    const getOptionLetter = (line) => {
        const m = line.trim().match(/^[A-Da-d]/);
        return m ? m[0].toUpperCase() : null;
    };
    
    const matchMarker = (line, markers) => {
        if (!markers || !markers.length) return null;
        const t = line.trim();
        const tl = t.toLowerCase();
        for (const m of markers) {
            if (tl.startsWith(m.toLowerCase())) return t.slice(m.length).trim();
        }
        return null;
    };
    
    const isAnswer = (line) => (matchMarker(line, config.answerMarkers) !== null) || (answerRe && answerRe.test(line));
    const getAnswer = (line) => {
        const byMarker = matchMarker(line, config.answerMarkers);
        if (byMarker) return byMarker.toUpperCase().charAt(0);
        if (answerRe) {
            const m = line.match(answerRe);
            const v = m && m[1] ? m[1] : line.replace(answerRe, '').trim();
            return v ? v.toUpperCase().charAt(0) : null;
        }
        return null;
    };
    
    const isExplanation = (line) =>
        (config.explanationMarkers && config.explanationMarkers.length && matchMarker(line, config.explanationMarkers) !== null) ||
        (explanationRe && explanationRe.test(line));
        
    const getExplanation = (line) => {
        const byMarker = matchMarker(line, config.explanationMarkers);
        if (byMarker !== null) return byMarker;
        if (explanationRe) {
            const m = line.match(explanationRe);
            return m && m[1] !== undefined ? String(m[1]).trim() : line.replace(explanationRe, '').trim();
        }
        return line.trim();
    };

    return { isSeparator, isQuestion, getQuestionText, isOption, getOptionText, getOptionLetter, isAnswer, getAnswer, isExplanation, getExplanation, hasBlankLineSeparator };
}

// 使用配置解析文本
export function parseTextWithConfig(text, config) {
    if (typeof text !== 'string' || !text.trim()) return [];
    if (!config || typeof config !== 'object') return [];

    let p;
    try {
        p = createParser(config);
    } catch (error) {
        console.error('解析器配置错误:', error);
        return [];
    }

    const lines = text.replace(/\r\n?/g, '\n').split('\n');
    const parsed = [];
    let current = null;
    const noQMarker = (!config.questionMarkers || !config.questionMarkers.length) && !config.questionPattern;

    const saveCurrent = () => {
        if (!current) return;
        if (!current.question || current.options.length < 2 || !current.answer) return;
        parsed.push({ ...current });
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        if (!trimmed) {
            if (p.hasBlankLineSeparator) {
                saveCurrent();
                current = null;
            }
            continue;
        }

        if (p.isSeparator(line)) { saveCurrent(); current = null; continue; }
        if (p.isAnswer(line)) { if (current) current.answer = p.getAnswer(line); continue; }
        if (p.isExplanation(line)) { if (current) current.explanation = p.getExplanation(line); continue; }

        if (p.isOption(line)) {
            if (!current && noQMarker && i > 0) {
                let qi = i - 1;
                while (qi >= 0 && !lines[qi].trim()) qi--;
                if (qi >= 0 && !p.isSeparator(lines[qi]) && !p.isOption(lines[qi]) && !p.isAnswer(lines[qi]) && !p.isExplanation(lines[qi])) {
                    saveCurrent();
                    current = { question: lines[qi].trim().replace(/^\d+[.、]\s*/, ''), options: [], answer: null, explanation: '' };
                }
            }
            if (current) {
                current.options.push({ letter: p.getOptionLetter(line), text: p.getOptionText(line) });
            }
            continue;
        }

        if (p.isQuestion(line)) {
            saveCurrent();
            current = { question: p.getQuestionText(line), options: [], answer: null, explanation: '' };
            continue;
        }

        if (noQMarker && !current) {
            let nextI = i + 1;
            while (nextI < lines.length && !lines[nextI].trim()) nextI++;
            if (nextI < lines.length && p.isOption(lines[nextI])) {
                saveCurrent();
                current = { question: trimmed.replace(/^\d+[.、]\s*/, ''), options: [], answer: null, explanation: '' };
            }
        }
    }
    saveCurrent();
    return normalizeQuestions(parsed);
}
