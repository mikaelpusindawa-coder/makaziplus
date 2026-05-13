import React, { useEffect, useRef } from 'react';

// Lazy-loads Leaflet only when rendered — avoids SSR issues and bundle bloat
export default function PropertyMap({ lat, lng, title, zoom = 15, height = '240px', markers = [] }) {
  const mapRef = useRef(null);
  const instanceRef = useRef(null);

  useEffect(() => {
    if (!lat || !lng) return;
    if (instanceRef.current) return; // already initialised

    // Dynamically import leaflet CSS + JS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);

    import('leaflet').then(L => {
      if (!mapRef.current || instanceRef.current) return;

      const map = L.default.map(mapRef.current, { zoomControl: true, scrollWheelZoom: false })
        .setView([parseFloat(lat), parseFloat(lng)], zoom);

      L.default.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      // Custom green marker icon
      const icon = L.default.divIcon({
        className: '',
        html: `<div style="background:#16a34a;width:32px;height:32px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.25)"></div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -34],
      });

      // Primary marker
      if (markers.length === 0) {
        L.default.marker([parseFloat(lat), parseFloat(lng)], { icon })
          .addTo(map)
          .bindPopup(`<b>${title || 'Mali'}</b>`)
          .openPopup();
      }

      // Multiple markers (search map)
      markers.forEach(m => {
        if (!m.lat || !m.lng) return;
        const mIcon = L.default.divIcon({
          className: '',
          html: `<div style="background:${m.premium ? '#d97706' : '#16a34a'};color:#fff;padding:2px 7px;border-radius:12px;font-size:11px;font-weight:700;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,.2)">${m.label || ''}</div>`,
          iconSize: [null, null],
          iconAnchor: [20, 12],
          popupAnchor: [0, -14],
        });
        L.default.marker([parseFloat(m.lat), parseFloat(m.lng)], { icon: mIcon })
          .addTo(map)
          .bindPopup(`<b>${m.title}</b><br/>${m.price || ''}`);
      });

      instanceRef.current = map;
    });

    return () => {
      if (instanceRef.current) {
        instanceRef.current.remove();
        instanceRef.current = null;
      }
    };
  }, [lat, lng, zoom, title, markers]);

  if (!lat || !lng) {
    return (
      <div style={{ height }} className="bg-surface-3 rounded-2xl flex flex-col items-center justify-center gap-2 text-ink-4">
        <svg viewBox="0 0 24 24" className="w-10 h-10 stroke-ink-5" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/>
        </svg>
        <span className="text-xs font-medium">Mahali hapajaongezwa kwenye ramani</span>
      </div>
    );
  }

  return <div ref={mapRef} style={{ height, borderRadius: '1rem', zIndex: 0 }} className="w-full" />;
}
