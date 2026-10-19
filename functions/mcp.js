// Stateless MCP over HTTP: no sessions to keep, so the streamable transport reduces to
// JSON-RPC in, JSON-RPC out. ponytail: hand-rolled to avoid the agents SDK + a Durable
// Object. The transport is ported from sidewise/src/mcp.js, which is already right on the
// edge cases worth keeping — `params: null`, `arguments: null`, notifications/initialized,
// and a throwing tool coming back as a tool result rather than a dead connection.
//
// The tools themselves live in src/lib/tools.js, shared with functions/api/, so the REST
// and MCP surfaces cannot describe different behaviour.

import { callTool, ToolError, TOOLS } from '../src/lib/tools.js';
import { readJson } from './body.js';
import { RESOURCES, readResource, PROMPTS, getPrompt } from '../src/lib/agentkit.js';

const VERSION = '38.0.0';

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'content-type, mcp-protocol-version',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
};

const json = (body, init = {}) => new Response(JSON.stringify(body), {
  ...init,
  headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...CORS, ...init.headers },
});

export async function onRequest({ request: req }) {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'POST') return json({ error: 'POST JSON-RPC to this endpoint' }, { status: 405 });

  const { body: msg, bad, tooLarge } = await readJson(req);
  if (tooLarge) return json({ jsonrpc: '2.0', id: null, error: { code: -32600, message: 'Request too large' } }, { status: 413 });
  if (bad) return json({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }, { status: 400 });
  if (!msg || typeof msg !== 'object' || Array.isArray(msg)) {
    return json({ jsonrpc: '2.0', id: null, error: { code: -32600, message: 'Invalid Request' } }, { status: 400 });
  }

  // `params = {}` only defaults on undefined, so an explicit `"params": null` — which is
  // valid JSON-RPC — would otherwise reach `params.protocolVersion` and throw a 500.
  const { id = null, method } = msg;
  const params = msg.params && typeof msg.params === 'object' ? msg.params : {};
  const reply = result => json({ jsonrpc: '2.0', id, result });

  switch (method) {
    case 'initialize':
      return reply({
        protocolVersion: params.protocolVersion || '2025-06-18',
        capabilities: { tools: {}, resources: {}, prompts: {} },
        serverInfo: { name: 'icelus', version: VERSION },
      });
    case 'notifications/initialized':
      return new Response(null, { status: 202, headers: CORS });
    case 'ping':
      return reply({});
    case 'tools/list':
      return reply({ tools: TOOLS });
    case 'resources/list':
      return reply({ resources: RESOURCES });
    case 'resources/read': {
      const entry = RESOURCES.find(r => r.uri === params.uri);
      const text = entry && readResource(entry.uri);
      if (!text) return json({ jsonrpc: '2.0', id, error: { code: -32002, message: `Resource not found: ${params.uri}` } });
      return reply({ contents: [{ uri: entry.uri, mimeType: entry.mimeType, text }] });
    }
    case 'prompts/list':
      return reply({ prompts: PROMPTS });
    case 'prompts/get': {
      const prompt = getPrompt(params.name, params.arguments || {});
      if (!prompt || prompt.error) {
        return json({ jsonrpc: '2.0', id, error: { code: -32602, message: prompt ? prompt.error : `Unknown prompt: ${params.name}` } });
      }
      return reply(prompt);
    }
    case 'tools/call': {
      let result;
      try {
        result = callTool(params.name, params.arguments || {});
      } catch (err) {
        // A tool rejecting its input is a tool result, not a transport error — the client
        // should see the message and be able to retry, not get a dead connection.
        if (err instanceof ToolError) {
          return reply({ content: [{ type: 'text', text: `icelus: ${err.message}` }], isError: true });
        }
        throw err;
      }
      if (!result) {
        return json({ jsonrpc: '2.0', id, error: { code: -32602, message: `Unknown tool: ${params.name}` } });
      }
      return reply({ content: [{ type: 'text', text: JSON.stringify(result) }], structuredContent: result });
    }
    default:
      return json({ jsonrpc: '2.0', id, error: { code: -32601, message: `Method not found: ${method}` } });
  }
}
