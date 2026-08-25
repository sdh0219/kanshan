interface BoardData {
  detectiveBoard: {
    query: string;
    reason: string;
    complementDim: string;
    zhihuUser: {
      name: string;
      avatar: string;
      url: string;
    } | null;
  }[];
  cardText: string;
}

export default function DetectiveBoard({ board }: { board: BoardData }) {
  if (!board?.detectiveBoard?.length) return null;

  return (
    <section className="case-card p-8">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] text-[#5a6478] tracking-[4px]">SOUL DETECTIVE BOARD</p>
        <span className="stamp stamp-blue text-[10px]">匹配</span>
      </div>
      <h2 className="font-serif-detective text-2xl font-bold text-[#e8dcc4] mb-2">灵魂侦探榜</h2>
      <p className="text-sm text-[#8a94a8] mb-6 leading-relaxed">{board.cardText}</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {board.detectiveBoard.map((item, i) => (
          <div
            key={i}
            className="bg-[#0a0c10]/60 rounded border border-[#232a3b] p-4 hover:border-[#3d5a7a] transition anim-fade-up"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className="flex items-center gap-3 mb-3">
              {item.zhihuUser?.avatar ? (
                <img
                  src={item.zhihuUser.avatar}
                  alt={item.zhihuUser.name}
                  className="w-10 h-10 rounded-full border border-[#2a3245]"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-[#6b9bd1]/15 border border-[#3d5a7a] flex items-center justify-center text-[#6b9bd1] font-serif-detective font-bold">
                  {i + 1}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#e8dcc4] truncate">
                  {item.zhihuUser?.name || '未知侦探'}
                </p>
                <p className="text-xs text-[#d4a24c]">{item.complementDim}</p>
              </div>
            </div>
            <p className="text-xs text-[#8a94a8] leading-relaxed mb-3">{item.reason}</p>
            {item.zhihuUser?.url && (
              <a
                href={item.zhihuUser.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[#6b9bd1] hover:text-[#7fa8d4] transition tracking-wide"
              >
                查看知乎主页 →
              </a>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
