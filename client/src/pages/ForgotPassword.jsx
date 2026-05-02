import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { Spinner } from '../components/common/Spinner';
import api from '../utils/api';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step,      setStep]      = useState(1); // 1=email, 2=otp, 3=new password
  const [email,     setEmail]     = useState('');
  const [otp,       setOtp]       = useState('');
  const [userId,    setUserId]    = useState(null);
  const [newPass,   setNewPass]   = useState('');
  const [confirm,   setConfirm]   = useState('');
  const [loading,   setLoading]   = useState(false);

  const handleRequestOTP = async (e) => {
    e.preventDefault();
    if (!email.trim()) { toast('Weka barua pepe au simu','error'); return; }
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: email.trim() });
      toast('OTP imetumwa! Angalia simu/barua pepe yako','success');
      setStep(2);
    } catch(e) {
      toast(e.response?.data?.message||'Hitilafu ya seva','error');
    } finally { setLoading(false); }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (!otp.trim()) { toast('Weka OTP iliyotumwa','error'); return; }
    setLoading(true);
    try {
      const r = await api.post('/auth/verify-otp', { email: email.trim(), otp: otp.trim() });
      setUserId(r.data.user_id);
      toast('OTP imethibitishwa! ✓','success');
      setStep(3);
    } catch(e) {
      toast(e.response?.data?.message||'OTP si sahihi','error');
    } finally { setLoading(false); }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPass.length < 8) { toast('Nywila lazima iwe herufi 8+','error'); return; }
    if (newPass !== confirm) { toast('Nywila hazifanani','error'); return; }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { email: email.trim(), user_id: userId, new_password: newPass });
      toast('Nywila imebadilishwa! Ingia sasa.','success');
      navigate('/auth');
    } catch(e) {
      toast(e.response?.data?.message||'Hitilafu ya seva','error');
    } finally { setLoading(false); }
  };

  const STEPS = ['Barua Pepe','Thibitisha OTP','Nywila Mpya'];

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-5">
      {/* Background */}
      <div className="fixed inset-0 opacity-5 pointer-events-none">
        <div className="w-full h-full bg-primary"/>
      </div>

      <div className="w-full max-w-md relative">
        {/* Logo */}
        <div className="text-center mb-8">
          <button onClick={()=>navigate('/auth')} className="font-serif text-3xl font-semibold text-primary">
            Makazi<span className="text-gold">Plus</span>
          </button>
          <p className="text-sm text-ink-5 mt-1">Rudisha Nywila</p>
        </div>

        {/* Step indicators */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((s,i)=>(
            <React.Fragment key={i}>
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all
                  ${i+1 < step ? 'bg-primary text-white' : i+1 === step ? 'bg-primary text-white ring-4 ring-primary/20' : 'bg-surface-4 text-ink-5'}`}>
                  {i+1 < step ? '✓' : i+1}
                </div>
                <span className={`text-[9px] mt-1 font-medium ${i+1===step?'text-primary':'text-ink-6'}`}>{s}</span>
              </div>
              {i < STEPS.length-1 && (
                <div className={`flex-1 h-0.5 mb-4 transition-all ${i+1 < step ? 'bg-primary' : 'bg-surface-4'}`}/>
              )}
            </React.Fragment>
          ))}
        </div>

        <div className="bg-white rounded-3xl p-7 shadow-card">

          {step === 1 && (
            <form onSubmit={handleRequestOTP} className="space-y-5">
              <div>
                <h2 className="font-serif text-2xl font-semibold text-ink mb-1">Umesahau Nywila?</h2>
                <p className="text-sm text-ink-5">Weka barua pepe au nambari ya simu yako. Tutatuma OTP.</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-ink-4 uppercase tracking-wider mb-2">Barua Pepe au Simu</label>
                <input value={email} onChange={e=>setEmail(e.target.value)}
                  placeholder="barua@email.com au +255..." autoFocus className="input-field"/>
              </div>
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? <><Spinner size="sm" color="white"/>Inatuma OTP...</> : 'Tuma OTP →'}
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleVerifyOTP} className="space-y-5">
              <div>
                <h2 className="font-serif text-2xl font-semibold text-ink mb-1">Weka OTP</h2>
                <p className="text-sm text-ink-5">
                  OTP ya namba 6 imetumwa kwa <strong>{email}</strong>.
                </p>
              </div>
              <div>
                <label className="block text-xs font-bold text-ink-4 uppercase tracking-wider mb-2">Nambari ya OTP</label>
                <input value={otp} onChange={e=>setOtp(e.target.value.replace(/\D/g,'').substring(0,6))}
                  placeholder="123456" maxLength={6} autoFocus
                  className="input-field text-center text-2xl font-bold tracking-[0.5em]"/>
              </div>
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? <><Spinner size="sm" color="white"/>Inathibitisha...</> : 'Thibitisha OTP →'}
              </button>
              <button type="button" onClick={()=>setStep(1)}
                className="w-full text-center text-sm text-ink-5 hover:text-primary transition-colors py-2">
                ← Rudi Nyuma
              </button>
            </form>
          )}

          {step === 3 && (
            <form onSubmit={handleResetPassword} className="space-y-5">
              <div>
                <h2 className="font-serif text-2xl font-semibold text-ink mb-1">Nywila Mpya</h2>
                <p className="text-sm text-ink-5">Weka nywila yako mpya. Lazima iwe herufi 8 au zaidi.</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-ink-4 uppercase tracking-wider mb-2">Nywila Mpya</label>
                <input value={newPass} onChange={e=>setNewPass(e.target.value)}
                  type="password" placeholder="Angalau herufi 8" autoFocus className="input-field"/>
              </div>
              <div>
                <label className="block text-xs font-bold text-ink-4 uppercase tracking-wider mb-2">Thibitisha Nywila</label>
                <input value={confirm} onChange={e=>setConfirm(e.target.value)}
                  type="password" placeholder="Rudia nywila" className="input-field"/>
              </div>
              {newPass && confirm && newPass !== confirm && (
                <p className="text-xs text-red-500">⚠ Nywila hazifanani</p>
              )}
              <button type="submit" disabled={loading||!newPass||newPass!==confirm} className="btn-primary">
                {loading ? <><Spinner size="sm" color="white"/>Inabadilisha...</> : 'Badilisha Nywila →'}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-sm text-ink-5 mt-6">
          Umekumbuka nywila?{' '}
          <button onClick={()=>navigate('/auth')} className="text-primary font-bold hover:underline">
            Ingia hapa
          </button>
        </p>
      </div>
    </div>
  );
}
