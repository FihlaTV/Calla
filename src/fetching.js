import { isFunction } from "./typeChecks";
import { LRUCache } from "./LRUCache";

/**
 * @param {string} path
 * @returns {Promise<Response>}
 */
export async function getResponse(path) {
    const request = fetch(path);
    const response = await request;
    if (!response.ok) {
        throw new Error(`[${response.status}] - ${response.statusText}`);
    }
    return response;
}

/**
 * @callback progressCallback
 * @param {number} soFar
 * @param {number} total
 * @param {string?} message
 **/

/**
 * @typedef {object} getPartsReturnType
 * @property {Uint8Array} buffer
 * @property {string} contentType
 **/

/**
 * @param {string} path
 * @param {progressCallback} onProgress
 * @returns {Promise<getPartsReturnType>}
 */
export async function getBufferWithProgress(path, onProgress) {
    if (!isFunction(onProgress)) {
        throw new Error("progress callback is required");
    }

    onProgress(0, 1, path);
    const response = await getResponse(path);

    const contentLength = parseInt(response.headers.get("Content-Length"), 10);
    if (!contentLength) {
        throw new Error("Server did not provide a content length header.");
    }

    const contentType = response.headers.get("Content-Type");
    if (!contentType) {
        throw new Error("Server did not provide a content type");
    }

    const reader = response.body.getReader();
    const buffer = new Uint8Array(contentLength);
    let receivedLength = 0;
    while (true) {
        const { done, value } = await reader.read();
        if (done) {
            break;
        }

        if (receivedLength + value.length > contentLength) {
            throw new Error("Whoa! Recieved content exceeded expected amount");
        }

        buffer.set(value, receivedLength);
        receivedLength += value.length;
        onProgress(receivedLength, contentLength, path);
    }

    onProgress(1, 1, path);

    return { buffer, contentType };
}

/**
 * @param {string} path
 * @param {progressCallback} onProgress
 * @returns {Promise<any>}
 */
export async function getObjectWithProgress(path, onProgress) {
    const { buffer } = await getBufferWithProgress(path, onProgress);
    const decoder = new TextDecoder("utf-8");
    const text = decoder.decode(buffer);
    const obj = JSON.parse(text);
    return obj;
}


/**
 * @param {string} path
 * @param {progressCallback} onProgress
 * @returns {Promise<Blob>}
 */
export async function getBlobWithProgress(path, onProgress) {
    const { buffer, contentType } = await getBufferWithProgress(path, onProgress);
    const blob = new Blob([buffer], { type: contentType });
    return blob;
}

/** @type {Map<string, string>} */
const cache = new Map();

/**
 * @param {string} path
 * @param {progressCallback} onProgress
 * @returns {Promise<string>}
 */
export async function getFileWithProgress(path, onProgress) {
    const key = path;
    if (cache.has(key)) {
        onProgress(0, 1, path);
        const blobUrl = cache.get(key);
        onProgress(1, 1, path);
        return blobUrl;
    }
    else {
        const blob = await getBlobWithProgress(path, onProgress);
        const blobUrl = URL.createObjectURL(blob);
        cache.set(key, blobUrl);
        return blobUrl;
    }
}

/**
 * @param {string} path
 * @param {progressCallback?} onProgress
 * @returns {Promise<any>}
 */
export async function getObject(path, onProgress = null) {
    if (isFunction(onProgress)) {
        return await getObjectWithProgress(path, onProgress);
    }

    const response = await getResponse(path);
    const obj = await response.json();
    return obj;
}

/**
 * @param {string} path
 * @param {progressCallback?} onProgress
 * @returns {Promise<Blob>}
 */
export async function getBlob(path, onProgress = null) {
    if (isFunction(onProgress)) {
        return await getBlobWithProgress(path, onProgress);
    }

    const response = await getResponse(path);
    const blob = await response.blob();
    return blob;
}

/**
 * @param {string} path
 * @param {progressCallback?} onProgress
 * @returns {Promise<string>}
 */
export async function getFile(path, onProgress = null) {
    if (isFunction(onProgress)) {
        return await getFileWithProgress(path, onProgress);
    }

    const blob = await getBlob(path);
    const blobUrl = URL.createObjectURL(blob);
    return blobUrl;
}
