import fetch from 'node-fetch';

const API_BASE = process.env.AGENT_API_BASE || 'https://developer.zhihu.com';
const ACCESS_SECRET = process.env.ZHIHU_ACCESS_SECRET || '';
const MODEL = process.env.AGENT_MODEL || 'zhida-fast-1p5';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

const REQUEST_TIMEOUT_MS = 30000;

export async function chat(messages: ChatMessage[]): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let resp;
  try {
    resp = await fetch(`${API_BASE}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ACCESS_SECRET}`,
        'X-Request-Timestamp': String(Math.floor(Date.now() / 1000)),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model: MODEL, messages }),
      signal: controller.signal,
    });
  } catch (err: any) {
    if (err?.name === 'AbortError') throw new Error(`直答Agent请求超时(${REQUEST_TIMEOUT_MS / 1000}s)`);
    throw err;
  } finally {
    clearTimeout(timer);
  }
  if (!resp.ok) {
    const errText = await resp.text().catch(() => '');
    console.error(`[AgentAPI] ${resp.status}: ${errText.substring(0, 200)}`);
    throw new Error(`直答Agent错误 ${resp.status}`);
  }
  const data = await resp.json() as any;
  return data.choices?.[0]?.message?.content || '';
}

export async function chatJSON(messages: ChatMessage[]): Promise<any> {
  const text = await chat(messages);
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error('[AgentAPI] JSON解析失败:', text.substring(0, 200));
    throw new Error('Agent返回内容无法解析为JSON');
  }
  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    console.error('[AgentAPI] JSON.parse失败:', jsonMatch[0].substring(0, 200));
    throw new Error('Agent返回JSON格式错误');
  }
}

export const agentApi = { chat, chatJSON };
export default agentApi;
