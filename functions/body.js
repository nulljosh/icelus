// Read a JSON body without trusting its size: the tools cap their own inputs, but JSON.parse on a
// 50MB body would burn the CPU budget first. 256KB fits the largest project the tools accept.
export const MAX_BODY = 256 * 1024;

export async function readJson(request) {
  if (Number(request.headers.get('content-length')) > MAX_BODY) return { tooLarge: true };
  const text = await request.text();
  if (text.length > MAX_BODY) return { tooLarge: true };
  try { return { body: JSON.parse(text) }; } catch { return { bad: true }; }
}
