import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user,    setUser]    = useState(() => {
    try { return JSON.parse(localStorage.getItem('mp_user')); } catch { return null; }
  });
  const [loading, setLoading] = useState(true);

  // On mount — verify token is still valid with server
  useEffect(() => {
    const token = localStorage.getItem('mp_token');
    if (token) {
      api.get('/auth/me')
        .then(r => {
          setUser(r.data.user);
          localStorage.setItem('mp_user', JSON.stringify(r.data.user));
        })
        .catch(() => {
          localStorage.removeItem('mp_token');
          localStorage.removeItem('mp_user');
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email, password) => {
    const r = await api.post('/auth/login', { email, password });
    localStorage.setItem('mp_token', r.data.token);
    localStorage.setItem('mp_user',  JSON.stringify(r.data.user));
    setUser(r.data.user);
    return r.data.user;
  }, []);

  const register = useCallback(async (data) => {
    const r = await api.post('/auth/register', data);
    localStorage.setItem('mp_token', r.data.token);
    localStorage.setItem('mp_user',  JSON.stringify(r.data.user));
    setUser(r.data.user);
    return r.data.user;
  }, []);

  // Server-side logout — revokes session in DB
  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Even if server call fails, clear local state
    } finally {
      localStorage.removeItem('mp_token');
      localStorage.removeItem('mp_user');
      setUser(null);
    }
  }, []);

  const updateUser = useCallback((updated) => {
    setUser(updated);
    localStorage.setItem('mp_user', JSON.stringify(updated));
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
