interface KanshanMascotProps {
  variant?: 'idle' | 'hello' | 'computer' | 'swing' | 'sleep' | 'basketball';
  size?: number;
  className?: string;
  alt?: string;
}

const GIF_MAP: Record<string, string> = {
  idle: '/liukan/liukan_idle.gif',
  hello: '/liukan/liukan_hello.gif',
  computer: '/liukan/liukan_computer.gif',
  swing: '/liukan/liukan_swing.gif',
  sleep: '/liukan/liukan_sleep.gif',
  basketball: '/liukan/liukan_basketball.gif',
};

export function KanshanGif({ variant = 'idle', size = 120, className = '', alt = '刘看山' }: KanshanMascotProps) {
  return (
    <img
      src={GIF_MAP[variant] || GIF_MAP.idle}
      alt={alt}
      width={size}
      height={size}
      className={`object-contain select-none pointer-events-none ${className}`}
      draggable={false}
    />
  );
}

interface KanshanPortraitProps {
  pose?: 1 | 2 | 3;
  size?: number;
  className?: string;
  rounded?: boolean;
}

export function KanshanPortrait({ pose = 1, size = 48, className = '', rounded = true }: KanshanPortraitProps) {
  return (
    <img
      src={`/liukan/liukan_pose_${pose}.jpg`}
      alt="刘看山"
      width={size}
      height={size}
      className={`object-cover ${rounded ? 'rounded-full' : 'rounded'} border border-[#8a6d35]/50 ${className}`}
      draggable={false}
    />
  );
}

interface KanshanBubbleProps {
  children: React.ReactNode;
  pose?: 1 | 2 | 3;
  size?: number;
  className?: string;
}

export function KanshanBubble({ children, pose = 1, size = 52, className = '' }: KanshanBubbleProps) {
  return (
    <div className={`flex items-start gap-3 ${className}`}>
      <KanshanPortrait pose={pose} size={size} className="shrink-0 shadow-lg shadow-black/40" />
      <div className="relative flex-1 min-w-0 bg-[#0f1420] border border-[#8a6d35]/40 rounded-lg rounded-tl-none px-4 py-3">
        <p className="text-[10px] text-[#d4a24c] tracking-[3px] mb-1.5">看山 · KANSHAN</p>
        <div className="text-sm text-[#c9d2e0] leading-relaxed">{children}</div>
      </div>
    </div>
  );
}

export default KanshanGif;
