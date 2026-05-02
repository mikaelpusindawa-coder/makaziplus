import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { TopBar } from '../components/layout/TopBar';
import { PropertyCard } from '../components/common/PropertyCard';
import { Spinner, EmptyState } from '../components/common/Spinner';
import api from '../utils/api';

// Filter categories
const TYPES = [
  { id: 'all', label: 'Yote', icon: '✨' },
  { id: 'nyumba', label: 'Nyumba', icon: '🏠' },
  { id: 'chumba', label: 'Chumba', icon: '🛏' },
  { id: 'frem', label: 'Frem', icon: '🏢' },
  { id: 'ofisi', label: 'Ofisi', icon: '💼' },
  { id: 'sale', label: 'Kuuza', icon: '🏷️' },
];

// Sort options
const SORT_OPTIONS = [
  { id: 'newest', label: 'Mpya Zaidi', icon: '🆕' },
  { id: 'price_low', label: 'Bei: Kuanzia Chini', icon: '💰⬆️' },
  { id: 'price_high', label: 'Bei: Kuanzia Juu', icon: '💰⬇️' },
  { id: 'popular', label: 'Maoni Mengi', icon: '👁️' },
  { id: 'premium', label: 'Premium Kwanza', icon: '⭐' },
];

// Cities for filter
const CITIES = [
  { id: 'all', label: 'Miji Yote' },
  { id: 'Dar es Salaam', label: 'Dar es Salaam' },
  { id: 'Mwanza', label: 'Mwanza' },
  { id: 'Arusha', label: 'Arusha' },
  { id: 'Dodoma', label: 'Dodoma' },
  { id: 'Mbeya', label: 'Mbeya' },
  { id: 'Zanzibar', label: 'Zanzibar' },
  { id: 'Tanga', label: 'Tanga' },
  { id: 'Morogoro', label: 'Morogoro' },
];

export default function Search() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  // Search state
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [type, setType] = useState('all');
  const [city, setCity] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [premiumOnly, setPremiumOnly] = useState(false);

  // Results state
  const [results, setResults] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // UI state
  const [showFilters, setShowFilters] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);

  const limit = 20;

  // Fetch results with all filters and sorting
  const fetchResults = useCallback(async (resetPage = true) => {
    if (resetPage) {
      setPage(1);
      setResults([]);
    }
    
    const currentPage = resetPage ? 1 : page;
    setLoading(true);
    
    try {
      const params = { 
        limit, 
        page: currentPage,
        sort_by: sortBy
      };
      
      if (query) params.search = query;
      if (type !== 'all') params.type = type;
      if (city !== 'all') params.city = city;
      if (priceMin) params.price_min = parseFloat(priceMin);
      if (priceMax) params.price_max = parseFloat(priceMax);
      if (premiumOnly) params.premium = 1;
      
      // Use the sort-enabled endpoint
      const r = await api.get('/properties/sort', { params });
      
      if (resetPage) {
        setResults(r.data.data);
      } else {
        setResults(prev => [...prev, ...r.data.data]);
      }
      
      setTotal(r.data.total);
      setHasMore(r.data.data.length === limit && (currentPage * limit) < r.data.total);
      
    } catch (err) {
      // Fallback to regular endpoint if sort endpoint fails
      try {
        const params = { limit, page: currentPage };
        if (query) params.search = query;
        if (type !== 'all') params.type = type;
        if (city !== 'all') params.city = city;
        if (priceMin) params.price_min = parseFloat(priceMin);
        if (priceMax) params.price_max = parseFloat(priceMax);
        if (premiumOnly) params.premium = 1;
        
        const r = await api.get('/properties', { params });
        
        // Apply sorting client-side
        let sortedData = [...r.data.data];
        if (sortBy === 'price_low') {
          sortedData.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
        } else if (sortBy === 'price_high') {
          sortedData.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
        } else if (sortBy === 'popular') {
          sortedData.sort((a, b) => (b.views || 0) - (a.views || 0));
        } else if (sortBy === 'premium') {
          sortedData.sort((a, b) => (b.is_premium || 0) - (a.is_premium || 0));
        } else {
          sortedData.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        }
        
        if (resetPage) {
          setResults(sortedData);
        } else {
          setResults(prev => [...prev, ...sortedData]);
        }
        setTotal(r.data.total);
        setHasMore(r.data.data.length === limit && (currentPage * limit) < r.data.total);
      } catch (fallbackErr) {
        console.error('Fetch error:', fallbackErr);
        toast('Hitilafu ya kupakia matokeo', 'error');
      }
    } finally {
      setLoading(false);
    }
  }, [query, type, city, sortBy, priceMin, priceMax, premiumOnly, page, limit, toast]);

  // Fetch favorites
  const fetchFavs = useCallback(async () => {
    if (!user) return;
    try {
      const r = await api.get('/favorites');
      setFavorites(r.data.data.map(p => p.id));
    } catch (err) {
      console.error('Favorites fetch error:', err);
    }
  }, [user]);

  // Trigger search when filters change
  useEffect(() => {
    fetchResults(true);
  }, [query, type, city, sortBy, priceMin, priceMax, premiumOnly]);

  // Load favorites on mount
  useEffect(() => {
    fetchFavs();
  }, [fetchFavs]);

  // Load more results (infinite scroll)
  useEffect(() => {
    const handleScroll = () => {
      if (loading || !hasMore) return;
      const scrollTop = document.documentElement.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = document.documentElement.clientHeight;
      
      if (scrollTop + clientHeight >= scrollHeight - 500) {
        setPage(prev => prev + 1);
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loading, hasMore]);

  // Load more when page changes
  useEffect(() => {
    if (page > 1) {
      fetchResults(false);
    }
  }, [page]);

  const toggleFav = async (id) => {
    if (!user) {
      navigate('/auth');
      return;
    }
    try {
      const r = await api.post(`/favorites/${id}/toggle`);
      setFavorites(prev => r.data.favorited ? [...prev, id] : prev.filter(f => f !== id));
      toast(r.data.message, 'success');
    } catch (err) {
      toast('Hitilafu ya mtandao', 'error');
    }
  };

  const clearFilters = () => {
    setQuery('');
    setType('all');
    setCity('all');
    setSortBy('newest');
    setPriceMin('');
    setPriceMax('');
    setPremiumOnly(false);
    setShowFilters(false);
  };

  const getCurrentSortLabel = () => {
    const option = SORT_OPTIONS.find(o => o.id === sortBy);
    return option ? `${option.icon} ${option.label}` : 'Panga kwa';
  };

  return (
    <div className="min-h-screen bg-surface pb-24 md:pb-8 animate-fade-in">
      <TopBar title="Tafuta Nyumba" showBack />

      {/* ─── SEARCH BAR ─── */}
      <div className="bg-primary px-4 pt-3 pb-4">
        <div className="bg-white rounded-xl flex items-center gap-2 px-3.5 py-1 shadow-md">
          <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-ink-4 flex-shrink-0" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Tafuta kwa eneo, mtaa, au jina la mali..."
            className="flex-1 py-2.5 bg-transparent text-sm text-ink placeholder-ink-4 outline-none"
            onKeyDown={e => e.key === 'Enter' && fetchResults(true)}
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-ink-4 text-lg px-1 hover:text-ink">
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ─── FILTER & SORT TOOLBAR ─── */}
      <div className="bg-white border-b border-surface-4 px-3 py-2 flex items-center justify-between gap-2">
        {/* Filter button */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all
            ${showFilters ? 'bg-primary text-white' : 'bg-surface text-ink-4 hover:bg-surface-3'}`}
        >
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="6" x2="20" y2="6" />
            <line x1="8" y1="12" x2="16" y2="12" />
            <line x1="11" y1="18" x2="13" y2="18" />
          </svg>
          Filters
          {(priceMin || priceMax || premiumOnly || city !== 'all') && (
            <span className="w-2 h-2 bg-primary rounded-full" />
          )}
        </button>

        {/* Sort button */}
        <div className="relative">
          <button
            onClick={() => setShowSortMenu(!showSortMenu)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-surface text-ink-4 hover:bg-surface-3 transition-all"
          >
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" y1="6" x2="16" y2="6" />
              <line x1="4" y1="12" x2="12" y2="12" />
              <line x1="4" y1="18" x2="20" y2="18" />
            </svg>
            {getCurrentSortLabel()}
          </button>

          {/* Sort dropdown menu */}
          {showSortMenu && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setShowSortMenu(false)} />
              <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-card border border-surface-4 z-40 overflow-hidden animate-fade-in">
                {SORT_OPTIONS.map(option => (
                  <button
                    key={option.id}
                    onClick={() => {
                      setSortBy(option.id);
                      setShowSortMenu(false);
                    }}
                    className={`w-full flex items-center gap-2 px-4 py-2.5 text-left text-sm transition-colors hover:bg-surface
                      ${sortBy === option.id ? 'bg-primary-50 text-primary font-semibold' : 'text-ink-4'}`}
                  >
                    <span>{option.icon}</span>
                    {option.label}
                    {sortBy === option.id && <span className="ml-auto">✓</span>}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Results count */}
        <div className="text-xs text-ink-4 ml-auto">
          {loading ? 'Inatafuta...' : `${total} matokeo`}
        </div>
      </div>

      {/* ─── ADVANCED FILTERS PANEL ─── */}
      {showFilters && (
        <div className="bg-white border-b border-surface-4 px-4 py-4 animate-fade-in">
          {/* City filter */}
          <div className="mb-4">
            <label className="block text-xs font-bold text-ink-4 uppercase tracking-wider mb-2">Jiji</label>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {CITIES.map(c => (
                <button
                  key={c.id}
                  onClick={() => setCity(c.id)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all
                    ${city === c.id ? 'bg-primary text-white' : 'bg-surface text-ink-4 hover:bg-surface-3'}`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Price range */}
          <div className="mb-4">
            <label className="block text-xs font-bold text-ink-4 uppercase tracking-wider mb-2">Bei (TZS)</label>
            <div className="flex gap-3">
              <input
                type="number"
                value={priceMin}
                onChange={e => setPriceMin(e.target.value)}
                placeholder="Kuanzia"
                className="flex-1 px-3 py-2 border-2 border-surface-3 rounded-xl text-sm bg-surface focus:border-primary focus:bg-white outline-none"
              />
              <span className="text-ink-4 self-center">-</span>
              <input
                type="number"
                value={priceMax}
                onChange={e => setPriceMax(e.target.value)}
                placeholder="Hadi"
                className="flex-1 px-3 py-2 border-2 border-surface-3 rounded-xl text-sm bg-surface focus:border-primary focus:bg-white outline-none"
              />
            </div>
          </div>

          {/* Premium only toggle */}
          <div className="flex items-center justify-between py-2 mb-3">
            <div>
              <div className="text-sm font-semibold text-ink">Premium Pekee</div>
              <div className="text-2xs text-ink-4">Onyesha matangazo ya premium tu</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={premiumOnly}
                onChange={e => setPremiumOnly(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-primary peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
            </label>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 mt-2">
            <button onClick={clearFilters} className="flex-1 py-2.5 border-2 border-surface-4 text-ink-4 rounded-xl text-sm font-semibold active:scale-[.98] transition-all">
              Futa Filters
            </button>
            <button onClick={() => setShowFilters(false)} className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-bold active:scale-[.98] transition-all">
              Tafuta
            </button>
          </div>
        </div>
      )}

      {/* ─── TYPE CHIPS ─── */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar px-3 py-3 border-b border-surface-4">
        {TYPES.map(t => (
          <button
            key={t.id}
            onClick={() => setType(t.id)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all shadow-sm
              ${type === t.id ? 'bg-primary text-white border-primary' : 'bg-white text-ink-4 border border-surface-4 hover:bg-surface-3'}`}
          >
            <span>{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      {/* ─── RESULTS ─── */}
      {loading && results.length === 0 ? (
        <div className="flex justify-center py-20">
          <Spinner size="lg" />
        </div>
      ) : results.length > 0 ? (
        <div className="px-3 py-2">
          {results.map(p => (
            <PropertyCard
              key={p.id}
              property={p}
              horizontal
              isFav={favorites.includes(p.id)}
              onFav={toggleFav}
            />
          ))}
          
          {/* Loading indicator for more results */}
          {loading && results.length > 0 && (
            <div className="flex justify-center py-6">
              <Spinner size="md" />
            </div>
          )}
          
          {/* No more results message */}
          {!hasMore && results.length > 0 && (
            <div className="text-center py-6 text-xs text-ink-4">
              Umefikia mwisho wa matokeo 🏁
            </div>
          )}
        </div>
      ) : (
        <EmptyState
          icon="🔍"
          title="Hakuna matokeo"
          subtitle="Jaribu kubadilisha filters au neno la kutafuta"
          action={{
            label: 'Angalia Mali Zote',
            onClick: () => {
              setQuery('');
              setType('all');
              setCity('all');
              setSortBy('newest');
              setPriceMin('');
              setPriceMax('');
              setPremiumOnly(false);
              setShowFilters(false);
            }
          }}
        />
      )}
    </div>
  );
}