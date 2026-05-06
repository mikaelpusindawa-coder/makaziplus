import React, { createContext, useContext, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../utils/api';

const LanguageContext = createContext(null);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};

export const LanguageProvider = ({ children }) => {
  const { i18n, t } = useTranslation();
  const [language, setLanguageState] = useState(() => {
    const saved = localStorage.getItem('mp_language');
    return saved === 'en' ? 'en' : 'sw';
  });

  useEffect(() => {
    // Set initial language
    i18n.changeLanguage(language);
    document.documentElement.lang = language === 'en' ? 'en' : 'sw';
    
    // Save to backend if user is logged in
    const token = localStorage.getItem('mp_token');
    if (token) {
      api.patch('/settings', { language }).catch(() => {});
    }
  }, [language, i18n]);

  const changeLanguage = async (lang) => {
    if (lang === 'en' || lang === 'sw') {
      setLanguageState(lang);
      localStorage.setItem('mp_language', lang);
      await i18n.changeLanguage(lang);
      document.documentElement.lang = lang === 'en' ? 'en' : 'sw';
    }
  };

  const translate = (key) => {
    return t(key);
  };

  return (
    <LanguageContext.Provider value={{ language, changeLanguage, t: translate, i18n }}>
      {children}
    </LanguageContext.Provider>
  );
};