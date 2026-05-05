import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';
import { TopBar } from '../components/layout/TopBar';
import { PaymentModal, Spinner } from '../components/common/Spinner';
import { ROLE_LABELS, getAvatar } from '../utils/helpers';
import api from '../utils/api';

export default function Profile() {
  const navigate = useNavigate();
  const { user, logout, updateUser } = useAuth();
  const { toast } = useToast();
  const { language, changeLanguage, t } = useLanguage();

  // State for edit profile modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAvatar, setEditAvatar] = useState(null);
  const [editAvatarPreview, setEditAvatarPreview] = useState('');
  const [updatingProfile, setUpdatingProfile] = useState(false);

  // State for verification
  const [verificationModalOpen, setVerificationModalOpen] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [idType, setIdType] = useState('nida');
  const [idNumber, setIdNumber] = useState('');
  const [submittingVerification, setSubmittingVerification] = useState(false);

  // State for settings (notifications)
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [settings, setSettings] = useState({
    email_notifications: 1,
    sms_notifications: 1,
    push_notifications: 1,
    language: 'sw',
    theme: 'light'
  });
  const [updatingSettings, setUpdatingSettings] = useState(false);

  // State for password change
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const [payOpen, setPayOpen] = useState(false);

  // Load verification status
  useEffect(() => {
    if (!user) return;
    const loadVerification = async () => {
      try {
        const r = await api.get('/verification/status');
        setVerificationStatus(r.data.data);
      } catch (err) {
        console.error('Load verification error:', err);
      }
    };
    loadVerification();
  }, [user]);

  // Load user settings
  useEffect(() => {
    if (!user) return;
    const loadSettings = async () => {
      try {
        const r = await api.get('/settings');
        setSettings(r.data.data);
        // Sync language from backend
        if (r.data.data?.language && ['sw', 'en'].includes(r.data.data.language)) {
          changeLanguage(r.data.data.language);
        }
      } catch (err) {
        console.error('Load settings error:', err);
      }
    };
    loadSettings();
  }, [user, changeLanguage]);

  if (!user) {
    navigate('/auth');
    return null;
  }

  const avatar = getAvatar(user);

  // MENU ITEMS
  const MENU = [
    { icon: '📊', label: 'Dashibodi', sub: 'Analytics na matangazo yako', path: '/dashboard', show: true },
    { icon: '❤️', label: 'Zilizohifadhiwa', sub: 'Mali uliyopenda', path: '/favorites', show: true },
    { icon: '➕', label: 'Ongeza Mali', sub: 'Chapisha tangazo jipya', path: '/add', show: true },
    { icon: '⭐', label: 'Upgradi Akaunti', sub: 'Pro -- TSh 30,000/mwezi', path: '/subscription', show: true },
    { icon: '📅', label: 'Bookings Zangu', sub: 'Angalia na udhibiti bookings zako', path: '/bookings', show: true },
    { icon: '🔔', label: 'Arifa', sub: 'Tazama arifa zako zote', path: '/notifications', show: true },
    { icon: '🛡️', label: 'Admin Panel', sub: 'Simamia mfumo wote', path: '/admin', show: user.role === 'admin' },
    { icon: '❓', label: 'Msaada & FAQs', sub: 'Maswali, msaada wa kiufundi', path: '/help', show: true },
  ];

  // ─── EDIT PROFILE ────────────────────────────────────────────────
  const openEditModal = () => {
    setEditName(user.name || '');
    setEditPhone(user.phone || '');
    setEditAvatarPreview(avatar);
    setEditModalOpen(true);
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast('Picha ni kubwa sana (max 10MB)', 'error');
        return;
      }
      if (!file.type.startsWith('image/')) {
        toast('Tafadhali chagua picha tu', 'error');
        return;
      }
      setEditAvatar(file);
      setEditAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleUpdateProfile = async () => {
    if (!editName.trim()) {
      toast('Jina halaliwezi kuwa tupu', 'error');
      return;
    }
    setUpdatingProfile(true);
    try {
      const formData = new FormData();
      formData.append('name', editName.trim());
      if (editPhone) formData.append('phone', editPhone.trim());
      if (editAvatar) formData.append('avatar', editAvatar);
      const r = await api.patch('/auth/update-profile', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      updateUser(r.data.user);
      toast('Profaili imesasishwa! ✅', 'success');
      setEditModalOpen(false);
    } catch (e) {
      toast(e.response?.data?.message || 'Hitilafu wakati wa kusasisha', 'error');
    } finally {
      setUpdatingProfile(false);
    }
  };

  // ─── VERIFICATION ────────────────────────────────────────────────
  const openVerificationModal = () => {
    setIdType('nida');
    setIdNumber('');
    setVerificationModalOpen(true);
  };

  const handleSubmitVerification = async () => {
    if (!idNumber.trim()) {
      toast('Weka namba ya kitambulisho', 'error');
      return;
    }
    if (idType === 'nida' && !/^\d{20}$/.test(idNumber)) {
      toast('NIDA lazima iwe na tarakimu 20', 'error');
      return;
    }
    if (idType === 'passport') {
      if (!/^[A-Z]{2}\d{7}$/.test(idNumber) && !/^\d{8,9}$/.test(idNumber)) {
        toast('Nambari ya pasipoti si sahihi. Mfano: AB1234567 au 12345678', 'error');
        return;
      }
    }
    if (idType === 'driving_license' && !/^[A-Z0-9]{6,15}$/i.test(idNumber)) {
      toast('Nambari ya leseni si sahihi', 'error');
      return;
    }

    setSubmittingVerification(true);
    try {
      await api.post('/verification/submit', { id_type: idType, id_number: idNumber });
      toast('Ombi la uthibitisho limetumwa! Tutakujulisha hivi karibuni.', 'success');
      setVerificationModalOpen(false);
      const r = await api.get('/verification/status');
      setVerificationStatus(r.data.data);
    } catch (e) {
      toast(e.response?.data?.message || 'Hitilafu wakati wa kutuma ombi', 'error');
    } finally {
      setSubmittingVerification(false);
    }
  };

  // ─── SETTINGS (Notifications ON/OFF + LANGUAGE TOGGLE) ─────────────
  const openSettingsModal = async () => {
    try {
      const r = await api.get('/settings');
      setSettings(r.data.data);
      setSettingsModalOpen(true);
    } catch (e) {
      toast('Hitilafu kupakia mipangilio', 'error');
    }
  };

  const handleUpdateSettings = async () => {
    setUpdatingSettings(true);
    try {
      await api.patch('/settings', settings);
      // Sync language change
      if (settings.language && ['sw', 'en'].includes(settings.language)) {
        changeLanguage(settings.language);
      }
      toast('Mipangilio imehifadhiwa! ✅', 'success');
      setSettingsModalOpen(false);
    } catch (e) {
      toast(e.response?.data?.message || 'Hitilafu wakati wa kuhifadhi', 'error');
    } finally {
      setUpdatingSettings(false);
    }
  };

  // ─── CHANGE PASSWORD ─────────────────────────────────────────────
  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      toast('Jaza sehemu zote', 'error');
      return;
    }
    if (newPassword.length < 8) {
      toast('Nywila mpya lazima iwe na herufi 8 au zaidi', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast('Nywila mpya hazifanani', 'error');
      return;
    }

    setChangingPassword(true);
    try {
      await api.patch('/auth/change-password', {
        currentPassword,
        newPassword
      });
      toast('Nywila imebadilishwa! ✅', 'success');
      setPasswordModalOpen(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (e) {
      toast(e.response?.data?.message || 'Hitilafu wakati wa kubadilisha nywila', 'error');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/auth');
    toast('Umetoka kikamilifu 👋', 'success');
  };

  const getVerificationBadge = () => {
    if (user.verified || user.is_verified) {
      return { text: '✓ Amethibitishwa', color: 'bg-green-50 text-green-700', icon: '✅' };
    }
    if (verificationStatus?.status === 'pending') {
      return { text: 'Inasubiri Uthibitisho', color: 'bg-yellow-50 text-yellow-700', icon: '⏳' };
    }
    if (verificationStatus?.status === 'rejected') {
      return { text: 'Imekataliwa', color: 'bg-red-50 text-red-700', icon: '❌' };
    }
    return { text: 'Hijathibitishwa', color: 'bg-gray-50 text-gray-600', icon: '⚠️' };
  };

  const verificationBadge = getVerificationBadge();

  return (
    <div className="min-h-screen bg-surface pb-24 md:pb-8 animate-fade-in-up">
      <TopBar title="Akaunti Yangu" showBack />

      {/* Cover Image */}
      <div className="h-32 relative overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&q=60"
          alt="cover"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-ink/60 to-primary/60" />
      </div>

      {/* Avatar */}
      <div className="relative px-4 -mt-10 mb-3">
        <div className="w-20 h-20 rounded-full border-4 border-white shadow-lg overflow-hidden bg-primary flex items-center justify-center">
          <img
            src={editAvatarPreview || avatar}
            alt={user.name}
            className="w-full h-full object-cover"
            onError={e => { e.target.style.display = 'none'; }}
          />
        </div>
        <button
          onClick={openEditModal}
          className="absolute bottom-0 left-16 w-7 h-7 bg-white rounded-full shadow-md flex items-center justify-center border border-surface-4 hover:bg-primary-50 transition-colors"
        >
          ✏️
        </button>
      </div>

      {/* User Info */}
      <div className="px-4 pb-4">
        <div className="font-serif text-xl font-semibold text-ink">{user.name}</div>
        <div className="text-xs text-ink-4 mt-0.5">{user.email}</div>
        {user.phone && <div className="text-xs text-ink-4 mt-0.5">{user.phone}</div>}
        <div className="flex gap-2 mt-2.5 flex-wrap">
          <span className="bg-primary-pale text-primary text-2xs font-bold px-2.5 py-1 rounded-full">
            {ROLE_LABELS[user.role] || '👤 Mteja'}
          </span>
          <span className="bg-gold-pale text-amber-700 text-2xs font-bold px-2.5 py-1 rounded-full">
            {user.plan === 'pro' ? '⭐ Pro' : user.plan === 'admin' ? '🛡️ Admin' : 'Basic'}
          </span>
          <span className={`text-2xs font-bold px-2.5 py-1 rounded-full ${verificationBadge.color}`}>
            {verificationBadge.icon} {verificationBadge.text}
          </span>
        </div>
        {!user.verified && !user.is_verified && verificationStatus?.status !== 'pending' && (
          <button
            onClick={openVerificationModal}
            className="mt-3 w-full py-2 border-2 border-primary text-primary rounded-xl text-xs font-bold active:scale-[.98] transition-all flex items-center justify-center gap-2 hover:bg-primary-50"
          >
            🔒 Thibitisha Akaunti Yako (NIDA / Pasipoti)
          </button>
        )}
      </div>

      {/* Menu */}
      <div className="px-4 space-y-2">
        <div className="text-2xs font-bold text-ink-4 uppercase tracking-widest mb-2 pl-1">
          Akaunti
        </div>
        <div className="bg-white rounded-2xl overflow-hidden shadow-soft border border-surface-4">
          {MENU.filter(m => m.show).map((m, i, arr) => (
            <button
              key={i}
              onClick={() => navigate(m.path)}
              className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-surface active:bg-surface-3
                ${i < arr.length - 1 ? 'border-b border-black/4' : ''}`}
            >
              <div className="w-9 h-9 bg-primary-pale rounded-xl flex items-center justify-center text-base flex-shrink-0">
                {m.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-ink">{m.label}</div>
                <div className="text-2xs text-ink-4 mt-0.5">{m.sub}</div>
              </div>
              <span className="text-ink-5 text-xl leading-none">›</span>
            </button>
          ))}
        </div>

        <button
          onClick={openSettingsModal}
          className="w-full flex items-center gap-3 bg-white rounded-2xl px-4 py-3.5 border border-surface-4 hover:bg-surface transition-colors"
        >
          <div className="w-9 h-9 bg-primary-pale rounded-xl flex items-center justify-center text-base">⚙️</div>
          <div className="flex-1 text-left">
            <div className="text-sm font-semibold text-ink">Mipangilio</div>
            <div className="text-2xs text-ink-4 mt-0.5">Arifa, lugha, na zaidi</div>
          </div>
          <span className="text-ink-5 text-xl leading-none">›</span>
        </button>

        <button
          onClick={() => setPasswordModalOpen(true)}
          className="w-full flex items-center gap-3 bg-white rounded-2xl px-4 py-3.5 border border-surface-4 hover:bg-surface transition-colors"
        >
          <div className="w-9 h-9 bg-primary-pale rounded-xl flex items-center justify-center text-base">🔐</div>
          <div className="flex-1 text-left">
            <div className="text-sm font-semibold text-ink">Badilisha Nywila</div>
            <div className="text-2xs text-ink-4 mt-0.5">Sasisha nywila yako</div>
          </div>
          <span className="text-ink-5 text-xl leading-none">›</span>
        </button>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 bg-red-50 rounded-2xl px-4 py-3.5 mt-3 border border-red-100 active:scale-[.99] transition-all"
        >
          <div className="w-9 h-9 bg-red-100 rounded-xl flex items-center justify-center text-base">🚪</div>
          <div className="text-sm font-semibold text-red-600">Toka kwenye Akaunti</div>
        </button>
      </div>

      <div className="text-center pt-6 pb-2 text-2xs text-ink-5">
        MakaziPlus v4.0 • © 2025 Tanzania 🇹🇿
      </div>

      {/* ─── EDIT PROFILE MODAL ─── */}
      {editModalOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => e.target === e.currentTarget && !updatingProfile && setEditModalOpen(false)}
        >
          <div className="bg-white rounded-3xl w-full max-w-md animate-scale-in">
            <div className="border-b border-surface-4 px-5 py-4 flex items-center justify-between">
              <h3 className="font-serif text-xl font-semibold text-ink">Hariri Profaili</h3>
              <button onClick={() => setEditModalOpen(false)} className="w-8 h-8 bg-surface rounded-full flex items-center justify-center">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex flex-col items-center">
                <div className="w-24 h-24 rounded-full overflow-hidden bg-primary-50 mb-3">
                  <img src={editAvatarPreview || avatar} alt="Avatar" className="w-full h-full object-cover" />
                </div>
                <label className="text-xs text-primary font-semibold cursor-pointer hover:underline">
                  Badilisha Picha
                  <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                </label>
              </div>
              <div>
                <label className="block text-xs font-bold text-ink-4 mb-1.5">Jina Kamili</label>
                <input value={editName} onChange={(e) => setEditName(e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="block text-xs font-bold text-ink-4 mb-1.5">Nambari ya Simu</label>
                <input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="+255 XXX XXX XXX" className="input-field" />
              </div>
              <button onClick={handleUpdateProfile} disabled={updatingProfile} className="btn-primary">
                {updatingProfile ? <><Spinner size="sm" color="white" /> Inahifadhi...</> : 'Hifadhi Mabadiliko'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── VERIFICATION MODAL ─── */}
      {verificationModalOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => e.target === e.currentTarget && !submittingVerification && setVerificationModalOpen(false)}
        >
          <div className="bg-white rounded-3xl w-full max-w-md animate-scale-in">
            <div className="border-b border-surface-4 px-5 py-4 flex items-center justify-between">
              <h3 className="font-serif text-xl font-semibold text-ink">🔒 Thibitisha Akaunti</h3>
              <button onClick={() => setVerificationModalOpen(false)} className="w-8 h-8 bg-surface rounded-full flex items-center justify-center">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-blue-50 rounded-xl p-3 text-xs text-blue-700">
                <span className="font-bold">ℹ️</span> Tunahitaji kuthibitisha utambulisho wako kwa usalama wa platform yetu.
              </div>
              <div>
                <label className="block text-xs font-bold text-ink-4 mb-1.5">Aina ya Kitambulisho</label>
                <select value={idType} onChange={(e) => setIdType(e.target.value)} className="input-field">
                  <option value="nida">NIDA (Tarakimu 20)</option>
                  <option value="passport">Pasipoti</option>
                  <option value="driving_license">Leseni ya Dereva</option>
                  <option value="tin">TIN (Kodi)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-ink-4 mb-1.5">
                  Namba ya Kitambulisho
                  {idType === 'nida' && <span className="text-primary ml-1">(Tarakimu 20)</span>}
                </label>
                <input
                  value={idNumber}
                  onChange={(e) => setIdNumber(e.target.value)}
                  placeholder={idType === 'nida' ? 'Eg: 12345678901234567890' : 'Weka namba yako'}
                  className="input-field"
                  maxLength={idType === 'nida' ? 20 : 50}
                />
              </div>
              <button onClick={handleSubmitVerification} disabled={submittingVerification} className="btn-primary">
                {submittingVerification ? <><Spinner size="sm" color="white" /> Inatuma...</> : 'Tuma Ombi la Uthibitisho'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── SETTINGS MODAL WITH LANGUAGE TOGGLE ─── */}
      {settingsModalOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => e.target === e.currentTarget && !updatingSettings && setSettingsModalOpen(false)}
        >
          <div className="bg-white rounded-3xl w-full max-w-md animate-scale-in">
            <div className="border-b border-surface-4 px-5 py-4 flex items-center justify-between">
              <h3 className="font-serif text-xl font-semibold text-ink">⚙️ Mipangilio</h3>
              <button onClick={() => setSettingsModalOpen(false)} className="w-8 h-8 bg-surface rounded-full flex items-center justify-center">✕</button>
            </div>
            <div className="p-5 space-y-4">
              {/* Language Toggle Section */}
              <div className="border-b border-surface-4 pb-3">
                <label className="block text-xs font-bold text-ink-4 uppercase tracking-wider mb-2">Lugha / Language</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSettings({ ...settings, language: 'sw' })}
                    className={`py-3 rounded-xl text-sm font-semibold transition-all active:scale-95
                      ${settings.language === 'sw' ? 'bg-primary text-white shadow-green' : 'bg-surface text-ink-4 border border-surface-4'}`}
                  >
                    🇹🇿 Kiswahili
                  </button>
                  <button
                    type="button"
                    onClick={() => setSettings({ ...settings, language: 'en' })}
                    className={`py-3 rounded-xl text-sm font-semibold transition-all active:scale-95
                      ${settings.language === 'en' ? 'bg-primary text-white shadow-green' : 'bg-surface text-ink-4 border border-surface-4'}`}
                  >
                    🇬🇧 English
                  </button>
                </div>
              </div>

              {/* Notifications Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2">
                  <div>
                    <div className="text-sm font-semibold text-ink">Arifa za Barua Pepe</div>
                    <div className="text-2xs text-ink-4">Pokea arifa kwenye barua pepe yako</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.email_notifications === 1}
                      onChange={(e) => setSettings({ ...settings, email_notifications: e.target.checked ? 1 : 0 })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-primary peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between py-2">
                  <div>
                    <div className="text-sm font-semibold text-ink">Arifa za SMS</div>
                    <div className="text-2xs text-ink-4">Pokea arifa kwenye simu yako</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.sms_notifications === 1}
                      onChange={(e) => setSettings({ ...settings, sms_notifications: e.target.checked ? 1 : 0 })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-primary peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between py-2">
                  <div>
                    <div className="text-sm font-semibold text-ink">Arifa za Push</div>
                    <div className="text-2xs text-ink-4">Pokea arifa za papo kwa hapo</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.push_notifications === 1}
                      onChange={(e) => setSettings({ ...settings, push_notifications: e.target.checked ? 1 : 0 })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-primary peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                  </label>
                </div>
              </div>

              <div className="pt-3 border-t border-surface-4">
                <label className="block text-xs font-bold text-ink-4 uppercase tracking-wider mb-1.5">Mandhari</label>
                <select value={settings.theme} onChange={(e) => setSettings({ ...settings, theme: e.target.value })} className="input-field">
                  <option value="light">Mwangaza</option>
                  <option value="dark">Giza</option>
                </select>
              </div>

              <button onClick={handleUpdateSettings} disabled={updatingSettings} className="btn-primary">
                {updatingSettings ? <><Spinner size="sm" color="white" /> Inahifadhi...</> : 'Hifadhi Mipangilio'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── CHANGE PASSWORD MODAL ─── */}
      {passwordModalOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => e.target === e.currentTarget && !changingPassword && setPasswordModalOpen(false)}
        >
          <div className="bg-white rounded-3xl w-full max-w-md animate-scale-in">
            <div className="border-b border-surface-4 px-5 py-4 flex items-center justify-between">
              <h3 className="font-serif text-xl font-semibold text-ink">🔐 Badilisha Nywila</h3>
              <button onClick={() => setPasswordModalOpen(false)} className="w-8 h-8 bg-surface rounded-full flex items-center justify-center">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-ink-4 mb-1.5">Nywila ya Sasa</label>
                <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="••••••••" className="input-field" />
              </div>
              <div>
                <label className="block text-xs font-bold text-ink-4 mb-1.5">Nywila Mpya</label>
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Angalau herufi 8" className="input-field" />
              </div>
              <div>
                <label className="block text-xs font-bold text-ink-4 mb-1.5">Thibitisha Nywila Mpya</label>
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Rudia nywila mpya" className="input-field" />
              </div>
              {newPassword && confirmPassword && newPassword !== confirmPassword && (
                <p className="text-xs text-red-500">⚠️ Nywila hazifanani</p>
              )}
              <button onClick={handleChangePassword} disabled={changingPassword} className="btn-primary">
                {changingPassword ? <><Spinner size="sm" color="white" /> Inabadilisha...</> : 'Badilisha Nywila'}
              </button>
            </div>
          </div>
        </div>
      )}

      <PaymentModal
        isOpen={payOpen}
        onClose={() => setPayOpen(false)}
        plan="pro"
        amount="TSh 30,000"
        onSuccess={() => { setPayOpen(false); toast('Umefanikiwa kuupgrade! ⭐', 'success'); }}
      />
    </div>
  );
}