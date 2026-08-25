import { useGameStore } from '../stores/gameStore';
import RadarChart from '../components/Fingerprint/RadarChart';
import CompanionCard from '../components/Companion/CompanionCard';

export default function FingerprintPage() {
  const { fingerprint, companion, companionIntro, setPage, userId } = useGameStore();

  const dims = fingerprint?.dimensions || [];
  const profile = fingerprint?.detective_profile;

  const playerRadarData = dims.map((d: any) => ({
    dimension: d.name.split('-')[0],
    score: 10 - d.score,
  }));
  const companionRadarData = dims.map((d: any) => {
    const sorted = [...dims].sort((a: any, b: any) => a.score - b.score);
    const isWeak = sorted.slice(0, 2).includes(d);
    return {
      dimension: d.name.split('-')[0],
      score: isWeak ? 9 : 5,
    };
  });

  return (
    <div className="space-y-6">
      {/* 档案头 */}
      <div className="border-b border-[#232a3b] pb-4 flex items-end justify-between">
        <div>
          <p className="text-[10px] text-[#5a6478] tracking-[4px] mb-1">DETECTIVE PROFILE</p>
          <h2 className="font-serif-detective text-2xl font-bold text-[#e8dcc4]">侦探思维档案</h2>
          <p className="text-sm text-[#8a94a8] mt-1">
            侦探 <span className="text-[#d4a24c] font-semibold">{userId}</span> · 档案已建立
          </p>
        </div>
        <span className="stamp stamp-gold text-sm">已建档</span>
      </div>

      {/* 雷达图区 */}
      <section className="case-card p-8 texture-paper">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div>
            <h3 className="font-serif-detective text-lg font-bold text-[#6b9bd1] mb-4">
              你的侦探能力
            </h3>
            <RadarChart data={playerRadarData} color="#6b9bd1" label="你的能力" />
          </div>
          <div>
            <h3 className="font-serif-detective text-lg font-bold text-[#d4a24c] mb-4">
              搭档互补能力 <span className="text-xs font-normal text-[#5a6478]">（组队共探时启用）</span>
            </h3>
            <RadarChart data={companionRadarData} color="#d4a24c" label="搭档能力" />
          </div>
        </div>

        <div className="divider-gold my-6" />

        {/* 维度明细 */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {dims.map((d: any, i: number) => (
              <div key={i} className="bg-[#0a0c10]/60 rounded border border-[#232a3b] p-3">
                <p className="text-xs text-[#5a6478] mb-1">{d.name}</p>
                <div className="flex items-baseline gap-2 mb-1.5">
                  <span className="font-serif-detective text-xl font-bold text-[#e8dcc4]">
                    {d.score.toFixed(1)}
                  </span>
                  <span className="text-xs text-[#d4a24c]">{d.toward}</span>
                </div>
                <div className="h-1 bg-[#232a3b] rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-[#8a6d35] to-[#d4a24c]" style={{ width: `${d.score * 10}%` }} />
                </div>
              </div>
            ))}
          </div>

          {/* 优势弱项 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#0a0c10]/60 rounded border border-[#232a3b] p-4">
              <p className="text-xs text-[#5a6478] mb-2 tracking-widest">探案优势</p>
              <div className="flex flex-wrap gap-2">
                {profile?.strength?.map((s: string, i: number) => (
                  <span key={i} className="tag" style={{ borderColor: '#4a7a5c', color: '#6dbb8a' }}>{s}</span>
                ))}
              </div>
            </div>
            <div className="bg-[#0a0c10]/60 rounded border border-[#232a3b] p-4">
              <p className="text-xs text-[#5a6478] mb-2 tracking-widest">探案弱项</p>
              <div className="flex flex-wrap gap-2">
                {profile?.weakness?.map((s: string, i: number) => (
                  <span key={i} className="tag" style={{ borderColor: '#8a4545', color: '#c05252' }}>{s}</span>
                ))}
              </div>
            </div>
          </div>

          <p className="text-sm text-[#8a94a8] leading-relaxed border-l-2 border-[#8a6d35] pl-4">
            {fingerprint?.summary}
          </p>
        </div>
      </section>

      {/* 搭档卡 */}
      {companion && (
        <CompanionCard
          companion={companion}
          intro={companionIntro}
          fingerprintSummary={fingerprint?.summary}
        />
      )}

      {/* 入口 */}
      <section className="case-card p-8">
        <div className="text-center">
          <h3 className="font-serif-detective text-xl font-bold text-[#e8dcc4] mb-2">
            档案已就绪
          </h3>
          <p className="text-sm text-[#8a94a8] mb-6">
            前往案件档案室，挑选一份卷宗，决定你的探索方式
          </p>
          <button
            onClick={() => setPage('archive')}
            className="btn-primary px-10 py-3.5 font-serif-detective tracking-widest anim-pulse-gold"
          >
            进入案件档案室
          </button>
        </div>
      </section>
    </div>
  );
}
