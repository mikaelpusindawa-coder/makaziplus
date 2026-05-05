import React from 'react';

const StarPicker = ({ value, onChange }) => (
  <div className="flex gap-1.5 justify-center">
    {[1, 2, 3, 4, 5].map(s => (
      <button key={s} type="button" onClick={() => onChange(s)}
        className={`text-4xl leading-none transition-transform hover:scale-110 active:scale-90 ${s <= value ? 'text-yellow-400' : 'text-gray-200'}`}
      >
        ★
      </button>
    ))}
  </div>
);

export const RatingModal = ({
  isOpen,
  onClose,
  userName,
  userRole,
  starValue,
  setStarValue,
  reviewText,
  setReviewText,
  onSubmit,
  submitting
}) => {
  if (!isOpen) return null;

  const getRatingText = (rating) => {
    const texts = ['', 'Mbaya sana', 'Mbaya', 'Sawa', 'Nzuri', 'Bora kabisa!'];
    return texts[rating] || '';
  };

  const getRoleDisplay = () => {
    if (userRole === 'agent') return { icon: '🧑‍💼', label: 'Dalali', desc: 'Tathmini huduma ya dalali huyu' };
    if (userRole === 'owner') return { icon: '🏠', label: 'Mwenye Nyumba', desc: 'Tathmini uaminifu na huduma ya mwenye nyumba' };
    return { icon: '🏠', label: 'Mali', desc: 'Tathmini ubora wa mali hii' };
  };

  const roleDisplay = getRoleDisplay();

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => e.target === e.currentTarget && !submitting && onClose()}
    >
      <div className="bg-white rounded-3xl w-full max-w-md animate-scale-in">
        <div className="border-b border-surface-4 px-5 py-4 flex items-center justify-between">
          <h3 className="font-serif text-xl font-semibold text-ink">⭐ Tathmini</h3>
          <button onClick={onClose} className="w-8 h-8 bg-surface rounded-full flex items-center justify-center text-ink-4 hover:text-ink">
            ✕
          </button>
        </div>
        <div className="p-5">
          <div className="text-center mb-4">
            <div className="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center text-3xl mx-auto mb-3">
              {roleDisplay.icon}
            </div>
            <p className="text-sm font-semibold text-ink">{userName}</p>
            <p className="text-xs text-ink-5 capitalize">{roleDisplay.label}</p>
            <p className="text-xs text-ink-6 mt-1">{roleDisplay.desc}</p>
          </div>
          <p className="text-sm text-ink-5 mb-4 text-center">
            Je, ulikuwa na furaha na {roleDisplay.label === 'Mali' ? 'mali hii' : 'huduma yake'}?
          </p>

          <div className="flex justify-center mb-4">
            <StarPicker value={starValue} onChange={setStarValue} />
          </div>

          {starValue > 0 && (
            <p className="text-center text-sm text-green-600 mb-4">
              {getRatingText(starValue)}
            </p>
          )}

          <textarea
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            placeholder="Maoni yako (si lazima)..."
            rows={3}
            className="input-field resize-none mb-4"
          />

          <button
            onClick={onSubmit}
            disabled={submitting || !starValue}
            className="btn-primary"
          >
            {submitting ? (
              <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Inatuma...</>
            ) : (
              'Tuma Tathmini →'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};