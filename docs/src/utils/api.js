// 网络请求工具函数

// URL 验证
const VALID_HTTP_PROTOCOLS = new Set(['http:', 'https:']);

export function isValidApiUrl(url) {
    if (!url || typeof url !== 'string') return false;
    try {
        const parsed = new URL(url);
        return VALID_HTTP_PROTOCOLS.has(parsed.protocol);
    } catch (_) {
        return false;
    }
}

// 带超时的 fetch
const FETCH_TIMEOUT_MS = 20000;

export async function fetchWithTimeout(url, options, timeoutMs = FETCH_TIMEOUT_MS) {
    const timerMs = Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : FETCH_TIMEOUT_MS;
    const baseOptions = (options && typeof options === 'object') ? options : {};
    const controller = new AbortController();
    const externalSignal = baseOptions.signal;
    let externalAbortHandler = null;

    if (externalSignal && typeof externalSignal.addEventListener === 'function') {
        if (externalSignal.aborted) {
            controller.abort();
        } else {
            externalAbortHandler = () => controller.abort();
            externalSignal.addEventListener('abort', externalAbortHandler, { once: true });
        }
    }

    const timeoutId = setTimeout(() => controller.abort(), timerMs);

    try {
        return await fetch(url, { ...baseOptions, signal: controller.signal });
    } catch (error) {
        if (error && error.name === 'AbortError' && !(externalSignal && externalSignal.aborted)) {
            throw new Error(`请求超时（>${timerMs}ms）`);
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
        if (externalSignal && externalAbortHandler && typeof externalSignal.removeEventListener === 'function') {
            externalSignal.removeEventListener('abort', externalAbortHandler);
        }
    }
}
