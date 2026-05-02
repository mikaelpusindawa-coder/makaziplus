// useSocket.js
import { io } from 'socket.io-client';
import { useEffect, useState } from 'react';

const SOCKET_URL = 'http://localhost:5000';

export const useSocket = () => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Initialize connection with proper options
    const socketInstance = io(SOCKET_URL, {
      transports: ['websocket', 'polling'], // Fallback to polling if websocket fails
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000,
    });

    socketInstance.on('connect', () => {
      console.log('Socket connected successfully');
      setIsConnected(true);
    });

    socketInstance.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setIsConnected(false);
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      setIsConnected(false);
    });

    setSocket(socketInstance);

    // Cleanup on unmount
    return () => {
      socketInstance.disconnect();
    };
  }, []);

  return { socket, isConnected };
};