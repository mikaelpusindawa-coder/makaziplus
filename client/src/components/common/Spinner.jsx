import React, { useState } from 'react';
import api from '../../utils/api';
import { useToast } from '../../context/ToastContext';

export const Spinner = ({ size='md', color='primary' }) => {
  const sz = {sm:'w-4 h-4',md:'w-6 h-6',lg:'w-10 h-10',xl:'w-14 h-14'}[size]||'w-6 h-6';
  const cl = color==='white' ? 'border-white/25 border-t-white' : 'border-primary/20 border-t-primary';
  return <div className={`${sz} ${cl} border-[3px] rounded-full animate-spin`}/>;
};

export const SkeletonCard = () => (
  <div className="bg-white rounded-2xl overflow-hidden flex-shrink-0 w-48 md:w-60">
    <div className="skeleton h-32 md:h-44"/>
    <div className="p-3 space-y-2">
      <div className="skeleton h-3 rounded-full w-3/5"/>
      <div className="skeleton h-2.5 rounded-full w-full"/>
      <div className="skeleton h-2.5 rounded-full w-4/5"/>
    </div>
  </div>
);

export const SkeletonListCard = () => (
  <div className="flex bg-white rounded-2xl overflow-hidden mb-2.5 mx-4 md:mx-0">
    <div className="skeleton w-28 h-24 flex-shrink-0"/>
    <div className="flex-1 p-3 space-y-2">
      <div className="skeleton h-3 rounded-full w-2/5"/>
      <div className="skeleton h-2.5 rounded-full w-full"/>
      <div className="skeleton h-2.5 rounded-full w-3/4"/>
      <div className="skeleton h-2.5 rounded-full w-1/2"/>
    </div>
  </div>
);

export const EmptyState = ({ icon, title, subtitle, action }) => (
  <div className="flex flex-col items-center justify-center py-20 px-8 text-center animate-fade-in">
    <div className="w-20 h-20 bg-surface-3 rounded-full flex items-center justify-center mb-4 animate-float">
      <span className="text-3xl">{icon}</span>
    </div>
    <h3 className="text-base font-bold text-ink mb-2">{title}</h3>
    {subtitle && <p className="text-sm text-ink-5 leading-relaxed max-w-xs">{subtitle}</p>}
    {action && (
      <button onClick={action.onClick}
        className="mt-5 px-6 py-2.5 bg-primary text-white rounded-full text-sm font-bold
          shadow-green active:scale-95 transition-all hover:shadow-green-lg hover:-translate-y-0.5">
        {action.label}
      </button>
    )}
  </div>
);

export const PaymentModal = ({ isOpen, onClose, plan, amount, propertyId, onSuccess }) => {
  const { toast } = useToast();
  const [method,    setMethod]    = useState('mpesa');
  const [phone,     setPhone]     = useState('');
  const [loading,   setLoading]   = useState(false);
  const [step,      setStep]      = useState(1); // 1=form 2=processing 3=success 4=failed
  const pollRef = React.useRef(null);

  if (!isOpen) return null;

  const METHODS = [
    { id:'mpesa',    name:'M-Pesa',    icon:'📱', color:'text-[#00A651]' },
    { id:'airtel',   name:'Airtel',    icon:'📲', color:'text-red-500' },
    { id:'tigopesa', name:'Tigo Pesa', icon:'💳', color:'text-blue-500' },
    { id:'card',     name:'Kadi',      icon:'💲', color:'text-ink-4' },
  ];

  const pollStatus = (pid) => {
    let attempts = 0;
    pollRef.current = setInterval(async () => {
      attempts++;
      try {
        const r = await api.get(`/payments/${pid}/status`);
        if (r.data.data?.status === 'completed') {
          clearInterval(pollRef.current);
          setStep(3);
          setTimeout(() => { resetModal(); onSuccess?.(); }, 2500);
        } else if (r.data.data?.status === 'failed' || attempts > 30) {
          clearInterval(pollRef.current);
          setStep(4);
          setLoading(false);
        }
      } catch {}
    }, 3000);
  };

  const resetModal = () => {
    clearInterval(pollRef.current);
    setStep(1); setPhone(''); setLoading(false);
    onClose();
  };

  const handlePay = async () => {
    if (method !== 'card') {
      const cleaned = phone.replace(/\s/g,'');
      if (!cleaned) { toast('Weka nambari ya simu','error'); return; }
      if (!/^\+?\d{9,15}$/.test(cleaned)) { toast('Nambari si sahihi','error'); return; }
    }
    setLoading(true); setStep(2);
    try {
      const amountNum = parseFloat(String(amount).replace(/[^0-9.]/g,''));
      const body = { amount:amountNum, plan, method, property_id:propertyId||null };
      if (method !== 'card') body.phone = phone.replace(/\s/g,'');
      const r = await api.post('/payments', body);
      const pid = r.data.payment_id;

      if (r.data.client_secret) {
        // Stripe — open hosted Stripe checkout or inform user
        toast('Malipo ya kadi: angalia barua pepe yako kwa link ya malipo.','info');
        setStep(2);
        pollStatus(pid);
      } else {
        pollStatus(pid);
      }
    } catch(e) {
      toast(e.response?.data?.message||'Malipo hayakufanikiwa','error');
      setLoading(false); setStep(1);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center"
      style={{background:'rgba(0,0,0,0.55)',backdropFilter:'blur(4px)'}}
      onClick={e => e.target===e.currentTarget && !loading && resetModal()}>
      <div className="bg-white rounded-t-[2rem] md:rounded-3xl w-full max-w-md p-6 animate-slide-up md:animate-scale-in">
        {step===3 ? (
          <div className="text-center py-10 animate-scale-in">
            <div className="w-20 h-20 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-5">
              <span className="text-5xl">✅</span>
            </div>
            <h2 className="font-serif text-2xl font-semibold text-ink mb-2">Yamefanikiwa!</h2>
            <p className="text-sm text-ink-5">Akaunti yako inasasishwa hivi karibuni...</p>
          </div>
        ) : step===4 ? (
          <div className="text-center py-10">
            <span className="text-5xl">❌</span>
            <h2 className="font-serif text-xl font-semibold text-ink mt-4 mb-2">Malipo Hayakufanikiwa</h2>
            <p className="text-sm text-ink-5 mb-4">Jaribu tena au wasiliana na msaada.</p>
            <button onClick={()=>setStep(1)} className="btn-primary">Jaribu Tena</button>
          </div>
        ) : step===2 ? (
          <div className="text-center py-14">
            <div className="flex justify-center gap-2 mb-5">
              {[0,1,2].map(i=>(
                <div key={i} className="w-3 h-3 bg-primary rounded-full animate-bounce-dot"
                  style={{animationDelay:`${i*0.15}s`}}/>
              ))}
            </div>
            <p className="font-semibold text-ink text-sm">Inachakata malipo...</p>
            <p className="text-xs text-ink-5 mt-1.5">
              {method==='card' ? 'Angalia barua pepe kwa link ya kadi' : 'Subiri ujumbe kwenye simu yako (USSD)'}
            </p>
          </div>
        ) : (
          <>
            <div className="w-10 h-1 bg-surface-4 rounded mx-auto mb-5 md:hidden"/>
            <h2 className="font-serif text-2xl font-semibold text-ink mb-1">Lipa</h2>
            <p className="text-xs text-ink-5 mb-4">Chagua njia ya malipo unayoipenda</p>
            <div className="bg-gradient-to-br from-primary to-primary-light rounded-2xl p-4 mb-5">
              <p className="text-white/60 text-xs mb-1">Jumla ya Kulipa</p>
              <p className="font-serif text-3xl font-semibold text-white">{amount}</p>
              <p className="text-white/50 text-xs mt-1 capitalize">{plan} plan</p>
            </div>
            <p className="text-xs font-bold text-ink-5 uppercase tracking-wider mb-3">Njia ya Malipo</p>
            <div className="grid grid-cols-4 gap-2 mb-5">
              {METHODS.map(m=>(
                <button key={m.id} onClick={()=>setMethod(m.id)}
                  className={`flex flex-col items-center gap-1.5 py-3 rounded-2xl border-2 transition-all
                    ${method===m.id ? 'border-primary bg-primary-50 scale-[1.03]' : 'border-surface-4 hover:border-primary/40'}`}>
                  <span className="text-2xl">{m.icon}</span>
                  <span className={`text-[10px] font-bold ${method===m.id?'text-primary':m.color}`}>{m.name}</span>
                </button>
              ))}
            </div>

            {method !== 'card' ? (
              <>
                <label className="block text-xs font-bold text-ink-5 uppercase tracking-wider mb-2">Nambari ya Simu</label>
                <div className="relative mb-5">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-4 text-sm font-semibold">+255</span>
                  <input value={phone} onChange={e=>setPhone(e.target.value)} type="tel"
                    placeholder="7XX XXX XXX" className="input-field pl-16 text-base"
                    onKeyDown={e=>e.key==='Enter'&&handlePay()}/>
                </div>
                <p className="text-[10px] text-ink-5 mb-4 leading-relaxed">
                  💡 Utapata ombi la USSD kwenye simu yako. Thibitisha malipo kwa kubonyeza OK.
                </p>
              </>
            ) : (
              <div className="bg-blue-50 rounded-2xl p-4 mb-5 border border-blue-100">
                <p className="text-xs text-blue-700 font-semibold mb-1">💳 Malipo ya Kadi (Stripe)</p>
                <p className="text-xs text-blue-600">Link ya malipo ya kadi itatumwa kwenye barua pepe yako baada ya kubonyeza "Lipia".</p>
              </div>
            )}

            <button onClick={handlePay} disabled={loading}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? 'Inachakata...' : `Lipia — ${amount}`}
            </button>
            <button onClick={resetModal} className="w-full py-3 text-ink-5 text-sm font-medium mt-2 hover:text-ink transition-colors">
              Ghairi
            </button>
          </>
        )}
      </div>
    </div>
  );
};
