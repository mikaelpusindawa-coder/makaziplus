import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { TopBar } from '../components/layout/TopBar';
import { EmptyState } from '../components/common/Spinner';
import { timeAgo } from '../utils/helpers';
import api from '../utils/api';

const TYPE_CFG = {
  new_listing:  {icon:'🏠', bg:'bg-primary-50',  color:'text-primary'},
  price_change: {icon:'💰', bg:'bg-gold-50',     color:'text-gold'},
  message:      {icon:'💬', bg:'bg-blue-50',     color:'text-blue-600'},
  payment:      {icon:'💳', bg:'bg-green-50',    color:'text-green-600'},
  security:     {icon:'🔒', bg:'bg-red-50',      color:'text-red-600'},
  system:       {icon:'🔔', bg:'bg-surface-3',   color:'text-ink-4'},
};

export default function Notifications() {
  const navigate = useNavigate();
  const { user }  = useAuth();
  const [notifs,  setNotifs]  = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    api.get('/notifications').then(r=>setNotifs(r.data.data)).catch(()=>{}).finally(()=>setLoading(false));
  }, [user]);

  const markRead = async (id) => {
    setNotifs(p=>p.map(n=>n.id===id?{...n,is_read:1}:n));
    await api.patch(`/notifications/${id}/read`).catch(()=>{});
  };
  const markAll = async () => {
    setNotifs(p=>p.map(n=>({...n,is_read:1})));
    await api.patch('/notifications/read-all').catch(()=>{});
  };

  const unread = notifs.filter(n=>!n.is_read).length;

  if (!user) return (
    <div className="min-h-screen bg-surface pb-24">
      <TopBar title="Arifa 🔔" showBack/>
      <EmptyState icon="🔔" title="Ingia kwanza" subtitle="Unahitaji kuingia ili kuona arifa"
        action={{label:'Ingia', onClick:()=>navigate('/auth')}}/>
    </div>
  );

  return (
    <div className="min-h-screen bg-surface pb-24 md:pb-8 animate-fade-in-up">
      <TopBar title="Arifa 🔔" showBack
        rightAction={unread>0 ? (
          <button onClick={markAll} className="text-sm font-semibold text-primary px-2">Soma Zote</button>
        ) : undefined}/>

      <div className="px-4 py-2.5 flex items-center justify-between border-b border-surface-4">
        <p className="text-xs text-ink-5">{unread>0?`${unread} mpya`:'Zote zimesomwa'}</p>
        <p className="text-xs text-ink-5">{notifs.length} jumla</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-6 h-6 border-[3px] border-primary/20 border-t-primary rounded-full animate-spin"/></div>
      ) : notifs.length ? (
        <div>
          {notifs.map(n=>{
            const cfg = TYPE_CFG[n.type]||TYPE_CFG.system;
            return (
              <button key={n.id} onClick={()=>markRead(n.id)}
                className={`w-full flex items-start gap-3 px-4 py-4 border-b border-surface-4 text-left transition-colors
                  ${!n.is_read?'bg-primary-50/40 hover:bg-primary-50/60':'bg-white hover:bg-surface'}`}>
                <div className={`w-10 h-10 ${cfg.bg} rounded-xl flex items-center justify-center text-xl flex-shrink-0 mt-0.5`}>
                  {cfg.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-ink">{n.title}</p>
                    {!n.is_read && <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0"/>}
                  </div>
                  <p className="text-xs text-ink-4 mt-0.5 leading-relaxed">{n.body}</p>
                  <p className="text-[10px] text-ink-6 mt-1">{timeAgo(n.created_at)}</p>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <EmptyState icon="🔔" title="Hakuna arifa" subtitle="Arifa zako zitaonekana hapa"/>
      )}
    </div>
  );
}
