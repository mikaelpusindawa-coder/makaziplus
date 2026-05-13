import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { TopBar } from '../components/layout/TopBar';
import { Spinner, EmptyState } from '../components/common/Spinner';
import { formatPrice, getPropertyImage, getPlaceholderImage, formatDate, resolveImageUrl } from '../utils/helpers';
import { useTranslation } from 'react-i18next';
import api from '../utils/api';

// Status badge component
const StatusBadge = ({ status }) => {
  const { t } = useTranslation();
  const config = {
    pending: { color: 'bg-yellow-50 text-yellow-700', icon: '⏳', label: t('bookings.status_pending') },
    confirmed: { color: 'bg-green-50 text-green-700', icon: '✅', label: t('bookings.status_confirmed') },
    cancelled: { color: 'bg-red-50 text-red-700', icon: '❌', label: t('bookings.status_cancelled') },
    completed: { color: 'bg-blue-50 text-blue-700', icon: '🏁', label: t('bookings.status_completed') },
  };
  const c = config[status] || config.pending;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-bold ${c.color}`}>
      {c.icon} {c.label}
    </span>
  );
};

// Booking card component
const BookingCard = ({ booking, type, onStatusUpdate, onViewProperty }) => {
  const [showDetails, setShowDetails] = useState(false);
  const [updating, setUpdating] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();

  const checkIn = new Date(booking.check_in_date);
  const checkOut = new Date(booking.check_out_date);
  const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
  const isUpcoming = new Date(booking.check_in_date) > new Date();
  const isActive = new Date(booking.check_in_date) <= new Date() && new Date(booking.check_out_date) >= new Date();
  const isPast = new Date(booking.check_out_date) < new Date();

  const handleStatusChange = async (newStatus, isCustomerCancel = false) => {
    setUpdating(true);
    try {
      if (isCustomerCancel) {
        // Customer cancels via dedicated endpoint (properly reverts property_status)
        await api.patch(`/bookings/${booking.id}/cancel`);
        toast('Booking imebatilishwa.', 'success');
      } else {
        // Owner confirms/rejects/completes
        await api.patch(`/bookings/${booking.id}/status`, { status: newStatus });
        const msgs = { confirmed: 'imethibitishwa ✅', cancelled: 'imekataliwa ❌', completed: 'imekamilika 🏁' };
        toast(`Booking ${msgs[newStatus] || newStatus}`, 'success');
      }
      onStatusUpdate?.();
    } catch (err) {
      toast(err.response?.data?.message || 'Hitilafu', 'error');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-soft border border-surface-4 mb-3 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-surface-4 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onViewProperty(booking.property_id)}
            className="w-12 h-12 rounded-xl overflow-hidden bg-surface-3 flex-shrink-0"
          >
            <img
              src={resolveImageUrl(booking.property_image) || getPlaceholderImage(booking.property_type || 'nyumba', booking.property_id)}
              alt={booking.title || booking.property_title}
              className="w-full h-full object-cover"
              loading="lazy"
              onError={(e) => { e.target.onerror = null; e.target.src = getPlaceholderImage(booking.property_type || 'nyumba', booking.property_id); }}
            />
          </button>
          <div>
            <h3 className="text-sm font-semibold text-ink line-clamp-1">{booking.title || booking.property_title}</h3>
            <p className="text-2xs text-ink-5">{booking.area}, {booking.city}</p>
          </div>
        </div>
        <StatusBadge status={booking.status} />
      </div>

      {/* Details */}
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <span className="text-ink-4">📅</span>
            <div>
              <p className="text-xs font-semibold text-ink">{formatDate(booking.check_in_date)}</p>
              <p className="text-2xs text-ink-5">{t('bookings.check_in')}</p>
            </div>
          </div>
          <span className="text-ink-4">→</span>
          <div className="flex items-center gap-2">
            <span className="text-ink-4">📅</span>
            <div>
              <p className="text-xs font-semibold text-ink">{formatDate(booking.check_out_date)}</p>
              <p className="text-2xs text-ink-5">{t('bookings.check_out')}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-ink-4">👥</span>
            <span className="text-xs text-ink">{booking.guests} {t('bookings.guest')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-ink-4">🌙</span>
            <span className="text-xs text-ink">{nights} {t('bookings.nights')}</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-surface-4">
          <span className="text-xs text-ink-4">{t('bookings.total_amount')}</span>
          <span className="font-serif text-base font-semibold text-primary">{formatPrice(booking.total_amount)}</span>
        </div>

        {booking.special_requests && (
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-xs text-primary font-medium hover:underline flex items-center gap-1"
          >
            {showDetails ? '▼' : '▶'} Special Requests
          </button>
        )}

        {showDetails && booking.special_requests && (
          <div className="bg-surface rounded-xl p-3 text-xs text-ink-4 italic">
            "{booking.special_requests}"
          </div>
        )}

        {/* Status indicators */}
        <div className="flex gap-2 mt-2">
          {isUpcoming && (
            <span className="text-2xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">🔜 Inakuja</span>
          )}
          {isActive && (
            <span className="text-2xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">🟢 Inaendelea</span>
          )}
          {isPast && booking.status !== 'cancelled' && (
            <span className="text-2xs text-gray-600 bg-gray-50 px-2 py-0.5 rounded-full">✓ Imepita</span>
          )}
        </div>

        {/* Action buttons for owner — pending */}
        {type === 'owner' && booking.status === 'pending' && (
          <div className="flex gap-2 mt-3 pt-2 border-t border-surface-4">
            <button
              onClick={() => handleStatusChange('confirmed')}
              disabled={updating}
              className="flex-1 py-2 bg-green-600 text-white rounded-xl text-xs font-bold active:scale-[.98] transition-all flex items-center justify-center gap-1"
            >
              {updating ? '...' : `✅ ${t('bookings.confirm_action')}`}
            </button>
            <button
              onClick={() => handleStatusChange('cancelled')}
              disabled={updating}
              className="flex-1 py-2 bg-red-600 text-white rounded-xl text-xs font-bold active:scale-[.98] transition-all flex items-center justify-center gap-1"
            >
              {updating ? '...' : `❌ ${t('bookings.reject_action')}`}
            </button>
          </div>
        )}
        {/* Owner marks confirmed booking as complete */}
        {type === 'owner' && booking.status === 'confirmed' && (
          <div className="mt-3 pt-2 border-t border-surface-4">
            <button
              onClick={() => handleStatusChange('completed')}
              disabled={updating}
              className="w-full py-2 bg-blue-600 text-white rounded-xl text-xs font-bold active:scale-[.98] transition-all flex items-center justify-center gap-1"
            >
              {updating ? '...' : '🏁 Kamilisha Booking'}
            </button>
          </div>
        )}

        {/* Action buttons for customer */}
        {type === 'customer' && (booking.status === 'pending' || booking.status === 'confirmed') && (
          <button
            onClick={() => handleStatusChange('cancelled', true)}
            disabled={updating}
            className="w-full mt-3 py-2 border-2 border-red-300 text-red-600 rounded-xl text-xs font-bold active:scale-[.98] transition-all"
          >
            {t('bookings.cancel_booking')}
          </button>
        )}
      </div>
    </div>
  );
};

// Tab component
const Tab = ({ active, onClick, label, count }) => (
  <button
    onClick={onClick}
    className={`flex-1 py-3 text-sm font-semibold transition-all relative
      ${active ? 'text-primary' : 'text-ink-4 hover:text-ink'}`}
  >
    {label}
    {count > 0 && (
      <span className={`ml-2 px-1.5 py-0.5 rounded-full text-2xs font-bold
        ${active ? 'bg-primary-50 text-primary' : 'bg-surface-3 text-ink-5'}`}
      >
        {count}
      </span>
    )}
    {active && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />}
  </button>
);

export default function Bookings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState('customer'); // 'customer' or 'owner'
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'upcoming', 'past', 'pending'

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      let endpoint = '/bookings/my';
      if (activeTab === 'owner') {
        // For owner, we need to get bookings for their properties
        // This would require a different endpoint or we can get all user's properties and fetch their bookings
        // For now, we'll use a general endpoint if available
        const [propertiesRes] = await Promise.all([
          api.get('/properties/my')
        ]);
        const properties = propertiesRes.data.data || [];
        const allBookings = [];
        for (const prop of properties) {
          try {
            const bookingsRes = await api.get(`/bookings/property/${prop.id}`);
            allBookings.push(...(bookingsRes.data.data || []));
          } catch (e) {}
        }
        setBookings(allBookings.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
      } else {
        const res = await api.get(endpoint);
        setBookings(res.data.data || []);
      }
    } catch (err) {
      console.error('Fetch bookings error:', err);
      toast('Hitilafu ya kupakia bookings', 'error');
    } finally {
      setLoading(false);
    }
  }, [activeTab, toast]);

  useEffect(() => {
    if (user) {
      fetchBookings();
    } else {
      setLoading(false);
    }
  }, [user, activeTab, fetchBookings]);

  const handleStatusUpdate = () => {
    fetchBookings();
  };

  const handleViewProperty = (propertyId) => {
    navigate(`/property/${propertyId}`);
  };

  // Filter bookings
  const filteredBookings = bookings.filter(booking => {
    const checkIn = new Date(booking.check_in_date);
    const checkOut = new Date(booking.check_out_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (filter === 'upcoming') {
      return checkIn > today && booking.status !== 'cancelled';
    }
    if (filter === 'past') {
      return checkOut < today || booking.status === 'completed';
    }
    if (filter === 'pending') {
      return booking.status === 'pending';
    }
    return true;
  });

  const counts = {
    all: bookings.length,
    upcoming: bookings.filter(b => new Date(b.check_in_date) > new Date() && b.status !== 'cancelled').length,
    past: bookings.filter(b => new Date(b.check_out_date) < new Date() || b.status === 'completed').length,
    pending: bookings.filter(b => b.status === 'pending').length,
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-surface pb-24">
        <TopBar title={t('bookings.my_bookings')} showBack />
        <EmptyState
          icon="📅"
          title={t('errors.please_login')}
          subtitle={t('errors.please_login')}
          action={{ label: t('auth.login'), onClick: () => navigate('/auth') }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface pb-24 md:pb-8 animate-fade-in-up">
      <TopBar title={`📅 ${t('bookings.my_bookings')}`} showBack />

      {/* Role Tabs */}
      <div className="bg-white border-b border-surface-4 px-4">
        <div className="flex gap-6">
          <Tab
            active={activeTab === 'customer'}
            onClick={() => setActiveTab('customer')}
            label={t('bookings.as_customer')}
            count={activeTab === 'customer' ? bookings.length : 0}
          />
          <Tab
            active={activeTab === 'owner'}
            onClick={() => setActiveTab('owner')}
            label={t('bookings.as_owner')}
            count={activeTab === 'owner' ? bookings.length : 0}
          />
        </div>
      </div>

      {/* Filter Tabs */}
      {bookings.length > 0 && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar px-4 py-3 border-b border-surface-4">
          {[
            { id: 'all', label: t('common.all'), icon: '📋' },
            { id: 'upcoming', label: t('bookings.upcoming'), icon: '🔜' },
            { id: 'past', label: t('bookings.past'), icon: '📅' },
            { id: 'pending', label: t('bookings.pending_status'), icon: '⏳' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all
                ${filter === f.id ? 'bg-primary text-white' : 'bg-white text-ink-4 border border-surface-4'}`}
            >
              {f.icon} {f.label}
              {counts[f.id] > 0 && (
                <span className={`ml-0.5 ${filter === f.id ? 'text-white/80' : 'text-ink-5'}`}>
                  ({counts[f.id]})
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Spinner size="lg" />
        </div>
      ) : filteredBookings.length > 0 ? (
        <div className="px-4 py-4">
          {filteredBookings.map(booking => (
            <BookingCard
              key={booking.id}
              booking={booking}
              type={activeTab}
              onStatusUpdate={handleStatusUpdate}
              onViewProperty={handleViewProperty}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon="📅"
          title={t('bookings.no_bookings')}
          subtitle={t('bookings.no_bookings_sub')}
          action={activeTab === 'customer' ? {
            label: t('nav.search'),
            onClick: () => navigate('/search')
          } : undefined}
        />
      )}

      {/* Help text */}
      {bookings.length > 0 && (
        <div className="px-4 mt-4">
          <div className="bg-blue-50 rounded-2xl p-4 text-center">
            <p className="text-xs text-blue-700">
              📌 Kwa maswali yoyote kuhusu booking yako, wasiliana na mwenye nyumba kupitia chat.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}