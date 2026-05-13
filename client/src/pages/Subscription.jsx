import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { TopBar } from '../components/layout/TopBar';
import { PaymentModal } from '../components/common/Spinner';
import api from '../utils/api';

const Check = () => (
  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 stroke-primary flex-shrink-0 mt-0.5" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const PlanCard = ({featured, borderColor='border-primary', tag, tagBg='bg-primary text-white', name, price, period, features, btnLabel, btnStyle, onPress}) => (
  <div className={`bg-white rounded-3xl p-5 mx-3 mb-3 shadow-soft border-2
    ${featured ? borderColor : 'border-surface-4'}`}>
    {tag && <div className={`inline-block text-[10px] font-bold px-3 py-1 rounded-full mb-3 ${tagBg}`}>{tag}</div>}
    <div className="font-serif text-xl font-semibold text-ink">{name}</div>
    <div className={`font-serif text-3xl font-semibold mt-2 mb-1 ${featured?'text-primary':'text-ink'}`}>
      {price}
      {period && <span className="font-sans text-xs font-normal text-ink-5 ml-1">{period}</span>}
    </div>
    <ul className="space-y-2.5 my-4">
      {features.map((f,i)=>(
        <li key={i} className="flex items-start gap-2 text-sm text-ink-4"><Check/>{f}</li>
      ))}
    </ul>
    <button onClick={onPress} className={`w-full py-3 rounded-2xl font-bold text-sm transition-all active:scale-[.98] ${btnStyle}`}>
      {btnLabel}
    </button>
  </div>
);

export default function Subscription() {
  const navigate = useNavigate();
  const { user, refreshUser }  = useAuth();
  const { toast } = useToast();
  const [payOpen,   setPayOpen]   = useState(false);
  const [payConf,   setPayConf]   = useState({plan:'pro', amount:'TSh 30,000'});
  const [subInfo,   setSubInfo]   = useState(null);
  const [cancelling,setCancelling]= useState(false);

  useEffect(() => {
    if (!user) return;
    api.get('/subscription/my').then(r => setSubInfo(r.data.data)).catch(()=>{});
  }, [user]);

  const openPay = (plan, amount) => {
    if (!user) { navigate('/auth'); return; }
    setPayConf({plan, amount});
    setPayOpen(true);
  };

  const handleCancel = async () => {
    if (!window.confirm('Una uhakika unataka kufuta usajili wako? Utarudi kwenye Basic mara moja.')) return;
    setCancelling(true);
    try {
      await api.post('/subscription/cancel');
      toast('Usajili umefutwa kikamilifu.', 'success');
      setSubInfo(prev => ({ ...prev, subscription: null, plan: 'basic' }));
      if (refreshUser) refreshUser();
    } catch (e) {
      toast(e.response?.data?.message || 'Hitilafu ya kufuta usajili', 'error');
    } finally { setCancelling(false); }
  };

  return (
    <div className="min-h-screen bg-surface pb-24 md:pb-10 animate-fade-in-up">
      <TopBar title="Upgradi Akaunti" showBack/>

      <div className="bg-ink px-5 py-6 relative overflow-hidden mb-2">
        <div className="absolute -right-8 -top-8 w-24 h-24 bg-white/4 rounded-full"/>
        <h1 className="font-serif text-2xl font-semibold text-white">⭐ Upgradi Akaunti</h1>
        <p className="text-white/45 text-sm mt-1.5">Fikia wateja zaidi na pata matokeo bora</p>
        {user && (
          <div className="inline-flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full mt-3">
            <div className="w-1.5 h-1.5 bg-green-400 rounded-full"/>
            <span className="text-xs text-white/70 font-medium">
              Sasa: {user.plan==='pro'?'⭐ Pro':user.plan==='admin'?'🛡️ Admin':'Basic (Bure)'}
            </span>
          </div>
        )}
      </div>

      {/* ── Current plan status ── */}
      {subInfo && (
        <div className="mx-3 mb-4 bg-white rounded-2xl p-4 shadow-soft border border-surface-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-ink">📊 Matumizi ya Sasa</h3>
            <span className={`badge ${subInfo.plan==='pro'?'badge-gold':'badge-primary'}`}>
              {subInfo.plan?.toUpperCase() || 'BASIC'}
            </span>
          </div>
          <div className="mb-2">
            <div className="flex justify-between text-xs font-medium mb-1">
              <span className="text-ink-4">Matangazo: {subInfo.used} / {subInfo.limit === 9999 ? '∞' : subInfo.limit}</span>
              <span className="text-ink-4">{subInfo.limit === 9999 ? '100%' : `${Math.round(((subInfo.used||0)/subInfo.limit)*100)}%`}</span>
            </div>
            <div className="h-2 bg-surface-3 rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all"
                style={{width:`${subInfo.limit===9999?100:Math.min(100,Math.round(((subInfo.used||0)/subInfo.limit)*100))}%`}}/>
            </div>
          </div>
          {subInfo.subscription && (
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-surface-4">
              <div>
                <p className="text-xs text-ink-4">Muda wa kumalizika:</p>
                <p className="text-xs font-semibold text-ink">
                  {new Date(subInfo.subscription.end_date).toLocaleDateString('sw-TZ')}
                </p>
              </div>
              <button onClick={handleCancel} disabled={cancelling}
                className="text-xs font-semibold text-red-500 hover:text-red-700 transition-colors disabled:opacity-50">
                {cancelling ? 'Inafuta...' : 'Futa Usajili'}
              </button>
            </div>
          )}
        </div>
      )}

      <PlanCard name="Basic" price="Bure" period="/milele"
        features={['Matangazo 3/mwezi','Picha 5 kwa tangazo','Mawasiliano ya msingi','Tafuta na hifadhi mali']}
        btnLabel={user?.plan==='basic'?'✓ Mpango wa Sasa':'Chagua Basic'}
        btnStyle="bg-surface text-ink border-2 border-surface-4 hover:border-primary"
        onPress={()=>toast('Uko tayari kwenye Basic','success')}/>

      <PlanCard featured tag="🔥 MAARUFU ZAIDI" name="Pro Dalali"
        price="TSh 30,000" period="/mwezi"
        features={['Matangazo bila kikomo','Picha 20 + video','Tangazo juu ya matokeo','Analytics za kina','Nembo ya Dalali Aliyethibitishwa ✓','Leads moja kwa moja','Msaada 24/7']}
        btnLabel="Lipia Sasa — TSh 30,000"
        btnStyle="bg-primary text-white shadow-green hover:shadow-green-lg hover:bg-primary-light"
        onPress={()=>openPay('pro','TSh 30,000')}/>

      <PlanCard featured borderColor="border-gold" tag="💎 MWENYE NYUMBA" tagBg="bg-gold text-white"
        name="Mwenye Plus" price="TSh 15,000" period="/mwezi"
        features={['Matangazo 10/mwezi','Picha 10 kwa tangazo','Mawasiliano ya moja kwa moja','Nembo ya Mwenye Aliyethibitishwa']}
        btnLabel="Lipia — TSh 15,000"
        btnStyle="bg-gold text-white shadow-gold hover:opacity-90"
        onPress={()=>openPay('owner','TSh 15,000')}/>

      <div className="mx-3 mb-4 bg-white rounded-2xl p-4 shadow-soft border border-surface-4">
        <h3 className="text-sm font-bold text-ink mb-2">🚀 Boost Tangazo Moja</h3>
        <p className="text-xs text-ink-4 mb-3">Lipa mara moja bila usajili — tangazo lako linaonekana juu.</p>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="bg-surface rounded-xl p-3 text-center">
            <div className="font-serif text-base font-semibold text-primary">TSh 10,000</div>
            <div className="text-xs text-ink-5 mt-0.5">Wiki 1 — Premium</div>
          </div>
          <div className="bg-surface rounded-xl p-3 text-center">
            <div className="font-serif text-base font-semibold text-primary">TSh 30,000</div>
            <div className="text-xs text-ink-5 mt-0.5">Mwezi 1 — Super</div>
          </div>
        </div>
        <button onClick={()=>navigate('/add')}
          className="btn-secondary">
          Boost Tangazo →
        </button>
      </div>

      <div className="mx-3 mb-6 bg-white rounded-2xl p-4 shadow-soft border border-surface-4">
        <h3 className="text-sm font-bold text-ink mb-3">❓ Maswali Yanayoulizwa Sana</h3>
        {[
          ['Ninaweza kubadilisha mpango?','Ndiyo, wakati wowote bila ada ya ziada.'],
          ['Malipo yanafanywaje?','M-Pesa, Airtel Money, na Tigo Pesa. Haraka na salama.'],
          ['Pro ina kikomo cha matangazo?','Hapana. Pro inakupa matangazo bila kikomo kabisa.'],
        ].map(([q,a])=>(
          <div key={q} className="mb-3 pb-3 border-b border-surface-4 last:border-0 last:mb-0 last:pb-0">
            <div className="text-sm font-semibold text-ink mb-1">{q}</div>
            <div className="text-xs text-ink-4 leading-relaxed">{a}</div>
          </div>
        ))}
      </div>

      <PaymentModal isOpen={payOpen} onClose={()=>setPayOpen(false)}
        plan={payConf.plan} amount={payConf.amount}
        onSuccess={()=>{toast('Umefanikiwa kuupgrade! ⭐','success'); setPayOpen(false); navigate('/profile');}}/>
    </div>
  );
}
