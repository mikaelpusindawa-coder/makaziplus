import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { TopBar } from '../components/layout/TopBar';
import { PropertyCard } from '../components/common/PropertyCard';
import { SkeletonCard, SkeletonListCard } from '../components/common/Spinner';
import api from '../utils/api';
import { formatPrice, getPropertyImage, timeAgo } from '../utils/helpers';

// Fallback hero images
const FALLBACK_HERO_IMAGES = [
  { id: 1, image_url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&q=80', title: 'Tafuta Nyumba Yako', is_premium: 1 },
  { id: 2, image_url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&q=80', title: 'Mali Bora Tanzania', is_premium: 0 },
  { id: 3, image_url: 'https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=1200&q=80', title: 'Kodisha au Nunua', is_premium: 1 },
  { id: 4, image_url: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1200&q=80', title: 'Nyumba za Kifahari', is_premium: 0 },
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

// Hero Slider Component with Auto-cycling
const HeroSlider = ({ properties, loading }) => {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [heroPaused, setHeroPaused] = useState(false);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  // Auto-cycling interval - FIXED: now working
  useEffect(() => {
    if (heroPaused || loading) return;
    
    const displayItems = properties.length >= 4 ? properties.slice(0, 4) : FALLBACK_HERO_IMAGES;
    if (displayItems.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % displayItems.length);
    }, 5000); // Change slide every 5 seconds
    
    return () => clearInterval(interval);
  }, [heroPaused, loading, properties.length]);

  // Touch handlers for mobile swipe
  const handleTouchStart = (e) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const difference = touchStart - touchEnd;
    const displayItems = properties.length >= 4 ? properties.slice(0, 4) : FALLBACK_HERO_IMAGES;
    
    if (difference > 50) {
      // Swipe left - next slide
      setCurrentIndex((prev) => (prev + 1) % displayItems.length);
      setHeroPaused(true);
      setTimeout(() => setHeroPaused(false), 8000);
    }
    if (difference < -50) {
      // Swipe right - previous slide
      setCurrentIndex((prev) => (prev - 1 + displayItems.length) % displayItems.length);
      setHeroPaused(true);
      setTimeout(() => setHeroPaused(false), 8000);
    }
    setTouchStart(0);
    setTouchEnd(0);
  };

  if (loading) {
    return (
      <div className="relative mx-3 mt-3 md:mx-0 md:mt-0 rounded-3xl md:rounded-none overflow-hidden bg-surface-3"
        style={{ height: 'clamp(200px, 35vw, 420px)' }}>
        <div className="w-full h-full skeleton" />
      </div>
    );
  }

  const displayItems = properties.length >= 4 ? properties.slice(0, 4) : FALLBACK_HERO_IMAGES;
  const current = displayItems[currentIndex];

  // Manual navigation functions
  const goToSlide = (index) => {
    setCurrentIndex(index);
    setHeroPaused(true);
    setTimeout(() => setHeroPaused(false), 8000);
  };

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % displayItems.length);
    setHeroPaused(true);
    setTimeout(() => setHeroPaused(false), 8000);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + displayItems.length) % displayItems.length);
    setHeroPaused(true);
    setTimeout(() => setHeroPaused(false), 8000);
  };

  return (
    <div
      className="relative mx-3 mt-3 md:mx-0 md:mt-0 rounded-3xl md:rounded-none overflow-hidden cursor-pointer group"
      style={{ height: 'clamp(200px, 35vw, 420px)' }}
      onMouseEnter={() => setHeroPaused(true)}
      onMouseLeave={() => setHeroPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Main Image */}
      <img
        src={current.isFallback ? current.image_url : getPropertyImage(current)}
        alt={current.title}
        loading="eager"
        className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
        onError={(e) => { e.target.src = FALLBACK_HERO_IMAGES[0].image_url; }}
      />
      
      {/* Overlay Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/40 to-transparent" />
      
      {/* Premium Badge */}
      {current.is_premium === 1 && (
        <div className="absolute top-4 left-4 bg-gold text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-gold z-10">
          ⭐ Premium Listing
        </div>
      )}
      
      {/* Content */}
      <div className="absolute inset-0 p-5 md:p-10 flex flex-col justify-end z-10">
        <div className="animate-fade-in-up">
          <p className="text-white/80 text-sm font-medium mb-1">
            {current.isFallback ? 'Karibu MakaziPlus' : `📍 ${current.area || ''}, ${current.city || ''}`}
          </p>
          <h2 className="font-serif text-xl md:text-3xl lg:text-4xl font-semibold text-white leading-tight text-balance">
            {current.title}
          </h2>
          {!current.isFallback && (
            <div className="mt-3 flex items-center gap-3">
              <span className="font-serif text-xl md:text-2xl font-bold text-gold-light">
                {formatPrice(current.price)}
              </span>
              <span className="text-white/60 text-sm">{current.price_type === 'rent' ? '/mwezi' : ''}</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Navigation Arrows - Desktop */}
      <button
        onClick={(e) => { e.stopPropagation(); prevSlide(); }}
        className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 md:w-10 md:h-10 bg-black/40 hover:bg-black/60 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all duration-300 z-20"
      >
        <svg viewBox="0 0 24 24" className="w-4 h-4 md:w-5 md:h-5 stroke-white" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); nextSlide(); }}
        className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 md:w-10 md:h-10 bg-black/40 hover:bg-black/60 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all duration-300 z-20"
      >
        <svg viewBox="0 0 24 24" className="w-4 h-4 md:w-5 md:h-5 stroke-white" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
      
      {/* Dots Indicator */}
      <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 z-10">
        {displayItems.map((_, idx) => (
          <button
            key={idx}
            onClick={(e) => { e.stopPropagation(); goToSlide(idx); }}
            className={`transition-all duration-300 rounded-full ${
              currentIndex === idx 
                ? 'w-8 h-1.5 bg-white' 
                : 'w-1.5 h-1.5 bg-white/40 hover:bg-white/60'
            }`}
          />
        ))}
      </div>
      
      {/* Auto-play indicator bar */}
      {!heroPaused && !loading && displayItems.length > 1 && (
        <div className="absolute bottom-0 left-0 h-1 bg-gold animate-slide-progress" style={{ width: '100%' }} />
      )}
    </div>
  );
};

// Recent Properties Marquee
const RecentMarquee = ({ items }) => {
  const navigate = useNavigate();
  if (!items.length) return null;
  const doubled = [...items, ...items];

  return (
    <div className="overflow-hidden relative">
      <div className="flex gap-3 animate-marquee" style={{ width: 'max-content' }}>
        {doubled.map((p, i) => (
          <div
            key={`${p.id}-${i}`}
            onClick={() => navigate(`/property/${p.id}`)}
            className="flex-shrink-0 w-44 bg-white rounded-2xl overflow-hidden shadow-soft border border-surface-4 cursor-pointer hover:shadow-card transition-all hover:-translate-y-1"
          >
            <div className="h-24 relative overflow-hidden bg-surface-3">
              <img
                src={getPropertyImage(p)}
                alt={p.title}
                className="w-full h-full object-cover"
                loading="lazy"
                onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=300&q=50'; }}
              />
              <div className="absolute bottom-1.5 left-1.5 bg-black/50 backdrop-blur-sm text-white text-2xs font-bold px-1.5 py-0.5 rounded-full">
                🆕 {timeAgo(p.created_at)}
              </div>
            </div>
            <div className="p-2.5">
              <p className="text-xs font-bold text-primary line-clamp-1">
                {p.price_type === 'rent' ? `TSh ${Math.round(p.price / 1000)}K/mwezi` : `TSh ${Math.round(p.price / 1000000).toFixed(1)}M`}
              </p>
              <p className="text-2xs text-ink-4 mt-0.5 line-clamp-1">{p.area}, {p.city}</p>
            </div>
          </div>
        ))}
      </div>
      <style>{`
        @keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @keyframes slideProgress { from { width: 100%; } to { width: 0%; } }
        .animate-marquee { animation: marquee 28s linear infinite; }
        .animate-marquee:hover { animation-play-state: paused; }
        .animate-slide-progress { animation: slideProgress 5s linear forwards; }
      `}</style>
    </div>
  );
};

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [filter, setFilter] = useState('all');
  const [featured, setFeatured] = useState([]);
  const [newest, setNewest] = useState([]);
  const [heroProperties, setHeroProperties] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [loadingF, setLoadingF] = useState(true);
  const [loadingN, setLoadingN] = useState(true);
  const [loadingHero, setLoadingHero] = useState(true);
  const [searchInput, setSearchInput] = useState('');

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
    if (searchInput) p.search = searchInput;
    return p;
  }, [filter, searchInput]);

  const fetchFeatured = useCallback(async () => {
    setLoadingF(true);
    try {
      const r = await api.get('/properties', { params: { ...buildParams(), premium: 1, limit: 8 } });
      setFeatured(r.data.data || []);
    } catch (err) {
      console.error('Featured fetch error:', err);
    } finally {
      setLoadingF(false);
    }
  }, [buildParams]);

  const fetchNewest = useCallback(async () => {
    setLoadingN(true);
    try {
      const r = await api.get('/properties', { params: { ...buildParams(), limit: 10 } });
      setNewest(r.data.data || []);
    } catch (err) {
      console.error('Newest fetch error:', err);
    } finally {
      setLoadingN(false);
    }
  }, [buildParams]);

  const fetchHeroProperties = useCallback(async () => {
    setLoadingHero(true);
    try {
      const r = await api.get('/properties', { params: { limit: 4 } });
      setHeroProperties(r.data.data || []);
    } catch (err) {
      console.error('Hero fetch error:', err);
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

  return (
    <div className="min-h-screen bg-surface pb-24 md:pb-8 page-enter">
      <TopBar />
      <HeroSlider properties={heroProperties} loading={loadingHero} />

      {/* Stats Section */}
      <div className="flex justify-around px-4 py-4 md:max-w-2xl md:mx-auto">
        {STATS.map(s => (
          <div key={s.label} className="text-center">
            <div className="text-xl md:text-2xl font-serif font-semibold text-primary">{s.value}</div>
            <div className="text-2xs text-ink-5 mt-0.5 hidden sm:block">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter Chips */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar px-4 py-2 md:max-w-4xl md:mx-auto">
        {FILTERS.map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all duration-200 active:scale-95 whitespace-nowrap
              ${filter === f.id ? 'bg-primary text-white shadow-green scale-[1.02]' : 'bg-white text-ink-4 shadow-soft hover:bg-surface-3 hover:text-ink'}`}
          >
            <span>{f.icon}</span> {f.label}
          </button>
        ))}
      </div>

      {/* Featured Properties */}
      {featured.length > 0 && (
        <div className="mt-4 md:max-w-4xl md:mx-auto">
          <div className="flex items-center justify-between px-4 mb-3">
            <h2 className="text-lg font-bold text-ink flex items-center gap-2">
              Featured <span className="text-gold">⭐</span>
            </h2>
            <button onClick={() => navigate('/search?premium=1')} className="text-sm font-medium text-primary hover:underline flex items-center gap-1">
              Ona Zote <span>→</span>
            </button>
          </div>
          {loadingF ? (
            <div className="flex gap-3 overflow-x-auto no-scrollbar px-4 pb-2">
              {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto no-scrollbar px-4 pb-2">
              {featured.map(p => (
                <PropertyCard key={p.id} property={p} isFav={favorites.includes(p.id)} onFav={toggleFav} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Newest Properties Marquee */}
      {newest.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between px-4 mb-2.5">
            <h2 className="text-base font-bold text-ink flex items-center gap-2">
              🆕 Mpya Zaidi <span className="text-green-500 text-sm animate-pulse-soft">● Live</span>
            </h2>
            <button onClick={() => navigate('/search')} className="text-xs font-medium text-primary hover:underline">Zaidi →</button>
          </div>
          <div className="px-4">
            <RecentMarquee items={newest} />
          </div>
        </div>
      )}

      {/* All Properties */}
      <div className="mt-5 md:max-w-4xl md:mx-auto">
        <div className="flex items-center justify-between px-4 mb-3">
          <h2 className="text-lg font-bold text-ink">Mali Zote 🏠</h2>
          <button onClick={() => navigate('/search')} className="text-sm font-medium text-primary hover:underline">Zaidi →</button>
        </div>
        {loadingN ? (
          <div className="space-y-0">{[1, 2, 3].map(i => <SkeletonListCard key={i} />)}</div>
        ) : (
          <div>
            {newest.length > 0 ? (
              newest.map(p => (
                <PropertyCard key={p.id} property={p} horizontal isFav={favorites.includes(p.id)} onFav={toggleFav} />
              ))
            ) : (
              <div className="text-center py-12">
                <p className="text-sm text-ink-5">Hakuna mali zilizoorodheshwa bado</p>
                <button onClick={() => navigate('/add')} className="mt-3 text-primary font-semibold underline">
                  Ongeza Mali Yako →
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* CTA for non-logged in users */}
      {!user && (
        <div className="mx-4 mt-6 mb-4 bg-gradient-to-br from-primary to-primary-light rounded-3xl p-6 text-center shadow-green">
          <h3 className="font-serif text-xl font-semibold text-white mb-2">Una Mali ya Kukodisha?</h3>
          <p className="text-white/70 text-sm mb-4">Weka tangazo lako bure leo. Fikia wateja elfu za Tanzania.</p>
          <button onClick={() => navigate('/auth')} className="bg-white text-primary px-6 py-2.5 rounded-full font-bold text-sm active:scale-95 transition-all shadow-soft hover:shadow-lift">
            Anza Sasa →
          </button>
        </div>
      )}
    </div>
  );
}