import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Spinner, PaymentModal } from '../components/common/Spinner';
import { BookingModal } from '../components/common/BookingModal';
import { RatingModal } from '../components/common/RatingModal';
import { formatPrice, getAvatar, daysAgo, renderStars, STATUS_LABELS } from '../utils/helpers';
import api from '../utils/api';

export default function PropertyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFav, setIsFav] = useState(false);
  const [mainImg, setMainImg] = useState('');
  const [imgIdx, setImgIdx] = useState(0);
  const [payOpen, setPayOpen] = useState(false);

  // Property review states
  const [showPropertyReviewModal, setShowPropertyReviewModal] = useState(false);
  const [propertyStarValue, setPropertyStarValue] = useState(0);
  const [propertyReviewText, setPropertyReviewText] = useState('');
  const [submittingPropertyReview, setSubmittingPropertyReview] = useState(false);

  // Owner rating modal states
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

  useEffect(() => {
    const load = async () => {
      try {
        const r = await api.get(`/properties/${id}`);
        setProperty(r.data.data);
        const imgs = r.data.data.images || [];
        if (imgs.length) {
          const url = imgs[0].image_url;
          setMainImg(url.startsWith('/uploads') ? `${process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000'}${url}` : url);
        }
        if (user) {
          const fav = await api.get(`/favorites/${id}/check`);
          setIsFav(fav.data.favorited);
        }
      } catch (err) {
        console.error('Load property error:', err);
        navigate('/');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, user, navigate]);

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
    if (!user) { navigate('/auth'); return; }
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
    if (!user) { navigate('/auth'); return; }
    navigate(`/chat?userId=${property.owner_id}`);
  };

  // ============================================================
  // SUBMIT PROPERTY REVIEW (FIX)
  // ============================================================
  const handleSubmitPropertyReview = async () => {
    if (!user) { navigate('/auth'); return; }
    if (!propertyStarValue) { toast('Chagua rating ya nyota', 'error'); return; }

    setSubmittingPropertyReview(true);
    try {
      await api.post('/reviews', {
        property_id: parseInt(id),
        rating: propertyStarValue,
        comment: propertyReviewText.trim() || null
      });
      toast('Asante kwa maoni yako! ⭐', 'success');
      setShowPropertyReviewModal(false);
      setPropertyStarValue(0);
      setPropertyReviewText('');

      // Refresh property to show new review
      const r = await api.get(`/properties/${id}`);
      setProperty(r.data.data);
    } catch (e) {
      toast(e.response?.data?.message || 'Hitilafu wakati wa kutuma maoni', 'error');
    } finally {
      setSubmittingPropertyReview(false);
    }
  };

  // ============================================================
  // SUBMIT OWNER RATING
  // ============================================================
  const handleSubmitRating = async () => {
    if (!user) { navigate('/auth'); return; }
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

      // Refresh owner ratings
      const r = await api.get(`/ratings/user/${property.owner_id}`);
      setOwnerRating(r.data.avg_rating);
      setOwnerReviews(r.data.data || []);
    } catch (e) {
      toast(e.response?.data?.message || 'Hitilafu wakati wa kutuma tathmini', 'error');
    } finally {
      setSubmittingRating(false);
    }
  };

  // ============================================================
  // BOOKING HANDLER
  // ============================================================
  const handleBooking = async () => {
    if (!user) { navigate('/auth'); return; }
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
      toast(`Booking request sent! Total: ${formatPrice(r.data.total_amount)}`, 'success');
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
    setMainImg(url.startsWith('/uploads') ? `${process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000'}${url}` : url);
    setImgIdx(idx);
  };

  return (
    <div className="min-h-screen bg-surface pb-28 md:pb-10 animate-fade-in">

      {/* HERO IMAGE */}
      <div className="relative overflow-hidden bg-surface-3" style={{ height: 'clamp(260px, 46vw, 500px)' }}>
        {mainImg && (
          <img src={mainImg} alt={p.title} loading="eager"
            className="w-full h-full object-cover transition-opacity duration-300"
            onError={e => { e.target.src = 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=60'; }}
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
          <div className={`badge ${propStatus.color}`}>{propStatus.icon} {propStatus.label}</div>
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
            const url = img.image_url.startsWith('/uploads')
              ? `${process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000'}${img.image_url}`
              : img.image_url;
            return (
              <button key={i} onClick={() => switchImg(img.image_url, i)}
                className={`w-16 h-12 md:w-20 md:h-14 rounded-xl overflow-hidden flex-shrink-0 transition-all ${i === imgIdx ? 'ring-2 ring-primary ring-offset-1' : 'opacity-55 hover:opacity-80'}`}
              >
                <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
              </button>
            );
          })}
        </div>
      )}

      {/* BODY */}
      <div className="px-4 pt-5 md:max-w-3xl md:mx-auto">

        {/* Price + Title + Time uploaded */}
        <div className="mb-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="font-serif text-3xl md:text-4xl font-semibold text-primary">
                {formatPrice(p.price)}
                <span className="font-sans text-sm font-normal text-ink-5 ml-2">
                  {p.price_type === 'rent' ? '/mwezi' : '-- bei ya mwisho'}
                </span>
              </div>
              <h1 className="text-xl font-bold text-ink mt-1.5 leading-snug">{p.title}</h1>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <p className="text-sm text-ink-5 flex items-center gap-1">
                  <span className="text-primary">📍</span>{p.area}, {p.city}
                </p>
                <span className="text-ink-6 text-xs">•</span>
                <p className="text-xs text-ink-5 flex items-center gap-1">
                  <span>🕐</span> Imechapishwa {daysSinceUpload}
                </p>
                {p.latitude && p.longitude && (
                  <>
                    <span className="text-ink-6 text-xs">•</span>
                    <button onClick={openGoogleMaps} className="text-xs text-primary hover:underline flex items-center gap-1">
                      <span>🗺️</span> Tazama Ramani
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div className={`grid gap-2 mb-5 ${[p.bedrooms > 0, p.bathrooms > 0, p.size_sqm > 0, true].filter(Boolean).length === 4 ? 'grid-cols-4' : 'grid-cols-3'}`}>
          {[
            p.bedrooms > 0 && { v: p.bedrooms, l: 'Vyumba', i: '🛏' },
            p.bathrooms > 0 && { v: p.bathrooms, l: 'Bafuni', i: '🚿' },
            p.size_sqm > 0 && { v: p.size_sqm, l: 'm²', i: '📐' },
            { v: p.views, l: 'Maoni', i: '👁' },
          ].filter(Boolean).map(({ v, l, i }) => (
            <div key={l} className="bg-white rounded-2xl py-3 text-center shadow-soft border border-surface-4">
              <div className="text-lg mb-0.5">{i}</div>
              <div className="text-base font-extrabold text-ink">{v}</div>
              <div className="text-2xs text-ink-5 font-medium">{l}</div>
            </div>
          ))}
        </div>

        {/* Description */}
        <div className="mb-5">
          <h2 className="text-base font-bold text-ink mb-2">Kuhusu Mali Hii</h2>
          <p className="text-sm leading-relaxed text-ink-4">{p.description}</p>
        </div>

        {/* Amenities */}
        {p.amenities?.length > 0 && (
          <div className="mb-5">
            <h2 className="text-base font-bold text-ink mb-3">✅ Huduma Zilizopo</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {p.amenities.map(a => (
                <div key={a} className="flex items-center gap-2 bg-primary-50 rounded-xl px-3 py-2.5 border border-primary/10">
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 stroke-primary flex-shrink-0" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span className="text-xs font-semibold text-primary-600">{a}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ============================================================
            PROPERTY REVIEWS SECTION (FIXED)
        ============================================================ */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-ink">⭐ Maoni ya Wateja</h2>
            {user && !isOwnProperty && (
              <button
                onClick={() => setShowPropertyReviewModal(true)}
                className="text-xs text-primary font-semibold hover:underline flex items-center gap-1"
              >
                + Ongeza Maoni
              </button>
            )}
          </div>

          {/* Rating summary */}
          {p.reviews && p.reviews.length > 0 ? (
            <>
              <div className="bg-white rounded-2xl p-4 shadow-soft border border-surface-4 mb-3">
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <div className="font-serif text-5xl font-semibold text-primary">
                      {p.avg_rating ? parseFloat(p.avg_rating).toFixed(1) : '--'}
                    </div>
                    <div className="mt-1">{renderStars(Math.round(p.avg_rating || 0), 'md')}</div>
                    <div className="text-2xs text-ink-5 mt-1">{p.review_count} maoni</div>
                  </div>
                  <div className="flex-1 space-y-1.5">
                    {[5, 4, 3, 2, 1].map(n => {
                      const cnt = p.reviews.filter(r => r.rating === n).length;
                      const pct = p.reviews.length ? Math.round(cnt / p.reviews.length * 100) : 0;
                      return (
                        <div key={n} className="flex items-center gap-2">
                          <span className="text-2xs text-ink-5 w-2.5 text-right">{n}</span>
                          <div className="flex-1 h-1.5 bg-surface-3 rounded-full overflow-hidden">
                            <div className="h-full bg-yellow-400 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-2xs text-ink-6 w-5 text-right">{cnt}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Review list */}
              {p.reviews.slice(0, 5).map(r => (
                <div key={r.id} className="bg-white rounded-2xl p-4 shadow-soft border border-surface-4 mb-2">
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="w-9 h-9 rounded-full overflow-hidden bg-primary-50 flex-shrink-0">
                      <img src={getAvatar({ avatar: r.reviewer_avatar })} alt=""
                        className="w-full h-full object-cover"
                        onError={e => { e.target.style.display = 'none'; }}
                      />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-ink">{r.reviewer_name || 'Mtumiaji'}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">{renderStars(r.rating, 'sm')}</div>
                    </div>
                  </div>
                  {r.comment && <p className="text-sm text-ink-4 leading-relaxed italic">"{r.comment}"</p>}
                </div>
              ))}
            </>
          ) : (
            <div className="bg-white rounded-2xl p-6 text-center shadow-soft border border-surface-4">
              <div className="text-4xl mb-2">📝</div>
              <p className="text-sm text-ink-5">Hakuna maoni bado</p>
              <p className="text-xs text-ink-6 mt-1">Kuwa wa kwanza kutoa maoni kuhusu mali hii</p>
              {user && !isOwnProperty && (
                <button
                  onClick={() => setShowPropertyReviewModal(true)}
                  className="mt-3 text-primary font-semibold text-sm hover:underline"
                >
                  + Andika Maoni
                </button>
              )}
            </div>
          )}
        </div>

        {/* OWNER CARD */}
        <div className="mb-5">
          <h2 className="text-base font-bold text-ink mb-3">Wasiliana Na</h2>
          <div className="bg-white rounded-2xl p-4 shadow-soft border border-surface-4">
            <div className="flex items-start gap-3">
              <div className="w-14 h-14 rounded-2xl overflow-hidden flex-shrink-0 bg-primary-50">
                <img src={ownerImg} alt={p.owner_name} className="w-full h-full object-cover" onError={e => { e.target.style.display = 'none'; }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-ink flex items-center gap-2 flex-wrap">
                  {p.owner_name}
                  {p.owner_verified && <span className="badge badge-primary text-2xs">✓ Amethibitishwa</span>}
                  {p.owner_plan === 'pro' && <span className="badge badge-gold text-2xs">⭐ Pro</span>}
                </div>
                <div className="text-xs text-ink-5 mt-0.5">
                  {p.owner_role === 'agent' ? '🧑‍💼 Dalali Aliyethibitishwa' : '🏠 Mwenye Nyumba'}
                </div>

                {/* Owner rating stars */}
                <div className="flex items-center gap-1.5 mt-1.5">
                  {renderStars(Math.round(ownerRating || 0), 'sm')}
                  <span className="text-xs font-semibold text-ink-4">
                    {ownerRating ? parseFloat(ownerRating).toFixed(1) : '--'}
                  </span>
                  <span className="text-xs text-ink-6">({ownerReviews.length || 0} tathmini)</span>
                </div>

                <div className="flex items-center gap-1.5 mt-1">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-2xs text-green-600 font-medium">Anapatikana sasa</span>
                </div>
              </div>
              <div className="flex flex-col gap-2 flex-shrink-0">
                <button onClick={openChat}
                  className="flex items-center gap-1.5 bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-bold active:scale-95 transition-all shadow-green hover:shadow-green-lg"
                >
                  💬 Chat
                </button>
                <button onClick={handleCall}
                  className="w-full py-2.5 bg-white border-2 border-primary text-primary rounded-xl text-sm font-bold active:scale-95 transition-all text-center"
                >
                  📞 Piga
                </button>
              </div>
            </div>

            {/* Rate button */}
            {user && !isOwnProperty && (
              <button onClick={() => setShowRatingModal(true)}
                className="w-full mt-3 py-2.5 border-2 border-gold bg-gold-50 text-gold-600 rounded-xl text-sm font-bold active:scale-[.98] transition-all flex items-center justify-center gap-2 hover:bg-gold-100"
              >
                ⭐ Kadiria {p.owner_role === 'agent' ? 'Dalali' : 'Mwenye Nyumba'} Huyu
              </button>
            )}

            {/* Owner reviews preview */}
            {ownerReviews.length > 0 && (
              <div className="mt-3 pt-3 border-t border-surface-4">
                <p className="text-xs font-semibold text-ink-4 mb-2">Maoni ya hivi karibuni:</p>
                {ownerReviews.slice(0, 2).map(r => (
                  <div key={r.id} className="text-xs text-ink-5 mb-2">
                    <div className="flex items-center gap-1">{renderStars(r.rating, 'xs')}</div>
                    <p className="italic line-clamp-2">"{r.review}"</p>
                    <p className="text-2xs text-ink-6">--- {r.rater_name}</p>
                  </div>
                ))}
              </div>
            )}

            {user && isOwnProperty && (
              <div className="mt-3 text-center text-xs text-blue-600 bg-blue-50 py-2 rounded-xl">
                ℹ️ Hii ni tangazo lako. Unaweza kulihariri.
              </div>
            )}

            {!user && (
              <button onClick={() => navigate('/auth')}
                className="w-full mt-3 py-2.5 bg-surface border-2 border-surface-4 text-ink-4 rounded-xl text-sm font-semibold active:scale-[.98] transition-all"
              >
                🔑 Ingia kutoa tathmini
              </button>
            )}
          </div>
        </div>

        {/* Edit button for owner */}
        {isOwnProperty && (
          <div className="mb-5">
            <button onClick={() => navigate(`/add?edit=${p.id}`)}
              className="w-full py-3 border-2 border-primary text-primary rounded-2xl font-bold text-sm active:scale-[.98] transition-all hover:bg-primary-50"
            >
              ✏️ Hariri Tangazo Hili
            </button>
          </div>
        )}
      </div>

      {/* STICKY CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-40" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0)' }}>
        <div className="glass border-t border-black/[0.07] px-4 py-3 flex gap-3 max-w-lg mx-auto md:max-w-3xl">
          <button onClick={openChat}
            className="flex-1 py-4 bg-primary text-white rounded-2xl font-bold text-sm active:scale-[.98] transition-all shadow-green hover:shadow-green-lg hover:bg-primary-light flex items-center justify-center gap-2"
          >
            💬 Wasiliana Sasa
          </button>
          <button onClick={() => setShowBookingModal(true)}
            className="flex-1 py-4 bg-gold text-white rounded-2xl font-bold text-sm active:scale-[.98] transition-all shadow-gold flex items-center justify-center gap-2 hover:bg-gold-dark"
          >
            📅 Book Now
          </button>
          <button onClick={toggleFav}
            className={`w-14 py-4 border-2 rounded-2xl font-bold text-base flex items-center justify-center active:scale-[.98] transition-all ${isFav ? 'border-red-400 bg-red-50 text-red-500' : 'border-surface-4 bg-white text-ink-5 hover:border-primary'}`}
          >
            {isFav ? '❤️' : '🤍'}
          </button>
        </div>
      </div>

      {/* PROPERTY REVIEW MODAL */}
      <RatingModal
        isOpen={showPropertyReviewModal}
        onClose={() => setShowPropertyReviewModal(false)}
        userName={p.title}
        userRole="property"
        starValue={propertyStarValue}
        setStarValue={setPropertyStarValue}
        reviewText={propertyReviewText}
        setReviewText={setPropertyReviewText}
        onSubmit={handleSubmitPropertyReview}
        submitting={submittingPropertyReview}
      />

      {/* OWNER RATING MODAL */}
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

      {/* BOOKING MODAL */}
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
    </div>
  );
}