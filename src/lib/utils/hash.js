const HEX_REGEX = /^[a-f0-9]+$/i;

function toHex(buffer) {
	return Array.from(new Uint8Array(buffer))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}

async function digestBytes(bytes) {
	if (!globalThis.crypto?.subtle) {
		throw new Error('Web Crypto API not available');
	}
	return globalThis.crypto.subtle.digest('SHA-256', bytes);
}

export async function sha256Hex(value = '') {
	const normalized = String(value).normalize('NFKC').trim();
	const encoder = new TextEncoder();
	const data = encoder.encode(normalized);
	const hashBuffer = await digestBytes(data);
	return typeof hashBuffer === 'string' ? hashBuffer : toHex(hashBuffer);
}

export function looksLikeHash(text) {
	if (typeof text !== 'string') return false;
	const trimmed = text.trim();
	return trimmed.length === 64 && HEX_REGEX.test(trimmed);
}
