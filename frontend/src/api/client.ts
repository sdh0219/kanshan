// 默认走同域 /api（Worker 通过 ASSETS 一体化托管前端，无需跨域）；
// 若前后端分域部署，build 时设置 VITE_API_BASE 指向 Worker 公网地址即可
const BASE = import.meta.env.VITE_API_BASE || '/api';

async function postJSON(path: string, body: Record<string, any>) {
  const resp = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || `HTTP ${resp.status}`);
  }
  return resp.json();
}

async function getJSON(path: string) {
  const resp = await fetch(`${BASE}${path}`);
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || `HTTP ${resp.status}`);
  }
  return resp.json();
}

export const api = {
  fingerprint: {
    analyze: (userId: string) => postJSON('/fingerprint/analyze', { userId }),
    seedUsers: () => getJSON('/fingerprint/seed-users'),
  },
  companion: {
    generate: (fingerprint: any) => postJSON('/companion/generate', { fingerprint }),
    intro: (fingerprint: any, companion: any) => postJSON('/companion/intro', { fingerprint, companion }),
    action: (data: any) => postJSON('/companion/action', data),
    templates: () => getJSON('/companion/templates'),
  },
  game: {
    cases: () => getJSON('/game/cases'),
    case: (caseId: string) => getJSON(`/game/case?caseId=${encodeURIComponent(caseId)}`),
    start: (caseId: string) => postJSON('/game/start', { caseId }),
    search: (keyword: string, state: any, caseId: string) =>
      postJSON('/game/search', { keyword, state, caseId }),
    talk: (npcId: string, question: string, state: any, caseId: string) =>
      postJSON('/game/talk', { npcId, question, state, caseId }),
    evaluate: (state: any, caseId: string, reasoning?: string) =>
      postJSON('/game/evaluate', { state, caseId, reasoning }),
  },
  archive: {
    cases: () => getJSON('/archive/cases'),
    case: (caseId: string) => getJSON(`/archive/case?caseId=${encodeURIComponent(caseId)}`),
    hotTopics: () => getJSON('/archive/hot-topics'),
    generate: (hotTopicIndex: number) => postJSON('/archive/generate', { hotTopicIndex }),
    custom: (userInput: string, userId: string) => postJSON('/archive/custom', { userInput, userId }),
    saveRecord: (data: any) => postJSON('/archive/record', data),
    records: (userId: string) => getJSON(`/archive/records?userId=${encodeURIComponent(userId)}`),
  },
  social: {
    detectiveBoard: (fingerprint: any) => postJSON('/social/detective-board', { fingerprint }),
  },
};

export default api;
