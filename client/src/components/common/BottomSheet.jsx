import React, { useEffect } from 'react';
import useSwipe from '../../hooks/useSwipe';

export default function BottomSheet({ isOpen, onClose, title, children, snapPoint = '85vh', showHandle = true }) {
  const { swipeRef } = useSwipe({ onSwipeDown: onClose, threshold: 60 });

  useEffect(() => {
    if (isOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      <div onClick={onClose} className="fixed inset-0 bg-black/45 z-[999] animate-fade-in" />
      <div
        ref={swipeRef}
        className="fixed bottom-0 left-0 right-0 z-[1000] bg-white rounded-t-3xl shadow-lg flex flex-col animate-slide-up"
        style={{ maxHeight: snapPoint }}
      >
        {showHandle && (
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 bg-surface-4 rounded-full" />
          </div>
        )}
        {title && (
          <div className="flex items-center justify-between px-5 py-3 border-b border-surface-4">
            <h2 className="text-base font-semibold text-ink">{title}</h2>
            <button onClick={onClose} className="w-8 h-8 bg-surface rounded-full flex items-center justify-center text-ink-4 hover:text-ink">✕</button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-5 pb-8">{children}</div>
      </div>
    </>
  );
}