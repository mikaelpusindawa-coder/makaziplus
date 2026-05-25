import React from 'react';
import { useNavigate } from 'react-router-dom';
import { formatPrice, getPropertyImage, getPlaceholderImage } from '../../utils/helpers';

const HeartIcon = ({ filled }) => (
  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 transition-all duration-200"
    fill={filled ? '#ef4444' : 'none'}
    stroke={filled ? '#ef4444' : 'currentColor'} strokeWidth="2.5"
    strokeLinecap="round" strokeLinejoin="round"
  >
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

export const PropertyCard = ({ property: p, onFav, isFav }) => {
  const navigate = useNavigate();
  const img = getPropertyImage(p);

  return (
    <div onClick={() => navigate(`/property/${p.id}`)}
      className="bg-white rounded-xl overflow-hidden shadow-soft border border-surface-4
        cursor-pointer flex flex-col w-full min-w-0 h-full hover:shadow-md transition-all duration-200" 
    >
      {/* Aspect Ratio changed to aspect-[16/10] on mobile to give images a wider look when stacked in 1 column */}
      <div className="relative aspect-[16/10] sm:aspect-[4/3] w-full overflow-hidden bg-surface-3">
        <img src={img} alt={p.title} loading="lazy"
          className="w-full h-full object-cover transition-transform duration-300 hover:scale-103"
          onError={(e) => { e.target.onerror = null; e.target.src = getPlaceholderImage(p.type, p.id); }}
        />
        {p.is_premium === 1 && (
          <div className="absolute top-2 left-2 bg-gold text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md shadow-sm">
            ⭐ Prem
          </div>
        )}
        {onFav && (
          <button onClick={(e) => { e.stopPropagation(); onFav(p.id); }}
            className={`absolute top-2 right-2 w-6.5 h-6.5 rounded-full flex items-center justify-center
              shadow-soft transition-all active:scale-90 z-10
              ${isFav ? 'bg-red-50 text-red-500' : 'bg-black/40 text-white hover:text-red-400'}`}
          >
            <HeartIcon filled={isFav} />
          </button>
        )}
        <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-xs text-white text-[10px] font-medium px-1.5 py-0.5 rounded-md capitalize">
          {p.type}
        </div>
      </div>
      
      {/* Typography paddings and limits calibrated perfectly for spacious 1-column reading layout */}
      <div className="p-3 sm:p-2.5 flex-1 flex flex-col justify-between min-w-0">
        <div className="min-w-0">
          <div className="text-sm sm:text-base md:text-sm font-black text-primary truncate">
            {formatPrice(p.price)}
            <span className="text-xs sm:text-[10px] font-normal text-ink-5 ml-0.5">
              {p.price_type === 'rent' ? '/mw' : ''}
            </span>
          </div>
          <p className="text-xs sm:text-xs font-bold text-ink mt-0.5 truncate">{p.title}</p>
          <p className="text-xs sm:text-[10px] text-ink-5 mt-0.5 truncate">
            📍 {p.area}
          </p>
        </div>
        <div className="flex gap-1.5 mt-2.5 flex-wrap">
          {p.bedrooms > 0 && <span className="bg-surface-3 text-ink-4 text-[10px] sm:text-[9px] px-2 py-0.5 sm:px-1.5 rounded font-medium">🛏 {p.bedrooms}</span>}
          {p.bathrooms > 0 && <span className="bg-surface-3 text-ink-4 text-[10px] sm:text-[9px] px-2 py-0.5 sm:px-1.5 rounded font-medium">🚿 {p.bathrooms}</span>}
          <span className="bg-surface-3 text-ink-4 text-[10px] sm:text-[9px] px-2 py-0.5 sm:px-1.5 rounded font-medium">👁 {p.views}</span>
        </div>
      </div>
    </div>
  );
};
