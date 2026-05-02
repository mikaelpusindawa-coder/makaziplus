import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { TopBar } from '../components/layout/TopBar';
import { Spinner, EmptyState } from '../components/common/Spinner';
import { formatPrice, getPropertyImage } from '../utils/helpers';
import api from '../utils/api';

const Stat = ({ icon, value, label, sub, color='primary' }) => {
  const colors = {primary:'bg-primary-50 text-primary', gold:'bg-gold-50 text-gold', blue:'bg-blue-50 text-blue-600', red:'bg-red-50 text-red-600'};
  return (
    <div className="bg-white rounded-2xl p-4 shadow-soft border border-surface-4">
      <div className={`w-10 h-10 ${colors[color].split(' ')[0]} rounded-xl flex items-center justify-center mb-3 text-xl`}>
        {icon}
      </div>
      <div className="font-serif text-2xl font-semibold text-ink">{value}</div>
      <div className="text-xs font-semibold text-ink-4 mt-0.5">{label}</div>
      {sub && <div className="text-[10px] text-ink-5 mt-0.5">{sub}</div>}
    </div>
  );
};

const Bar = ({ label, count, max }) => (
  <div className="mb-3 last:mb-0">
    <div className="flex justify-between text-xs font-medium mb-1">
      <span className="text-ink-4">{label}</span><span className="text-ink-4">{count.toLocaleString()}</span>
    </div>
    <div className="h-2 bg-surface-3 rounded-full overflow-hidden">
      <div className="h-full bg-primary rounded-full transition-all duration-700"
        style={{width:`${max?Math.round((count/max)*100):0}%`}}/>
    </div>
  </div>
);

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [props,   setProps]   = useState([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    try { const r = await api.get('/properties/my'); setProps(r.data.data); }
    catch { toast('Hitilafu ya kupakia','error'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (user) fetch(); }, [user]);

  const totalViews = props.reduce((s,p)=>s+(p.views||0),0);
  const active = props.filter(p=>p.status==='active').length;
  const premium = props.filter(p=>p.is_premium).length;

  return (
    <div className="min-h-screen bg-surface pb-24 md:pb-8 animate-fade-in-up">
      <TopBar title="Dashibodi" showBack/>

      {/* Hero */}
      <div className="bg-gradient-to-br from-ink to-primary/90 px-5 py-6 relative overflow-hidden">
        <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/5 rounded-full"/>
        <div className="absolute right-16 -top-6 w-20 h-20 bg-white/5 rounded-full"/>
        <div className="font-serif text-2xl font-semibold text-white">
          Habari, {user?.name?.split(' ')[0]} 👋
        </div>
        <p className="text-white/45 text-sm mt-1">Hali ya Biashara Yako Leo</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4">
        <Stat icon="🏠" value={props.length} label="Matangazo Yote" sub={`${active} active`} color="primary"/>
        <Stat icon="👁️" value={totalViews.toLocaleString()} label="Maoni Yote" sub="kutoka tangazo lako" color="blue"/>
        <Stat icon="⭐" value={premium} label="Premium" sub={`${props.length-premium} kawaida`} color="gold"/>
        <Stat icon="💬" value="38" label="Leads Mpya" sub="+5 leo" color="red"/>
      </div>

      {/* Bar chart */}
      <div className="bg-white rounded-2xl mx-4 p-4 shadow-soft border border-surface-4 mb-4">
        <h3 className="text-sm font-bold text-ink mb-4">📍 Maeneo Yanayovutia</h3>
        {[['Msasani',420],['Kinondoni',340],['Mikocheni',220],['Tegeta',203],['Sinza',107]].map(([l,c])=>(
          <Bar key={l} label={l} count={c} max={420}/>
        ))}
      </div>

      {/* My listings */}
      <div className="px-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-ink">Matangazo Yangu</h2>
          <button onClick={()=>navigate('/add')}
            className="flex items-center gap-1.5 bg-primary text-white px-4 py-1.5 rounded-full text-xs font-bold
              shadow-green active:scale-95 transition-all hover:shadow-green-lg">
            + Ongeza
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-10"><Spinner/></div>
        ) : props.length ? (
          <div className="space-y-2.5 md:grid md:grid-cols-2 md:gap-3 md:space-y-0">
            {props.map(p=>(
              <button key={p.id} onClick={()=>navigate(`/property/${p.id}`)}
                className="w-full flex gap-3 bg-white rounded-2xl p-3.5 shadow-soft border border-surface-4
                  text-left active:scale-[.99] transition-all hover:shadow-card">
                <div className="w-16 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-surface-3">
                  <img src={getPropertyImage(p)} alt={p.title}
                    className="w-full h-full object-cover" loading="lazy"
                    onError={e=>{e.target.src='https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=100&q=40';}}/>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-serif text-base font-semibold text-primary leading-none">{formatPrice(p.price)}</div>
                  <div className="text-xs font-semibold text-ink truncate mt-0.5">{p.title}</div>
                  <div className="text-[10px] text-ink-5 mt-0.5">👁 {p.views} • {p.area}</div>
                </div>
                <div className="flex flex-col gap-1.5 items-end flex-shrink-0">
                  <span className={`badge ${p.is_premium?'badge-gold':'badge-primary'}`}>
                    {p.is_premium?'⭐ Prem':'Kawaida'}
                  </span>
                  <span className={`badge ${p.status==='active'?'badge-primary':'badge-red'}`}>
                    {p.status}
                  </span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <EmptyState icon="🏠" title="Bado hujaweka tangazo" subtitle="Bonyeza + Ongeza kuanza kupata wateja"
            action={{label:'Ongeza Tangazo', onClick:()=>navigate('/add')}}/>
        )}
      </div>
    </div>
  );
}
