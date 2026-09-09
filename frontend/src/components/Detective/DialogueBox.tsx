import { useEffect, useRef } from 'react';
import { KanshanPortrait } from '../LiuKanshan';
import ThinkingDots from './ThinkingDots';

interface DialogueEntry {
  role: 'player' | 'npc' | 'companion' | 'kanshan';
  content: string;
  npcId?: string;
}

interface DialogueBoxProps {
  dialogues: DialogueEntry[];
  npcList?: any[];
  currentNpcId: string | null;
  question: string;
  setQuestion: (v: string) => void;
  onTalk: (npcId: string) => void;
  loading: boolean;
  companionThinking?: boolean;
}

const roleConfig: Record<string, { name: string; color: string; borderColor: string }> = {
  player: { name: '你', color: 'text-[#6b9bd1]', borderColor: '#6b9bd1' },
  npc: { name: 'NPC', color: 'text-[#c9d2e0]', borderColor: '#2a3245' },
  companion: { name: '搭档', color: 'text-[#d4a24c]', borderColor: '#d4a24c' },
  kanshan: { name: '看山', color: 'text-[#6dbb8a]', borderColor: '#6dbb8a' },
};

export default function DialogueBox({ dialogues, npcList, currentNpcId, question, setQuestion, onTalk, loading, companionThinking }: DialogueBoxProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [dialogues]);

  const npcName = (npcId: string | null) => {
    if (!npcId) return '证人';
    const npc = npcList?.find((n: any) => n.id === npcId || n.name === npcId);
    return npc?.name || '证人';
  };

  return (
    <div className="case-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-serif-detective text-sm font-bold text-[#6b9bd1] tracking-widest">
          讯问 · 证人对话
        </h3>
        <span className="text-[10px] text-[#5a6478] tracking-[2px]">INTERROGATION</span>
      </div>

      {npcList && npcList.length > 0 && (
        <div className="flex gap-2 mb-4 flex-wrap">
          {npcList.map((npc: any) => (
            <button
              key={npc.id}
              onClick={() => onTalk(npc.id)}
              disabled={loading}
              className={`text-xs px-3 py-1.5 rounded border transition disabled:opacity-50 ${
                currentNpcId === npc.id
                  ? 'bg-[#6b9bd1]/15 text-[#6b9bd1] border-[#6b9bd1]'
                  : 'bg-[#0a0c10]/60 text-[#8a94a8] border-[#232a3b] hover:border-[#3d5a7a] hover:text-[#c9d2e0]'
              }`}
            >
              {npc.name} <span className="text-[10px] opacity-70">· {npc.role}</span>
            </button>
          ))}
        </div>
      )}

      <div className="space-y-3 max-h-80 overflow-y-auto scrollbar-thin mb-4 pr-1">
        {dialogues.length === 0 && (
          <div className="text-center py-10">
            <p className="text-sm text-[#5a6478]">选择一位证人开始讯问，或先进行搜证</p>
            <p className="text-[10px] text-[#3d4557] mt-2 tracking-widest">提示：自由提问，观察证人反应</p>
          </div>
        )}
        {dialogues.map((d, i) => {
          const cfg = roleConfig[d.role] || roleConfig.npc;
          const name = d.role === 'npc' ? npcName(d.npcId || currentNpcId) : cfg.name;
          return (
            <div key={i} className="flex gap-2.5 anim-fade-in">
              {d.role === 'kanshan' ? (
                <KanshanPortrait pose={2} size={30} className="shrink-0 mt-0.5" />
              ) : (
                <div className="w-[30px] h-[30px] rounded-full border shrink-0 mt-0.5 flex items-center justify-center text-[10px] font-bold"
                  style={{ borderColor: cfg.borderColor, color: cfg.borderColor }}>
                  {d.role === 'player' ? '你' : d.role === 'companion' ? '伴' : name[0]}
                </div>
              )}
              <div className="flex-1 min-w-0 border-l-2 pl-3 py-1" style={{ borderColor: cfg.borderColor }}>
                <span className={`text-xs font-semibold ${cfg.color} tracking-wider`}>{name}</span>
                <p className="text-sm text-[#c9d2e0] mt-1 leading-relaxed">{d.content}</p>
              </div>
            </div>
          );
        })}
        {loading && (
          <p className="text-xs text-[#8a6d35] anim-fade-in">
            <ThinkingDots text="对方正在回应" />
          </p>
        )}
        {!loading && companionThinking && (
          <p className="text-xs text-[#d4a24c] anim-fade-in">
            <ThinkingDots text="搭档正在思考" />
          </p>
        )}
        <div ref={endRef} />
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && currentNpcId && onTalk(currentNpcId)}
          placeholder={currentNpcId ? `向${npcName(currentNpcId)}提问...` : '先选择讯问对象'}
          disabled={!currentNpcId || loading}
          className="input-detective flex-1 px-4 py-2.5 text-sm disabled:opacity-40"
        />
        <button
          onClick={() => currentNpcId && onTalk(currentNpcId)}
          disabled={loading || !currentNpcId || !question.trim()}
          className="btn-primary px-6 text-sm whitespace-nowrap"
        >
          提问
        </button>
      </div>
    </div>
  );
}
