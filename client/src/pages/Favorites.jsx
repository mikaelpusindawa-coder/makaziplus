import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { TopBar } from '../components/layout/TopBar';
import { PropertyCard } from '../components/common/PropertyCard';
import { SkeletonListCard, EmptyState } from '../components/common/Spinner';
import api from '../utils/api';

export default function Favorites() {
  const navigate = useNavigate();
  const { user }  = useAuth();
  const { toast } = useToast();
  const [favs,    setFavs]    = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    api.get('/favorites').then(r=>setFavs(r.data.data)).catch(()=>{}).finally(()=>setLoading(false));
  }, [user]);

  const toggleFav = async (id) => {
    try {
      const r = await api.post(`/favorites/${id}/toggle`);
      if (!r.data.favorited) setFavs(p=>p.filter(x=>x.id!==id));
      toast(r.data.message,'success');
    } catch { toast('Hitilafu ya mtandao','error'); }
  };

  if (!user) return (
    <div className="min-h-screen bg-surface pb-24">
      <TopBar title="Zilizohifadhiwa ❤️" showBack/>
      <EmptyState icon="🔒" title="Ingia kwanza" subtitle="Unahitaji kuingia ili kuona mali uliyohifadhi"
        action={{label:'Ingia', onClick:()=>navigate('/auth')}}/>
    </div>
  );

  return (
    <div className="min-h-screen bg-surface pb-24 md:pb-8 animate-fade-in-up">
      <TopBar title="Zilizohifadhiwa ❤️" showBack/>
      <div className="px-4 pt-3 pb-2 flex items-center justify-between">
        <p className="text-sm font-semibold text-ink-4">{favs.length} mali zilizohifadhiwa</p>
      </div>

      {loading ? (
        <div>{[1,2,3].map(i=><SkeletonListCard key={i}/>)}</div>
      ) : favs.length ? (
        <div className="px-4 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-3">
          {favs.map(p=>(
            <PropertyCard key={p.id} property={p} horizontal isFav onFav={toggleFav}/>
          ))}
        </div>
      ) : (
        <EmptyState icon="🤍" title="Bado hujahifadhi mali" subtitle="Bonyeza ❤️ kwenye mali unayoipenda kuihifadhi hapa"
          action={{label:'Tafuta Mali', onClick:()=>navigate('/search')}}/>
      )}
    </div>
  );
}
