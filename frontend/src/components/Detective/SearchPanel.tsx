import { KanshanGif } from '../LiuKanshan';

interface SearchPanelProps {
  keyword: string;
  setKeyword: (v: string) => void;
  onSearch: () => void;
  results: any[];
  loading: boolean;
  hints?: { keyword: string; hint: string }[];
}

export default function SearchPanel({ keyword, setKeyword, onSearch, results, loading, hints }: SearchPanelProps) {
  return (
    <div className="case-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <KanshanGif variant="computer" size={44} className="shrink-0" />
          <h3 className="font-serif-detective text-sm font-bold text-[#6b9bd1] tracking-widest">
            搜证 · 知乎网络搜索
          </h3>
        </div>
        <span className="text-[10px] text-[#5a6478] tracking-[2px]">EVIDENCE SEARCH</span>
      </div>

      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSearch()}
          placeholder="输入关键词，在知乎真实内容中搜证..."
          className="input-detective flex-1 px-4 py-2.5 text-sm"
        />
        <button
          onClick={onSearch}
          disabled={loading || !keyword.trim()}
          className="btn-solo px-6 text-sm whitespace-nowrap"
        >
          {loading ? '检索中' : '搜证'}
        </button>
      </div>

      {hints && hints.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-[#5a6478] mb-2">看山的调查方向提示（点击填入）：</p>
          <div className="flex flex-wrap gap-2">
            {hints.map((h, i) => (
              <button
                key={i}
                onClick={() => setKeyword(h.keyword)}
                className="text-xs px-3 py-1.5 bg-[#0a0c10]/60 border border-[#232a3b] rounded text-[#8a94a8] hover:border-[#8a6d35] hover:text-[#d4a24c] transition"
                title={h.hint}
              >
                {h.keyword}
              </button>
            ))}
          </div>
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin">
          <p className="text-[10px] text-[#5a6478] tracking-widest border-b border-[#232a3b] pb-2">
            检索结果 · 来自知乎真实内容
          </p>
          {results.map((r, i) => (
            <div key={i} className="bg-[#0a0c10]/60 rounded border border-[#232a3b] p-3 hover:border-[#2a3245] transition">
              <p className="text-sm text-[#c9d2e0] font-medium mb-1">
                {r.title || r.Title || r.target?.title || '搜索结果'}
              </p>
              <p className="text-xs text-[#5a6478] line-clamp-2 leading-relaxed">
                {(r.content || r.excerpt || r.ContentText || r.content_text || r.target?.excerpt || '').substring(0, 150)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
