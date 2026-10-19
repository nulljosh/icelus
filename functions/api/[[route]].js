// REST surface. Thin: every route is argument-shuffling around callTool() in
// src/lib/tools.js, which functions/mcp.js also calls. No grid logic lives here.

import { callTool, ToolError, TOOL_NAMES } from '../../src/lib/tools.js';
import { readJson, MAX_BODY } from '../body.js';
import { safePageUrl } from '../../src/lib/capture.js';
import { describeMessages, cleanReply } from '../../src/lib/describe.js';

// The model behind Describe it. Free tier Workers AI; the daily quota is the ceiling on what it can cost.
const MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
// Only the app may ask, so another site cannot spend the quota. Not a lock (a script can send any Origin).
const APP_ORIGIN = /^https:\/\/((icelus|morphis|morpheus|glyphbox|wiretext)\.jaybulb\.com|[a-z0-9-]+\.wiretext\.pages\.dev)$|^http:\/\/localhost(:\d+)?$/;

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'content-type',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
};

const json = (body, status = 200) =>
  new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...CORS },
  });

const ENDPOINTS = {
  'GET /api/components': 'The component palette. Optional ?category=',
  'POST /api/place': '{ text?, componentId, col, row, cols?, rows? } -> { text }',
  'POST /api/render': '{ text, cols?, rows? } -> { text }',
  'POST /api/parse': '{ source, cols?, rows? } -> { text, project }. The typed syntax, see the sketch_to_wireframe tool.',
  'POST /api/edit': '{ project, ops } -> { text, project }. Move, resize, restyle, delete parts and draw arrows.',
  'POST /api/capture': '{ url } -> { source, text, project }. A public web page back as a wireframe.',
  'POST /api/describe': '{ message, current?, history? } -> { source, text, project }. A screen from a sentence, from the app only.',
  'POST /mcp': 'Model Context Protocol, JSON-RPC. The same tools.',
};

const run = (name, args) => {
  try {
    return json(callTool(name, args));
  } catch (err) {
    // Bad input is the caller's to fix, so say what was wrong rather than 500ing.
    if (err instanceof ToolError) return json({ error: err.message, tool: name }, 400);
    throw err;
  }
};

export async function onRequest({ request, env }) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, '');

  if (request.method === 'GET' && path === '/api/components') {
    const category = url.searchParams.get('category') ?? undefined;
    return run('list_components', { category });
  }

  if (request.method === 'POST' && (path === '/api/place' || path === '/api/render' || path === '/api/parse' || path === '/api/edit')) {
    const { body, bad, tooLarge } = await readJson(request);
    if (tooLarge) return json({ error: `Body is over ${MAX_BODY} bytes.` }, 413);
    if (bad) return json({ error: 'Body must be JSON.' }, 400);
    const tool = { '/api/place': 'place_component', '/api/render': 'render_wireframe', '/api/parse': 'sketch_to_wireframe', '/api/edit': 'edit_project' }[path];
    return run(tool, body);
  }

  if (request.method === 'POST' && path === '/api/capture') {
    const { body, bad, tooLarge } = await readJson(request);
    if (tooLarge) return json({ error: `Body is over ${MAX_BODY} bytes.` }, 413);
    if (bad) return json({ error: 'Body must be JSON.' }, 400);
    const page = safePageUrl(body?.url);
    if (!page) return json({ error: 'url must be a public http or https page.' }, 400);
    const html = await fetchPage(page);
    // 422, not 502: Cloudflare swaps a Function's 502 for its own error page, which hides the reason.
    if (html.error) return json({ error: html.error }, 422);
    return run('html_to_wireframe', { html: html.text, cols: body.cols, rows: body.rows });
  }

  if (request.method === 'POST' && path === '/api/describe') {
    if (!APP_ORIGIN.test(request.headers.get('origin') ?? '')) return json({ error: 'Describe it works from the Icelus app.' }, 403);
    if (!env?.AI) return json({ error: 'Describe it is not set up here.' }, 503);
    const { body, bad, tooLarge } = await readJson(request);
    if (tooLarge) return json({ error: `Body is over ${MAX_BODY} bytes.` }, 413);
    if (bad) return json({ error: 'Body must be JSON.' }, 400);
    const messages = describeMessages(body?.message, { history: body?.history, current: typeof body?.current === 'string' ? body.current : '' });
    if (!messages) return json({ error: 'Say what the screen is for.' }, 400);
    let reply;
    try {
      reply = await env.AI.run(MODEL, { messages, max_tokens: 700, temperature: 0.4 });
    } catch (err) {
      return json({ error: /limit|quota|capacity/i.test(String(err)) ? 'Describe it is busy. Try again in a minute.' : 'The model did not answer. Try again.' }, 422);
    }
    const source = cleanReply(reply?.response);
    if (!source) return json({ error: 'The model did not draw a screen. Try saying it another way.' }, 422);
    try {
      return json({ source, ...callTool('sketch_to_wireframe', { source, cols: body.cols, rows: body.rows }) });
    } catch (err) {
      if (err instanceof ToolError) return json({ error: err.message }, 422);
      throw err;
    }
  }

  if (path === '/api' || path === '/api/') return json({ endpoints: ENDPOINTS, tools: TOOL_NAMES });

  return json({ error: `Unknown endpoint: ${request.method} ${path}`, endpoints: ENDPOINTS }, 404);
}

// Fetch a page for /api/capture: 8 seconds, HTML only, the first 2 MB. Redirects are followed but each hop
// must still be a public page.
const PAGE_BYTES = 2_000_000;
async function fetchPage(url, hops = 0) {
  let res;
  try {
    res = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(8000),
      headers: { 'user-agent': 'Icelus capture (+https://icelus.jaybulb.com)', accept: 'text/html' } });
  } catch { return { error: 'The page did not answer.' }; }
  if (res.status >= 300 && res.status < 400 && res.headers.get('location') && hops < 3) {
    const next = safePageUrl(new URL(res.headers.get('location'), url).href);
    return next ? fetchPage(next, hops + 1) : { error: 'The page redirects somewhere it cannot be read from.' };
  }
  if (!res.ok) return { error: `The page answered ${res.status}.` };
  if (!/text\/html|application\/xhtml/i.test(res.headers.get('content-type') ?? '')) return { error: 'That is not a web page.' };
  const reader = res.body.getReader(), chunks = [];
  let size = 0;
  while (size < PAGE_BYTES) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value); size += value.length;
  }
  reader.cancel().catch(() => {});
  const all = new Uint8Array(Math.min(size, PAGE_BYTES));
  let at = 0;
  for (const c of chunks) { const part = c.subarray(0, all.length - at); all.set(part, at); at += part.length; }
  return { text: new TextDecoder().decode(all) };
}
