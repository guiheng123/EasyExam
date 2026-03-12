// 文件导入模块 - 文件上传和文本解析

import { $ } from '../utils/dom.js';
import { safeJsonParse } from '../core/storage.js';
import { normalizeQuestions } from '../core/dataProcessor.js';
import { parseTextWithConfig } from '../core/parser.js';
import { PRESET_FORMATS } from '../config/presets.js';
import { showError, hideErrors } from './viewManager.js';

const FILE_SIZE_LIMIT = 5 * 1024 * 1024; // 5MB
let currentFileReadVersion = 0;
let currentFileReader = null;

// finishParsing 回调，由 main.js 注入
let _finishParsingCallback = null;
export function setFinishParsingCallback(fn) {
    _finishParsingCallback = fn;
}

// 文件上传初始化
export function initFileUpload() {
    const uploadZone = $('uploadZone');

    if (uploadZone) {
        uploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadZone.classList.add('drag-over');
        });

        uploadZone.addEventListener('dragleave', () => {
            uploadZone.classList.remove('drag-over');
        });

        uploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadZone.classList.remove('drag-over');
            const file = e.dataTransfer.files[0];
            if (file) processFile(file);
        });
    }
}

export function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) processFile(file);
}

function processFile(file) {
    hideErrors();
    if (!file || typeof file.name !== 'string') {
        showError('无效文件，请重新选择', 'file');
        return;
    }

    const lowerName = file.name.toLowerCase();
    if (!(lowerName.endsWith('.txt') || lowerName.endsWith('.json'))) {
        showError('仅支持 .txt 或 .json 文件', 'file');
        return;
    }

    if (file.size > FILE_SIZE_LIMIT) {
        showError(`文件过大，请控制在 ${Math.round(FILE_SIZE_LIMIT / 1024 / 1024)}MB 以内`, 'file');
        return;
    }

    currentFileReadVersion++;
    const readVersion = currentFileReadVersion;

    if (currentFileReader && currentFileReader.readyState === FileReader.LOADING) {
        try { currentFileReader.abort(); } catch (_) {}
    }

    const reader = new FileReader();
    currentFileReader = reader;

    reader.onerror = () => {
        if (readVersion !== currentFileReadVersion) return;
        showError('文件读取失败，请重试', 'file');
    };

    reader.onload = (e) => {
        if (readVersion !== currentFileReadVersion) return;

        const content = typeof (e && e.target && e.target.result) === 'string' ? e.target.result : '';
        if (!content.trim()) {
            showError('文件内容为空', 'file');
            return;
        }

        if (lowerName.endsWith('.json')) {
            const data = safeJsonParse(content);
            const arr = Array.isArray(data) ? data : (Array.isArray(data?.questions) ? data.questions : []);
            if (!arr.length) {
                showError('JSON 中未找到题目', 'file');
                return;
            }
            const normalized = normalizeQuestions(arr);
            if (!normalized.length) {
                showError('JSON 格式不正确或题目数据不完整', 'file');
                return;
            }
            if (typeof _finishParsingCallback === 'function') _finishParsingCallback(normalized);
            return;
        }

        tryParseText(content);
    };

    reader.onloadend = () => {
        if (readVersion === currentFileReadVersion) {
            currentFileReader = null;
        }
    };

    try {
        reader.readAsText(file, 'utf-8');
    } catch (_) {
        if (readVersion !== currentFileReadVersion) return;
        currentFileReader = null;
        showError('文件读取失败，请重试', 'file');
    }
}

function tryParseText(text) {
    for (const preset of PRESET_FORMATS) {
        const result = parseTextWithConfig(text, preset.config);
        if (result.length > 0) {
            if (typeof _finishParsingCallback === 'function' && _finishParsingCallback(result)) {
                return;
            }
        }
    }
    showError('未能自动识别文件格式，请尝试使用文本粘贴功能手动选择格式', 'file');
}

// 解析预设格式
export function parseWithSelectedPreset(selectedPreset, allFormats) {
    if (!selectedPreset) {
        showError('请先选择一个格式', 'paste');
        return;
    }
    const input = $('presetInput');
    const text = input ? input.value.trim() : '';
    if (!text) {
        showError('请先粘贴题目内容', 'paste');
        return;
    }
    const format = allFormats.find(f => f.id === selectedPreset);
    if (!format) {
        showError('所选格式不存在，请重新选择', 'paste');
        return;
    }
    const parsed = parseTextWithConfig(text, format.config);
    if (!parsed.length) {
        showError('未能解析出任何题目，请检查格式是否正确', 'paste');
        return;
    }
    if (typeof _finishParsingCallback === 'function') _finishParsingCallback(parsed);
}
