import { useGameStore } from './stores/gameStore';
import { KanshanPortrait } from './components/LiuKanshan';
import HomePage from './pages/HomePage';
import FingerprintPage from './pages/FingerprintPage';
import ArchivePage from './pages/ArchivePage';
import GamePage from './pages/GamePage';
import ResultPage from './pages/ResultPage';
import MyRecordsPage from './pages/MyRecordsPage';

const NAV_ITEMS = [
  { key: 'home', label: '侦探事务所', desc: 'HOME' },
  { key: 'archive', label: '案件档案室', desc: 'ARCHIVE' },
  { key: 'records', label: '我的卷宗', desc: 'RECORDS' },
] as const;

export default function App() {
  const page = useGameStore((s) => s.page);
  const setPage = useGameStore((s) => s.setPage);
  const userId = useGameStore((s) => s.userId);

  const activeNav =
    page === 'game' ? 'archive'
    : page === 'result' ? 'records'
    : page === 'fingerprint' ? 'home'
    : page;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 bg-[#0a0c10]/95 backdrop-blur border-b border-[#2a3245]">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setPage('home')}>
            <KanshanPortrait pose={1} size={40} className="group-hover:scale-105 transition-transform" />
            <div>
              <h1 className="font-serif-detective text-lg font-bold text-[#e8dcc4] tracking-wider leading-tight">
                看山探案录
              </h1>
              <p className="text-[10px] text-[#5a6478] tracking-[3px]">KANSHAN DETECTIVE ARCHIVES</p>
            </div>
          </div>

          <nav className="flex items-center gap-8">
            {NAV_ITEMS.map(item => (
              <button
                key={item.key}
                onClick={() => setPage(item.key)}
                className={`nav-link font-serif-detective text-sm pb-1 ${activeNav === item.key ? 'active' : ''}`}
              >
                {item.label}
              </button>
            ))}
            {userId && (
              <span className="tag tag-gold border-[#8a6d35] text-[#d4a24c]">
                {userId}
              </span>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8">
        {page === 'home' && <HomePage />}
        {page === 'fingerprint' && <FingerprintPage />}
        {page === 'archive' && <ArchivePage />}
        {page === 'game' && <GamePage />}
        {page === 'result' && <ResultPage />}
        {page === 'records' && <MyRecordsPage />}
      </main>

      <footer className="border-t border-[#232a3b] py-5">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between text-[11px] text-[#5a6478]">
          <span>看山探案录 · 灵魂共探</span>
          <span className="tracking-[2px]">知乎黑客松 2026 · CAMPUS RISING</span>
        </div>
      </footer>
    </div>
  );
}
