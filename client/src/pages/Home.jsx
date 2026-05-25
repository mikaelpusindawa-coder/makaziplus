import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { TopBar } from '../components/layout/TopBar';
import { PropertyCard } from '../components/common/PropertyCard';
import { SkeletonCard, SkeletonListCard } from '../components/common/Spinner';
import api from '../utils/api';
import { formatPrice, getPropertyImage, getPlaceholderImage, timeAgo } from '../utils/helpers';

const _HERO_ERROR_SVG = (() => {
  const s = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="500" viewBox="0 0 1200 500"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1B4F72"/><stop offset="1" stop-color="#2E86C1"/></linearGradient></defs><rect width="1200" height="500" fill="url(%23g)"/><text x="600" y="250" text-anchor="middle" font-size="36" font-weight="700" font-family="system-ui,sans-serif" fill="rgba(255,255,255,0.9)">MakaziPlus</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(s)}`;
})();

const FALLBACK_HERO_IMAGES = [
  {
    id: 'f1', isFallback: true, is_premium: 1,
    title: 'Tafuta Nyumba Yako',
    image_url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&h=500&fit=crop&auto=format&q=80',
  },
  {
    id: 'f2', isFallback: true, is_premium: 0,
    title: 'Mali Bora Tanzania',
    image_url: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1200&h=500&fit=crop&auto=format&q=80',
  },
  {
    id: 'f3', isFallback: true, is_premium: 1,
    title: 'Kodisha au Nunua',
    image_url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&h=500&fit=crop&auto=format&q=80',
  },
  {
    id: 'f4', isFallback: true, is_premium: 0,
    title: 'Nyumba za Kifahari',
    image_url: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=1200&h=500&fit=crop&auto=format&q=80',
  },
];

const STATS = [
  { label: 'Mali Zilizoorodheshwa', value: '10K+', icon: '🏠' },
  { label: 'Watumiaji Wanaokua', value: '50K+', icon: '👥' },
  { label: 'Miji Tanzania', value: '20+', icon: '📍' },
];

const FILTERS = [
  { id: 'all', label: 'Yote', icon: '✨' },
  { id: 'nyumba', label: 'Nyumba', icon: '🏠' },
  { id: 'chumba', label: 'Chumba', icon: '🛏' },
  { id: 'frem', label: 'Frem', icon: '🏢' },
  { id: 'ofisi', label: 'Ofisi', icon: '💼' },
  { id: 'sale', label: 'Kuuza', icon: '🏷️' },
  { id: 'dar', label: 'Dar', icon: '📍' },
  { id: 'mwanza', label: 'Mwanza', icon: '📍' },
  { id: 'arusha', label: 'Arusha', icon: '📍' },
];

const HeroSlider = ({ properties, loading }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [heroPaused, setHeroPaused] = useState(false);

  useEffect(() => {
    if (heroPaused || loading) return;
    const displayItems = properties.length > 0 ? properties.slice(0, 4) : FALLBACK_HERO_IMAGES;
    if (displayItems.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % displayItems.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [heroPaused, loading, properties]);

  if (loading) {
    return (
      <div className="relative w-full rounded-2xl overflow-hidden bg-surface-3 h-48 sm:h-64 md:h-80 lg:h-[400px]">
        <div className="w-full h-full skeleton" />
      </div>
    );
  }

  const displayItems = properties.length > 0 ? properties.slice(0, 4) : FALLBACK_HERO_IMAGES;
  const current = displayItems[currentIndex];

  return (
    <div
      className="relative w-full overflow-hidden cursor-pointer rounded-2xl shadow-soft h-48 sm:h-64 md:h-80 lg:h-[400px] group"
      onMouseEnter={() => setHeroPaused(true)}
      onMouseLeave={() => setHeroPaused(false)}
    >
      <img
        src={current.isFallback ? current.image_url : getPropertyImage(current)}
        alt={current.title}
        loading="eager"
        className="w-full h-full object-cover transition-transform duration-700 hover:scale-102"
        onError={(e) => { e.target.onerror = null; e.target.src = _HERO_ERROR_SVG; }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
      {current.is_premium === 1 && (
        <div className="absolute top-3 left-3 bg-gold text-white text-2xs font-bold px-2 py-0.5 rounded-full shadow-gold z-10">
          ⭐ Premium
        </div>
      )}
      <div className="absolute inset-0 p-4 md:p-6 lg:p-8 flex flex-col justify-end">
        <p className="text-white/80 text-2xs md:text-xs font-medium mb-0.5">
          {current.isFallback ? 'Karibu MakaziPlus' : `📍 ${current.area || ''}, ${current.city || ''}`}
        </p>
        <h2 className="font-serif text-sm sm:text-lg md:text-xl lg:text-2xl font-bold text-white leading-tight line-clamp-2 max-w-2xl">
          {current.title}
        </h2>
        {!current.isFallback && (
          <div className="mt-1.5 flex items-center gap-2">
            <span className="font-serif text-base md:text-lg font-bold text-gold-light">
              {formatPrice(current.price)}
            </span>
            <span className="text-white/60 text-2xs">{current.price_type === 'rent' ? '/mwezi' : ''}</span>
          </div>
        )}
      </div>
    </div>
  );
};

const RecentMarquee = ({ items }) => {
  const navigate = useNavigate();
  if (!items.length) return null;
  const doubled = [...items, ...items];

  return (
    <div className="overflow-hidden relative w-full rounded-2xl">
      <div className="flex gap-4 animate-marquee" style={{ width: 'max-content' }}>
        {doubled.map((p, i) => (
          <div key={`${p.id}-${i}`} onClick={() => navigate(`/property/${p.id}`)}
            className="flex-shrink-0 w-44 bg-white rounded-2xl overflow-hidden shadow-soft border border-surface-4 cursor-pointer">
            <div className="h-24 relative overflow-hidden bg-surface-3">
              <img src={getPropertyImage(p)} alt={p.title} className="w-full h-full object-cover" loading="lazy"
                onError={(e) => { e.target.onerror = null; e.target.src = getPlaceholderImage(p.type, p.id); }} />
            </div>
            <div className="p-2.5">
              <p className="text-xs font-bold text-primary line-clamp-1">
                {formatPrice(p.price)} {p.price_type === 'rent' ? '/mw' : ''}
              </p>
              <p className="text-2xs text-ink-4 mt-0.5 line-clamp-1">{p.area}</p>
            </div>
          </div>
        ))}
      </div>
      <style>{`
        @keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .animate-marquee { animation: marquee 30s linear infinite; }
        .animate-marquee:hover { animation-play-state: paused; }
      `}</style>
    </div>
  );
};

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [filter, setFilter] = useState('all');
  const [featured, setFeatured] = useState([]);
  const [newest, setNewest] = useState([]);
  const [heroProperties, setHeroProperties] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [loadingF, setLoadingF] = useState(true);
  const [loadingN, setLoadingN] = useState(true);
  const [loadingHero, setLoadingHero] = useState(true);
  
  const buildParams = useCallback(() => {
    const p = {};
    if (filter === 'nyumba') p.type = 'nyumba';
    else if (filter === 'chumba') p.type = 'chumba';
    else if (filter === 'frem') p.type = 'frem';
    else if (filter === 'ofisi') p.type = 'ofisi';
    else if (filter === 'sale') p.price_type = 'sale';
    else if (filter === 'dar') p.city = 'Dar es Salaam';
    else if (filter === 'mwanza') p.city = 'Mwanza';
    else if (filter === 'arusha') p.city = 'Arusha';
    return p;
  }, [filter]);

  const fetchFeatured = useCallback(async () => {
    setLoadingF(true);
    try {
      const r = await api.get('/properties', { params: { ...buildParams(), premium: 1, limit: 8 } });
      setFeatured(r.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingF(false);
    }
  }, [buildParams]);

  const fetchNewest = useCallback(async () => {
    setLoadingN(true);
    try {
      const r = await api.get('/properties', { params: { ...buildParams(), limit: 12 } });
      setNewest(r.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingN(false);
    }
  }, [buildParams]);

  const fetchHeroProperties = useCallback(async () => {
    setLoadingHero(true);
    try {
      const r = await api.get('/properties', { params: { limit: 20 } });
      setHeroProperties(r.data.data || []);
    } catch {
      setHeroProperties([]);
    } finally {
      setLoadingHero(false);
    }
  }, []);

  useEffect(() => {
    fetchFeatured();
    fetchNewest();
    fetchHeroProperties();
  }, [fetchFeatured, fetchNewest, fetchHeroProperties]);

  useEffect(() => {
    if (!user) return;
    api.get('/favorites').then(r => setFavorites(r.data.data.map(p => p.id))).catch(() => {});
  }, [user]);

  const toggleFav = async (id) => {
    if (!user) { navigate('/auth'); return; }
    try {
      const r = await api.post(`/favorites/${id}/toggle`);
      setFavorites(prev => r.data.favorited ? [...prev, id] : prev.filter(f => f !== id));
      toast(r.data.message, 'success');
    } catch { toast('Hitilafu ya mtandao', 'error'); }
  };

  const heroWithImages = heroProperties.filter(p => Array.isArray(p.images) && p.images.length > 0);
  const newestWithImages = newest.filter(p => Array.isArray(p.images) && p.images.length > 0);
  const marqueeItems = newestWithImages.length > 0 ? newestWithImages : newest;

  return (
    <div className="w-full flex justify-center bg-surface min-h-screen pb-16">
      <div className="w-full max-w-6xl px-4 sm:px-6 lg:px-8 pt-4 space-y-6">
        <TopBar />
        
        <HeroSlider properties={heroWithImages} loading={loadingHero} />

        {/* Stats */}
        <div className="bg-white rounded-2xl p-4 shadow-soft flex justify-around w-full border border-surface-4">
          {STATS.map(s => (
            <div key={s.label} className="text-center">
              <div className="text-lg md:text-xl font-serif font-semibold text-primary">{s.value}</div>
              <div className="text-2xs text-ink-5 mt-0.5 font-medium">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar py-1 w-full">
          {FILTERS.map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition-all shadow-soft
                ${filter === f.id ? 'bg-primary text-white scale-102' : 'bg-white text-ink-4 hover:bg-surface-3'}`}>
              <span>{f.icon}</span> {f.label}
            </button>
          ))}
        </div>

        {/* Featured Grid - Maintained 2 columns on mobile, 4 columns on desktop */}
        {featured.length > 0 && (
          <div className="w-full">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm md:text-base font-bold text-ink flex items-center gap-1">
                Featured <span className="text-gold">⭐</span>
              </h2>
              <button onClick={() => navigate('/search?premium=1')} className="text-2xs font-bold text-primary hover:underline">
                Ona Zote →
              </button>
            </div>
            {loadingF ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 w-full">
                {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 w-full">
                {featured.map(p => (
                  <PropertyCard key={p.id} property={p} isFav={favorites.includes(p.id)} onFav={toggleFav} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Newest Slider */}
        {marqueeItems.length > 0 && (
          <div className="w-full">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-bold text-ink flex items-center gap-1">
                🆕 Mpya Zaidi <span className="text-green-500 text-2xs animate-pulse">● Live</span>
              </h2>
              <button onClick={() => navigate('/search')} className="text-2xs font-bold text-primary hover:underline">Zaidi →</button>
            </div>
            <RecentMarquee items={marqueeItems} />
          </div>
        )}

        {/* All Properties Matrix Grid - UPGRADED to grid-cols-1 on Mobile for perfect horizontal rhythm, scaling up beautifully to md:grid-cols-4 on desktop */}
        <div className="w-full">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm md:text-base font-bold text-ink">Mali Zote 🏠</h2>
            <button onClick={() => navigate('/search')} className="text-2xs font-bold text-primary hover:underline">Zaidi →</button>
          </div>
          {loadingN ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 w-full">
              {[1, 2, 3, 4].map(i => <SkeletonListCard key={i} />)}
            </div>
          ) : (
            <>
              {newest.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 w-full">
                  {newest.map(p => (
                    <PropertyCard key={p.id} property={p} isFav={favorites.includes(p.id)} onFav={toggleFav} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 bg-white rounded-2xl border border-surface-4 shadow-soft w-full">
                  <p className="text-xs text-ink-5 font-medium">Hakuna mali zilizoorodheshwa bado</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Banner CTA */}
        {!user && (
          <div className="bg-gradient-to-br from-primary to-primary-light rounded-2xl p-6 text-center shadow-soft w-full border border-primary/10">
            <h3 className="font-serif text-base md:text-lg font-bold text-white mb-0.5">Una Mali ya Kukodisha?</h3>
            <p className="text-white/80 text-2xs mb-3 max-w-md mx-auto">Weka tangazo lako bure leo. Fikia wateja elfu za Tanzania.</p>
            <button onClick={() => navigate('/auth')} className="bg-white text-primary px-5 py-2 rounded-full font-bold text-2xs active:scale-95 transition-all shadow-soft">
              Anza Sasa →
            </button>
          </div>
        )}
        
      </div>
    </div>
  );
}
