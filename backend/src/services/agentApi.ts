import { env } from '../utils/runtime.js';

const REQUEST_TIMEOUT_MS = 30000;

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function chat(messages: ChatMessage[], opts?: { maxTokens?: number }): Promise<string> {
  const apiBase = env('AGENT_API_BASE') || 'https://developer.zhihu.com';
  const model = env('AGENT_MODEL') || 'zhida-fast-1p5';
  let resp;
  try {
    resp = await fetch(`${apiBase}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env('ZHIHU_ACCESS_SECRET') || ''}`,
        'X-Request-Timestamp': String(Math.floor(Date.now() / 1000)),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        // 不显式给上限时部分模型默认很小，长 JSON 会被截断成非法输出
        ...(opts?.maxTokens ? { max_tokens: opts.maxTokens } : {}),
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (err: any) {
    if (err?.name === 'AbortError' || err?.message?.includes('abort')) {
      throw new Error(`直答Agent请求超时(${REQUEST_TIMEOUT_MS / 1000}s)`);
    }
    throw err;
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
  const tryParse = (text: string): any => {
    // 清洗 markdown 代码栅栏与前后杂文，取首个 { 到最后一个 }
    const cleaned = text.replace(/```(?:json)?/gi, '');
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error(`[AgentAPI] JSON解析失败，原始内容前300字: ${text.substring(0, 300)}`);
      throw new Error('Agent返回内容无法解析为JSON');
    }
    return JSON.parse(jsonMatch[0]);
  };

  try {
    return tryParse(await chat(messages, { maxTokens: 2000 }));
  } catch (firstErr) {
    // 模型偶发输出纯文本或截断：追加强制JSON指令重试一次
    console.error(`[AgentAPI] JSON首试失败，重试: ${(firstErr as Error).message}`);
    const retryMessages: ChatMessage[] = [
      ...messages,
      { role: 'user' as const, content: '你上一次的输出不是合法JSON。请重新输出：跳过所有客套和分析过程，第一个字符就是 {，最后一个字符是 }，只输出JSON本体。' },
    ];
    return tryParse(await chat(retryMessages, { maxTokens: 2000 }));
  }
}

export const agentApi = { chat, chatJSON };
export default agentApi;
