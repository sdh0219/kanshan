import { KanshanGif } from '../LiuKanshan';

interface EndingRevealProps {
  endingType: string | null;
  endingText: string | null;
  truth: string | null;
  clues: any[];
  companionName?: string;
  gameMode?: 'solo' | 'team' | null;
}

const endingConfig: Record<string, { title: string; stampClass: string; color: string; gif: 'swing' | 'sleep' | 'sleep'; gifText: string }> = {
  good: { title: '真相浮现', stampClass: 'stamp-green', color: '#6dbb8a', gif: 'swing', gifText: '干得漂亮！' },
  neutral: { title: '真相模糊', stampClass: 'stamp-gold', color: '#d4a24c', gif: 'sleep', gifText: '还差一点……' },
  bad: { title: '错误指控', stampClass: 'stamp-seal', color: '#c05252', gif: 'sleep', gifText: '再想想吧……' },
};

export default function EndingReveal({ endingType, endingText, truth, clues, companionName, gameMode }: EndingRevealProps) {
  const cfg = endingType ? endingConfig[endingType] || endingConfig.neutral : endingConfig.neutral;

  return (
    <section className="case-card p-10 texture-paper text-center anim-fade-up">
      <div className="flex items-center justify-between mb-6">
        <p className="text-[10px] text-[#5a6478] tracking-[4px]">CASE CLOSED</p>
        <span className={`stamp ${cfg.stampClass} text-sm`}>{cfg.title}</span>
      </div>

      <div className="flex justify-center mb-4">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-[#d4a24c]/8 blur-xl" />
          <KanshanGif variant={cfg.gif} size={150} className="relative" />
        </div>
      </div>

      <h2 className="font-serif-detective text-4xl font-bold mb-2" style={{ color: cfg.color }}>
        {cfg.title}
      </h2>
      <p className="text-xs text-[#8a94a8] tracking-[2px] mb-8">{cfg.gifText}</p>

      <div className="bg-[#0a0c10]/70 rounded border border-[#232a3b] p-6 mb-6 text-left max-w-2xl mx-auto">
        <p className="text-[15px] text-[#c9d2e0] leading-8">{endingText}</p>
      </div>

      <div className="grid grid-cols-3 gap-4 max-w-md mx-auto mb-6">
        <div className="bg-[#0a0c10]/60 rounded border border-[#232a3b] p-4">
          <p className="font-serif-detective text-3xl font-bold text-[#6b9bd1]">{clues.length}</p>
          <p className="text-xs text-[#5a6478] mt-1">线索收集</p>
        </div>
        <div className="bg-[#0a0c10]/60 rounded border border-[#232a3b] p-4">
          <p className="font-serif-detective text-3xl font-bold text-[#d4a24c]">
            {clues.filter(c => c.requiresDim).length}
          </p>
          <p className="text-xs text-[#5a6478] mt-1">关键证据</p>
        </div>
        <div className="bg-[#0a0c10]/60 rounded border border-[#232a3b] p-4">
          <p className="font-serif-detective text-3xl font-bold text-[#6dbb8a]">
            {clues.filter(c => c.foundBy === 'companion').length}
          </p>
          <p className="text-xs text-[#5a6478] mt-1">搭档贡献</p>
        </div>
      </div>

      {companionName && gameMode === 'team' && (
        <p className="text-sm text-[#8a94a8] mb-4">
          搭档 <span className="text-[#d4a24c] font-semibold">{companionName}</span> 与你共同破解了此案
        </p>
      )}
      {gameMode === 'solo' && (
        <p className="text-sm text-[#8a94a8] mb-4">
          你独立完成了本次调查
        </p>
      )}

      {truth && (
        <div className="bg-[#0a0c10]/70 rounded border-l-3 border-[#3d5a7a] p-5 max-w-2xl mx-auto text-left" style={{ borderLeftWidth: 3 }}>
          <p className="text-xs text-[#5a6478] mb-2 tracking-widest">完整真相档案</p>
          <p className="text-sm text-[#c9d2e0] leading-relaxed">{truth}</p>
        </div>
      )}
    </section>
  );
}
