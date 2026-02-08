// @ts-nocheck
import fs from 'node:fs';
import path from 'node:path';

// Import the WASM file as a bundled asset.
// Bun will resolve this to an internal path within the compiled executable.
import tiktokenWasmPath from 'tiktoken/tiktoken_bg.wasm' with { type: 'file' };
import tiktokenLiteWasmPath from 'tiktoken/lite/tiktoken_bg.wasm' with { type: 'file' };

const originalReadFileSync = fs.readFileSync;
const originalReadFile = fs.readFile;

// Log for debugging (optional - remove in prod if too noisy, or keep for diagnostics)
// console.log(`[Shim] Tiktoken paths initialized: Main=${tiktokenWasmPath}, Lite=${tiktokenLiteWasmPath}`);

/**
 * Shim for fs.readFileSync to redirect tiktoken WASM reads to the bundled asset.
 */
fs.readFileSync = (pathOrFd: any, options: any) => {
    if (typeof pathOrFd === 'string' && pathOrFd.endsWith('tiktoken_bg.wasm')) {
        const isLite = pathOrFd.includes('lite');
        const internalPath = isLite ? tiktokenLiteWasmPath : tiktokenWasmPath;

        // Intercept and read from the bundled asset location
        return originalReadFileSync(internalPath, options);
    }
    return originalReadFileSync(pathOrFd, options);
};

/**
 * Shim for fs.readFile (async) just in case.
 */
fs.readFile = (pathOrFd: any, ...args: any[]) => {
    if (typeof pathOrFd === 'string' && pathOrFd.endsWith('tiktoken_bg.wasm')) {
        const isLite = pathOrFd.includes('lite');
        const internalPath = isLite ? tiktokenLiteWasmPath : tiktokenWasmPath;

        return originalReadFile(internalPath, ...args);
    }
    return originalReadFile(pathOrFd, ...args);
};

export {};
