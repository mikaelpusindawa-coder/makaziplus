import React from 'react';
import { useNavigate } from 'react-router-dom';
import { formatPrice, getPropertyImage } from '../../utils/helpers';

const HeartIcon = ({ filled }) => (
  <svg viewBox="0 0 24 24" className="w-4 h-4 transition-all duration-200"
    fill={filled ? '#ef4444' : 'none'}
    stroke={filled ? '#ef4444' : 'currentColor'} strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round"
  >
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

export const PropertyCard = ({ property: p, onFav, isFav, horizontal }) => {
  const navigate = useNavigate();
  const img = getPropertyImage(p);

  if (horizontal) {
    return (
      <div onClick={() => navigate(`/property/${p.id}`)}
        className="card-hover flex bg-white rounded-2xl overflow-hidden shadow-soft
          border border-surface-4 cursor-pointer mb-2.5 mx-4 md:mx-0"
      >
        <div className="relative w-28 md:w-36 flex-shrink-0 overflow-hidden bg-surface-3">
          <img src={img} alt={p.title} loading="lazy"
            className="w-full h-full object-cover min-h-[88px]"
            onError={(e) => {
              e.target.src = 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=300&q=60';
            }}
          />
          {p.is_premium === 1 && (
            <div className="absolute bottom-2 left-2 bg-gold text-white text-2xs font-bold px-2 py-0.5 rounded-full">
              ⭐ Prem
            </div>
          )}
          {/* Video Badge */}
          {(p.video_url || p.video_file) && (
            <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm text-white text-2xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
              <svg viewBox="0 0 24 24" className="w-3 h-3 fill-white" stroke="currentColor" strokeWidth="1">
                <path d="M2 4v16h20V4H2zm18 14H4V6h16v12zm-9-9v6l5-3-5-3z" />
              </svg>
              Video
            </div>
          )}
        </div>
        <div className="flex-1 p-3 min-w-0 flex flex-col justify-between">
          <div>
            <div className="font-serif text-base font-semibold text-primary leading-tight">
              {formatPrice(p.price)}
              <span className="font-sans text-xs font-normal text-ink-5 ml-1">
                {p.price_type === 'rent' ? '/mwezi' : ''}
              </span>
            </div>
            <p className="text-sm font-semibold text-ink mt-0.5 line-clamp-1">{p.title}</p>
            <p className="text-xs text-ink-5 mt-0.5 flex items-center gap-1">
              <span>📍</span>{p.area}, {p.city}
            </p>
          </div>
          <div className="flex items-center justify-between mt-2">
            <div className="flex gap-1.5 flex-wrap">
              {p.bedrooms > 0 && <span className="badge bg-surface text-ink-4">🛏 {p.bedrooms}</span>}
              {p.bathrooms > 0 && <span className="badge bg-surface text-ink-4">🚿 {p.bathrooms}</span>}
              {p.size_sqm > 0 && <span className="badge bg-surface text-ink-4">📐 {p.size_sqm}m²</span>}
            </div>
            {onFav && (
              <button onClick={(e) => { e.stopPropagation(); onFav(p.id); }}
                className={`w-7 h-7 rounded-full flex items-center justify-center transition-all
                  active:scale-95 ${isFav ? 'text-red-500 bg-red-50' : 'text-ink-5 bg-surface hover:text-red-400'}`}
              >
                <HeartIcon filled={isFav} />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div onClick={() => navigate(`/property/${p.id}`)}
      className="card-hover bg-white rounded-2xl overflow-hidden shadow-soft border border-surface-4
        cursor-pointer flex-shrink-0 w-48 md:w-60"
    >
      <div className="relative h-32 md:h-44 overflow-hidden bg-surface-3">
        <img src={img} alt={p.title} loading="lazy"
          className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
          onError={(e) => {
            e.target.src = 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=300&q=60';
          }}
        />
        {p.is_premium === 1 && (
          <div className="absolute top-2 left-2 bg-gold text-white text-2xs font-bold px-2.5 py-0.5 rounded-full shadow-gold">
            ⭐ Premium
          </div>
        )}
        {/* Video Badge */}
        {(p.video_url || p.video_file) && (
          <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm text-white text-2xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
            <svg viewBox="0 0 24 24" className="w-3 h-3 fill-white" stroke="currentColor" strokeWidth="1">
              <path d="M2 4v16h20V4H2zm18 14H4V6h16v12zm-9-9v6l5-3-5-3z" />
            </svg>
            Video
          </div>
        )}
        {onFav && (
          <button onClick={(e) => { e.stopPropagation(); onFav(p.id); }}
            className={`absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center
              shadow-soft transition-all active:scale-90
              ${isFav ? 'bg-red-50 text-red-500' : 'glass text-ink-4 hover:text-red-400'}`}
          >
            <HeartIcon filled={isFav} />
          </button>
        )}
        <div className="absolute bottom-2 right-2 bg-black/50 text-white text-2xs font-bold px-2 py-0.5 rounded-full capitalize">
          {p.type}
        </div>
      </div>
      <div className="p-3">
        <div className="font-serif text-base font-semibold text-primary">
          {formatPrice(p.price)}
          <span className="font-sans text-xs font-normal text-ink-5 ml-1">
            {p.price_type === 'rent' ? '/mwezi' : ''}
          </span>
        </div>
        <p className="text-xs font-semibold text-ink mt-0.5 line-clamp-1">{p.title}</p>
        <p className="text-2xs text-ink-5 mt-0.5 flex items-center gap-0.5">
          <span>📍</span>{p.area}
        </p>
        <div className="flex gap-1.5 mt-2 flex-wrap">
          {p.bedrooms > 0 && <span className="badge bg-surface-3 text-ink-4">🛏 {p.bedrooms}</span>}
          {p.bathrooms > 0 && <span className="badge bg-surface-3 text-ink-4">🚿 {p.bathrooms}</span>}
          <span className="badge bg-surface-3 text-ink-4">👁 {p.views}</span>
        </div>
      </div>
    </div>
  );
};