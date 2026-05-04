export const formatPrice = (n) => {
  if (!n && n !== 0) return 'TSh 0';
  const num = Number(n);
  if (num >= 1_000_000_000) return `TSh ${(num / 1_000_000_000).toFixed(1)}B`;
  if (num >= 1_000_000) return `TSh ${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `TSh ${(num / 1_000).toFixed(0)}K`;
  return `TSh ${num.toLocaleString()}`;
};

export const timeAgo = (dateStr) => {
  if (!dateStr) return '';
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60) return 'sasa hivi';
  if (diff < 3600) return `dakika ${Math.floor(diff / 60)} zilizopita`;
  if (diff < 86400) return `saa ${Math.floor(diff / 3600)} zilizopita`;
  if (diff < 604800) return `siku ${Math.floor(diff / 86400)} zilizopita`;
  if (diff < 2592000) return `wiki ${Math.floor(diff / 604800)} zilizopita`;
  return `miezi ${Math.floor(diff / 2592000)} iliyopita`;
};

export const daysAgo = (dateStr) => {
  if (!dateStr) return '';
  const days = Math.floor((Date.now() - new Date(dateStr)) / 86400000);
  if (days === 0) return 'Leo';
  if (days === 1) return 'Jana';
  if (days < 7) return `Siku ${days} zilizopita`;
  if (days < 30) return `Wiki ${Math.floor(days / 7)} zilizopita`;
  if (days < 365) return `Miezi ${Math.floor(days / 30)} iliyopita`;
  return `Miaka ${Math.floor(days / 365)} iliyopita`;
};

export const msgTime = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0');
};

export const formatDate = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('sw-TZ', {
    day: 'numeric', month: 'short', year: 'numeric'
  });
};

// CRITICAL FIX: Get property image - correctly handles uploaded images
export const getPropertyImage = (prop) => {
  const getBaseUrl = () => {
    return process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000';
  };

  // FIRST: Check if property has images array from API
  if (prop?.images && Array.isArray(prop.images) && prop.images.length > 0) {
    const primaryImg = prop.images.find(img => img.is_primary === 1);
    const imgToUse = primaryImg || prop.images[0];
    
    if (imgToUse && imgToUse.image_url) {
      // If it's an uploaded image (starts with /uploads), add base URL
      if (imgToUse.image_url.startsWith('/uploads')) {
        return `${getBaseUrl()}${imgToUse.image_url}`;
      }
      return imgToUse.image_url;
    }
  }
  
  // SECOND: Check primary_image field
  if (prop?.primary_image) {
    if (prop.primary_image.startsWith('/uploads')) {
      return `${getBaseUrl()}${prop.primary_image}`;
    }
    return prop.primary_image;
  }
  
  // THIRD: For debugging - log what we're trying to display
  console.log('No image found for property:', prop?.id, prop?.title);
  
  // FALLBACK: Use property-specific fallback based on ID
  const fallbacks = [
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&q=75',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&q=75',
    'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=600&q=75',
    'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=600&q=75',
    'https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=600&q=75',
    'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600&q=75',
    'https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&q=75',
    'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=600&q=75',
    'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&q=75',
    'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=600&q=75',
  ];
  
  const index = (prop?.id || 0) % fallbacks.length;
  return fallbacks[index];
};

export const AVATAR_IMAGES = [
  'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=120&q=60',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&q=60',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&q=60',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=120&q=60',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&q=60',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=120&q=60',
];

export const getAvatar = (user) => {
  const getBaseUrl = () => {
    return process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000';
  };
  
  if (user?.avatar) {
    if (user.avatar.startsWith('/uploads')) {
      return `${getBaseUrl()}${user.avatar}`;
    }
    return user.avatar;
  }
  return AVATAR_IMAGES[(user?.id || 0) % AVATAR_IMAGES.length];
};

export const ROLE_LABELS = {
  customer: '👤 Mteja',
  agent: '🧑‍💼 Dalali',
  owner: '🏠 Mwenye Nyumba',
  admin: '🛡️ Admin',
};

export const TYPE_LABELS = {
  nyumba: 'Nyumba',
  chumba: 'Chumba',
  frem: 'Frem',
  ofisi: 'Ofisi',
};

export const STATUS_LABELS = {
  available: { label: 'Inapatikana', color: 'bg-green-50 text-green-700', icon: '✅' },
  rented: { label: 'Imekodishwa', color: 'bg-amber-50 text-amber-700', icon: '🔒' },
  sold: { label: 'Imeuzwa', color: 'bg-red-50 text-red-700', icon: '🏷️' },
  pending: { label: 'Inasubiri', color: 'bg-blue-50 text-blue-700', icon: '⏳' },
};

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

export const formatPhone = (phone) => {
  if (!phone) return '';
  const clean = String(phone).replace(/\D/g, '');
  if (clean.length === 9) return `+255 ${clean.substring(0, 3)} ${clean.substring(3, 6)} ${clean.substring(6)}`;
  if (clean.startsWith('255') && clean.length === 12) {
    return `+255 ${clean.substring(3, 6)} ${clean.substring(6, 9)} ${clean.substring(9)}`;
  }
  return phone;
};