import { useRef, useEffect, useCallback } from 'react';

export default function useSwipe({ onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, threshold = 50, velocityThreshold = 0.3 }) {
  const swipeRef = useRef(null);
  const touchData = useRef(null);

  const handleTouchStart = useCallback((e) => {
    const touch = e.touches[0];
    touchData.current = { startX: touch.clientX, startY: touch.clientY, startTime: Date.now() };
  }, []);

  const handleTouchEnd = useCallback((e) => {
    if (!touchData.current) return;
    const touch = e.changedTouches[0];
    const { startX, startY, startTime } = touchData.current;
    const dx = touch.clientX - startX;
    const dy = touch.clientY - startY;
    const elapsed = Date.now() - startTime;
    const velX = Math.abs(dx) / elapsed;
    const velY = Math.abs(dy) / elapsed;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    touchData.current = null;
    if (absDx > absDy && absDx > threshold && velX > velocityThreshold) {
      if (dx < 0 && onSwipeLeft) onSwipeLeft();
      if (dx > 0 && onSwipeRight) onSwipeRight();
      return;
    }
    if (absDy > absDx && absDy > threshold && velY > velocityThreshold) {
      if (dy < 0 && onSwipeUp) onSwipeUp();
      if (dy > 0 && onSwipeDown) onSwipeDown();
    }
  }, [onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, threshold, velocityThreshold]);

  useEffect(() => {
    const el = swipeRef.current;
    if (!el) return;
    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchend', handleTouchEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchEnd]);

  return { swipeRef };
}