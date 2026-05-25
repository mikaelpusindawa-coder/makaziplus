import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Spinner } from '../components/common/Spinner';

const BG_GRADIENTS = [
  'linear-gradient(135deg, #1B4F72 0%, #2E86C1 50%, #0B5345 100%)',
  'linear-gradient(135deg, #4A235A 0%, #7D3C98 50%, #1B4F72 100%)',
  'linear-gradient(135deg, #1B2631 0%, #2980B9 50%, #17A589 100%)',
];

const ROLES = [
  { id: 'customer', icon: '👤', label: 'Mteja', desc: 'Natafuta nyumba' },
  { id: 'agent', icon: '🧑‍💼', label: 'Dalali', desc: 'Nasaidia kukodisha' },
  { id: 'owner', icon: '🏠', label: 'Mwenye', desc: 'Nina mali zangu' },
];

const GENDERS = [
  { v: 'male', l: 'Mwanaume ♂' },
  { v: 'female', l: 'Mwanamke ♀' },
  { v: 'other', l: 'Nyingine' },
];

// Key for storing return URL (must match LoginPromptModal.jsx)
const RETURN_URL_KEY = 'makaziplus_return_url';

// Get return URL without clearing it (just peek)
const peekReturnUrl = () => {
  return localStorage.getItem(RETURN_URL_KEY);
};

// Get and clear return URL
const getReturnUrl = () => {
  const url = localStorage.getItem(RETURN_URL_KEY);
  console.log('🔑 Auth.jsx: Retrieved return URL:', url);
  localStorage.removeItem(RETURN_URL_KEY);
  return url;
};

export default function Auth() {
  const navigate = useNavigate();
  const { login, register } = useAuth();
  const { toast } = useToast();

  const [mode, setMode] = useState('login');
  const [role, setRole] = useState('customer');
  const [gender, setGender] = useState('');
  const [loading, setLoading] = useState(false);
  const [bgIdx] = useState(() => Math.floor(Math.random() * BG_GRADIENTS.length));
  const [showPass, setShowPass] = useState(false);

  const [form, setForm] = useState({
    email: '',
    password: '',
    name: '',
    phone: '',
    confirmPassword: ''
  });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      toast('Jaza sehemu zote', 'error');
      return;
    }
    setLoading(true);
    try {
      await login(form.email, form.password);
      
      // Check for saved return URL after successful login
      const returnUrl = getReturnUrl();
      console.log('🔑 Auth.jsx: After login, returnUrl =', returnUrl);
      
      if (returnUrl && returnUrl !== '/auth' && returnUrl !== '/login') {
        // Redirect back to the original page
        console.log('🔑 Auth.jsx: Redirecting to:', returnUrl);
        navigate(returnUrl);
      } else {
        // Fallback to home page
        console.log('🔑 Auth.jsx: No valid return URL, going home');
        navigate('/');
      }
    } catch (err) {
      toast(err.response?.data?.message || err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.phone || !form.password) {
      toast('Jaza sehemu zote', 'error');
      return;
    }
    if (form.password.length < 8) {
      toast('Nywila lazima iwe herufi 8+', 'error');
      return;
    }
    if (form.password !== form.confirmPassword) {
      toast('Nywila hazifanani', 'error');
      return;
    }
    setLoading(true);
    try {
      await register({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        password: form.password,
        role,
        gender: gender || undefined
      });
      
      // Check for saved return URL after successful registration
      const returnUrl = getReturnUrl();
      console.log('🔑 Auth.jsx: After register, returnUrl =', returnUrl);
      
      if (returnUrl && returnUrl !== '/auth' && returnUrl !== '/login') {
        console.log('🔑 Auth.jsx: Redirecting to:', returnUrl);
        navigate(returnUrl);
      } else {
        navigate('/');
      }
    } catch (err) {
      toast(err.response?.data?.message || err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left panel — decorative gradient (desktop only) */}
      <div className="hidden md:flex md:w-5/12 lg:w-3/5 relative overflow-hidden flex-shrink-0">
        <div className="w-full h-full" style={{ background: BG_GRADIENTS[bgIdx] }} />
        <div className="absolute inset-0 bg-gradient-to-br from-black/20 via-transparent to-black/30" />
        <div className="absolute inset-0 flex flex-col justify-end p-14">
          <div className="font-serif text-[3.5rem] font-semibold text-white leading-none">
            Makazi<span className="text-gold-200">Plus</span>
          </div>
          <p className="text-white/65 text-lg mt-3 max-w-md leading-relaxed font-light">
            Tanzania's Premier Property Platform.<br />Tafuta, Weka, na Unganike.
          </p>
          <div className="flex gap-8 mt-8">
            {[
              ['10K+', 'Mali'],
              ['50K+', 'Watumiaji'],
              ['20+', 'Miji']
            ].map(([v, l]) => (
              <div key={l}>
                <div className="font-serif text-2xl font-semibold text-white">{v}</div>
                <div className="text-white/50 text-sm">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form with improved visibility */}
      <div className="flex-1 flex flex-col relative overflow-y-auto">
        {/* Mobile background - hidden behind content */}
        <div className="fixed inset-0 z-0 md:hidden">
          <div className="w-full h-full" style={{ background: BG_GRADIENTS[bgIdx] }} />
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/10 to-black/60" />
        </div>

        {/* Scrollable content area with solid card background */}
        <div className="relative z-10 flex-1 flex flex-col justify-center py-6 px-4 md:py-12 md:px-10 lg:px-16">
          
          {/* Mobile logo */}
          <div className="md:hidden text-center mb-5">
            <div className="font-serif text-3xl font-semibold text-white drop-shadow-lg">
              Makazi<span className="text-gold-200">Plus</span>
            </div>
            <p className="text-white/70 text-xs mt-1">Tanzania's Property Platform</p>
          </div>

          {/* Form Card - Solid white background for better readability */}
          <div className="bg-white rounded-3xl p-6 md:p-8 shadow-xl w-full max-w-md mx-auto">
            {mode === 'login' ? (
              /* ── LOGIN ── */
              <>
                <div className="mb-6 text-center md:text-left">
                  <h1 className="font-serif text-2xl md:text-3xl font-semibold text-gray-900">Karibu Tena 👋</h1>
                  <p className="text-sm text-gray-500 mt-1">Ingia kwenye akaunti yako</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                      Barua Pepe au Simu
                    </label>
                    <input
                      value={form.email}
                      onChange={e => set('email', e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-800 bg-white focus:border-primary focus:outline-none transition-all"
                      placeholder="barua@email.com au +255..."
                      autoComplete="email"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Nywila</label>
                    <div className="relative">
                      <input
                        value={form.password}
                        onChange={e => set('password', e.target.value)}
                        type={showPass ? 'text' : 'password'}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-800 bg-white focus:border-primary focus:outline-none transition-all pr-12"
                        placeholder="••••••••"
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass(p => !p)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-primary text-sm"
                      >
                        {showPass ? '🙈' : '👁'}
                      </button>
                    </div>
                  </div>

                  <div className="text-right">
                    <button
                      type="button"
                      onClick={() => navigate('/forgot-password')}
                      className="text-xs text-primary font-semibold hover:underline"
                    >
                      Umesahau nywila?
                    </button>
                  </div>

                  <button type="submit" disabled={loading} className="btn-primary w-full">
                    {loading ? (
                      <>
                        <Spinner size="sm" color="white" /> Inaingia...
                      </>
                    ) : (
                      'Ingia →'
                    )}
                  </button>
                </form>

                <p className="text-center text-sm text-gray-500 mt-6">
                  Huna akaunti?{' '}
                  <button onClick={() => setMode('register')} className="text-primary font-bold hover:underline">
                    Jisajili hapa
                  </button>
                </p>
              </>
            ) : (
              /* ── REGISTER ── */
              <>
                <div className="mb-5 text-center md:text-left">
                  <h1 className="font-serif text-2xl md:text-3xl font-semibold text-gray-900">Anza Safari 🚀</h1>
                  <p className="text-sm text-gray-500 mt-1">Unda akaunti yako mpya bure</p>
                </div>

                {/* Role picker */}
                <div className="grid grid-cols-3 gap-2 mb-5">
                  {ROLES.map(r => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setRole(r.id)}
                      className={`flex flex-col items-center gap-1 py-3 rounded-2xl border-2 text-center transition-all active:scale-95
                        ${role === r.id
                          ? 'border-primary bg-primary-50 text-primary'
                          : 'border-gray-200 hover:border-primary/30 bg-white text-gray-600'
                        }`}
                    >
                      <span className="text-xl">{r.icon}</span>
                      <span className={`text-[11px] font-bold ${role === r.id ? 'text-primary' : 'text-gray-600'}`}>
                        {r.label}
                      </span>
                      <span className={`text-[9px] ${role === r.id ? 'text-primary/70' : 'text-gray-400'}`}>
                        {r.desc}
                      </span>
                    </button>
                  ))}
                </div>

                <form onSubmit={handleRegister} className="space-y-3.5">
                  {/* Name */}
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                      Jina Kamili *
                    </label>
                    <input
                      value={form.name}
                      onChange={e => set('name', e.target.value)}
                      type="text"
                      placeholder="Jina lako kamili"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-800 bg-white focus:border-primary focus:outline-none transition-all"
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                      Nambari ya Simu *
                    </label>
                    <input
                      value={form.phone}
                      onChange={e => set('phone', e.target.value)}
                      type="tel"
                      placeholder="+255 7XX XXX XXX"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-800 bg-white focus:border-primary focus:outline-none transition-all"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                      Barua Pepe *
                    </label>
                    <input
                      value={form.email}
                      onChange={e => set('email', e.target.value)}
                      type="email"
                      placeholder="barua@email.com"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-800 bg-white focus:border-primary focus:outline-none transition-all"
                    />
                  </div>

                  {/* Gender (optional) */}
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                      Jinsia (hiari)
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {GENDERS.map(g => (
                        <button
                          key={g.v}
                          type="button"
                          onClick={() => setGender(g.v === gender ? '' : g.v)}
                          className={`py-2 rounded-xl border-2 text-xs font-semibold transition-all active:scale-95
                            ${gender === g.v
                              ? 'border-primary bg-primary-50 text-primary'
                              : 'border-gray-200 text-gray-600 bg-white hover:border-primary/30'
                            }`}
                        >
                          {g.l}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                      Nywila *
                    </label>
                    <div className="relative">
                      <input
                        value={form.password}
                        onChange={e => set('password', e.target.value)}
                        type={showPass ? 'text' : 'password'}
                        placeholder="Angalau herufi 8"
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-800 bg-white focus:border-primary focus:outline-none transition-all pr-12"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass(p => !p)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm"
                      >
                        {showPass ? '🙈' : '👁'}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                      Thibitisha Nywila *
                    </label>
                    <input
                      value={form.confirmPassword}
                      onChange={e => set('confirmPassword', e.target.value)}
                      type="password"
                      placeholder="Rudia nywila"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-800 bg-white focus:border-primary focus:outline-none transition-all"
                    />
                  </div>

                  <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
                    {loading ? (
                      <>
                        <Spinner size="sm" color="white" /> Inajisajili...
                      </>
                    ) : (
                      'Jisajili →'
                    )}
                  </button>
                </form>

                <p className="text-center text-sm text-gray-500 mt-6">
                  Una akaunti?{' '}
                  <button onClick={() => setMode('login')} className="text-primary font-bold hover:underline">
                    Ingia hapa
                  </button>
                </p>
              </>
            )}
          </div>

          {/* Footer spacing for mobile */}
          <div className="h-6 md:h-0" />
        </div>
      </div>
    </div>
  );
}
