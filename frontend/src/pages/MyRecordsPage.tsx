import { useState, useEffect } from 'react';
import { useGameStore } from '../stores/gameStore';
import { api } from '../api/client';
import { KanshanGif } from '../components/LiuKanshan';

interface ExploreRecordItem {
  record_id: string;
  case_title: string;
  game_mode: 'solo' | 'team';
  companion_name?: string;
  ending_type: 'good' | 'neutral' | 'bad';
  clue_count: number;
  key_clue_count: number;
  companion_clue_count: number;
  duration_seconds: number;
  finished_at: string;
}

const endingConfig: Record<string, { label: string; stampClass: string }> = {
  good: { label: '真相浮现', stampClass: 'stamp-green' },
  neutral: { label: '真相模糊', stampClass: 'stamp-gold' },
  bad: { label: '错误指控', stampClass: 'stamp-seal' },
};

export default function MyRecordsPage() {
  const userId = useGameStore((s) => s.userId);
  const setPage = useGameStore((s) => s.setPage);
  const [records, setRecords] = useState<ExploreRecordItem[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    api.archive.records(userId)
      .then((data: any) => {
        setRecords(data.records || []);
        setStats(data.stats || null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  if (!userId) {
    return (
      <div className="max-w-xl mx-auto py-20 text-center">
        <div className="case-card p-10">
          <p className="text-[10px] text-[#5a6478] tracking-[4px] mb-2">MY RECORDS</p>
          <h2 className="font-serif-detective text-2xl font-bold text-[#e8dcc4] mb-3">我的卷宗</h2>
          <p className="text-sm text-[#8a94a8] mb-6">
            侦探尚未登记身份。建立档案后，你的每次探索都会记录在案。
          </p>
          <button onClick={() => setPage('home')} className="btn-primary px-6 py-2.5 text-sm">
            前往建档
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-[#232a3b] pb-4">
        <p className="text-[10px] text-[#5a6478] tracking-[4px] mb-1">MY CASE RECORDS</p>
        <h2 className="font-serif-detective text-2xl font-bold text-[#e8dcc4]">我的卷宗</h2>
        <p className="text-sm text-[#8a94a8] mt-1">侦探 <span className="text-[#d4a24c]">{userId}</span> 的探索档案</p>
      </div>

      {/* 统计面板 */}
      {stats && (
        <div className="case-card p-6">
          <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
            {[
              { label: '已探案件', value: stats.total, color: '#e8dcc4' },
              { label: '真相浮现', value: stats.good, color: '#6dbb8a' },
              { label: '真相模糊', value: stats.neutral, color: '#d4a24c' },
              { label: '错误指控', value: stats.bad, color: '#c05252' },
              { label: '独立探索', value: stats.solo, color: '#6b9bd1' },
              { label: '组队共探', value: stats.team, color: '#d4a24c' },
            ].map((s, i) => (
              <div key={i} className="text-center">
                <p className="font-serif-detective text-3xl font-bold" style={{ color: s.color }}>{s.value}</p>
                <p className="text-xs text-[#5a6478] mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 记录列表 */}
      {loading ? (
        <div className="text-center py-16 text-[#5a6478]">
          <span className="font-serif-detective tracking-[6px] text-lg">调取记录...</span>
        </div>
      ) : records.length === 0 ? (
        <div className="case-card p-12 text-center">
          <div className="flex justify-center mb-4">
            <KanshanGif variant="sleep" size={130} />
          </div>
          <span className="stamp stamp-gold text-sm mb-4 inline-block">空白档案</span>
          <p className="text-sm text-[#8a94a8] mt-4 mb-6">看山打了个哈欠——你的卷宗还是空的。第一起案件正等着你。</p>
          <button onClick={() => setPage('archive')} className="btn-primary px-6 py-2.5 text-sm">
            前往案件档案室
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {records.map((r, i) => {
            const cfg = endingConfig[r.ending_type] || endingConfig.neutral;
            return (
              <div key={r.record_id} className="case-card p-5 anim-fade-up" style={{ animationDelay: `${i * 40}ms` }}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="font-serif-detective text-lg font-bold text-[#e8dcc4]">{r.case_title}</h3>
                      <span className={`tag ${r.game_mode === 'solo' ? 'tag-blue' : 'tag-gold'}`}
                        style={{ borderColor: r.game_mode === 'solo' ? '#3d5a7a' : '#8a6d35', color: r.game_mode === 'solo' ? '#6b9bd1' : '#d4a24c' }}>
                        {r.game_mode === 'solo' ? '独立探索' : `组队 · ${r.companion_name || '搭档'}`}
                      </span>
                    </div>
                    <div className="flex gap-4 text-xs text-[#5a6478] mt-2 flex-wrap">
                      <span>线索 {r.clue_count}</span>
                      <span>关键证据 {r.key_clue_count}</span>
                      {r.game_mode === 'team' && <span>搭档贡献 {r.companion_clue_count}</span>}
                      {r.duration_seconds > 0 && <span>用时 {Math.round(r.duration_seconds / 60)}分钟</span>}
                      <span>{new Date(r.finished_at).toLocaleString('zh-CN')}</span>
                    </div>
                  </div>
                  <span className={`stamp ${cfg.stampClass} text-xs whitespace-nowrap`}>{cfg.label}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
