import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { TopBar } from '../components/layout/TopBar';
import { Spinner, EmptyState } from '../components/common/Spinner';
import { formatPrice, getPropertyImage, getPlaceholderImage } from '../utils/helpers';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const [props,    setProps]    = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading,  setLoading]  = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [propsRes, bookRes] = await Promise.allSettled([
        api.get('/properties/my'),
        api.get('/bookings/my'),
      ]);
      if (propsRes.status === 'fulfilled') setProps(propsRes.value.data.data || []);
      if (bookRes.status  === 'fulfilled') setBookings(bookRes.value.data.data || []);
    } catch {
      toast('Hitilafu ya kupakia', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (user) loadData(); }, [user, loadData]);

  const totalViews    = props.reduce((s,p)=>s+(p.views||0),0);
  const active        = props.filter(p=>p.status==='active').length;
  const premium       = props.filter(p=>p.is_premium).length;
  const pendingLeads  = bookings.filter(b=>b.status==='pending').length;
  // Build city distribution from actual listings
  const cityCounts    = props.reduce((acc,p)=>{ const c=p.city||'Nyingine'; acc[c]=(acc[c]||0)+1; return acc; },{});
  const topCities     = Object.entries(cityCounts).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const maxCityCount  = topCities[0]?.[1] || 1;

  return (
    <div className="min-h-screen bg-surface pb-24 md:pb-8 animate-fade-in-up">
      <TopBar title={t('dashboard.title')} showBack/>

      {/* Hero */}
      <div className="bg-gradient-to-br from-ink to-primary/90 px-5 py-6 relative overflow-hidden">
        <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/5 rounded-full"/>
        <div className="absolute right-16 -top-6 w-20 h-20 bg-white/5 rounded-full"/>
        <div className="font-serif text-2xl font-semibold text-white">
          {t('dashboard.hello')}, {user?.name?.split(' ')[0]} 👋
        </div>
        <p className="text-white/45 text-sm mt-1">{t('dashboard.business_today')}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4">
        <Stat icon="🏠" value={props.length} label={t('dashboard.all_listings')} sub={`${active} ${t('dashboard.active')}`} color="primary"/>
        <Stat icon="👁️" value={totalViews.toLocaleString()} label={t('dashboard.total_views')} sub={t('dashboard.from_listing')} color="blue"/>
        <Stat icon="⭐" value={premium} label="Premium" sub={`${props.length-premium} ${t('dashboard.regular')}`} color="gold"/>
        <Stat icon="📅" value={pendingLeads} label={t('dashboard.new_leads')} sub={`${bookings.length} jumla`} color="red"/>
      </div>

      {/* Bar chart — real data from user's listings */}
      <div className="bg-white rounded-2xl mx-4 p-4 shadow-soft border border-surface-4 mb-4">
        <h3 className="text-sm font-bold text-ink mb-4">📍 {t('dashboard.popular_areas')}</h3>
        {topCities.length > 0 ? topCities.map(([city, count]) => (
          <Bar key={city} label={city} count={count} max={maxCityCount}/>
        )) : (
          <p className="text-xs text-ink-5 text-center py-4">Ongeza mali ili kuona takwimu</p>
        )}
      </div>

      {/* My listings */}
      <div className="px-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-ink">{t('dashboard.my_listings')}</h2>
          <button onClick={()=>navigate('/add')}
            className="flex items-center gap-1.5 bg-primary text-white px-4 py-1.5 rounded-full text-xs font-bold
              shadow-green active:scale-95 transition-all hover:shadow-green-lg">
            {t('dashboard.add_listing')}
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-10"><Spinner/></div>
        ) : props.length ? (
          <div className="space-y-2.5 md:grid md:grid-cols-2 md:gap-3 md:space-y-0">
            {props.map(p=>(
              <div key={p.id} className="bg-white rounded-2xl shadow-soft border border-surface-4 overflow-hidden">
                <button onClick={()=>navigate(`/property/${p.id}`)}
                  className="w-full flex gap-3 p-3.5 text-left active:scale-[.99] transition-all hover:bg-surface-2">
                  <div className="w-16 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-surface-3">
                    <img src={getPropertyImage(p)} alt={p.title}
                      className="w-full h-full object-cover" loading="lazy"
                      onError={e=>{e.target.onerror=null; e.target.src=getPlaceholderImage(p.type, p.id);}}/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-serif text-base font-semibold text-primary leading-none">{formatPrice(p.price)}</div>
                    <div className="text-xs font-semibold text-ink truncate mt-0.5">{p.title}</div>
                    <div className="text-[10px] text-ink-5 mt-0.5">👁 {p.views} • {p.area}</div>
                  </div>
                  <div className="flex flex-col gap-1.5 items-end flex-shrink-0">
                    <span className={`badge ${p.is_premium?'badge-gold':'badge-primary'}`}>
                      {p.is_premium?`⭐ Prem`: t('dashboard.regular')}
                    </span>
                    <span className={`badge ${p.status==='active'?'badge-primary':'badge-red'}`}>
                      {p.status}
                    </span>
                  </div>
                </button>
                <div className="flex border-t border-surface-3 divide-x divide-surface-3">
                  <button
                    onClick={()=>navigate(`/add?edit=${p.id}`)}
                    className="flex-1 py-2 text-xs font-semibold text-primary hover:bg-primary-50 transition-colors flex items-center justify-center gap-1.5">
                    ✏️ {t('dashboard.edit')}
                  </button>
                  <button
                    onClick={async()=>{
                      if(!window.confirm(t('dashboard.delete_confirm'))) return;
                      try {
                        await api.delete(`/properties/${p.id}`);
                        toast('Tangazo limefutwa','success');
                        loadData();
                      } catch { toast('Hitilafu ya kufuta','error'); }
                    }}
                    className="flex-1 py-2 text-xs font-semibold text-red-500 hover:bg-red-50 transition-colors flex items-center justify-center gap-1.5">
                    🗑️ {t('dashboard.delete')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon="🏠" title={t('dashboard.no_listings')} subtitle={t('dashboard.no_listings_sub')}
            action={{label: t('dashboard.add_listing'), onClick:()=>navigate('/add')}}/>
        )}
      </div>
    </div>
  );
}
