import React from 'react';

const formatPrice = (n) => {
  if (!n) return 'TSh 0';
  if (n >= 1_000_000) return `TSh ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `TSh ${(n / 1_000).toFixed(0)}K`;
  return `TSh ${Number(n).toLocaleString()}`;
};

export const BookingModal = ({
  isOpen,
  onClose,
  propertyTitle,
  propertyPrice,
  priceType,
  checkIn,
  setCheckIn,
  checkOut,
  setCheckOut,
  guests,
  setGuests,
  specialRequests,
  setSpecialRequests,
  onSubmit,
  loading,
  minDate,
  minCheckOut
}) => {
  if (!isOpen) return null;

  const calculateTotal = () => {
    if (!checkIn || !checkOut) return 0;
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    return days * parseFloat(propertyPrice || 0);
  };

  const total = calculateTotal();
  const nights = checkIn && checkOut ? Math.ceil((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24)) : 0;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => e.target === e.currentTarget && !loading && onClose()}
    >
      <div className="bg-white rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto animate-scale-in">
        <div className="sticky top-0 bg-white border-b border-surface-4 px-5 py-4 flex items-center justify-between">
          <h2 className="font-serif text-xl font-semibold text-ink">📅 Book Property</h2>
          <button onClick={onClose} className="w-8 h-8 bg-surface rounded-full flex items-center justify-center text-ink-4 hover:text-ink">
            ✕
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Property info */}
          <div className="bg-primary-50 rounded-2xl p-4">
            <p className="text-xs text-primary/60 mb-1">Unachokichagua</p>
            <p className="font-semibold text-ink">{propertyTitle}</p>
            <p className="text-sm text-primary font-bold mt-1">
              {priceType === 'rent' ? `${formatPrice(propertyPrice)} / night` : formatPrice(propertyPrice)}
            </p>
          </div>

          {/* Date pickers */}
          <div>
            <label className="block text-xs font-bold text-ink-4 uppercase tracking-wider mb-2">Check-in Date</label>
            <input
              type="date"
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
              min={minDate}
              className="input-field"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-ink-4 uppercase tracking-wider mb-2">Check-out Date</label>
            <input
              type="date"
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
              min={minCheckOut || minDate}
              className="input-field"
              required
            />
          </div>

          {/* Guests */}
          <div>
            <label className="block text-xs font-bold text-ink-4 uppercase tracking-wider mb-2">Number of Guests</label>
            <select value={guests} onChange={(e) => setGuests(parseInt(e.target.value))} className="input-field">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(g => (
                <option key={g} value={g}>{g} {g === 1 ? 'guest' : 'guests'}</option>
              ))}
            </select>
          </div>

          {/* Special requests */}
          <div>
            <label className="block text-xs font-bold text-ink-4 uppercase tracking-wider mb-2">Special Requests (Optional)</label>
            <textarea
              value={specialRequests}
              onChange={(e) => setSpecialRequests(e.target.value)}
              placeholder="Any special requests or questions for the host?"
              rows={3}
              className="input-field resize-none"
            />
          </div>

          {/* Price breakdown */}
          {nights > 0 && (
            <div className="bg-surface rounded-2xl p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-ink-4">{formatPrice(propertyPrice)} x {nights} {nights === 1 ? 'night' : 'nights'}</span>
                <span className="font-semibold">{formatPrice(propertyPrice * nights)}</span>
              </div>
              <div className="border-t border-surface-4 pt-2 flex justify-between font-bold">
                <span>Total</span>
                <span className="text-primary text-lg">{formatPrice(total)}</span>
              </div>
            </div>
          )}

          {/* Submit button */}
          <button
            onClick={onSubmit}
            disabled={loading || !checkIn || !checkOut}
            className="btn-primary mt-2"
          >
            {loading ? (
              <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Processing...</>
            ) : (
              `Confirm Booking → ${formatPrice(total)}`
            )}
          </button>

          <p className="text-2xs text-ink-5 text-center">
            By confirming, you agree to our booking terms and cancellation policy.
          </p>
        </div>
      </div>
    </div>
  );
};