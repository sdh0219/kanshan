// 轻量氛围音效：首次交互后解锁播放，静音偏好存 localStorage，任何失败静默降级
const SRC: Record<string, string> = {
  ding: '/sfx/ding.mp3',   // 线索命中
  stamp: '/sfx/stamp.mp3', // 结局印章
  blip: '/sfx/blip.mp3',   // 搭档插话
};

const cache: Record<string, HTMLAudioElement> = {};
let muted = typeof localStorage !== 'undefined' && localStorage.getItem('kanshan_muted') === '1';

export function isMuted(): boolean {
  return muted;
}

export function toggleMuted(): boolean {
  muted = !muted;
  try {
    localStorage.setItem('kanshan_muted', muted ? '1' : '0');
  } catch { /* 隐私模式等场景忽略 */ }
  return muted;
}

export function playSfx(name: keyof typeof SRC) {
  if (muted) return;
  try {
    let audio = cache[name];
    if (!audio) {
      audio = new Audio(SRC[name]);
      audio.volume = 0.35;
      cache[name] = audio;
    }
    audio.currentTime = 0;
    audio.play().catch(() => { /* 浏览器自动播放策略拦截时静默 */ });
  } catch { /* 环境不支持时静默 */ }
}
