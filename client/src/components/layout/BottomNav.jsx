import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const NAV = [
  { path:'/', label:'Nyumbani',
    icon:(a)=><svg viewBox="0 0 24 24" className={`w-[22px] h-[22px] transition-all duration-200 ${a?'stroke-primary fill-primary/15':'stroke-ink-5 fill-transparent'}`} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
  { path:'/search', label:'Tafuta',
    icon:(a)=><svg viewBox="0 0 24 24" className={`w-[22px] h-[22px] transition-all duration-200 ${a?'stroke-primary':'stroke-ink-5'}`} fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg> },
  { path:'/add', label:'', isFab:true },
  { path:'/chat', label:'Gumzo',
    icon:(a)=><svg viewBox="0 0 24 24" className={`w-[22px] h-[22px] transition-all duration-200 ${a?'stroke-primary fill-primary/15':'stroke-ink-5 fill-transparent'}`} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> },
  { path:'/profile', label:'Akaunti',
    icon:(a)=><svg viewBox="0 0 24 24" className={`w-[22px] h-[22px] transition-all duration-200 ${a?'stroke-primary':'stroke-ink-5'}`} fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
];

export const BottomNav = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const active = (p) => p==='/' ? pathname==='/' : pathname.startsWith(p);

  return (
    <nav className="bottom-nav fixed bottom-0 left-0 right-0 z-50"
      style={{paddingBottom:'env(safe-area-inset-bottom,0)'}}>
      <div className="glass border-t border-black/[0.07] h-[60px] flex max-w-lg mx-auto md:hidden">
        {NAV.map(item => {
          const isActive = active(item.path);
          if (item.isFab) return (
            <button key="fab" onClick={() => navigate(item.path)}
              className="flex-1 flex items-center justify-center" aria-label="Ongeza mali">
              <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center
                -mt-4 shadow-green active:scale-90 transition-all duration-200 ring-4 ring-white">
                <svg viewBox="0 0 24 24" className="w-6 h-6 stroke-white" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
              </div>
            </button>
          );
          return (
            <button key={item.path} onClick={() => navigate(item.path)}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 relative
                active:scale-90 transition-all duration-150"
              aria-label={item.label}>
              {isActive && <span className="absolute top-1 w-1 h-1 bg-primary rounded-full" />}
              {item.icon(isActive)}
              <span className={`text-[9px] font-semibold ${isActive?'text-primary':'text-ink-6'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

/* ── Desktop Sidebar ── */
export const DesktopSidebar = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const active = (p) => p==='/' ? pathname==='/' : pathname.startsWith(p);

  const LINKS = [
    {path:'/',             emoji:'🏠', label:'Nyumbani'},
    {path:'/search',       emoji:'🔍', label:'Tafuta Mali'},
    {path:'/favorites',    emoji:'❤️', label:'Zilizohifadhiwa'},
    {path:'/chat',         emoji:'💬', label:'Mazungumzo'},
    {path:'/dashboard',    emoji:'📊', label:'Dashibodi'},
    {path:'/add',          emoji:'➕', label:'Ongeza Mali'},
    {path:'/notifications',emoji:'🔔', label:'Arifa'},
    {path:'/profile',      emoji:'👤', label:'Akaunti'},
  ];

  return (
    <aside className="app-sidebar hidden md:flex flex-col h-screen sticky top-0
      w-[240px] bg-white border-r border-surface-4 flex-shrink-0">
      <button onClick={() => navigate('/')} className="px-5 py-6 text-left">
        <div className="font-serif text-[22px] font-semibold text-primary">
          Makazi<span className="text-gold">Plus</span>
        </div>
        <div className="text-[10px] text-ink-6 font-medium tracking-[0.15em] uppercase mt-0.5">
          Makazi Kiganjani
        </div>
      </button>

      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        {LINKS.map(l => {
          const isActive = active(l.path);
          return (
            <button key={l.path} onClick={() => navigate(l.path)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl text-left
                transition-all duration-150 text-sm font-medium
                ${isActive
                  ? 'bg-primary-50 text-primary font-semibold'
                  : 'text-ink-4 hover:bg-surface hover:text-ink'}`}>
              <span className="w-5 text-center text-base">{l.emoji}</span>
              {l.label}
              {isActive && <div className="ml-auto w-1.5 h-1.5 bg-primary rounded-full flex-shrink-0" />}
            </button>
          );
        })}
      </nav>

      <div className="px-5 py-4 border-t border-surface-4">
        <div className="text-[10px] text-ink-6">MakaziPlus v4.0 • Tanzania 🇹🇿</div>
      </div>
    </aside>
  );
};
