import React, { useState, useEffect, lazy, Suspense } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Spinner, PaymentModal } from '../components/common/Spinner';
import { BookingModal } from '../components/common/BookingModal';
import { RatingModal } from '../components/common/RatingModal';
import { LoginPromptModal } from '../components/common/LoginPromptModal';
import { formatPrice, getAvatar, daysAgo, renderStars, STATUS_LABELS, resolveImageUrl, getPlaceholderImage } from '../utils/helpers';
import api from '../utils/api';
const PropertyMap = lazy(() => import('../components/common/PropertyMap'));

// Intent keys for localStorage
const INTENT_KEY = 'makaziplus_intent';
const RETURN_URL_KEY = 'makaziplus_return_url';

// Save intent to localStorage before redirecting to login
const saveIntent = (intent, data) => {
  console.log('💾 saveIntent: Saving intent:', intent, data);
  localStorage.setItem(INTENT_KEY, JSON.stringify({ intent, data, timestamp: Date.now() }));
};

// Clear intent after execution
const clearIntent = () => {
  console.log('🗑️ clearIntent: Removing saved intent');
  localStorage.removeItem(INTENT_KEY);
};

// Get saved intent (does NOT clear it)
const getSavedIntent = () => {
  const saved = localStorage.getItem(INTENT_KEY);
  console.log('📦 getSavedIntent: Raw saved data:', saved);
  if (!saved) return null;
  try {
    const intent = JSON.parse(saved);
    console.log('📦 getSavedIntent: Parsed intent:', intent);
    if (Date.now() - intent.timestamp > 10 * 60 * 1000) {
      console.log('📦 getSavedIntent: Intent expired, clearing');
      clearIntent();
      return null;
    }
    return intent;
  } catch (e) {
    console.error('📦 getSavedIntent: Parse error:', e);
    return null;
  }
};

// Get return URL
const getReturnUrl = () => {
  const url = localStorage.getItem(RETURN_URL_KEY);
  console.log('🔙 getReturnUrl: Retrieved URL:', url);
  localStorage.removeItem(RETURN_URL_KEY);
  return url;
};

export default function PropertyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFav, setIsFav] = useState(false);
  const [mainImg, setMainImg] = useState('');
  const [imgIdx, setImgIdx] = useState(0);
  const [payOpen, setPayOpen] = useState(false);
  const [intentExecuted, setIntentExecuted] = useState(false);

  // Rating modal states
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [starValue, setStarValue] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);

  // Booking modal states
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingDetails, setBookingDetails] = useState({
    check_in: '',
    check_out: '',
    guests: 1,
    special_requests: ''
  });
  const [bookingLoading, setBookingLoading] = useState(false);

  // Owner rating states
  const [ownerRating, setOwnerRating] = useState(null);
  const [ownerReviews, setOwnerReviews] = useState([]);

  // Guest login prompt
  const [loginPrompt, setLoginPrompt] = useState({ open: false, action: '', intent: null });

  // Check for return URL after login - redirect back to property page
  useEffect(() => {
    const returnUrl = getReturnUrl();
    console.log('🔙 Return URL check:', returnUrl);
    
    if (returnUrl && returnUrl.includes(`/property/${id}`)) {
      console.log('🔙 Already on property page, will execute intent');
    } else if (returnUrl && returnUrl.includes('/property/')) {
      console.log('🔙 Navigating to return URL:', returnUrl);
      const match = returnUrl.match(/\/property\/(\d+)/);
      if (match && match[1] !== id) {
        navigate(returnUrl, { replace: true });
        return;
      }
    }
  }, [id, navigate]);

  // Load property data
  const loadProperty = async () => {
    try {
      console.log('📡 Loading property ID:', id);
      setLoading(true);
      setError(null);
      
      const r = await api.get(`/properties/${id}`);
      console.log('📡 Property data received:', r.data.data);
      setProperty(r.data.data);
      
      const imgs = r.data.data.images || [];
      if (imgs.length) {
        setMainImg(resolveImageUrl(imgs[0].image_url) || '');
      }
      
      if (user) {
        const fav = await api.get(`/favorites/${id}/check`);
        setIsFav(fav.data.favorited);
      }
    } catch (err) {
      console.error('Load property error:', err);
      setError('Mali haipatikani');
      toast('Mali haipatikani', 'error');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProperty();
  }, [id, user]);

  // Reset intent executed flag when property changes
  useEffect(() => {
    console.log('🔄 Resetting for property ID:', id);
    setIntentExecuted(false);
  }, [id]);

  // Check for saved intent AFTER property is loaded AND user is logged in
  useEffect(() => {
    console.log('🔍 Intent check: user=', !!user, 'property=', !!property, 'intentExecuted=', intentExecuted);
    
    if (!user || !property || intentExecuted) return;
    
    const savedIntent = getSavedIntent();
    console.log('🔍 Intent check: savedIntent=', savedIntent);
    
    if (!savedIntent) return;
    
    const { intent, data } = savedIntent;
    console.log('🎯 Executing saved intent:', intent, data);
    
    setIntentExecuted(true);
    
    switch (intent) {
      case 'rating':
        console.log('✅ Opening rating modal');
        setShowRatingModal(true);
        toast('Tathmini yako iko tayari. Weka nyota zako! ⭐', 'info');
        clearIntent();
        break;
      case 'booking':
        if (data.propertyId === parseInt(id)) {
          console.log('✅ Opening booking modal');
          setShowBookingModal(true);
          toast('Kamilisha booking yako kwa kuchagua tarehe 📅', 'info');
          clearIntent();
        } else {
          console.log('❌ Property ID mismatch');
        }
        break;
      case 'chat':
        if (data.ownerId === property.owner_id) {
          console.log('✅ Opening chat');
          clearIntent();
          navigate(`/chat?userId=${data.ownerId}`);
        } else {
          console.log('❌ Owner ID mismatch');
        }
        break;
      case 'favorite':
        if (data.propertyId === parseInt(id)) {
          console.log('✅ Toggling favorite');
          clearIntent();
          toggleFavAfterLogin();
        } else {
          console.log('❌ Property ID mismatch');
        }
        break;
      default:
        console.log('❌ Unknown intent:', intent);
        break;
    }
  }, [user, property, id, navigate, toast, intentExecuted]);

  // Load owner ratings
  useEffect(() => {
    if (!property?.owner_id) return;
    const loadOwnerRatings = async () => {
      try {
        const r = await api.get(`/ratings/user/${property.owner_id}`);
        setOwnerRating(r.data.avg_rating);
        setOwnerReviews(r.data.data || []);
      } catch (err) {
        console.error('Load owner ratings error:', err);
      }
    };
    loadOwnerRatings();
  }, [property?.owner_id]);

  const toggleFav = async () => {
    if (!user) {
      console.log('💾 Guest favorite: Saving intent');
      saveIntent('favorite', { propertyId: parseInt(id) });
      setLoginPrompt({ open: true, action: 'kuhifadhi mali', intent: 'favorite' });
      return;
    }
    try {
      const r = await api.post(`/favorites/${id}/toggle`);
      setIsFav(r.data.favorited);
      toast(r.data.message, 'success');
    } catch (err) {
      console.error('Toggle fav error:', err);
      toast('Hitilafu ya mtandao', 'error');
    }
  };

  const toggleFavAfterLogin = async () => {
    try {
      const r = await api.post(`/favorites/${id}/toggle`);
      setIsFav(r.data.favorited);
      toast(r.data.message, 'success');
    } catch (err) {
      console.error('Toggle fav error:', err);
      toast('Hitilafu ya mtandao', 'error');
    }
  };

  const openChat = () => {
    if (!user) {
      console.log('💾 Guest chat: Saving intent');
      saveIntent('chat', { ownerId: property?.owner_id, ownerName: property?.owner_name });
      setLoginPrompt({ open: true, action: 'kuwasiliana na dalali/mwenye nyumba', intent: 'chat' });
      return;
    }
    navigate(`/chat?userId=${property.owner_id}`);
  };

  const handleSubmitRating = async () => {
    if (!user) {
      console.log('💾 Guest rating: Saving intent');
      saveIntent('rating', { ownerId: property?.owner_id, ownerName: property?.owner_name });
      setLoginPrompt({ open: true, action: 'kutoa tathmini', intent: 'rating' });
      return;
    }
    if (!starValue) { toast('Chagua rating ya nyota', 'error'); return; }

    setSubmittingRating(true);
    try {
      await api.post('/ratings/user', {
        rated_user_id: property.owner_id,
        rating: starValue,
        review: reviewText.trim() || null
      });
      toast('Asante kwa tathmini yako! ⭐', 'success');
      setShowRatingModal(false);
      setStarValue(0);
      setReviewText('');

      const r = await api.get(`/ratings/user/${property.owner_id}`);
      setOwnerRating(r.data.avg_rating);
      setOwnerReviews(r.data.data || []);
    } catch (e) {
      toast(e.response?.data?.message || 'Hitilafu wakati wa kutuma tathmini', 'error');
    } finally {
      setSubmittingRating(false);
    }
  };

  const openBookingModal = () => {
    if (!user) {
      console.log('💾 Guest booking: Saving intent');
      saveIntent('booking', { propertyId: parseInt(id), propertyTitle: property?.title });
      setLoginPrompt({ open: true, action: 'kuweka booking', intent: 'booking' });
      return;
    }
    setShowBookingModal(true);
  };

  const handleBooking = async () => {
    if (!user) {
      saveIntent('booking', { propertyId: parseInt(id), propertyTitle: property?.title });
      setLoginPrompt({ open: true, action: 'kuweka booking', intent: 'booking' });
      return;
    }
    if (!bookingDetails.check_in || !bookingDetails.check_out) {
      toast('Chagua tarehe za kuingia na kutoka', 'error');
      return;
    }

    const checkIn = new Date(bookingDetails.check_in);
    const checkOut = new Date(bookingDetails.check_out);
    if (checkOut <= checkIn) {
      toast('Tarehe ya kutoka lazima iwe baada ya tarehe ya kuingia', 'error');
      return;
    }

    setBookingLoading(true);
    try {
      const r = await api.post('/bookings', {
        property_id: parseInt(id),
        check_in_date: bookingDetails.check_in,
        check_out_date: bookingDetails.check_out,
        guests: bookingDetails.guests,
        special_requests: bookingDetails.special_requests
      });
      const amount = r.data.total_amount || r.data.data?.total_amount;
      const days   = r.data.days || r.data.data?.days;
      toast(
        `Ombi la uhifadhi limetumwa! Siku ${days} • Jumla: ${formatPrice(amount)} — Subiri uthibitisho.`,
        'success'
      );
      setShowBookingModal(false);
      setBookingDetails({ check_in: '', check_out: '', guests: 1, special_requests: '' });
    } catch (e) {
      toast(e.response?.data?.message || 'Hitilafu wakati wa kuweka booking', 'error');
    } finally {
      setBookingLoading(false);
    }
  };

  const handleCall = () => {
    if (property?.owner_phone) {
      window.location.href = `tel:${property.owner_phone}`;
    } else {
      toast('Nambari ya simu haipatikani', 'info');
    }
  };

  const openGoogleMaps = () => {
    if (property?.latitude && property?.longitude) {
      window.open(`https://www.google.com/maps?q=${property.latitude},${property.longitude}`, '_blank');
    } else if (property?.google_maps_url) {
      window.open(property.google_maps_url, '_blank');
    } else {
      toast('Mahali pa mali haijabainishwa', 'info');
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-surface">
      <Spinner size="lg" />
    </div>
  );

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface">
        <div className="text-center">
          <div className="text-4xl mb-4">🏠</div>
          <p className="text-ink-5">{error}</p>
          <button onClick={() => navigate('/')} className="btn-primary mt-4">Rudi Nyumbani</button>
        </div>
      </div>
    );
  }

  if (!property) return null;

  const p = property;
  const ownerImg = getAvatar({ id: p.owner_id, avatar: p.owner_avatar });
  const allImages = p.images || [];
  const propStatus = STATUS_LABELS[p.property_status || 'available'];
  const isOwnProperty = user && user.id === p.owner_id;
  const daysSinceUpload = daysAgo(p.created_at);
  const today = new Date().toISOString().split('T')[0];
  const minCheckOut = bookingDetails.check_in || today;

  const switchImg = (url, idx) => {
    setMainImg(resolveImageUrl(url) || '');
    setImgIdx(idx);
  };

  return (
    <div className="min-h-screen bg-surface pb-32 md:pb-10 animate-fade-in">

      {/* HERO IMAGE */}
      <div className="relative overflow-hidden bg-surface-3" style={{ height: 'clamp(260px, 46vw, 500px)' }}>
        {mainImg && (
          <img src={mainImg} alt={p.title} loading="eager"
            className="w-full h-full object-cover transition-opacity duration-300"
            onError={e => { e.target.onerror = null; e.target.src = getPlaceholderImage(p?.type, p?.id); }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20" />
        <button onClick={() => navigate(-1)} aria-label="Rudi"
          className="absolute top-4 left-4 w-10 h-10 glass rounded-full flex items-center justify-center shadow-soft active:scale-90 transition-all z-10"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-ink" fill="none" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div className="absolute top-4 right-4 flex gap-2 z-10">
          <button onClick={() => { navigator.share?.({ title: p.title, url: window.location.href }) || toast('Link imenakiliwa', 'success'); }}
            className="w-10 h-10 glass rounded-full flex items-center justify-center shadow-soft active:scale-90"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-ink" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
          </button>
          <button onClick={toggleFav} aria-label="Hifadhi"
            className={`w-10 h-10 rounded-full flex items-center justify-center shadow-soft active:scale-90 transition-all ${isFav ? 'bg-red-500' : 'glass'}`}
          >
            <svg viewBox="0 0 24 24" className={`w-5 h-5 transition-all ${isFav ? 'stroke-white fill-white' : 'stroke-ink fill-transparent'}`}
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </button>
        </div>
        <div className="absolute bottom-3 left-3 flex gap-2 z-10">
          {p.is_premium === 1 && <div className="badge badge-gold shadow-gold">⭐ Premium</div>}
          {p.owner_verified && <div className="badge bg-blue-50 text-blue-700">✓ Verified Owner</div>}
        </div>
        {allImages.length > 1 && (
          <div className="absolute bottom-3 right-3 glass-light text-ink text-xs font-bold px-2.5 py-1 rounded-full">
            📷 {imgIdx + 1}/{allImages.length}
          </div>
        )}
      </div>

      {/* THUMBNAIL STRIP */}
      {allImages.length > 1 && (
        <div className="flex gap-2 px-4 py-3 overflow-x-auto no-scrollbar bg-white border-b border-surface-4">
          {allImages.map((img, i) => {
            const url = resolveImageUrl(img.image_url) || '';
            return (
              <button key={i} onClick={() => switchImg(img.image_url, i)}
                className={`w-16 h-12 md:w-20 md:h-14 rounded-xl overflow-hidden flex-shrink-0 transition-all ${i === imgIdx ? 'ring-2 ring-primary ring-offset-1' : 'opacity-55 hover:opacity-80'}`}
              >
                <img src={url} alt="" className="w-full h-full object-cover" loading="lazy"
                  onError={e => { e.target.onerror = null; e.target.src = getPlaceholderImage(p?.type, p?.id); }} />
              </button>
            );
          })}
        </div>
      )}

      {/* BODY */}
      <div className="px-4 pt-5 md:max-w-3xl md:mx-auto pb-24">

        {/* Price + Title + Time uploaded */}
        <div className="mb-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="font-serif text-2xl md:text-3xl font-semibold text-primary">
                {formatPrice(p.price)}
                <span className="font-sans text-xs font-normal text-ink-5 ml-1">
                  {p.price_type === 'rent' ? '/mwezi' : '-- bei ya mwisho'}
                </span>
              </div>
              <h1 className="text-lg md:text-xl font-bold text-ink mt-1 leading-snug">{p.title}</h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <p className="text-xs text-ink-5 flex items-center gap-0.5">
                  <span className="text-primary">📍</span>{p.area}, {p.city}
                </p>
                <span className="text-ink-6 text-2xs">•</span>
                <p className="text-2xs text-ink-5 flex items-center gap-0.5">
                  <span>🕐</span> Imechapishwa {daysSinceUpload}
                </p>
                {p.latitude && p.longitude && (
                  <>
                    <span className="text-ink-6 text-2xs">•</span>
                    <button onClick={openGoogleMaps} className="text-2xs text-primary hover:underline flex items-center gap-0.5">
                      <span>🗺️</span> Ramani
                    </button>
                  </>
                )}
              </div>
            </div>
            {(isOwnProperty || user?.role === 'admin') && (
              <button
                onClick={() => navigate(`/add?edit=${p.id}`)}
                className="flex items-center gap-1 px-2 py-1.5 bg-primary-50 text-primary rounded-lg text-xs font-bold
                  hover:bg-primary hover:text-white active:scale-95 transition-all flex-shrink-0">
                ✏️ Hariri
              </button>
            )}
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-4 gap-2 mb-5">
          {p.bedrooms > 0 && (
            <div className="bg-white rounded-xl py-2 text-center shadow-soft border border-surface-4">
              <div className="text-base mb-0.5">🛏</div>
              <div className="text-sm font-extrabold text-ink">{p.bedrooms}</div>
              <div className="text-2xs text-ink-5 font-medium">Vyumba</div>
            </div>
          )}
          {p.bathrooms > 0 && (
            <div className="bg-white rounded-xl py-2 text-center shadow-soft border border-surface-4">
              <div className="text-base mb-0.5">🚿</div>
              <div className="text-sm font-extrabold text-ink">{p.bathrooms}</div>
              <div className="text-2xs text-ink-5 font-medium">Bafu</div>
            </div>
          )}
          {p.size_sqm > 0 && (
            <div className="bg-white rounded-xl py-2 text-center shadow-soft border border-surface-4">
              <div className="text-base mb-0.5">📐</div>
              <div className="text-sm font-extrabold text-ink">{p.size_sqm}</div>
              <div className="text-2xs text-ink-5 font-medium">m²</div>
            </div>
          )}
          <div className="bg-white rounded-xl py-2 text-center shadow-soft border border-surface-4">
            <div className="text-base mb-0.5">👁</div>
            <div className="text-sm font-extrabold text-ink">{p.views}</div>
            <div className="text-2xs text-ink-5 font-medium">Maoni</div>
          </div>
        </div>

        {/* Description */}
        <div className="mb-5">
          <h2 className="text-sm font-bold text-ink mb-2">Kuhusu Mali Hii</h2>
          <p className="text-xs leading-relaxed text-ink-4">{p.description}</p>
        </div>

        {/* Amenities */}
        {p.amenities?.length > 0 && (
          <div className="mb-5">
            <h2 className="text-sm font-bold text-ink mb-2">✅ Huduma Zilizopo</h2>
            <div className="flex flex-wrap gap-1.5">
              {p.amenities.slice(0, 8).map(a => (
                <span key={a} className="badge badge-primary text-2xs">{a}</span>
              ))}
              {p.amenities.length > 8 && (
                <span className="badge bg-surface text-ink-4 text-2xs">+{p.amenities.length - 8}</span>
              )}
            </div>
          </div>
        )}

        {/* ─── MAP SECTION ─── */}
        <div className="mb-5">
          <h2 className="text-sm font-bold text-ink mb-2">🗺️ Mahali pa Mali</h2>
          <Suspense fallback={<div className="h-48 bg-surface-3 rounded-xl animate-pulse"/>}>
            <PropertyMap lat={p.latitude} lng={p.longitude} title={p.title} height="200px"/>
          </Suspense>
          {(p.latitude && p.longitude) && (
            <button onClick={openGoogleMaps} className="mt-2 text-2xs text-primary hover:underline flex items-center gap-1">
              📍 Fungua Google Maps →
            </button>
          )}
        </div>

        {/* ─── VIDEO SECTION ─── */}
        {p.video_url && (
          <div className="mb-5">
            <h2 className="text-sm font-bold text-ink mb-2">🎬 Video ya Mali</h2>
            <div className="bg-black rounded-xl overflow-hidden shadow-soft">
              {(p.video_url.includes('youtube.com') || p.video_url.includes('youtu.be') || p.video_url.includes('vimeo.com')) ? (
                <iframe
                  src={
                    p.video_url.includes('youtube.com')
                      ? p.video_url.replace('watch?v=', 'embed/')
                      : p.video_url.includes('youtu.be')
                        ? `https://www.youtube.com/embed/${p.video_url.split('/').pop().split('?')[0]}`
                        : p.video_url
                  }
                  title="Property Video"
                  className="w-full h-48 md:h-64"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <video
                  src={resolveImageUrl(p.video_url, 'videos') || p.video_url}
                  controls
                  className="w-full h-48 md:h-64 object-contain"
                />
              )}
            </div>
          </div>
        )}

        {/* OWNER CARD */}
        <div className="mb-5">
          <h2 className="text-sm font-bold text-ink mb-2">Wasiliana Na</h2>
          <div className="bg-white rounded-xl p-3 shadow-soft border border-surface-4">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-primary-50">
                <img src={ownerImg} alt={p.owner_name} className="w-full h-full object-cover" onError={e => { e.target.style.display = 'none'; }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm text-ink flex items-center gap-1.5 flex-wrap">
                  {p.owner_name}
                  {p.owner_verified && <span className="badge badge-primary text-2xs">✓ Amethibitishwa</span>}
                  {p.owner_plan === 'pro' && <span className="badge badge-gold text-2xs">⭐ Pro</span>}
                </div>
                <div className="text-2xs text-ink-5 mt-0.5">
                  {p.owner_role === 'agent' ? '🧑‍💼 Dalali' : '🏠 Mwenye Nyumba'}
                </div>
                {/* Owner rating stars */}
                <div className="flex items-center gap-1 mt-1">
                  {renderStars(Math.round(ownerRating || 0), 'xs')}
                  <span className="text-2xs font-semibold text-ink-4">
                    {ownerRating ? parseFloat(ownerRating).toFixed(1) : '--'}
                  </span>
                  <span className="text-2xs text-ink-6">({ownerReviews.length || 0})</span>
                </div>
              </div>
              <div className="flex flex-col gap-1.5 flex-shrink-0">
                <button onClick={openChat}
                  className="flex items-center gap-1 bg-primary text-white px-3 py-1.5 rounded-lg text-2xs font-bold active:scale-95 transition-all shadow-green"
                >
                  💬 Chat
                </button>
                <button onClick={handleCall}
                  className="flex items-center gap-1 bg-white border border-primary text-primary px-3 py-1.5 rounded-lg text-2xs font-bold active:scale-95 transition-all"
                >
                  📞 Piga
                </button>
              </div>
            </div>

            {/* Rate button */}
            {user && !isOwnProperty && (
              <button onClick={() => setShowRatingModal(true)}
                className="w-full mt-2 py-2 border border-gold bg-gold-50 text-gold-600 rounded-lg text-xs font-bold active:scale-[.98] transition-all flex items-center justify-center gap-1"
              >
                ⭐ Kadiria {p.owner_role === 'agent' ? 'Dalali' : 'Mwenye Nyumba'}
              </button>
            )}

            {/* Owner reviews preview */}
            {ownerReviews.length > 0 && (
              <div className="mt-2 pt-2 border-t border-surface-4">
                <p className="text-2xs font-semibold text-ink-4 mb-1">Maoni:</p>
                {ownerReviews.slice(0, 1).map(r => (
                  <div key={r.id} className="text-2xs text-ink-5">
                    <div className="flex items-center gap-0.5">{renderStars(r.rating, 'xs')}</div>
                    <p className="italic line-clamp-1">"{r.review?.substring(0, 50)}"</p>
                  </div>
                ))}
              </div>
            )}

            {user && isOwnProperty && (
              <div className="mt-2 text-center text-2xs text-blue-600 bg-blue-50 py-1.5 rounded-lg">
                ℹ️ Tangazo lako
              </div>
            )}

            {!user && (
              <button onClick={() => {
                saveIntent('rating', { ownerId: p.owner_id, ownerName: p.owner_name });
                setLoginPrompt({ open: true, action: 'kutoa tathmini', intent: 'rating' });
              }}
                className="w-full mt-2 py-2 bg-surface border border-surface-4 text-ink-4 rounded-lg text-xs font-semibold active:scale-[.98] transition-all"
              >
                🔑 Ingia kutoa tathmini
              </button>
            )}
          </div>
        </div>

        {/* PROPERTY REVIEWS */}
        {p.reviews?.length > 0 && (
          <div className="mb-5">
            <h2 className="text-sm font-bold text-ink mb-2">⭐ Maoni ya Wateja</h2>
            <div className="bg-white rounded-xl p-3 shadow-soft border border-surface-4">
              <div className="flex items-center gap-3">
                <div className="text-center">
                  <div className="font-serif text-2xl font-semibold text-primary">
                    {p.avg_rating ? parseFloat(p.avg_rating).toFixed(1) : '--'}
                  </div>
                  <div className="mt-0.5">{renderStars(Math.round(p.avg_rating || 0), 'xs')}</div>
                  <div className="text-2xs text-ink-5 mt-0.5">{p.review_count} maoni</div>
                </div>
                <div className="flex-1">
                  {[5, 4, 3, 2, 1].map(n => {
                    const cnt = p.reviews.filter(r => r.rating === n).length;
                    const pct = p.reviews.length ? Math.round(cnt / p.reviews.length * 100) : 0;
                    return (
                      <div key={n} className="flex items-center gap-1 text-2xs">
                        <span className="text-ink-5 w-2">{n}</span>
                        <div className="flex-1 h-1 bg-surface-3 rounded-full overflow-hidden">
                          <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-ink-6 w-3 text-right">{cnt}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* STICKY CTA - FIXED FOR MOBILE VISIBILITY */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-gray-200 shadow-lg"
        style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
        <div className="px-3 py-2 flex gap-2 max-w-lg mx-auto md:max-w-3xl">
          <button onClick={openChat}
            className="flex-1 py-3 bg-primary text-white rounded-xl font-bold text-sm active:scale-95 transition-all shadow-md flex items-center justify-center gap-1.5"
          >
            <span>💬</span> <span className="hidden sm:inline">Wasiliana</span>
          </button>
          <button
            onClick={openBookingModal}
            className="flex-1 py-3 bg-gold text-white rounded-xl font-bold text-sm active:scale-95 transition-all shadow-md flex items-center justify-center gap-1.5"
          >
            <span>📅</span> <span className="hidden sm:inline">Book Now</span>
          </button>
          <button onClick={toggleFav}
            className={`w-12 py-3 rounded-xl font-bold text-base flex items-center justify-center active:scale-95 transition-all shadow-md ${
              isFav 
                ? 'bg-red-500 text-white border-0' 
                : 'bg-white border-2 border-gray-300 text-gray-500'
            }`}
          >
            {isFav ? '❤️' : '🤍'}
          </button>
        </div>
      </div>

      {/* MODALS */}
      <RatingModal
        isOpen={showRatingModal}
        onClose={() => setShowRatingModal(false)}
        userName={p.owner_name}
        userRole={p.owner_role}
        starValue={starValue}
        setStarValue={setStarValue}
        reviewText={reviewText}
        setReviewText={setReviewText}
        onSubmit={handleSubmitRating}
        submitting={submittingRating}
      />

      <BookingModal
        isOpen={showBookingModal}
        onClose={() => setShowBookingModal(false)}
        propertyTitle={p.title}
        propertyPrice={p.price}
        priceType={p.price_type}
        checkIn={bookingDetails.check_in}
        setCheckIn={(val) => setBookingDetails({ ...bookingDetails, check_in: val })}
        checkOut={bookingDetails.check_out}
        setCheckOut={(val) => setBookingDetails({ ...bookingDetails, check_out: val })}
        guests={bookingDetails.guests}
        setGuests={(val) => setBookingDetails({ ...bookingDetails, guests: val })}
        specialRequests={bookingDetails.special_requests}
        setSpecialRequests={(val) => setBookingDetails({ ...bookingDetails, special_requests: val })}
        onSubmit={handleBooking}
        loading={bookingLoading}
        minDate={today}
        minCheckOut={minCheckOut}
      />

      <PaymentModal
        isOpen={payOpen}
        onClose={() => setPayOpen(false)}
        plan="boost"
        amount="TSh 10,000"
        propertyId={p.id}
        onSuccess={() => { toast('Tangazo limeboostwa! ⭐', 'success'); setPayOpen(false); }}
      />

      <LoginPromptModal
        isOpen={loginPrompt.open}
        onClose={() => setLoginPrompt({ open: false, action: '', intent: null })}
        action={loginPrompt.action}
        returnUrl={window.location.pathname + window.location.search}
      />
    </div>
  );
}
