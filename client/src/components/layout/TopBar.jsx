import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export const TopBar = ({ title, showBack, rightAction }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, []);

  const initials = user?.name?.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase() || 'MP';

  return (
    <header style={{paddingTop:'env(safe-area-inset-top,0)'}}
      className={`sticky top-0 z-40 h-14 flex items-center px-4 gap-3 transition-all duration-200
        ${scrolled ? 'glass border-b border-black/[0.07] shadow-soft' : 'bg-transparent'}`}>

      {showBack ? (
        <button onClick={() => navigate(-1)}
          className="w-9 h-9 bg-white rounded-full shadow-soft flex items-center justify-center
            flex-shrink-0 active:scale-90 transition-all hover:bg-surface-3" aria-label="Rudi">
          <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] stroke-ink" fill="none" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
      ) : null}

      {title
        ? <h1 className="font-serif text-lg font-semibold text-ink flex-1 truncate">{title}</h1>
        : <button onClick={() => navigate('/')}
            className="font-serif text-xl font-semibold text-primary flex-1 text-left md:hidden">
            Makazi<span className="text-gold">Plus</span>
          </button>
      }

      {rightAction ? rightAction : (
        !showBack && (
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/search')}
              className="w-9 h-9 bg-white rounded-full shadow-soft flex items-center justify-center
                active:scale-90 transition-all hover:bg-surface-3 hidden sm:flex" aria-label="Tafuta">
              <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-ink-4" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
            </button>
            <button onClick={() => navigate('/notifications')}
              className="w-9 h-9 bg-white rounded-full shadow-soft flex items-center justify-center
                relative active:scale-90 transition-all hover:bg-surface-3" aria-label="Arifa">
              <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-ink-4" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white animate-pulse" />
            </button>
            <button onClick={() => navigate('/profile')}
              className="w-9 h-9 bg-primary rounded-full flex items-center justify-center
                text-white text-xs font-bold shadow-green active:scale-90 transition-all
                ring-2 ring-primary/25 hover:ring-primary/50" aria-label="Akaunti">
              {initials}
            </button>
          </div>
        )
      )}
    </header>
  );
};
