interface CompanionCardProps {
  companion: {
    name: string;
    personality: string;
    strength: string;
    speech_style: string;
    complement_dim: string;
  };
  intro: string;
  fingerprintSummary?: string;
}

export default function CompanionCard({ companion, intro }: CompanionCardProps) {
  return (
    <section className="case-card p-8 border-[#8a6d35]/50 texture-paper">
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full border-2 border-[#d4a24c] bg-[#d4a24c]/10 flex items-center justify-center font-serif-detective text-2xl font-bold text-[#d4a24c]">
            {companion.name?.[0]}
          </div>
          <div>
            <p className="text-[10px] text-[#5a6478] tracking-[3px] mb-1">YOUR DETECTIVE PARTNER</p>
            <h2 className="font-serif-detective text-2xl font-bold text-[#e8dcc4]">{companion.name}</h2>
            <p className="text-sm text-[#d4a24c] mt-0.5">互补型AI侦探搭档</p>
          </div>
        </div>
        <span className="stamp stamp-gold text-xs">待命</span>
      </div>

      <div className="bg-[#0a0c10]/70 rounded border-l-3 border-[#8a6d35] p-5 mb-5" style={{ borderLeftWidth: 3 }}>
        <p className="text-[15px] text-[#c9d2e0] leading-8 italic">"{intro}"</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-[#0a0c10]/60 rounded border border-[#232a3b] p-4">
          <p className="text-xs text-[#5a6478] mb-1.5 tracking-widest">互补维度</p>
          <p className="text-sm text-[#d4a24c]">{companion.complement_dim}</p>
        </div>
        <div className="bg-[#0a0c10]/60 rounded border border-[#232a3b] p-4">
          <p className="text-xs text-[#5a6478] mb-1.5 tracking-widest">探案特长</p>
          <p className="text-sm text-[#6dbb8a]">{companion.strength}</p>
        </div>
        <div className="bg-[#0a0c10]/60 rounded border border-[#232a3b] p-4">
          <p className="text-xs text-[#5a6478] mb-1.5 tracking-widest">说话风格</p>
          <p className="text-sm text-[#8a94a8] leading-relaxed">{companion.speech_style}</p>
        </div>
      </div>
    </section>
  );
}
