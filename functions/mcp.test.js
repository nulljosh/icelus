import { describe, it, expect } from 'vitest';
import { onRequest } from './mcp.js';

const rpc = async (method, params) => {
  const res = await onRequest({ request: new Request('https://x/mcp', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }) }) });
  return res.json();
};

describe('mcp resources and prompts', () => {
  it('says it has them', async () => {
    expect((await rpc('initialize', {})).result.capabilities).toEqual({ tools: {}, resources: {}, prompts: {} });
  });
  it('lists and reads resources, and refuses unknown ones', async () => {
    const { resources } = (await rpc('resources/list')).result;
    const read = await rpc('resources/read', { uri: resources.find(r => r.uri.includes('sign-in')).uri });
    expect(JSON.parse(read.result.contents[0].text).blockprint).toBe(1);
    expect((await rpc('resources/read', { uri: 'icelus://secrets' })).error.code).toBe(-32002);
    expect((await rpc('resources/read', null)).error.code).toBe(-32002);
  });
  it('lists and fills prompts, and refuses bad arguments', async () => {
    expect((await rpc('prompts/list')).result.prompts).toHaveLength(3);
    expect((await rpc('prompts/get', { name: 'sketch_screen', arguments: { description: 'a login' } })).result.messages[0].role).toBe('user');
    expect((await rpc('prompts/get', { name: 'sketch_screen', arguments: null })).error.code).toBe(-32602);
    expect((await rpc('prompts/get', { name: 'rm -rf' })).error.code).toBe(-32602);
  });
});
