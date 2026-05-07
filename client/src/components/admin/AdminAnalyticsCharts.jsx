import React, { useEffect, useRef } from 'react';

const TSH = (n) => {
  if (!n) return 'TSh 0';
  if (n >= 1_000_000) return `TSh ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `TSh ${(n / 1_000).toFixed(0)}K`;
  return `TSh ${Number(n).toLocaleString()}`;
};

const StatCard = ({ icon, label, value, sub }) => (
  <div className="bg-white rounded-2xl p-4 shadow-soft border border-surface-4">
    <div className="text-2xl mb-2">{icon}</div>
    <div className="text-2xs font-bold text-ink-4 uppercase tracking-wide">{label}</div>
    <div className="font-serif text-xl font-bold text-ink">{typeof value === 'number' ? value.toLocaleString() : value}</div>
    {sub && <div className="text-2xs text-ink-4 mt-0.5">{sub}</div>}
  </div>
);

export default function AdminAnalyticsCharts({ stats = {}, payments = [], properties = [], users = [] }) {
  const revenueCanvas = useRef(null);
  const usersCanvas = useRef(null);
  const typeCanvas = useRef(null);
  const chartInstances = useRef({});

  // Group payments by month
  const revenueByMonth = React.useMemo(() => {
    const map = {};
    payments.filter(p => p.status === 'completed').forEach(p => {
      const d = new Date(p.created_at);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      map[key] = (map[key] || 0) + parseFloat(p.amount || 0);
    });
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0])).slice(-6);
  }, [payments]);

  // Group users by month
  const usersByMonth = React.useMemo(() => {
    const map = {};
    users.forEach(u => {
      const d = new Date(u.created_at);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0])).slice(-6);
  }, [users]);

  // Property type distribution
  const typeDistribution = React.useMemo(() => {
    const types = { nyumba: 0, chumba: 0, frem: 0, ofisi: 0 };
    properties.forEach(p => {
      if (types[p.type] !== undefined) types[p.type]++;
    });
    return Object.entries(types).filter(([, v]) => v > 0);
  }, [properties]);

  // Revenue Chart
  useEffect(() => {
    if (!revenueCanvas.current || !window.Chart || revenueByMonth.length === 0) return;
    if (chartInstances.current.revenue) chartInstances.current.revenue.destroy();
    chartInstances.current.revenue = new window.Chart(revenueCanvas.current, {
      type: 'line',
      data: {
        labels: revenueByMonth.map(([k]) => {
          const [y, m] = k.split('-');
          return new Date(y, m - 1).toLocaleString('default', { month: 'short' });
        }),
        datasets: [{
          label: 'Mapato (TSh)',
          data: revenueByMonth.map(([, v]) => v),
          borderColor: '#0d5c36',
          backgroundColor: 'rgba(13,92,54,0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => ` ${TSH(ctx.raw)}` } } },
        scales: { y: { beginAtZero: true, ticks: { callback: (v) => TSH(v) } } }
      }
    });
    return () => { if (chartInstances.current.revenue) chartInstances.current.revenue.destroy(); };
  }, [revenueByMonth]);

  // Users Chart
  useEffect(() => {
    if (!usersCanvas.current || !window.Chart || usersByMonth.length === 0) return;
    if (chartInstances.current.users) chartInstances.current.users.destroy();
    chartInstances.current.users = new window.Chart(usersCanvas.current, {
      type: 'bar',
      data: {
        labels: usersByMonth.map(([k]) => {
          const [y, m] = k.split('-');
          return new Date(y, m - 1).toLocaleString('default', { month: 'short' });
        }),
        datasets: [{ label: 'Watumiaji Wapya', data: usersByMonth.map(([, v]) => v), backgroundColor: '#0d5c36', borderRadius: 8 }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
    });
    return () => { if (chartInstances.current.users) chartInstances.current.users.destroy(); };
  }, [usersByMonth]);

  // Property Type Pie Chart
  useEffect(() => {
    if (!typeCanvas.current || !window.Chart || typeDistribution.length === 0) return;
    if (chartInstances.current.type) chartInstances.current.type.destroy();
    const typeLabels = { nyumba: 'Nyumba', chumba: 'Chumba', frem: 'Frem', ofisi: 'Ofisi' };
    chartInstances.current.type = new window.Chart(typeCanvas.current, {
      type: 'doughnut',
      data: {
        labels: typeDistribution.map(([k]) => typeLabels[k]),
        datasets: [{ data: typeDistribution.map(([, v]) => v), backgroundColor: ['#0d5c36', '#52b47d', '#c8933a', '#2563eb'], borderWidth: 0 }]
      },
      options: { responsive: true, maintainAspectRatio: false, cutout: '65%', plugins: { legend: { position: 'bottom', labels: { font: { size: 11 } } } } }
    });
    return () => { if (chartInstances.current.type) chartInstances.current.type.destroy(); };
  }, [typeDistribution]);

  const totalRevenue = payments.filter(p => p.status === 'completed').reduce((s, p) => s + parseFloat(p.amount || 0), 0);
  const activeProperties = properties.filter(p => p.status === 'active').length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <StatCard icon="👥" label="Watumiaji Wote" value={users.length} sub="waliojisajili" />
        <StatCard icon="🏠" label="Matangazo" value={activeProperties} sub="yanayotumika" />
        <StatCard icon="💰" label="Mapato Yote" value={TSH(totalRevenue)} />
        <StatCard icon="✅" label="Malipo" value={payments.filter(p => p.status === 'completed').length} sub="yaliyokamilika" />
      </div>
      <div className="bg-white rounded-2xl p-4 shadow-soft border border-surface-4">
        <h3 className="text-sm font-bold text-ink mb-1">💰 Mapato kwa Miezi</h3>
        <div style={{ height: 200 }}><canvas ref={revenueCanvas} /></div>
      </div>
      <div className="bg-white rounded-2xl p-4 shadow-soft border border-surface-4">
        <h3 className="text-sm font-bold text-ink mb-1">👥 Watumiaji Wapya</h3>
        <div style={{ height: 200 }}><canvas ref={usersCanvas} /></div>
      </div>
      <div className="bg-white rounded-2xl p-4 shadow-soft border border-surface-4">
        <h3 className="text-sm font-bold text-ink mb-1">🏠 Usambazaji wa Aina za Mali</h3>
        <div style={{ height: 200 }}><canvas ref={typeCanvas} /></div>
      </div>
    </div>
  );
}