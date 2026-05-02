import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Spinner } from '../components/common/Spinner';

const BG_IMAGES = [
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&q=75',
  'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&q=75',
  'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1200&q=75',
];

const ROLES = [
  {id:'customer', icon:'👤', label:'Mteja',  desc:'Natafuta nyumba'},
  {id:'agent',    icon:'🧑‍💼', label:'Dalali', desc:'Nasaidia kukodisha'},
  {id:'owner',    icon:'🏠', label:'Mwenye', desc:'Nina mali zangu'},
];

const GENDERS = [{v:'male',l:'Mwanaume ♂'},{v:'female',l:'Mwanamke ♀'},{v:'other',l:'Nyingine'}];

export default function Auth() {
  const navigate = useNavigate();
  const { login, register } = useAuth();
  const { toast } = useToast();

  const [mode,    setMode]    = useState('login');
  const [role,    setRole]    = useState('customer');
  const [gender,  setGender]  = useState('');
  const [loading, setLoading] = useState(false);
  const [bgIdx]               = useState(() => Math.floor(Math.random() * BG_IMAGES.length));
  const [showPass, setShowPass] = useState(false);

  const [form, setForm] = useState({
    email:'', password:'', name:'', phone:'', confirmPassword:''
  });
  const set = (k,v) => setForm(p=>({...p,[k]:v}));

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!form.email||!form.password) { toast('Jaza sehemu zote','error'); return; }
    setLoading(true);
    try { await login(form.email, form.password); navigate('/'); }
    catch(err) { toast(err.response?.data?.message||err.message,'error'); }
    finally { setLoading(false); }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!form.name||!form.email||!form.phone||!form.password) { toast('Jaza sehemu zote','error'); return; }
    if (form.password.length<8) { toast('Nywila lazima iwe herufi 8+','error'); return; }
    if (form.password!==form.confirmPassword) { toast('Nywila hazifanani','error'); return; }
    setLoading(true);
    try {
      await register({name:form.name.trim(), email:form.email.trim(), phone:form.phone.trim(), password:form.password, role, gender:gender||undefined});
      navigate('/');
    }
    catch(err) { toast(err.response?.data?.message||err.message,'error'); }
    finally { setLoading(false); }
  };

  /* Quick fill demo credentials */
  const fillDemo = (email, pw) => { set('email',email); set('password',pw); };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">

      {/* Left panel — decorative image (desktop) */}
      <div className="hidden md:flex md:w-5/12 lg:w-3/5 relative overflow-hidden flex-shrink-0">
        <img src={BG_IMAGES[bgIdx]} alt="" className="w-full h-full object-cover"/>
        <div className="absolute inset-0 bg-gradient-to-br from-ink/82 via-primary/55 to-transparent"/>
        <div className="absolute inset-0 flex flex-col justify-end p-14">
          <div className="font-serif text-[3.5rem] font-semibold text-white leading-none">
            Makazi<span className="text-gold-200">Plus</span>
          </div>
          <p className="text-white/65 text-lg mt-3 max-w-md leading-relaxed font-light">
            Tanzania's Premier Property Platform.<br/>Tafuta, Weka, na Unganike.
          </p>
          <div className="flex gap-8 mt-8">
            {[['10K+','Mali'],['50K+','Watumiaji'],['20+','Miji']].map(([v,l])=>(
              <div key={l}>
                <div className="font-serif text-2xl font-semibold text-white">{v}</div>
                <div className="text-white/50 text-sm">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col min-h-screen md:min-h-0 relative overflow-hidden overflow-y-auto">
        {/* Mobile background */}
        <div className="md:hidden absolute inset-0">
          <img src={BG_IMAGES[bgIdx]} alt="" className="w-full h-full object-cover"/>
          <div className="absolute inset-0 bg-gradient-to-b from-ink/72 via-ink/52 to-ink/90"/>
        </div>

        <div className="relative flex-1 flex flex-col justify-center p-5 md:p-10 lg:p-16 py-10 md:py-12">

          {/* Mobile logo */}
          <div className="md:hidden text-center mb-8">
            <div className="font-serif text-4xl font-semibold text-white">
              Makazi<span className="text-gold-200">Plus</span>
            </div>
            <p className="text-white/50 text-sm mt-1">Tanzania's Property Platform</p>
          </div>

          <div className="bg-white/97 md:bg-white backdrop-blur-xl rounded-3xl p-7 md:p-9
            shadow-hero md:shadow-card w-full max-w-md mx-auto">

            {mode === 'login' ? (
              /* ── LOGIN ── */
              <>
                <div className="mb-6">
                  <h1 className="font-serif text-2xl md:text-3xl font-semibold text-ink">Karibu Tena 👋</h1>
                  <p className="text-sm text-ink-5 mt-1">Ingia kwenye akaunti yako</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-ink-4 uppercase tracking-wider mb-2">Barua Pepe au Simu</label>
                    <input value={form.email} onChange={e=>set('email',e.target.value)}
                      className="input-field" placeholder="barua@email.com au +255..." autoComplete="email"/>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-ink-4 uppercase tracking-wider mb-2">Nywila</label>
                    <div className="relative">
                      <input value={form.password} onChange={e=>set('password',e.target.value)}
                        type={showPass?'text':'password'} className="input-field pr-12"
                        placeholder="••••••••" autoComplete="current-password"/>
                      <button type="button" onClick={()=>setShowPass(p=>!p)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-5 hover:text-ink text-sm">
                        {showPass?'🙈':'👁'}
                      </button>
                    </div>
                  </div>
                  <div className="text-right">
                    <button type="button" onClick={()=>navigate('/forgot-password')}
                      className="text-xs text-primary font-semibold hover:underline">
                      Umesahau nywila?
                    </button>
                  </div>
                  <button type="submit" disabled={loading} className="btn-primary mt-2">
                    {loading ? <><Spinner size="sm" color="white"/>Inaingia...</> : 'Ingia →'}
                  </button>
                </form>

                <p className="text-center text-sm text-ink-5 mt-5">
                  Huna akaunti?{' '}
                  <button onClick={()=>setMode('register')} className="text-primary font-bold hover:underline">
                    Jisajili hapa
                  </button>
                </p>

                {/* Demo credentials */}
                <div className="mt-5 p-4 bg-primary-50 rounded-2xl border border-primary/10">
                  <p className="text-xs font-bold text-primary mb-2.5">🔑 Demo Accounts — Bonyeza kujaza:</p>
                  <div className="space-y-1.5">
                    {[
                      ['demo@makaziplus.co.tz','demo123','👤 Mteja'],
                      ['agent@makaziplus.co.tz','agent123','🧑‍💼 Dalali'],
                      ['admin@makaziplus.co.tz','admin123','🛡️ Admin'],
                    ].map(([email,pw,role])=>(
                      <button key={email} type="button"
                        onClick={()=>fillDemo(email,pw)}
                        className="w-full flex items-center justify-between px-3 py-2 bg-white rounded-xl text-xs
                          border border-primary/10 hover:border-primary/30 hover:bg-primary-50 transition-all">
                        <span className="font-mono text-ink-3">{email}</span>
                        <span className="text-primary font-semibold">{role}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              /* ── REGISTER ── */
              <>
                <div className="mb-5">
                  <h1 className="font-serif text-2xl md:text-3xl font-semibold text-ink">Anza Safari 🚀</h1>
                  <p className="text-sm text-ink-5 mt-1">Unda akaunti yako mpya bure</p>
                </div>

                {/* Role picker */}
                <div className="grid grid-cols-3 gap-2 mb-5">
                  {ROLES.map(r=>(
                    <button key={r.id} type="button" onClick={()=>setRole(r.id)}
                      className={`flex flex-col items-center gap-1 py-3 rounded-2xl border-2 text-center transition-all active:scale-95
                        ${role===r.id?'border-primary bg-primary-50 scale-[1.03]':'border-surface-4 hover:border-primary/30'}`}>
                      <span className="text-xl">{r.icon}</span>
                      <span className={`text-[11px] font-bold ${role===r.id?'text-primary':'text-ink-4'}`}>{r.label}</span>
                      <span className="text-[9px] text-ink-6">{r.desc}</span>
                    </button>
                  ))}
                </div>

                <form onSubmit={handleRegister} className="space-y-3.5">
                  {[
                    {k:'name',  label:'Jina Kamili',  type:'text',     ph:'Jina lako kamili'},
                    {k:'phone', label:'Nambari ya Simu',type:'tel',     ph:'+255 7XX XXX XXX'},
                    {k:'email', label:'Barua Pepe',    type:'email',    ph:'barua@email.com'},
                  ].map(({k,label,type,ph})=>(
                    <div key={k}>
                      <label className="block text-xs font-bold text-ink-4 uppercase tracking-wider mb-1.5">{label}</label>
                      <input value={form[k]} onChange={e=>set(k,e.target.value)}
                        type={type} placeholder={ph} className="input-field"/>
                    </div>
                  ))}

                  {/* Gender (optional) */}
                  <div>
                    <label className="block text-xs font-bold text-ink-4 uppercase tracking-wider mb-1.5">Jinsia (hiari)</label>
                    <div className="grid grid-cols-3 gap-2">
                      {GENDERS.map(g=>(
                        <button key={g.v} type="button" onClick={()=>setGender(g.v===gender?'':g.v)}
                          className={`py-2 rounded-xl border-2 text-xs font-semibold transition-all active:scale-95
                            ${gender===g.v?'border-primary bg-primary-50 text-primary':'border-surface-4 text-ink-4'}`}>
                          {g.l}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-ink-4 uppercase tracking-wider mb-1.5">Nywila</label>
                    <div className="relative">
                      <input value={form.password} onChange={e=>set('password',e.target.value)}
                        type={showPass?'text':'password'} placeholder="Angalau herufi 8" className="input-field pr-12"/>
                      <button type="button" onClick={()=>setShowPass(p=>!p)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-5 text-sm">
                        {showPass?'🙈':'👁'}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-ink-4 uppercase tracking-wider mb-1.5">Thibitisha Nywila</label>
                    <input value={form.confirmPassword} onChange={e=>set('confirmPassword',e.target.value)}
                      type="password" placeholder="Rudia nywila" className="input-field"/>
                  </div>

                  <button type="submit" disabled={loading} className="btn-primary mt-1">
                    {loading ? <><Spinner size="sm" color="white"/>Inajisajili...</> : 'Jisajili →'}
                  </button>
                </form>

                <p className="text-center text-sm text-ink-5 mt-4">
                  Una akaunti?{' '}
                  <button onClick={()=>setMode('login')} className="text-primary font-bold hover:underline">
                    Ingia hapa
                  </button>
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
