import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { TopBar } from '../components/layout/TopBar';
import { Spinner, EmptyState } from '../components/common/Spinner';
import { formatPrice, getAvatar, formatDate } from '../utils/helpers';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import api from '../utils/api';

const TABS = ['Overview', 'Users', 'Listings', 'Payments', 'Verifications', 'Security', 'Analytics'];

const Badge = ({ children, color = 'green' }) => {
  const colors = {
    green: 'bg-primary-pale text-primary',
    gold: 'bg-gold-pale text-amber-700',
    red: 'bg-red-50 text-red-600',
    blue: 'bg-blue-50 text-blue-700',
    gray: 'bg-surface-3 text-ink-4',
    orange: 'bg-orange-50 text-orange-700',
    purple: 'bg-purple-50 text-purple-700',
  };
  return <span className={`text-2xs font-bold px-2 py-0.5 rounded-full ${colors[color] || colors.gray}`}>{children}</span>;
};

const StatCard = ({ icon, label, value, sub, highlight, onClick }) => (
  <div
    onClick={onClick}
    className={`rounded-2xl p-4 shadow-sm transition-all hover:shadow-md cursor-pointer
      ${highlight ? 'bg-red-50 border border-red-100' : 'bg-white border border-surface-4'}`}
  >
    <div className="text-2xl mb-2">{icon}</div>
    <div className="text-2xs font-bold text-ink-4 uppercase tracking-wide">{label}</div>
    <div className={`font-serif text-2xl font-semibold ${highlight ? 'text-red-600' : 'text-ink'}`}>
      {typeof value === 'number' ? value.toLocaleString() : value}
    </div>
    {sub && <div className="text-2xs text-ink-4 mt-0.5">{sub}</div>}
  </div>
);

const BarRow = ({ label, count, max }) => (
  <div className="mb-3">
    <div className="flex justify-between text-xs text-ink-4 font-medium mb-1">
      <span>{label}</span><span>{count.toLocaleString()}</span>
    </div>
    <div className="h-1.5 bg-surface rounded-full overflow-hidden">
      <div className="h-full bg-primary rounded-full transition-all duration-700" style={{ width: `${Math.round((count / max) * 100)}%` }} />
    </div>
  </div>
);

// Verification Request Card
const VerificationCard = ({ request, onApprove, onReject, onViewDetails }) => {
  const [expanded, setExpanded] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const handleApprove = async () => {
    if (!window.confirm(`Thibitisha akaunti ya ${request.name}?`)) return;
    setActionLoading(true);
    try {
      await onApprove(request.user_id);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      alert('Tafadhali weka sababu ya kukataa');
      return;
    }
    setActionLoading(true);
    try {
      await onReject(request.user_id, rejectReason);
      setShowRejectModal(false);
      setRejectReason('');
    } finally {
      setActionLoading(false);
    }
  };

  const statusColors = {
    pending: 'bg-yellow-50 text-yellow-700',
    approved: 'bg-green-50 text-green-700',
    rejected: 'bg-red-50 text-red-700',
    requires_resubmission: 'bg-orange-50 text-orange-700',
  };

  return (
    <div className="border-b border-surface-4 last:border-0">
      <div className="p-4 hover:bg-surface/50 transition-colors">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-bold text-primary">{request.name?.charAt(0) || 'U'}</span>
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-ink">{request.name}</span>
              <Badge color={request.id_type === 'nida' ? 'purple' : request.id_type === 'passport' ? 'blue' : 'gold'}>
                {request.id_type?.toUpperCase()}
              </Badge>
              <span className={`text-2xs font-bold px-2 py-0.5 rounded-full ${statusColors[request.status]}`}>
                {request.status === 'pending' ? '⏳ Inasubiri' :
                 request.status === 'approved' ? '✅ Imethibitishwa' :
                 request.status === 'rejected' ? '❌ Imekataliwa' : '📝 Inahitaji Kurekebishwa'}
              </span>
            </div>
            <div className="text-xs text-ink-4 mt-0.5">{request.email}</div>
            <div className="text-2xs text-ink-5 mt-0.5">📞 {request.phone}</div>
            <div className="text-2xs text-ink-5">🆔 {request.id_number}</div>
            <div className="text-2xs text-ink-5">📅 Iliyotumwa: {formatDate(request.created_at)}</div>

            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-primary font-medium mt-2 flex items-center gap-1 hover:underline"
            >
              {expanded ? '▼' : '▶'} {expanded ? 'Funga' : 'Ona Picha'}
            </button>

            {expanded && (
              <div className="mt-3 pt-3 border-t border-surface-4">
                <div className="grid grid-cols-3 gap-2">
                  {request.id_document_front && (
                    <div>
                      <p className="text-2xs text-ink-5 mb-1">Mbele ya Kitambulisho</p>
                      <img
                        src={request.id_document_front}
                        alt="ID Front"
                        className="w-full h-24 object-cover rounded-lg border border-surface-4 cursor-pointer"
                        onClick={() => window.open(request.id_document_front, '_blank')}
                      />
                    </div>
                  )}
                  {request.id_document_back && (
                    <div>
                      <p className="text-2xs text-ink-5 mb-1">Nyuma ya Kitambulisho</p>
                      <img
                        src={request.id_document_back}
                        alt="ID Back"
                        className="w-full h-24 object-cover rounded-lg border border-surface-4 cursor-pointer"
                        onClick={() => window.open(request.id_document_back, '_blank')}
                      />
                    </div>
                  )}
                  {request.selfie_url && (
                    <div>
                      <p className="text-2xs text-ink-5 mb-1">Selfie na Kitambulisho</p>
                      <img
                        src={request.selfie_url}
                        alt="Selfie"
                        className="w-full h-24 object-cover rounded-lg border border-surface-4 cursor-pointer"
                        onClick={() => window.open(request.selfie_url, '_blank')}
                      />
                    </div>
                  )}
                </div>
                {request.admin_notes && (
                  <div className="mt-3 p-2 bg-red-50 rounded-lg">
                    <p className="text-2xs text-red-600 font-semibold">Sababu ya Kukataliwa:</p>
                    <p className="text-xs text-red-700">{request.admin_notes}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {request.status === 'pending' && (
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={handleApprove}
                disabled={actionLoading}
                className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                ✅ Thibitisha
              </button>
              <button
                onClick={() => setShowRejectModal(true)}
                disabled={actionLoading}
                className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                ❌ Kataa
              </button>
            </div>
          )}
        </div>
      </div>

      {showRejectModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => e.target === e.currentTarget && setShowRejectModal(false)}
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-5">
            <h3 className="font-semibold text-ink mb-3">Kataa Uthibitisho</h3>
            <p className="text-sm text-ink-5 mb-3">Sababu ya kukataa:</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Mfano: Picha hazionekani vizuri, namba si sahihi..."
              rows={3}
              className="input-field mb-4"
            />
            <div className="flex gap-3">
              <button onClick={() => setShowRejectModal(false)} className="flex-1 py-2 border border-surface-4 rounded-xl text-sm font-medium">
                Ghairi
              </button>
              <button onClick={handleReject} className="flex-1 py-2 bg-red-600 text-white rounded-xl text-sm font-bold">
                Kataa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default function Admin() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [tab, setTab] = useState(0);
  const [users, setUsers] = useState([]);
  const [props, setProps] = useState([]);
  const [payments, setPayments] = useState([]);
  const [stats, setStats] = useState(null);
  const [security, setSecurity] = useState(null);
  const [verifications, setVerifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [blockIp, setBlockIp] = useState('');
  const [blockReason, setBlockReason] = useState('');

  // Analytics data states
  const [revenueData, setRevenueData] = useState([]);
  const [userGrowthData, setUserGrowthData] = useState([]);
  const [propertyTypeData, setPropertyTypeData] = useState([]);
  const [cityData, setCityData] = useState([]);

  useEffect(() => {
    if (user && user.role !== 'admin') navigate('/');
  }, [user, navigate]);

  const fetchAnalytics = useCallback(async () => {
    try {
      // Fetch revenue by month
      const revenueRes = await api.get('/admin/analytics/revenue');
      setRevenueData(revenueRes.data.data || []);

      // Fetch user growth
      const userGrowthRes = await api.get('/admin/analytics/user-growth');
      setUserGrowthData(userGrowthRes.data.data || []);

      // Fetch property type distribution
      const typeRes = await api.get('/admin/analytics/property-types');
      setPropertyTypeData(typeRes.data.data || []);

      // Fetch city distribution
      const cityRes = await api.get('/admin/analytics/city-distribution');
      setCityData(cityRes.data.data || []);
    } catch (err) {
      console.error('Analytics fetch error:', err);
      // Generate sample data if API fails
      setRevenueData([
        { month: 'Jan', revenue: 0 },
        { month: 'Feb', revenue: 0 },
        { month: 'Mar', revenue: 0 },
        { month: 'Apr', revenue: 0 },
        { month: 'Mei', revenue: 0 },
        { month: 'Jun', revenue: 0 },
      ]);
      setUserGrowthData([
        { month: 'Jan', users: 0 },
        { month: 'Feb', users: 0 },
        { month: 'Mar', users: 0 },
        { month: 'Apr', users: 0 },
        { month: 'Mei', users: 0 },
        { month: 'Jun', users: 0 },
      ]);
      setPropertyTypeData([
        { name: 'Nyumba', value: 0 },
        { name: 'Chumba', value: 0 },
        { name: 'Frem', value: 0 },
        { name: 'Ofisi', value: 0 },
      ]);
      setCityData([
        { name: 'Dar es Salaam', value: 0 },
        { name: 'Mwanza', value: 0 },
        { name: 'Arusha', value: 0 },
        { name: 'Dodoma', value: 0 },
        { name: 'Mbeya', value: 0 },
      ]);
    }
  }, []);

  const fetchAll = useCallback(async () => {
    if (!user || user.role !== 'admin') return;
    setLoading(true);
    try {
      const [u, p, pay, s, sec, ver] = await Promise.all([
        api.get('/admin/users'),
        api.get('/properties', { params: { limit: 100 } }),
        api.get('/admin/payments'),
        api.get('/admin/stats'),
        api.get('/admin/security'),
        api.get('/admin/verifications/all').catch(() => ({ data: { data: [] } })),
      ]);
      setUsers(u.data.data || []);
      setProps(p.data.data || []);
      setPayments(pay.data.data || []);
      setStats(s.data.data);
      setSecurity(sec.data.data);
      setVerifications(ver.data.data || []);
    } catch (err) {
      console.error('Fetch error:', err);
      toast('Hitilafu ya kupakia data', 'error');
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchAll();
    fetchAnalytics();
  }, [user, fetchAll, fetchAnalytics]);

  const toggleVerify = async (uid, current) => {
    try {
      await api.patch(`/admin/users/${uid}`, { verified: current ? 0 : 1 });
      setUsers(prev => prev.map(u => u.id === uid ? { ...u, verified: !current } : u));
      toast('Imebadilishwa ✓', 'success');
    } catch { toast('Hitilafu', 'error'); }
  };

  const toggleActive = async (uid, current) => {
    try {
      await api.patch(`/admin/users/${uid}`, { is_active: current ? 0 : 1 });
      setUsers(prev => prev.map(u => u.id === uid ? { ...u, is_active: !current } : u));
      toast('Imebadilishwa ✓', 'success');
    } catch { toast('Hitilafu', 'error'); }
  };

  const toggleIdentityVerified = async (uid, current) => {
    try {
      await api.patch(`/admin/users/${uid}`, { is_verified: current ? 0 : 1 });
      setUsers(prev => prev.map(u => u.id === uid ? { ...u, is_verified: !current } : u));
      toast('Uthibitisho wa utambulisho umebadilishwa ✓', 'success');
    } catch { toast('Hitilafu', 'error'); }
  };

  const moderateProp = async (pid, status) => {
    try {
      await api.patch(`/admin/properties/${pid}`, { status });
      setProps(prev => prev.map(p => p.id === pid ? { ...p, status } : p));
      toast('Hali imebadilishwa ✓', 'success');
    } catch { toast('Hitilafu', 'error'); }
  };

  const handleApproveVerification = async (userId) => {
    try {
      await api.post(`/admin/verifications/${userId}/approve`);
      toast('Uthibitisho umekubaliwa! ✅', 'success');
      fetchAll();
    } catch (err) {
      toast(err.response?.data?.message || 'Hitilafu', 'error');
    }
  };

  const handleRejectVerification = async (userId, reason) => {
    try {
      await api.post(`/admin/verifications/${userId}/reject`, { reason });
      toast('Uthibitisho umekataliwa ❌', 'success');
      fetchAll();
    } catch (err) {
      toast(err.response?.data?.message || 'Hitilafu', 'error');
    }
  };

  const handleBlockIp = async () => {
    if (!blockIp.trim() || !blockReason.trim()) {
      toast('Jaza IP na sababu', 'error');
      return;
    }
    try {
      await api.post('/admin/block-ip', { ip_address: blockIp.trim(), reason: blockReason.trim() });
      toast(`IP ${blockIp} imefungwa ✓`, 'success');
      setBlockIp('');
      setBlockReason('');
      fetchAll();
    } catch { toast('Hitilafu', 'error'); }
  };

  const softDelete = async (uid, name) => {
    if (!window.confirm(`Futa akaunti ya ${name}? Hatua hii haiwezi kurudishwa.`)) return;
    try {
      await api.delete(`/admin/users/${uid}`);
      setUsers(prev => prev.filter(u => u.id !== uid));
      toast(`Akaunti ya ${name} imefutwa`, 'success');
    } catch { toast('Hitilafu', 'error'); }
  };

  if (!user || user.role !== 'admin') return null;

  const totalRevenue = payments.filter(p => p.status === 'completed').reduce((s, p) => s + parseFloat(p.amount || 0), 0);
  const pendingVerifications = verifications.filter(v => v.status === 'pending').length;

  const COLORS = ['#0d5c36', '#52b47d', '#c8933a', '#2563eb', '#dc2626', '#7a8c82'];

  return (
    <div className="min-h-screen bg-surface pb-24 md:pb-8">
      <TopBar title="🛡️ Admin Panel" showBack />

      {/* Hero */}
      <div className="bg-gradient-to-br from-ink to-primary/90 px-4 py-5 relative overflow-hidden">
        <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-white/5 rounded-full" />
        <div className="font-serif text-xl font-semibold text-white">Admin Panel</div>
        <div className="text-xs text-white/40 mt-0.5">MakaziPlus v4.0 --- Simamia mfumo wote</div>

        {stats && (
          <div className="flex gap-4 mt-3">
            {[
              ['👥', stats.users, 'Watumiaji'],
              ['🏠', stats.properties, 'Mali'],
              ['💰', formatPrice(stats.revenue || 0), 'Mapato'],
              ['📋', pendingVerifications, 'Yanasubiri'],
            ].map(([icon, val, lbl]) => (
              <div key={lbl} className="text-center">
                <div className="text-white font-bold text-sm">{icon} {typeof val === 'number' ? val.toLocaleString() : val}</div>
                <div className="text-white/40 text-2xs">{lbl}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar px-3 py-3">
        {TABS.map((t, i) => (
          <button
            key={t}
            onClick={() => setTab(i)}
            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold shadow-sm transition-all
              ${tab === i ? (t === 'Security' ? 'bg-red-600 text-white' : 'bg-primary text-white') : 'bg-white text-ink-3'}`}
          >
            {t === 'Security' ? '🔒 ' : ''}{t}
            {t === 'Verifications' && pendingVerifications > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 bg-red-500 text-white rounded-full text-2xs">{pendingVerifications}</span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : (
        <div className="px-3">
          {/* TAB 0: OVERVIEW */}
          {tab === 0 && stats && (
            <>
              <div className="grid grid-cols-2 gap-2.5 mb-3">
                <StatCard icon="👥" label="Watumiaji" value={stats.users} sub="wote waliojisajili" />
                <StatCard icon="🏠" label="Matangazo" value={stats.properties} sub={`${stats.active} active`} />
                <StatCard icon="👁️" label="Maoni Yote" value={(stats.views || 0).toLocaleString()} sub="jumla views" />
                <StatCard icon="💰" label="Mapato" value={formatPrice(stats.revenue || 0)} sub="malipo yote" />
              </div>

              {stats.pending_payments > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 mb-3 flex items-center gap-2">
                  <span className="text-lg">⏳</span>
                  <div className="text-xs text-amber-800 font-medium">Malipo {stats.pending_payments} yanasubiri uthibitisho</div>
                </div>
              )}

              <div className="bg-white rounded-2xl p-4 shadow-sm mb-3">
                <div className="text-sm font-bold text-ink mb-4">🔥 Mali Zinazoongoza (Views)</div>
                {stats.top_properties?.length ?
                  stats.top_properties.map((p, i) => (
                    <BarRow key={p.id} label={`${i + 1}. ${p.area} --- ${p.title?.substring(0, 25)}...`} count={p.views} max={stats.top_properties[0]?.views || 1} />
                  )) : <div className="text-xs text-ink-4">Hakuna data</div>}
              </div>

              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="text-sm font-bold text-ink mb-4">📍 Maeneo Maarufu</div>
                {[
                  { label: 'Oyster Bay', count: 612 },
                  { label: 'Msasani', count: 420 },
                  { label: 'Kinondoni', count: 340 },
                  { label: 'Mikocheni', count: 220 },
                  { label: 'CBD', count: 180 },
                ].map(b => <BarRow key={b.label} label={b.label} count={b.count} max={612} />)}
              </div>
            </>
          )}

          {/* TAB 1: USERS */}
          {tab === 1 && (
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-black/5 flex justify-between items-center">
                <span className="text-sm font-bold text-ink">Watumiaji ({users.length})</span>
                <Badge color="green">{users.filter(u => u.verified).length} verified</Badge>
              </div>
              {users.map(u => {
                const img = getAvatar(u);
                const roleColor = { admin: 'red', agent: 'blue', owner: 'gold', customer: 'green' }[u.role] || 'green';
                return (
                  <div key={u.id} className="flex items-center gap-3 px-4 py-3 border-b border-black/4 last:border-0">
                    <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 bg-primary-pale">
                      <img src={img} alt={u.name} className="w-full h-full object-cover" loading="lazy" onError={e => { e.target.style.display = 'none'; }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-ink truncate">{u.name}</div>
                      <div className="text-2xs text-ink-4 truncate">{u.email}</div>
                      {u.locked_until && new Date(u.locked_until) > new Date() && (
                        <div className="text-2xs text-red-500 font-bold">🔒 Imefungwa</div>
                      )}
                    </div>
                    <div className="flex flex-col gap-1 items-end flex-shrink-0">
                      <Badge color={roleColor}>{u.role}</Badge>
                      <div className="flex gap-1">
                        <button onClick={() => toggleVerify(u.id, u.verified)} className={`text-2xs font-bold px-1.5 py-0.5 rounded-full transition-all ${u.verified ? 'bg-primary-pale text-primary' : 'bg-surface text-ink-4'}`}>
                          {u.verified ? '✓ Verified' : 'Verify'}
                        </button>
                        <button onClick={() => toggleActive(u.id, u.is_active)} className={`text-2xs font-bold px-1.5 py-0.5 rounded-full transition-all ${u.is_active ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
                          {u.is_active ? 'Active' : 'Blocked'}
                        </button>
                        <button onClick={() => toggleIdentityVerified(u.id, u.is_verified)} className={`text-2xs font-bold px-1.5 py-0.5 rounded-full transition-all ${u.is_verified ? 'bg-purple-50 text-purple-600' : 'bg-surface text-ink-4'}`}>
                          {u.is_verified ? '✓ ID' : 'Verify ID'}
                        </button>
                        {u.role !== 'admin' && (
                          <button onClick={() => softDelete(u.id, u.name)} className="text-2xs font-bold px-1.5 py-0.5 rounded-full bg-red-50 text-red-500">
                            Del
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 2: LISTINGS */}
          {tab === 2 && (
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-black/5">
                <span className="text-sm font-bold text-ink">Matangazo Yote ({props.length})</span>
              </div>
              {props.map(p => (
                <div key={p.id} className="flex items-center gap-3 px-4 py-3 border-b border-black/4 last:border-0">
                  <button onClick={() => navigate(`/property/${p.id}`)} className="w-12 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-surface-3">
                    <img src={p.primary_image || 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=100&q=40'} alt="" className="w-full h-full object-cover" loading="lazy" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-ink truncate">{p.title}</div>
                    <div className="text-2xs text-ink-4">{p.area} • {formatPrice(p.price)}</div>
                  </div>
                  <div className="flex flex-col gap-1 items-end flex-shrink-0">
                    <Badge color={p.status === 'active' ? 'green' : p.status === 'pending' ? 'gold' : p.status === 'rejected' ? 'red' : 'gray'}>
                      {p.status}
                    </Badge>
                    <div className="flex gap-1">
                      {p.status === 'pending' && (
                        <button onClick={() => moderateProp(p.id, 'active')} className="text-2xs font-bold px-1.5 py-0.5 rounded-full bg-green-50 text-green-600">Approve</button>
                      )}
                      {p.status === 'active' && (
                        <button onClick={() => moderateProp(p.id, 'suspended')} className="text-2xs font-bold px-1.5 py-0.5 rounded-full bg-red-50 text-red-500">Suspend</button>
                      )}
                      {(p.status === 'suspended' || p.status === 'rejected') && (
                        <button onClick={() => moderateProp(p.id, 'active')} className="text-2xs font-bold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600">Restore</button>
                      )}
                      <span className="text-2xs font-bold px-1.5 py-0.5 rounded-full bg-surface text-ink-4">👁 {p.views}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 3: PAYMENTS */}
          {tab === 3 && (
            <>
              <div className="bg-gradient-to-br from-ink to-primary rounded-2xl p-5 mb-3 shadow-sm relative overflow-hidden">
                <div className="absolute -right-4 -bottom-4 w-16 h-16 bg-white/5 rounded-full" />
                <div className="text-xs text-white/50 mb-1">Jumla Mapato Yaliyokamilika</div>
                <div className="font-serif text-4xl font-semibold text-white">{formatPrice(totalRevenue)}</div>
                <div className="flex gap-4 mt-2">
                  <div className="text-xs text-white/50">{payments.filter(p => p.status === 'completed').length} completed</div>
                  <div className="text-xs text-white/50">{payments.filter(p => p.status === 'pending').length} pending</div>
                  <div className="text-xs text-white/50">{payments.filter(p => p.status === 'failed').length} failed</div>
                </div>
              </div>
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-black/5">
                  <span className="text-sm font-bold text-ink">Historia ya Malipo ({payments.length})</span>
                </div>
                {payments.length ? payments.map(p => (
                  <div key={p.id} className="flex items-center gap-3 px-4 py-3 border-b border-black/4 last:border-0">
                    <div className="w-9 h-9 bg-primary-pale rounded-full flex items-center justify-center text-base flex-shrink-0">💳</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-ink">{p.user_name || 'Mtumiaji'}</div>
                      <div className="text-2xs text-ink-4 truncate">{p.method?.toUpperCase()} • {p.plan} • {new Date(p.created_at).toLocaleDateString()}</div>
                      {p.transaction_id && <div className="text-2xs text-ink-5 font-mono truncate">{p.transaction_id}</div>}
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className="text-xs font-bold text-primary">{formatPrice(p.amount)}</span>
                      <Badge color={p.status === 'completed' ? 'green' : p.status === 'pending' ? 'gold' : 'red'}>{p.status}</Badge>
                    </div>
                  </div>
                )) : <div className="py-8 text-center text-xs text-ink-4">Hakuna malipo bado</div>}
              </div>
            </>
          )}

          {/* TAB 4: VERIFICATIONS */}
          {tab === 4 && (
            <>
              <div className="grid grid-cols-2 gap-2.5 mb-3">
                <StatCard icon="⏳" label="Zinazosubiri" value={verifications.filter(v => v.status === 'pending').length} sub="Ombi la uthibitisho" />
                <StatCard icon="✅" label="Zilizokubaliwa" value={verifications.filter(v => v.status === 'approved').length} sub="Uthibitisho umekamilika" />
                <StatCard icon="❌" label="Zilizokataliwa" value={verifications.filter(v => v.status === 'rejected').length} sub="Zimekataliwa" />
                <StatCard icon="📊" label="Watumiaji Walio Thibitishwa" value={users.filter(u => u.is_verified).length} sub={`Kati ya ${users.length} watumiaji`} />
              </div>
              {verifications.length === 0 ? (
                <EmptyState icon="📋" title="Hakuna maombi ya uthibitisho" subtitle="Maombi ya uthibitisho yataonekana hapa" />
              ) : (
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-surface-4">
                  <div className="px-4 py-3 border-b border-surface-4 bg-primary-50">
                    <span className="text-sm font-bold text-primary">Maombi ya Uthibitisho wa Utambulisho</span>
                  </div>
                  {verifications.map(v => (
                    <VerificationCard
                      key={v.id}
                      request={v}
                      onApprove={handleApproveVerification}
                      onReject={handleRejectVerification}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {/* TAB 5: SECURITY */}
          {tab === 5 && (
            <>
              <div className="grid grid-cols-3 gap-2 mb-3">
                <StatCard icon="🚫" label="Majaribio Mabaya (24h)" value={security?.counts?.failed_24h || 0} highlight={(security?.counts?.failed_24h || 0) > 50} />
                <StatCard icon="⚠️" label="Majaribio Mabaya (1h)" value={security?.counts?.failed_1h || 0} highlight={(security?.counts?.failed_1h || 0) > 20} />
                <StatCard icon="🔒" label="Akaunti Zilizofungwa" value={security?.counts?.locked_accounts || 0} highlight={(security?.counts?.locked_accounts || 0) > 0} />
              </div>
              {security?.alerts?.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-3">
                  <div className="px-4 py-3 border-b border-black/5 flex justify-between items-center">
                    <span className="text-sm font-bold text-red-600">⚠️ IP Zinazoshukiwa</span>
                    <Badge color="red">{security.alerts.length}</Badge>
                  </div>
                  {security.alerts.map((a, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-black/4 last:border-0">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold font-mono text-ink">{a.ip_address}</div>
                        <div className="text-2xs text-ink-4">{a.attempt_count} majaribio • {a.unique_identifiers} akaunti tofauti</div>
                      </div>
                      <div className="flex flex-col gap-1 items-end">
                        <Badge color={a.threat_level === 'CRITICAL' ? 'red' : a.threat_level === 'HIGH' ? 'orange' : a.threat_level === 'MEDIUM' ? 'gold' : 'gray'}>
                          {a.threat_level}
                        </Badge>
                        <button onClick={() => { setBlockIp(a.ip_address); setBlockReason('Automated: too many failed logins'); }} className="text-2xs font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600">
                          Block IP
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="bg-white rounded-2xl p-4 shadow-sm mb-3">
                <div className="text-sm font-bold text-ink mb-3">🚫 Funga IP Address</div>
                <div className="space-y-2">
                  <input value={blockIp} onChange={e => setBlockIp(e.target.value)} placeholder="IP Address (mf: 192.168.1.1)" className="input-field font-mono" />
                  <input value={blockReason} onChange={e => setBlockReason(e.target.value)} placeholder="Sababu ya kufunga" className="input-field" />
                  <button onClick={handleBlockIp} className="w-full py-2.5 bg-red-600 text-white rounded-xl text-sm font-bold active:scale-[.98] transition-transform">🚫 Funga IP</button>
                </div>
              </div>
              {security?.blocked_ips?.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-3">
                  <div className="px-4 py-3 border-b border-black/5">
                    <span className="text-sm font-bold text-ink">IPs Zilizofungwa ({security.blocked_ips.length})</span>
                  </div>
                  {security.blocked_ips.map((b, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-black/4 last:border-0">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold font-mono text-ink">{b.ip_address}</div>
                        <div className="text-2xs text-ink-4">{b.reason}</div>
                      </div>
                      <Badge color="red">Blocked</Badge>
                    </div>
                  ))}
                </div>
              )}
              {!security?.alerts?.length && !security?.blocked_ips?.length && (
                <EmptyState icon="✅" title="Hakuna vitisho vya sasa hivi" subtitle="Mfumo uko salama. Hakuna IP zinazoshukiwa." />
              )}
            </>
          )}

          {/* TAB 6: ANALYTICS - NEW WITH CHARTS */}
          {tab === 6 && (
            <div className="space-y-4">
              {/* Revenue Chart */}
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-surface-4">
                <h3 className="text-sm font-bold text-ink mb-4">📈 Mapato kwa Mwezi (TZS)</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`} />
                    <Tooltip formatter={(value) => [`TSh ${value.toLocaleString()}`, 'Mapato']} />
                    <Legend />
                    <Line type="monotone" dataKey="revenue" stroke="#0d5c36" strokeWidth={2} dot={{ fill: '#0d5c36', r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* User Growth Chart */}
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-surface-4">
                <h3 className="text-sm font-bold text-ink mb-4">👥 Ukuaji wa Watumiaji</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={userGrowthData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="users" stroke="#c8933a" strokeWidth={2} dot={{ fill: '#c8933a', r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Property Type Distribution - Pie Chart */}
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-surface-4">
                <h3 className="text-sm font-bold text-ink mb-4">🏠 Usambazaji wa Aina za Mali</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={propertyTypeData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {propertyTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* City Distribution - Bar Chart */}
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-surface-4">
                <h3 className="text-sm font-bold text-ink mb-4">📍 Usambazaji wa Mali kwa Miji</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={cityData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="value" fill="#0d5c36" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Quick Stats Summary */}
              <div className="grid grid-cols-2 gap-2.5">
                <StatCard icon="🏠" label="Jumla ya Mali" value={props.length} sub="zilizoorodheshwa" />
                <StatCard icon="👥" label="Jumla ya Watumiaji" value={users.length} sub="waliojiunga" />
                <StatCard icon="💰" label="Jumla ya Mapato" value={formatPrice(totalRevenue)} sub="malipo yote" />
                <StatCard icon="⭐" label="Wastani wa Rating" value={(users.reduce((s, u) => s + (u.rating || 0), 0) / (users.length || 1)).toFixed(1)} sub="kati ya 5" />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}