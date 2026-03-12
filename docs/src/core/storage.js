// 存储模块 - 处理 localStorage 操作和数据加密

// Token 混淆（简单的安全措施）
export function obfuscateToken(token) {
    if (!token) return '';
    try {
        const encoded = btoa(unescape(encodeURIComponent(token)));
        const salt = Math.random().toString(36).substring(2, 10);
        return `${salt}:${encoded}:${salt.split('').reverse().join('')}`;
    } catch (e) {
        console.error('Token 混淆失败:', e);
        return token;
    }
}

export function deobfuscateToken(obfuscated) {
    if (!obfuscated) return '';
    try {
        const parts = obfuscated.split(':');
        if (parts.length !== 3) return obfuscated;
        const encoded = parts[1];
        const decoded = decodeURIComponent(escape(atob(encoded)));
        return decoded;
    } catch (e) {
        console.error('Token 解混淆失败:', e);
        return obfuscated;
    }
}

// 安全的 JSON 解析
export function safeJsonParse(text, fallback = null) {
    try {
        return JSON.parse(text);
    } catch (e) {
        console.error('JSON 解析失败:', e);
        return fallback;
    }
}

// 安全的 localStorage 操作
export function safeLocalStorageGet(key, fallback = null) {
    try {
        const value = localStorage.getItem(key);
        return value !== null ? value : fallback;
    } catch (e) {
        console.error('localStorage 读取失败:', e);
        return fallback;
    }
}

export function safeLocalStorageSet(key, value) {
    try {
        localStorage.setItem(key, value);
        return true;
    } catch (e) {
        console.error('localStorage 写入失败:', e);
        if (e.name === 'QuotaExceededError') {
            console.warn('localStorage 容量不足，尝试清理旧数据...');
        }
        return false;
    }
}

// 检查 localStorage 剩余容量（内部使用）
function checkLocalStorageSpace() {
    try {
        const testKey = '__storage_test__';
        const testData = new Array(1024).join('a');
        let size = 0;
        
        for (let key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                size += localStorage[key].length + key.length;
            }
        }
        
        localStorage.setItem(testKey, testData);
        localStorage.removeItem(testKey);
        
        return {
            used: size,
            usedKB: (size / 1024).toFixed(2),
            available: true
        };
    } catch (e) {
        return {
            used: 0,
            usedKB: 0,
            available: false,
            error: e.message
        };
    }
}

// 带容量检查的安全设置
export function safeLocalStorageSetWithCheck(key, value, maxSizeKB = 2048) {
    try {
        const valueSize = (value.length + key.length) / 1024;
        
        if (valueSize > maxSizeKB) {
            console.error(`数据过大 (${valueSize.toFixed(2)}KB)，超过限制 ${maxSizeKB}KB`);
            return false;
        }
        
        localStorage.setItem(key, value);
        return true;
    } catch (e) {
        console.error('localStorage 写入失败:', e);
        
        if (e.name === 'QuotaExceededError') {
            console.warn('localStorage 容量不足');
            const space = checkLocalStorageSpace();
            console.log(`当前使用: ${space.usedKB}KB`);
        }
        return false;
    }
}
