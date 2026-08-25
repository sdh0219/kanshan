interface Clue {
  id: string;
  keyword: string;
  content: string;
  foundBy: 'player' | 'companion';
  requiresDim?: string;
}

export default function ClueWall({ clues, requiredCount = 3 }: { clues: Clue[]; requiredCount?: number }) {
  const keyClues = clues.filter(c => c.requiresDim).length;

  return (
    <div className="case-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-serif-detective text-sm font-bold text-[#d4a24c] tracking-widest">
          线索墙
        </h3>
        <span className={`text-xs ${keyClues >= requiredCount ? 'text-[#6dbb8a]' : 'text-[#8a94a8]'}`}>
          关键证据 {keyClues}/{requiredCount}
        </span>
      </div>

      {/* 进度条 */}
      <div className="h-1.5 bg-[#232a3b] rounded-full overflow-hidden mb-4">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            keyClues >= requiredCount
              ? 'bg-gradient-to-r from-[#4a7a5c] to-[#6dbb8a]'
              : 'bg-gradient-to-r from-[#8a6d35] to-[#d4a24c]'
          }`}
          style={{ width: `${Math.min(100, (keyClues / requiredCount) * 100)}%` }}
        />
      </div>

      {clues.length === 0 ? (
        <div className="text-center py-8">
          <span className="stamp stamp-gold text-[10px] mb-3 inline-block">空</span>
          <p className="text-sm text-[#5a6478]">尚无线索。搜证或讯问以收集证据。</p>
        </div>
      ) : (
        <div className="space-y-2">
          {clues.map((clue) => (
            <div
              key={clue.id}
              className={`rounded border p-3 anim-fade-up ${
                clue.foundBy === 'companion'
                  ? 'bg-[#d4a24c]/8 border-[#8a6d35]/50'
                  : 'bg-[#0a0c10]/60 border-[#232a3b]'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-[#d4a24c] tracking-wide">
                  {clue.keyword}
                </span>
                <div className="flex gap-1.5">
                  {clue.requiresDim && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#c05252]/15 text-[#c05252]">
                      关键
                    </span>
                  )}
                  {clue.foundBy === 'companion' && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#d4a24c]/15 text-[#d4a24c]">
                      搭档发现
                    </span>
                  )}
                </div>
              </div>
              <p className="text-sm text-[#c9d2e0] leading-relaxed">{clue.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
