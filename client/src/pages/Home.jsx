import React, { useState, useEffect, useCallback, useRef } from 'react';
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

// Clean Base Category Filters (Regions stripped out to be handled by the premium dropdown menu instead)
const CATEGORY_FILTERS = [
  { id: 'all', label: 'Yote', icon: '✨' },
  { id: 'nyumba', label: 'Nyumba', icon: '🏠' },
  { id: 'chumba', label: 'Chumba', icon: '🛏' },
  { id: 'frem', label: 'Frem', icon: '🏢' },
  { id: 'ofisi', label: 'Ofisi', icon: '💼' },
  { id: 'sale', label: 'Kuuza', icon: '🏷️' },
];

// Complete official database list of all Tanzanian Regions for the dropdown selection mapping
const TANZANIA_REGIONS = [
  { id: 'dar', label: 'Dar es Salaam', apiKey: 'Dar es Salaam' },
  { id: 'dodoma', label: 'Dodoma', apiKey: 'Dodoma' },
  { id: 'arusha', label: 'Arusha', apiKey: 'Arusha' },
  { id: 'mwanza', label: 'Mwanza', apiKey: 'Mwanza' },
  { id: 'zanzibar', label: 'Zanzibar Mjini Magharibi', apiKey: 'Zanzibar' },
  { id: 'mbeya', label: 'Mbeya', apiKey: 'Mbeya' },
  { id: 'morogoro', label: 'Morogoro', apiKey: 'Morogoro' },
  { id: 'tanga', label: 'Tanga', apiKey: 'Tanga' },
  { id: 'kilimanjaro', label: 'Kilimanjaro (Moshi)', apiKey: 'Kilimanjaro' },
  { id: 'iringa', label: 'Iringa', apiKey: 'Iringa' },
  { id: 'tabora', label: 'Tabora', apiKey: 'Tabora' },
  { id: 'kigoma', label: 'Kigoma', apiKey: 'Kigoma' },
  { id: 'shinyanga', label: 'Shinyanga', apiKey: 'Shinyanga' },
  { id: 'kagera', label: 'Kagera (Bukoba)', apiKey: 'Kagera' },
  { id: 'mara', label: 'Mara (Musoma)', apiKey: 'Mara' },
  { id: 'mपेक्षा', label: 'Mtwara', apiKey: 'Mtwara' },
  { id: 'lindi', label: 'Lindi', apiKey: 'Lindi' },
  { id: 'ruvuma', label: 'Ruvuma (Songea)', apiKey: 'Ruvuma' },
  { id: 'singida', label: 'Singida', apiKey: 'Singida' },
  { id: 'manyara', label: 'Manyara', apiKey: 'Manyara' },
  { id: 'geita', label: 'Geita', apiKey: 'Geita' },
  { id: 'katavi', label: 'Katavi', apiKey: 'Katavi' },
  { id: 'njombe', label: 'Njombe', apiKey: 'Njombe' },
  { id: 'simiyu', label: 'Simiyu', apiKey: 'Simiyu' },
  { id: 'songwe', label: 'Songwe', apiKey: 'Songwe' },
  { id: 'pemba_north', label: 'Pemba Kaskazini', apiKey: 'Pemba Kaskazini' },
  { id: 'pemba_south', label: 'Pemba Kusini', apiKey: 'Pemba Kusini' },
  { id: 'unguja_north', label: 'Unguja Kaskazini', apiKey: 'Unguja Kaskazini' },
  { id: 'unguja_south', label: 'Unguja Kusini', apiKey: 'Unguja Kusini' },
];

const HeroSlider = ({ properties, loading }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [heroPaused, setHeroPaused] = useState(false);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  useEffect(() => {
    if (heroPaused || loading) return;
    const displayItems = properties.length > 0 ? properties.slice(0, 4) : FALLBACK_HERO_IMAGES;
    if (displayItems.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % displayItems.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [heroPaused, loading, properties]);

  const handleTouchStart = (e) => setTouchStart(e.targetTouches[0].clientX);
  const handleTouchMove = (e) => setTouchEnd(e.targetTouches[0].clientX);
  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const difference = touchStart - touchEnd;
    const displayItems = properties.length > 0 ? properties.slice(0, 4) : FALLBACK_HERO_IMAGES;
    
    if (difference > 50) {
      setCurrentIndex((prev) => (prev + 1) % displayItems.length);
      setHeroPaused(true);
      setTimeout(() => setHeroPaused(false), 8000);
    }
    if (difference < -50) {
      setCurrentIndex((prev) => (prev - 1 + displayItems.length) % displayItems.length);
      setHeroPaused(true);
      setTimeout(() => setHeroPaused(false), 8000);
    }
    setTouchStart(0);
    setTouchEnd(0);
  };

  if (loading) {
    return (
      <div className="relative mx-3 mt-3 md:mx-4 md:mt-4 rounded-3xl overflow-hidden bg-surface-3" style={{ height: 'clamp(200px, 35vw, 420px)' }}>
        <div className="w-full h-full skeleton" />
      </div>
    );
  }

  const displayItems = properties.length > 0 ? properties.slice(0, 4) : FALLBACK_HERO_IMAGES;
  const current = displayItems[currentIndex];

  return (
    <div
      className="relative mx-3 mt-3 md:mx-4 md:mt-4 rounded-3xl overflow-hidden cursor-pointer group shadow-soft"
      style={{ height: 'clamp(200px, 35vw, 420px)' }}
      onMouseEnter={() => setHeroPaused(true)}
      onMouseLeave={() => setHeroPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <img
        src={current.isFallback ? current.image_url : getPropertyImage(current)}
        alt={current.title}
        loading="eager"
        className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
        onError={(e) => { e.target.onerror = null; e.target.src = _HERO_ERROR_SVG; }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/40 to-transparent" />
      
      {current.is_premium === 1 && (
        <div className="absolute top-4 left-4 bg-gold text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-gold z-10">
          ⭐ Premium Listing
        </div>
      )}
      
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

      <button onClick={(e) => { e.stopPropagation(); setCurrentIndex((prev) => (prev - 1 + displayItems.length) % displayItems.length); }}
        className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 md:w-10 md:h-10 bg-black/40 hover:bg-black/60 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all duration-300 z-20">
        <svg viewBox="0 0 24 24" className="w-4 h-4 md:w-5 h-5 stroke-white" fill="none" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg>
      </button>
      <button onClick={(e) => { e.stopPropagation(); setCurrentIndex((prev) => (prev + 1) % displayItems.length); }}
        className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 md:w-10 md:h-10 bg-black/40 hover:bg-black/60 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all duration-300 z-20">
        <svg viewBox="0 0 24 24" className="w-4 h-4 md:w-5 h-5 stroke-white" fill="none" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
      </button>

      <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 z-10">
        {displayItems.map((_, idx) => (
          <button key={idx} onClick={(e) => { e.stopPropagation(); setCurrentIndex(idx); }}
            className={`transition-all duration-300 rounded-full ${currentIndex === idx ? 'w-8 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/40 hover:bg-white/60'}`} />
        ))}
      </div>
      {!heroPaused && !loading && displayItems.length > 1 && (
        <div className="absolute bottom-0 left-0 h-1 bg-gold animate-slide-progress" style={{ width: '100%' }} />
      )}
    </div>
  );
};

const RecentMarquee = ({ items }) => {
  const navigate = useNavigate();
  if (!items.length) return null;
  const doubled = [...items, ...items];

  return (
    <div className="overflow-hidden relative">
      <div className="flex gap-3 animate-marquee" style={{ width: 'max-content' }}>
        {doubled.map((p, i) => (
          <div key={`${p.id}-${i}`} onClick={() => navigate(`/property/${p.id}`)}
            className="flex-shrink-0 w-44 bg-white rounded-2xl overflow-hidden shadow-soft border border-surface-4 cursor-pointer hover:shadow-card transition-all hover:-translate-y-1">
            <div className="h-24 relative overflow-hidden bg-surface-3">
              <img src={getPropertyImage(p)} alt={p.title} className="w-full h-full object-cover" loading="lazy"
                onError={(e) => { e.target.onerror = null; e.target.src = getPlaceholderImage(p.type, p.id); }} />
              <div className="absolute bottom-1.5 left-1.5 bg-black/50 backdrop-blur-sm text-white text-2xs font-bold px-1.5 py-0.5 rounded-full">
                🆕 {timeAgo(p.created_at)}
              </div>
            </div>
            <div className="p-2.5">
              <p className="text-xs font-bold text-primary line-clamp-1">
                {formatPrice(p.price)} {p.price_type === 'rent' ? '/mwezi' : ''}
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
  const [filter, setFilter] = useState('all');
  const [featured, setFeatured] = useState([]);
  const [newest, setNewest] = useState([]);
  const [heroProperties, setHeroProperties] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [loadingF, setLoadingF] = useState(true);
  const [loadingN, setLoadingN] = useState(true);
  const [loadingHero, setLoadingHero] = useState(true);
  
  // Dropdown visibility toggle state management
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown overlay when user clicks anywhere outside of the container
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Dynamically matches current filter string with active region mapping inside TANZANIA_REGIONS collection
  const selectedRegion = TANZANIA_REGIONS.find(r => r.id === filter);

  const buildParams = useCallback(() => {
    const p = {};
    if (filter === 'nyumba') p.type = 'nyumba';
    else if (filter === 'chumba') p.type = 'chumba';
    else if (filter === 'frem') p.type = 'frem';
    else if (filter === 'ofisi') p.type = 'ofisi';
    else if (filter === 'sale') p.price_type = 'sale';
    
    // Dynamically checks if the filter corresponds to any of the 30+ dropdown regions listed above
    const matchedRegion = TANZANIA_REGIONS.find(r => r.id === filter);
    if (matchedRegion) {
      p.city = matchedRegion.apiKey;
    }
    
    return p;
  }, [filter]);

  const fetchFeatured = useCallback(async () => {
    setLoadingF(true);
    try {
      const r = await api.get('/properties', { params: { ...buildParams(), premium: 1, limit: 8 } });
      setFeatured(r.data.data || []);
    } catch (err) { console.error(err); } finally { setLoadingF(false); }
  }, [buildParams]);

  const fetchNewest = useCallback(async () => {
    setLoadingN(true);
    try {
      const r = await api.get('/properties', { params: { ...buildParams(), limit: 12 } });
      setNewest(r.data.data || []);
    } catch (err) { console.error(err); } finally { setLoadingN(false); }
  }, [buildParams]);

  const fetchHeroProperties = useCallback(async () => {
    setLoadingHero(true);
    try {
      const r = await api.get('/properties', { params: { limit: 20 } });
      setHeroProperties(r.data.data || []);
    } catch { setHeroProperties([]); } finally { setLoadingHero(false); }
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
    <div className="min-h-screen bg-surface pb-24 md:pb-12 page-enter">
      <TopBar />
      <HeroSlider properties={heroWithImages} loading={loadingHero} />

      <div className="flex justify-around px-4 py-4 md:max-w-4xl md:mx-auto">
        {STATS.map(s => (
          <div key={s.label} className="text-center">
            <div className="text-xl md:text-2xl font-serif font-semibold text-primary">{s.value}</div>
            <div className="text-2xs text-ink-5 mt-0.5 hidden sm:block font-medium">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Highly optimized, scannable horizontally scrolling filter ribbon layout container */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar px-4 py-2 md:max-w-4xl md:mx-auto items-center relative">
        {CATEGORY_FILTERS.map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all duration-200 active:scale-95 whitespace-nowrap
              ${filter === f.id ? 'bg-primary text-white shadow-green scale-[1.02]' : 'bg-white text-ink-4 shadow-soft hover:bg-surface-3 hover:text-ink'}`}>
            <span>{f.icon}</span> {f.label}
          </button>
        ))}

        {/* Professional Dropdown Component enclosing all 30+ locations seamlessly */}
        <div className="relative flex-shrink-0" ref={dropdownRef}>
          <button 
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all duration-200 active:scale-95 whitespace-nowrap shadow-soft
              ${selectedRegion ? 'bg-primary text-white shadow-green' : 'bg-white text-ink-4 hover:bg-surface-3 hover:text-ink'}`}
          >
            <span>📍</span> {selectedRegion ? selectedRegion.label : 'Chagua Mkoa'}
            <svg viewBox="0 0 24 24" className={`w-3 h-3 ml-0.5 transition-transform duration-200 fill-none stroke-current stroke-[3] ${dropdownOpen ? 'rotate-180' : ''}`}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 max-h-64 bg-white rounded-xl shadow-xl border border-surface-4 overflow-y-auto z-50 animate-fade-in no-scrollbar">
              <div className="py-1">
                {TANZANIA_REGIONS.map(reg => (
                  <button
                    key={reg.id}
                    onClick={() => {
                      setFilter(reg.id);
                      setDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 text-xs font-medium transition-colors duration-150 flex items-center justify-between
                      ${filter === reg.id ? 'bg-primary/10 text-primary font-semibold' : 'text-ink-4 hover:bg-surface-2 hover:text-ink'}`}
                  >
                    <span>{reg.label}</span>
                    {filter === reg.id && <span className="text-primary text-sm">✓</span>}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

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

      {marqueeItems.length > 0 && (
        <div className="mt-6 md:max-w-4xl md:mx-auto">
          <div className="flex items-center justify-between px-4 mb-2.5">
            <h2 className="text-base font-bold text-ink flex items-center gap-2">
              🆕 Mpya Zaidi <span className="text-green-500 text-sm animate-pulse-soft">● Live</span>
            </h2>
            <button onClick={() => navigate('/search')} className="text-xs font-medium text-primary hover:underline">Zaidi →</button>
          </div>
          <div className="px-4">
            <RecentMarquee items={marqueeItems} />
          </div>
        </div>
      )}

      <div className="mt-5 md:max-w-4xl md:mx-auto">
        <div className="flex items-center justify-between px-4 mb-3">
          <h2 className="text-lg font-bold text-ink">Mali Zote 🏠</h2>
          <button onClick={() => navigate('/search')} className="text-sm font-medium text-primary hover:underline">Zaidi →</button>
        </div>
        {loadingN ? (
          <div className="px-4 space-y-3 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-4 md:space-y-0">
            {[1, 2, 3].map(i => <SkeletonListCard key={i} />)}
          </div>
        ) : (
          <div className="px-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {newest.length > 0 ? (
              newest.map(p => (
                <PropertyCard key={p.id} property={p} horizontal isFav={favorites.includes(p.id)} onFav={toggleFav} />
              ))
            ) : (
              <div className="text-center py-12 col-span-full bg-white rounded-2xl border border-surface-4">
                <p className="text-sm text-ink-5">Hakuna mali zilizoorodheshwa bado</p>
                <button onClick={() => navigate('/add')} className="mt-3 text-primary font-semibold underline">Ongeza Mali Yako →</button>
              </div>
            )}
          </div>
        )}
      </div>

      {!user && (
        <div className="mx-4 mt-6 mb-4 md:max-w-4xl md:mx-auto bg-gradient-to-br from-primary to-primary-light rounded-3xl p-6 text-center shadow-green">
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
