import { useGameStore } from '../stores/gameStore';
import RadarChart from '../components/Fingerprint/RadarChart';
import CompanionCard from '../components/Companion/CompanionCard';
import ThinkingDots from '../components/Detective/ThinkingDots';

export default function FingerprintPage() {
  const { fingerprint, companion, companionIntro, setPage, userId } = useGameStore();

  const dims = fingerprint?.dimensions || [];
  const profile = fingerprint?.detective_profile;
  const passive = fingerprint?.passive_profile;
  const hasPassive = !!(passive && (passive.nickname || passive.headline || passive.followees?.length || passive.favlists?.length));

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

      {/* 样本量与档案置信度 */}
      <div className="case-card px-4 py-2.5 flex items-center gap-3 flex-wrap text-xs">
        {typeof fingerprint?.sampleCount === 'number' && fingerprint.sampleCount > 0 && (
          <span className="text-[#8a94a8]">📊 分析样本：<span className="text-[#e8dcc4]">{fingerprint.sampleCount}</span> 条有效内容</span>
        )}
        {fingerprint?.confidence === 'light' ? (
          <span className="px-2 py-0.5 rounded-full border border-[#8a6d35]/50 text-[#d4a24c]">
            轻量档案 · 内容样本不足，这是初步画像——登录知乎账号后档案会更厚
          </span>
        ) : fingerprint?.confidence === 'full' ? (
          <span className="px-2 py-0.5 rounded-full border border-[#4a7a5c]/60 text-[#6dbb8a]">
            完整档案 · 样本充足，画像可信度高
          </span>
        ) : null}
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

          {/* 维度明细：分数 + 人话标签 + 场景化解读 */}
          <div className="space-y-3">
            {dims.map((d: any, i: number) => (
              <div key={i} className="bg-[#0a0c10]/60 rounded border border-[#232a3b] p-4">
                <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
                  <p className="text-xs text-[#5a6478]">{d.name}</p>
                  {(d.label || d.toward) && (
                    <span className="px-2 py-0.5 rounded-full border border-[#6b9bd1]/50 text-[#6b9bd1] text-xs">
                      {d.label || d.toward}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-1.5 flex-1 bg-[#232a3b] rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-[#8a6d35] to-[#d4a24c]" style={{ width: `${d.score * 10}%` }} />
                  </div>
                  <span className="font-serif-detective text-sm font-bold text-[#e8dcc4] shrink-0">
                    {d.score.toFixed(1)}
                  </span>
                </div>
                {d.interpret && (
                  <p className="text-xs text-[#c9d2e0] leading-relaxed">
                    <span className="text-[#d4a24c] mr-1">解读</span>{d.interpret}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* 本案演绎 */}
          {fingerprint?.scene_story && (
            <div className="bg-[#0a0c10]/60 rounded border border-[#8a6d35]/40 p-5">
              <p className="text-xs text-[#d4a24c] tracking-widest mb-2">🎭 如果你走进案发现场</p>
              <p className="text-sm text-[#c9d2e0] leading-relaxed">{fingerprint.scene_story}</p>
            </div>
          )}

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
      </section>

      {/* 被动账号侧写（OAuth 登录用户专属，全程无需用户输入） */}
      {hasPassive && (
        <section className="case-card p-6">
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <p className="text-xs text-[#5a6478] tracking-widest">🪪 账号侧写 · 这些信息你一个字都没写</p>
            {passive?.nickname && <span className="font-serif-detective text-base font-bold text-[#e8dcc4]">{passive.nickname}</span>}
            {passive?.gender && <span className="tag text-xs">{passive.gender}</span>}
          </div>
          {passive?.headline && (
            <p className="text-xs text-[#8a94a8] italic mb-3">「{passive.headline}」</p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-[#5a6478] mb-2">
                关注的人{typeof passive?.followeeCount === 'number' ? `（共 ${passive.followeeCount} 个，前5）` : '（前5）'}
              </p>
              <div className="flex flex-wrap gap-2">
                {(passive?.followees?.length ? passive.followees : ['（本次未获取到）']).map((n: string, i: number) => (
                  <span key={i} className="tag text-xs">{n}</span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-[#5a6478] mb-2">收藏夹（你的兴趣线索）</p>
              <div className="flex flex-wrap gap-2">
                {(passive?.favlists?.length ? passive.favlists : ['（本次未获取到）']).map((n: string, i: number) => (
                  <span key={i} className="tag text-xs">{n}</span>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 搭档卡 */}
      {companion ? (
        <CompanionCard
          companion={companion}
          intro={companionIntro}
          fingerprintSummary={fingerprint?.summary}
        />
      ) : (
        <section className="case-card p-8 border-[#8a6d35]/30 text-center">
          <p className="text-sm text-[#8a94a8]">
            <ThinkingDots text="正在为你匹配互补型AI搭档" />
          </p>
          <p className="text-xs text-[#5a6478] mt-2">
            搭档就绪后会自动出现在这里——不着急，档案室可以先逛着
          </p>
        </section>
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
