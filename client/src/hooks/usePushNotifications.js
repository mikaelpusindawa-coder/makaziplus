import { useEffect, useRef } from 'react';
import api from '../utils/api';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw     = window.atob(base64);
  return new Uint8Array([...raw].map(c => c.charCodeAt(0)));
}

export function usePushNotifications(user) {
  const subscribed = useRef(false);

  useEffect(() => {
    if (!user || subscribed.current) return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    const setup = async () => {
      try {
        const { data } = await api.get('/push/vapid-key');
        if (!data.publicKey) return;

        const reg = await navigator.serviceWorker.ready;
        let sub = await reg.pushManager.getSubscription();

        if (!sub) {
          const permission = await Notification.requestPermission();
          if (permission !== 'granted') return;
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(data.publicKey),
          });
        }

        await api.post('/push/subscribe', sub.toJSON());
        subscribed.current = true;
      } catch (e) {
        // Silently fail — push is optional
      }
    };

    setup();
  }, [user]);
}
