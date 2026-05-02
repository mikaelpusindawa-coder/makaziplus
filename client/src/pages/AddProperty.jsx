import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { TopBar } from '../components/layout/TopBar';
import { Spinner, PaymentModal } from '../components/common/Spinner';
import api from '../utils/api';

// Constants
const TYPES = [
  ['nyumba', '🏠', 'Nyumba'],
  ['chumba', '🛏️', 'Chumba'],
  ['frem', '🏢', 'Frem'],
  ['ofisi', '💼', 'Ofisi'],
];

const CITIES = [
  'Dar es Salaam', 'Mwanza', 'Arusha', 'Dodoma', 'Mbeya',
  'Zanzibar', 'Tanga', 'Morogoro', 'Kilimanjaro', 'Iringa'
];

const AMENITY_OPTIONS = [
  'Pool', 'Bustani', 'Parking', 'Generator', 'Security 24/7',
  'WiFi', 'Gym', 'Lift', 'Maji', 'Umeme', 'Cinema Room', 'Rooftop',
  'AC', 'Furnished', 'Balcony', 'Store Room', 'Water Tank', 'Solar'
];

const PROP_STATUS = [
  ['available', '✅', 'Inapatikana'],
  ['rented', '🔒', 'Imekodishwa'],
  ['sold', '🏷️', 'Imeuzwa'],
  ['pending', '⏳', 'Inasubiri'],
];

// Google Maps autocomplete component
const LocationPicker = ({ onLocationSelect, address, setAddress, lat, setLat, lng, setLng }) => {
  const inputRef = useRef(null);
  const autocompleteRef = useRef(null);
  const { toast } = useToast();

  useEffect(() => {
    // Load Google Maps script dynamically
    if (!window.google && !document.querySelector('#google-maps-script')) {
      const script = document.createElement('script');
      script.id = 'google-maps-script';
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.REACT_APP_GOOGLE_MAPS_API_KEY || ''}&libraries=places&callback=initAutocomplete`;
      script.async = true;
      script.defer = true;
      window.initAutocomplete = () => {
        if (inputRef.current && window.google) {
          autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
            types: ['geocode', 'establishment'],
            componentRestrictions: { country: 'tz' }
          });
          autocompleteRef.current.addListener('place_changed', () => {
            const place = autocompleteRef.current.getPlace();
            if (place.geometry) {
              setLat(place.geometry.location.lat());
              setLng(place.geometry.location.lng());
              setAddress(place.formatted_address);
              onLocationSelect({
                lat: place.geometry.location.lat(),
                lng: place.geometry.location.lng(),
                address: place.formatted_address,
                placeId: place.place_id
              });
            }
          });
        }
      };
      document.head.appendChild(script);
    } else if (window.google && inputRef.current && !autocompleteRef.current) {
      autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
        types: ['geocode', 'establishment'],
        componentRestrictions: { country: 'tz' }
      });
      autocompleteRef.current.addListener('place_changed', () => {
        const place = autocompleteRef.current.getPlace();
        if (place.geometry) {
          setLat(place.geometry.location.lat());
          setLng(place.geometry.location.lng());
          setAddress(place.formatted_address);
          onLocationSelect({
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
            address: place.formatted_address,
            placeId: place.place_id
          });
        }
      });
    }
  }, [onLocationSelect, setLat, setLng, setAddress]);

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast('Geolocation not supported', 'error');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setLat(latitude);
        setLng(longitude);
        try {
          const response = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${process.env.REACT_APP_GOOGLE_MAPS_API_KEY || ''}`
          );
          const data = await response.json();
          if (data.results && data.results[0]) {
            setAddress(data.results[0].formatted_address);
            onLocationSelect({
              lat: latitude,
              lng: longitude,
              address: data.results[0].formatted_address,
              placeId: data.results[0].place_id
            });
          }
        } catch (err) {
          console.error('Geocoding error:', err);
        }
      },
      (error) => {
        console.error('Location error:', error);
        toast('Unable to get your location', 'error');
      }
    );
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Anwani kamili au jina la eneo..."
          className="input-field pr-28"
        />
        <button
          type="button"
          onClick={getCurrentLocation}
          className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-primary-50 text-primary rounded-lg text-xs font-semibold hover:bg-primary hover:text-white transition-colors"
        >
          📍 Yangu
        </button>
      </div>
      
      {(lat && lng) && (
        <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 p-2 rounded-xl">
          <span>📍</span>
          <span>Mahali yamegunduliwa: {lat.toFixed(6)}, {lng.toFixed(6)}</span>
          <button
            type="button"
            onClick={() => window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank')}
            className="ml-auto text-primary hover:underline"
          >
            Tazama Ramani
          </button>
        </div>
      )}
    </div>
  );
};

export default function AddProperty() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const { user } = useAuth();
  const { toast } = useToast();

  // Form state
  const [form, setForm] = useState({
    title: '', description: '', type: 'nyumba', price: '', price_type: 'rent',
    city: 'Dar es Salaam', area: '', address: '', bedrooms: '', bathrooms: '',
    size_sqm: '', property_status: 'available',
  });
  
  // Location state
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [placeId, setPlaceId] = useState(null);
  const [formattedAddress, setFormattedAddress] = useState('');
  
  const [amenities, setAmenities] = useState([]);
  const [images, setImages] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  const [boost, setBoost] = useState('free');
  const [loading, setLoading] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [newPropId, setNewPropId] = useState(null);
  
  const isEdit = !!editId;
  const allowed = user && ['agent', 'owner', 'admin'].includes(user.role);

  // Load existing property if editing
  useEffect(() => {
    if (!editId) return;
    setLoadingEdit(true);
    api.get(`/properties/${editId}`)
      .then(r => {
        const p = r.data.data;
        setForm({
          title: p.title || '', description: p.description || '', type: p.type || 'nyumba',
          price: p.price || '', price_type: p.price_type || 'rent', city: p.city || 'Dar es Salaam',
          area: p.area || '', address: p.address || '', bedrooms: p.bedrooms || '',
          bathrooms: p.bathrooms || '', size_sqm: p.size_sqm || '',
          property_status: p.property_status || 'available',
        });
        setLatitude(p.latitude || null);
        setLongitude(p.longitude || null);
        setFormattedAddress(p.address || '');
        setPlaceId(p.place_id || null);
        setAmenities(p.amenities || []);
        setExistingImages(p.images || []);
      })
      .catch(() => toast('Hitilafu ya kupakia', 'error'))
      .finally(() => setLoadingEdit(false));
  }, [editId, toast]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleImages = (e) => {
    const files = Array.from(e.target.files);
    const validFiles = files.filter(f => f.size <= 10 * 1024 * 1024);
    if (validFiles.length !== files.length) {
      toast('Baadhi ya picha ni kubwa sana (max 10MB)', 'warning');
    }
    setImages(prev => [...prev, ...validFiles]);
    setPreviews(prev => [...prev, ...validFiles.map(f => URL.createObjectURL(f))]);
  };

  const removeImage = (index, isExisting = false) => {
    if (isExisting) {
      setExistingImages(prev => prev.filter((_, i) => i !== index));
    } else {
      setImages(prev => prev.filter((_, i) => i !== index));
      setPreviews(prev => prev.filter((_, i) => i !== index));
    }
  };

  const toggleAmenity = (a) => {
    setAmenities(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]);
  };

  const handleLocationSelect = (location) => {
    setLatitude(location.lat);
    setLongitude(location.lng);
    setFormattedAddress(location.address);
    setPlaceId(location.placeId);
    if (location.address) {
      const parts = location.address.split(',');
      if (parts.length >= 2) {
        const possibleCity = parts[parts.length - 2]?.trim();
        if (CITIES.some(c => possibleCity?.includes(c))) {
          set('city', possibleCity);
        }
        if (parts[0] && !form.area) {
          set('area', parts[0].trim());
        }
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.area || !form.price) {
      toast('Jaza sehemu zote muhimu', 'error');
      return;
    }
    if (form.price <= 0) {
      toast('Bei lazima iwe kubwa kuliko sifuri', 'error');
      return;
    }
    if (images.length === 0 && existingImages.length === 0 && !isEdit) {
      toast('Pakia angalau picha moja', 'error');
      return;
    }

    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (v !== undefined && v !== '') fd.append(k, v);
      });
      if (latitude) fd.append('latitude', latitude);
      if (longitude) fd.append('longitude', longitude);
      if (placeId) fd.append('place_id', placeId);
      if (formattedAddress) fd.append('formatted_address', formattedAddress);
      
      amenities.forEach(a => fd.append('amenities', a));
      images.forEach(img => fd.append('images', img));
      
      if (isEdit && existingImages.length) {
        fd.append('existing_images', JSON.stringify(existingImages.map(img => img.id)));
      }

      let r;
      if (isEdit) {
        r = await api.patch(`/properties/${editId}`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast('Tangazo limesasishwa! ✅', 'success');
        navigate(`/property/${editId}`);
        return;
      } else {
        r = await api.post('/properties', fd, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        setNewPropId(r.data.data?.id);
        if (boost !== 'free') {
          setPayOpen(true);
        } else {
          toast('Tangazo limechapishwa! ✅', 'success');
          navigate('/dashboard');
        }
      }
    } catch (e) {
      toast(e.response?.data?.message || 'Hitilafu ya seva', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!allowed) {
    return (
      <div className="min-h-screen bg-surface pb-24">
        <TopBar title="Ongeza Mali" showBack />
        <div className="m-4 bg-amber-50 border-2 border-gold rounded-2xl p-6 text-center">
          <div className="text-4xl mb-3">🔒</div>
          <div className="text-base font-bold text-ink mb-2">Dalali au Mwenye Nyumba tu</div>
          <div className="text-sm text-ink-5 mb-5 leading-relaxed">
            Unahitaji akaunti ya Dalali au Mwenye Nyumba kuweka matangazo
          </div>
          <button onClick={() => navigate('/subscription')} className="btn-primary max-w-xs mx-auto">
            Upgradi Akaunti →
          </button>
        </div>
      </div>
    );
  }

  if (loadingEdit) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface pb-28 md:pb-10 animate-fade-in-up">
      <TopBar title={isEdit ? 'Hariri Tangazo' : 'Ongeza Mali Mpya'} showBack />

      <form onSubmit={handleSubmit} className="md:max-w-2xl md:mx-auto">
        {/* ─── IMAGES UPLOAD ─── */}
        <div className="bg-white rounded-2xl m-3 p-4 shadow-soft border border-surface-4">
          <h3 className="text-sm font-bold text-ink mb-3 flex items-center gap-2">
            <span>📸</span> Picha za Mali <span className="text-xs text-ink-4 font-normal">(Angalau picha 1, max 10MB)</span>
          </h3>
          
          <input type="file" multiple accept="image/*" onChange={handleImages} id="img-input" className="hidden" />
          <label htmlFor="img-input"
            className="border-2 border-dashed border-surface-4 rounded-2xl p-6 flex flex-col items-center cursor-pointer hover:border-primary hover:bg-primary-50/30 transition-all"
          >
            <div className="w-12 h-12 bg-primary-50 rounded-full flex items-center justify-center mb-2.5">
              <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-primary" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <p className="text-sm text-ink-5">Bonyeza <strong className="text-primary">Pakia Picha</strong></p>
            <p className="text-xs text-ink-6 mt-0.5">PNG, JPG, WEBP hadi 10MB kila moja</p>
          </label>

          {existingImages.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-semibold text-ink-5 mb-2">Picha zilizopo:</p>
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                {existingImages.map((img, i) => (
                  <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 border-2 border-surface-4">
                    <img src={img.image_url} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(i, true)}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white text-xs flex items-center justify-center hover:bg-red-600"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {previews.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-semibold text-ink-5 mb-2">Picha mpya:</p>
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                {previews.map((src, i) => (
                  <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 border-2 border-surface-4">
                    <img src={src} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white text-xs flex items-center justify-center hover:bg-red-600"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ─── DETAILS ─── */}
        <div className="bg-white rounded-2xl m-3 p-4 shadow-soft border border-surface-4 space-y-4">
          <h3 className="text-sm font-bold text-ink flex items-center gap-2"><span>🏠</span> Maelezo ya Mali</h3>
          
          <div>
            <label className="block text-xs font-bold text-ink-4 uppercase tracking-wider mb-1.5">Kichwa cha Tangazo *</label>
            <input value={form.title} onChange={e => set('title', e.target.value)}
              placeholder="mf: Nyumba nzuri Kinondoni 3BR" className="input-field" />
          </div>

          <div>
            <label className="block text-xs font-bold text-ink-4 uppercase tracking-wider mb-2">Aina ya Mali</label>
            <div className="grid grid-cols-4 gap-2">
              {TYPES.map(([v, icon, label]) => (
                <button key={v} type="button" onClick={() => set('type', v)}
                  className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border-2 transition-all active:scale-95
                    ${form.type === v ? 'border-primary bg-primary-50' : 'border-surface-4'}`}
                >
                  <span className="text-xl">{icon}</span>
                  <span className={`text-2xs font-bold ${form.type === v ? 'text-primary' : 'text-ink-4'}`}>{label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-ink-4 uppercase tracking-wider mb-1.5">Maelezo *</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)}
              rows={4} placeholder="Elezea mali yako kwa undani --- eneo, hali, facilities..." className="input-field resize-none" />
          </div>

          <div>
            <label className="block text-xs font-bold text-ink-4 uppercase tracking-wider mb-2">Hali ya Mali</label>
            <div className="grid grid-cols-4 gap-2">
              {PROP_STATUS.map(([v, icon, label]) => (
                <button key={v} type="button" onClick={() => set('property_status', v)}
                  className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl border-2 text-xs font-semibold transition-all active:scale-95
                    ${form.property_status === v ? 'border-primary bg-primary-50 text-primary' : 'border-surface-4 text-ink-4'}`}
                >
                  {icon} {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ─── LOCATION WITH GOOGLE MAPS ─── */}
        <div className="bg-white rounded-2xl m-3 p-4 shadow-soft border border-surface-4 space-y-4">
          <h3 className="text-sm font-bold text-ink flex items-center gap-2"><span>📍</span> Eneo na Ramani</h3>
          
          <LocationPicker
            onLocationSelect={handleLocationSelect}
            address={formattedAddress}
            setAddress={setFormattedAddress}
            lat={latitude}
            setLat={setLatitude}
            lng={longitude}
            setLng={setLongitude}
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-ink-4 uppercase tracking-wider mb-1.5">Jiji/Mji</label>
              <select value={form.city} onChange={e => set('city', e.target.value)} className="input-field">
                {CITIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-ink-4 uppercase tracking-wider mb-1.5">Mtaa / Kata *</label>
              <input value={form.area} onChange={e => set('area', e.target.value)}
                placeholder="mf: Kinondoni, Msasani, Oysterbay..." className="input-field" />
            </div>
          </div>
        </div>

        {/* ─── PRICE ─── */}
        <div className="bg-white rounded-2xl m-3 p-4 shadow-soft border border-surface-4 space-y-3">
          <h3 className="text-sm font-bold text-ink flex items-center gap-2"><span>💰</span> Bei</h3>
          
          <div className="flex gap-1 bg-surface p-1 rounded-xl">
            {[['rent', 'Kukodi / Mwezi'], ['sale', 'Kuuza']].map(([v, l]) => (
              <button key={v} type="button" onClick={() => set('price_type', v)}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all
                  ${form.price_type === v ? 'bg-white text-primary shadow-soft' : 'text-ink-4'}`}
              >
                {l}
              </button>
            ))}
          </div>

          <div>
            <label className="block text-xs font-bold text-ink-4 uppercase tracking-wider mb-1.5">Bei (TZS) *</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-5 text-sm font-semibold">TSh</span>
              <input value={form.price} onChange={e => set('price', e.target.value)} type="number"
                placeholder="350,000" className="input-field pl-14" />
            </div>
          </div>
        </div>

        {/* ─── SPECIFICATIONS ─── */}
        <div className="bg-white rounded-2xl m-3 p-4 shadow-soft border border-surface-4">
          <h3 className="text-sm font-bold text-ink mb-3 flex items-center gap-2"><span>📐</span> Vipimo na Maelezo Zaidi</h3>
          <div className="grid grid-cols-3 gap-2.5">
            {[['bedrooms', '🛏 Vyumba', '3'], ['bathrooms', '🚿 Bafuni', '2'], ['size_sqm', '📐 m²', '120']].map(([k, l, ph]) => (
              <div key={k}>
                <label className="block text-xs font-semibold text-ink-5 mb-1.5">{l}</label>
                <input value={form[k]} onChange={e => set(k, e.target.value)} type="number"
                  placeholder={ph} className="input-field text-center" />
              </div>
            ))}
          </div>
        </div>

        {/* ─── AMENITIES ─── */}
        <div className="bg-white rounded-2xl m-3 p-4 shadow-soft border border-surface-4">
          <h3 className="text-sm font-bold text-ink mb-3">✅ Huduma Zilizopo</h3>
          <div className="flex flex-wrap gap-2">
            {AMENITY_OPTIONS.map(a => (
              <button key={a} type="button" onClick={() => toggleAmenity(a)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-all active:scale-95
                  ${amenities.includes(a) ? 'bg-primary text-white border-primary' : 'bg-surface text-ink-4 border-transparent'}`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        {/* ─── BOOST (only for new listings) ─── */}
        {!isEdit && (
          <div className="m-3 rounded-2xl overflow-hidden shadow-soft">
            <div className="bg-gradient-to-br from-ink to-primary p-5 relative overflow-hidden">
              <div className="absolute -right-4 -top-4 w-20 h-20 bg-white/5 rounded-full" />
              <h3 className="font-serif text-lg font-semibold text-white mb-1">🚀 Boost Tangazo</h3>
              <p className="text-white/60 text-xs mb-4">Tangazo lako litaonekana juu ya yote na kufikia wateja zaidi</p>
              <div className="grid grid-cols-3 gap-2">
                {[['free', 'Bure', 'Kawaida'], ['week', 'Premium', 'TSh 10K/wiki'], ['month', 'Super', 'TSh 30K/mwezi']].map(([id, name, price]) => (
                  <button key={id} type="button" onClick={() => setBoost(id)}
                    className={`py-3 px-2 rounded-xl border-2 text-center transition-all
                      ${boost === id ? 'border-white bg-white/20' : 'border-white/20 bg-white/5'}`}
                  >
                    <div className="text-xs font-bold text-white">{name}</div>
                    <div className="text-2xs text-white/60 mt-0.5">{price}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── SUBMIT ─── */}
        <div className="px-3 pb-5">
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? <><Spinner size="sm" color="white" /> {isEdit ? 'Inasasisha...' : 'Inachapisha...'}</> : (isEdit ? '💾 Hifadhi Mabadiliko' : '📢 Chapisha Tangazo')}
          </button>
        </div>
      </form>

      <PaymentModal
        isOpen={payOpen}
        onClose={() => { setPayOpen(false); navigate('/dashboard'); }}
        plan="boost"
        amount={boost === 'week' ? 'TSh 10,000' : 'TSh 30,000'}
        propertyId={newPropId}
        onSuccess={() => { toast('Tangazo limeboostwa! ⭐', 'success'); navigate('/dashboard'); }}
      />
    </div>
  );
}