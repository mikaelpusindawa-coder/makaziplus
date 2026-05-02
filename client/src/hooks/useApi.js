import { useState, useCallback } from 'react';
import api from '../utils/api';

export const useApi = () => {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const request = useCallback(async (method, url, data = null, config = {}) => {
    setLoading(true);
    setError(null);
    try {
      const res = method === 'get' || method === 'delete'
        ? await api[method](url, config)
        : await api[method](url, data, config);
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Hitilafu ya mtandao';
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading, error,
    get:    (url, cfg)        => request('get',    url, null, cfg),
    post:   (url, data, cfg)  => request('post',   url, data, cfg),
    patch:  (url, data, cfg)  => request('patch',  url, data, cfg),
    del:    (url, cfg)        => request('delete', url, null, cfg),
  };
};
