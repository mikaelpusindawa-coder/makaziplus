// ─────────────────────────────────────────────────────────────────────────────
// client/src/utils/helpers.js  — FULL REPLACEMENT
// ─────────────────────────────────────────────────────────────────────────────

// Reads REACT_APP_API_URL from .env so it works on both localhost and production
const getBase = () =>
  (process.env.REACT_APP_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');

// ── resolveImageUrl ───────────────────────────────────────────────────────────
// Use this wherever you have a raw image_url or primary_image string.
// Works on localhost:3000 AND on production (Vercel/Render).
export const resolveImageUrl = (url, folder = 'properties') => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/uploads')) return `${getBase()}${url}`;
  // Bare filename (legacy DB records stored without path prefix)
  if (!url.includes('/')) return `${getBase()}/uploads/${folder}/${url}`;
  return url;
};

// ── SVG placeholder generator — path-based icons, no emoji, sharp at any size ─
// Uses nested <svg> with standard 24×24 Lucide icon paths for crisp rendering.
const _ph = (iconPath, label, c1, c2) => {
  const s =
    `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/>` +
    `</linearGradient></defs>` +
    `<rect width="600" height="400" fill="url(%23g)"/>` +
    `<rect x="220" y="100" width="160" height="160" rx="24" fill="rgba(255,255,255,0.08)"/>` +
    `<svg x="252" y="132" width="96" height="96" viewBox="0 0 24 24" fill="none"` +
    ` stroke="rgba(255,255,255,0.88)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">` +
    iconPath +
    `</svg>` +
    `<text x="300" y="294" text-anchor="middle" font-size="13" font-weight="700" letter-spacing="3"` +
    ` font-family="-apple-system,system-ui,sans-serif" fill="rgba(255,255,255,0.52)">${label}</text>` +
    `</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(s)}`;
};

// Standard Lucide 24×24 icon paths
const _HOUSE    = `<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>`;
const _BED      = `<path d="M2 4v16M2 8h18a2 2 0 0 1 2 2v10M2 17h20M6 8v9"/>`;
const _BUILDING = `<rect x="4" y="2" width="16" height="20" rx="2"/><line x1="9" y1="22" x2="9" y2="12"/><line x1="15" y1="22" x2="15" y2="12"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="7" x2="20" y2="7"/>`;
const _BRIEFCASE= `<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>`;

const PLACEHOLDER_MAP = {
  nyumba: _ph(_HOUSE,     'NYUMBA', '#1B4F72', '#2E86C1'),
  chumba: _ph(_BED,       'CHUMBA', '#4A235A', '#7D3C98'),
  frem:   _ph(_BUILDING,  'FREM',   '#1B2631', '#2C3E50'),
  ofisi:  _ph(_BRIEFCASE, 'OFISI',  '#0B5345', '#17A589'),
};

// Returns a stable, type-appropriate placeholder for a given property.
export const getPlaceholderImage = (type, _id = 0) => {
  return PLACEHOLDER_MAP[type] || PLACEHOLDER_MAP.nyumba;
};

// ── getPropertyImage ──────────────────────────────────────────────────────────
// Returns the real uploaded image URL when available, or a type-seeded
// SVG placeholder (no external requests).
export const getPropertyImage = (prop) => {
  if (!prop) return PLACEHOLDER_MAP.nyumba;

  if (Array.isArray(prop.images) && prop.images.length > 0) {
    const primary = prop.images.find(img => img.is_primary === 1 || img.is_primary === true);
    const img = primary || prop.images[0];
    const url = resolveImageUrl(img?.image_url);
    if (url) return url;
  }

  const url = resolveImageUrl(prop.primary_image);
  if (url) return url;

  // No uploaded image — return stable type-based placeholder
  return getPlaceholderImage(prop.type, prop.id);
};

// ── formatPrice ───────────────────────────────────────────────────────────────
export const formatPrice = (n) => {
  if (!n && n !== 0) return 'TSh 0';
  const num = Number(n);
  if (num >= 1_000_000_000) return `TSh ${(num / 1_000_000_000).toFixed(1)}B`;
  if (num >= 1_000_000)     return `TSh ${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000)         return `TSh ${(num / 1_000).toFixed(0)}K`;
  return `TSh ${num.toLocaleString()}`;
};

// ── timeAgo ───────────────────────────────────────────────────────────────────
export const timeAgo = (dateStr) => {
  if (!dateStr) return '';
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60)      return 'sasa hivi';
  if (diff < 3600)    return `dakika ${Math.floor(diff / 60)} zilizopita`;
  if (diff < 86400)   return `saa ${Math.floor(diff / 3600)} zilizopita`;
  if (diff < 604800)  return `siku ${Math.floor(diff / 86400)} zilizopita`;
  if (diff < 2592000) return `wiki ${Math.floor(diff / 604800)} zilizopita`;
  return `miezi ${Math.floor(diff / 2592000)} iliyopita`;
};

// ── daysAgo ───────────────────────────────────────────────────────────────────
export const daysAgo = (dateStr) => {
  if (!dateStr) return '';
  const days = Math.floor((Date.now() - new Date(dateStr)) / 86400000);
  if (days === 0) return 'Leo';
  if (days === 1) return 'Jana';
  if (days < 7)   return `Siku ${days} zilizopita`;
  if (days < 30)  return `Wiki ${Math.floor(days / 7)} zilizopita`;
  if (days < 365) return `Miezi ${Math.floor(days / 30)} iliyopita`;
  return `Miaka ${Math.floor(days / 365)} iliyopita`;
};

// ── msgTime ───────────────────────────────────────────────────────────────────
export const msgTime = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0');
};

// ── formatDate ────────────────────────────────────────────────────────────────
export const formatDate = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('sw-TZ', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
};

// ── getAvatar ─────────────────────────────────────────────────────────────────
const _PERSON = `<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>`;
const _avatarSVG = (() => {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="#1B4F72"/><stop offset="1" stop-color="#2E86C1"/>` +
    `</linearGradient></defs>` +
    `<rect width="120" height="120" fill="url(%23g)"/>` +
    `<svg x="30" y="26" width="60" height="60" viewBox="0 0 24 24" fill="none"` +
    ` stroke="rgba(255,255,255,0.85)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">` +
    _PERSON +
    `</svg></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
})();

export const AVATAR_IMAGES = [_avatarSVG];

export const getAvatar = (user) => {
  const url = resolveImageUrl(user?.avatar);
  if (url) return url;
  return _avatarSVG;
};

// ── Labels ────────────────────────────────────────────────────────────────────
export const ROLE_LABELS = {
  customer: '👤 Mteja',
  agent:    '🧑‍💼 Dalali',
  owner:    '🏠 Mwenye Nyumba',
  admin:    '🛡️ Admin',
};

export const TYPE_LABELS = {
  nyumba: 'Nyumba',
  chumba: 'Chumba',
  frem:   'Frem',
  ofisi:  'Ofisi',
};

export const STATUS_LABELS = {
  available: { label: 'Inapatikana', color: 'bg-green-50 text-green-700',  icon: '✅' },
  rented:    { label: 'Imekodishwa', color: 'bg-amber-50 text-amber-700',  icon: '🔒' },
  sold:      { label: 'Imeuzwa',     color: 'bg-red-50 text-red-700',      icon: '🏷️' },
  pending:   { label: 'Inasubiri',   color: 'bg-blue-50 text-blue-700',    icon: '⏳' },
};

// ── renderStars ───────────────────────────────────────────────────────────────
export const renderStars = (rating, size = 'sm') => {
  const sz = size === 'lg' ? 'text-2xl' : size === 'md' ? 'text-lg' : 'text-sm';
  return (
    <span className="inline-flex gap-px">
      {[1, 2, 3, 4, 5].map(s => (
        <span key={s} className={`${sz} leading-none ${s <= rating ? 'text-yellow-400' : 'text-gray-200'}`}>★</span>
      ))}
    </span>
  );
};