import { useEffect, useState, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

export const useSocket = (eventHandlers = {}) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const socketRef = useRef(null);
  const eventHandlersRef = useRef(eventHandlers);

  // Update event handlers ref when they change
  useEffect(() => {
    eventHandlersRef.current = eventHandlers;
  }, [eventHandlers]);

  // Initialize socket connection
  useEffect(() => {
    // Get token from localStorage
    const token = localStorage.getItem('mp_token');
    
    if (!token) {
      console.log('🔌 No token found, skipping socket connection');
      setIsConnecting(false);
      return;
    }

    console.log('🔌 Initializing socket connection to:', SOCKET_URL);

    const socketInstance = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      forceNew: true
    });

    socketRef.current = socketInstance;

    // Connection event handlers
    socketInstance.on('connect', () => {
      console.log('✅ Socket connected successfully');
      setIsConnected(true);
      setIsConnecting(false);
    });

    socketInstance.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error.message);
      setIsConnected(false);
      // Don't set isConnecting to false immediately to allow retries
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason);
      setIsConnected(false);
      if (reason === 'io server disconnect') {
        // Reconnect manually if server disconnected
        socketInstance.connect();
      }
    });

    socketInstance.on('reconnect', (attemptNumber) => {
      console.log(`🔄 Socket reconnected after ${attemptNumber} attempts`);
      setIsConnected(true);
      setIsConnecting(false);
    });

    socketInstance.on('reconnect_attempt', (attemptNumber) => {
      console.log(`🔄 Socket reconnection attempt ${attemptNumber}`);
    });

    socketInstance.on('reconnect_error', (error) => {
      console.error('❌ Socket reconnection error:', error.message);
    });

    socketInstance.on('reconnect_failed', () => {
      console.error('❌ Socket reconnection failed');
      setIsConnecting(false);
    });

    // Custom event handlers passed from parent
    socketInstance.on('connected', (data) => {
      console.log('📡 Socket confirmed connected:', data);
    });

    socketInstance.on('new_message', (data) => {
      console.log('📨 New message received:', data);
      if (eventHandlersRef.current.onNewMessage) {
        eventHandlersRef.current.onNewMessage(data);
      }
    });

    socketInstance.on('message_sent', (data) => {
      console.log('✅ Message sent confirmation:', data);
      if (eventHandlersRef.current.onMessageSent) {
        eventHandlersRef.current.onMessageSent(data);
      }
    });

    socketInstance.on('user_typing', (data) => {
      console.log('✏️ User typing:', data);
      if (eventHandlersRef.current.onUserTyping) {
        eventHandlersRef.current.onUserTyping(data);
      }
    });

    socketInstance.on('user_stop_typing', (data) => {
      console.log('✏️ User stopped typing:', data);
      if (eventHandlersRef.current.onUserStopTyping) {
        eventHandlersRef.current.onUserStopTyping(data);
      }
    });

    socketInstance.on('notification', (data) => {
      console.log('🔔 Notification received:', data);
      if (eventHandlersRef.current.onNotification) {
        eventHandlersRef.current.onNotification(data);
      }
    });

    socketInstance.on('error', (data) => {
      console.error('❌ Socket error:', data);
      if (eventHandlersRef.current.onError) {
        eventHandlersRef.current.onError(data);
      }
    });

    setSocket(socketInstance);

    // Cleanup on unmount
    return () => {
      console.log('🔌 Cleaning up socket connection');
      if (socketInstance) {
        socketInstance.off('connect');
        socketInstance.off('connect_error');
        socketInstance.off('disconnect');
        socketInstance.off('reconnect');
        socketInstance.off('reconnect_attempt');
        socketInstance.off('reconnect_error');
        socketInstance.off('reconnect_failed');
        socketInstance.off('connected');
        socketInstance.off('new_message');
        socketInstance.off('message_sent');
        socketInstance.off('user_typing');
        socketInstance.off('user_stop_typing');
        socketInstance.off('notification');
        socketInstance.off('error');
        socketInstance.disconnect();
      }
      socketRef.current = null;
    };
  }, []); // Empty dependency array - only run once on mount

  // ============================================================
  // Send message
  // ============================================================
  const sendMessage = useCallback((toUserId, message, propertyId = null) => {
    if (!socketRef.current || !isConnected) {
      console.error('❌ Cannot send message: socket not connected');
      return false;
    }
    
    const data = {
      to_user_id: toUserId,
      message: message,
      property_id: propertyId
    };
    
    console.log(`📤 Sending message to user ${toUserId}:`, message.substring(0, 50));
    socketRef.current.emit('send_message', data);
    return true;
  }, [isConnected]);

  // ============================================================
  // Send typing indicator
  // ============================================================
  const startTyping = useCallback((toUserId) => {
    if (!socketRef.current || !isConnected) return;
    socketRef.current.emit('typing', { to_user_id: toUserId });
  }, [isConnected]);

  const stopTyping = useCallback((toUserId) => {
    if (!socketRef.current || !isConnected) return;
    socketRef.current.emit('stop_typing', { to_user_id: toUserId });
  }, [isConnected]);

  // ============================================================
  // Mark messages as read
  // ============================================================
  const markMessagesRead = useCallback((fromUserId) => {
    if (!socketRef.current || !isConnected) return;
    socketRef.current.emit('mark_read', { from_user_id: fromUserId });
  }, [isConnected]);

  // ============================================================
  // Reconnect manually
  // ============================================================
  const reconnect = useCallback(() => {
    if (socketRef.current && !isConnected) {
      console.log('🔌 Attempting manual reconnect...');
      socketRef.current.connect();
    }
  }, [isConnected]);

  // ============================================================
  // Disconnect manually
  // ============================================================
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      console.log('🔌 Manual disconnect requested');
      socketRef.current.disconnect();
    }
  }, []);

  return {
    socket,
    isConnected,
    isConnecting,
    sendMessage,
    startTyping,
    stopTyping,
    markMessagesRead,
    reconnect,
    disconnect
  };
};