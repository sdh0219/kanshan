import { useEffect, useState } from 'react';

interface SceneMapProps {
  /** 案件的搜证方向（最多取4个映射到现场热点） */
  directions: { keyword: string; hint: string }[];
  onSearch: (kw: string) => void;
  loading: boolean;
  /** 最近一次搜索的关键词，用于标记"已勘察" */
  lastKeyword?: string;
}

/** 四个现场热点：位置固定，标签来自案件的搜证方向 */
const SPOTS = [
  { x: 16, y: 42, label: '书架' },
  { x: 42, y: 64, label: '书桌抽屉' },
  { x: 66, y: 36, label: '电脑' },
  { x: 88, y: 68, label: '纸篓' },
];

/**
 * 案发现场热点图：把"打字搜证"变成"勘察现场"。
 * 点现场里的物件，看山就去搜对应方向的证据。
 */
export default function SceneMap({ directions, onSearch, loading, lastKeyword }: SceneMapProps) {
  const spots = directions.slice(0, 4);
  const [visited, setVisited] = useState<string[]>([]);

  useEffect(() => {
    if (lastKeyword && !visited.includes(lastKeyword)) {
      setVisited((v) => [...v, lastKeyword]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastKeyword]);

  if (spots.length === 0) return null;

  return (
    <div className="case-card p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-[#5a6478] tracking-[4px]">CRIME SCENE</span>
          <h3 className="font-serif-detective text-sm font-bold text-[#d4a24c]">案发现场 · 亲手勘察</h3>
        </div>
        <span className="text-[10px] text-[#5a6478]">点现场里的物件，看山替你翻证据</span>
      </div>

      <div className="relative rounded-lg overflow-hidden border border-[#232a3b]">
        {/* 现场底图 */}
        <svg viewBox="0 0 640 300" className="w-full block">
          <defs>
            <linearGradient id="scene-bg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stop-color="#0c1424" />
              <stop offset="1" stop-color="#0a0c10" />
            </linearGradient>
            <radialGradient id="scene-lamp" cx="0.68" cy="0.3" r="0.6">
              <stop offset="0" stop-color="#d4a24c" stop-opacity="0.25" />
              <stop offset="1" stop-color="#d4a24c" stop-opacity="0" />
            </radialGradient>
            <filter id="scene-grain">
              <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
              <feColorMatrix type="saturate" values="0" />
              <feComponentTransfer><feFuncA type="linear" slope="0.05" /></feComponentTransfer>
              <feComposite operator="over" in2="SourceGraphic" />
            </filter>
          </defs>
          <rect width="640" height="300" fill="url(#scene-bg)" />
          <rect width="640" height="300" fill="url(#scene-lamp)" />

          {/* 窗与雨（右上） */}
          <rect x="470" y="28" width="120" height="86" fill="#0e1828" stroke="#232a3b" stroke-width="3" />
          <line x1="530" y1="28" x2="530" y2="114" stroke="#232a3b" stroke-width="3" />
          <line x1="470" y1="71" x2="590" y2="71" stroke="#232a3b" stroke-width="3" />
          <g stroke="#3d5a7a" stroke-width="1" opacity="0.4">
            <line x1="480" y1="6" x2="470" y2="26" /><line x1="522" y1="2" x2="512" y2="22" />
            <line x1="566" y1="8" x2="556" y2="28" /><line x1="606" y1="14" x2="596" y2="34" />
          </g>

          {/* 书架（左） */}
          <rect x="60" y="60" width="96" height="170" fill="#111a2e" stroke="#232a3b" stroke-width="3" />
          <g fill="#1c2536">
            <rect x="70" y="74" width="76" height="8" /><rect x="70" y="96" width="60" height="8" /><rect x="70" y="118" width="70" height="8" />
            <rect x="70" y="146" width="76" height="8" /><rect x="70" y="168" width="52" height="8" /><rect x="70" y="190" width="68" height="8" />
            <rect x="70" y="212" width="60" height="8" />
          </g>

          {/* 书桌+电脑（中） */}
          <rect x="230" y="150" width="200" height="14" fill="#1a2438" stroke="#2a3245" stroke-width="2" />
          <rect x="244" y="164" width="12" height="90" fill="#141d30" /><rect x="404" y="164" width="12" height="90" fill="#141d30" />
          <rect x="290" y="96" width="84" height="54" rx="4" fill="#0e1828" stroke="#2a3245" stroke-width="3" />
          <rect x="298" y="104" width="68" height="38" fill="#13203a" />
          <text x="332" y="128" font-family="monospace" font-size="11" fill="#3d5a7a" text-anchor="middle">&gt;_</text>

          {/* 纸篓+散落纸张（右下） */}
          <polygon points="520,232 560,232 552,278 528,278" fill="#1a2438" stroke="#2a3245" stroke-width="2" />
          <g fill="#c9d2e0" opacity="0.45">
            <rect x="472" y="246" width="13" height="9" rx="1" transform="rotate(16 478 250)" />
            <rect x="576" y="238" width="12" height="8" rx="1" transform="rotate(-20 582 242)" />
            <rect x="150" y="248" width="12" height="8" rx="1" transform="rotate(28 156 252)" />
          </g>

          <rect width="640" height="300" fill="#0a0c10" opacity="0.18" filter="url(#scene-grain)" />
        </svg>

        {/* 热点按钮（绝对定位覆盖在底图上） */}
        {spots.map((d, i) => {
          const spot = SPOTS[i];
          const isVisited = visited.includes(d.keyword);
          return (
            <button
              key={d.keyword}
              onClick={() => onSearch(d.keyword)}
              disabled={loading}
              className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group disabled:cursor-wait"
              style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
              title={d.hint}
            >
              <span className="relative flex items-center justify-center">
                {!isVisited && !loading && (
                  <span className="absolute w-8 h-8 rounded-full bg-[#d4a24c]/30 animate-ping" />
                )}
                <span
                  className={`relative w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold transition ${
                    isVisited
                      ? 'border-[#4a7a5c] bg-[#0a0c10] text-[#6dbb8a]'
                      : 'border-[#d4a24c] bg-[#d4a24c]/20 text-[#d4a24c] group-hover:bg-[#d4a24c]/40'
                  }`}
                >
                  {isVisited ? '✓' : i + 1}
                </span>
              </span>
              <span
                className={`mt-1 px-2 py-0.5 rounded text-[10px] whitespace-nowrap border transition ${
                  isVisited
                    ? 'border-[#4a7a5c]/50 text-[#6dbb8a] bg-[#0a0c10]/70'
                    : 'border-[#8a6d35]/50 text-[#d4a24c] bg-[#0a0c10]/70 group-hover:border-[#d4a24c]'
                }`}
              >
                {d.keyword}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
