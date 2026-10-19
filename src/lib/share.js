// Share links carry the whole project in the URL hash, deflated and base64url'd: no server, nothing stored.
// The hash never reaches the server, so a shared sketch stays between the people who have the link.

async function pipe(bytes, stream) {
  return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer());
}

export async function encodeShare(json) {
  const bytes = await pipe(new TextEncoder().encode(json), new CompressionStream('deflate-raw'));
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// A link can be crafted to inflate into gigabytes, so stop reading past what a real project needs.
export const MAX_SHARE = 2 * 1024 * 1024;

// Returns the project JSON, or null for anything that is not a share code (or inflates past MAX_SHARE).
export async function decodeShare(code) {
  try {
    const bin = atob(code.replace(/-/g, '+').replace(/_/g, '/'));
    const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
    const reader = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader();
    const chunks = [];
    let size = 0;
    for (let r; !(r = await reader.read()).done;) {
      size += r.value.length;
      if (size > MAX_SHARE) { reader.cancel(); return null; }
      chunks.push(r.value);
    }
    return new TextDecoder().decode(await new Blob(chunks).arrayBuffer());
  } catch {
    return null;
  }
}
