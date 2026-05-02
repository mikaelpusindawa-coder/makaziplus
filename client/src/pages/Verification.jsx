import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { TopBar } from '../components/layout/TopBar';
import { Spinner } from '../components/common/Spinner';
import api from '../utils/api';

export default function Verification() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [verificationRequest, setVerificationRequest] = useState(null);
  
  // Form state
  const [idType, setIdType] = useState('nida');
  const [idNumber, setIdNumber] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [idDocumentFront, setIdDocumentFront] = useState(null);
  const [idDocumentBack, setIdDocumentBack] = useState(null);
  const [selfie, setSelfie] = useState(null);
  
  // Preview URLs
  const [frontPreview, setFrontPreview] = useState('');
  const [backPreview, setBackPreview] = useState('');
  const [selfiePreview, setSelfiePreview] = useState('');
  
  // Step tracking
  const [step, setStep] = useState(1); // 1: ID Info, 2: Documents, 3: Review & Submit

  // Load existing verification status
  useEffect(() => {
    const loadVerification = async () => {
      try {
        const [statusRes, requestRes] = await Promise.all([
          api.get('/verification/status'),
          api.get('/admin/verifications/all').catch(() => ({ data: { data: [] } }))
        ]);
        setVerificationStatus(statusRes.data.data);
        const userRequest = requestRes.data?.data?.find(r => r.user_id === user?.id);
        if (userRequest) {
          setVerificationRequest(userRequest);
          setIdType(userRequest.id_type);
          setIdNumber(userRequest.id_number);
          if (userRequest.id_document_front) setFrontPreview(userRequest.id_document_front);
          if (userRequest.id_document_back) setBackPreview(userRequest.id_document_back);
          if (userRequest.selfie_url) setSelfiePreview(userRequest.selfie_url);
        }
      } catch (err) {
        console.error('Load verification error:', err);
      } finally {
        setLoading(false);
      }
    };
    
    if (user) {
      loadVerification();
    } else {
      setLoading(false);
    }
  }, [user]);

  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 10 * 1024 * 1024) {
      toast('Faili ni kubwa sana (max 10MB)', 'error');
      return;
    }
    
    if (!file.type.startsWith('image/')) {
      toast('Tafadhali chagua picha tu', 'error');
      return;
    }
    
    const previewUrl = URL.createObjectURL(file);
    
    switch (type) {
      case 'front':
        setIdDocumentFront(file);
        setFrontPreview(previewUrl);
        break;
      case 'back':
        setIdDocumentBack(file);
        setBackPreview(previewUrl);
        break;
      case 'selfie':
        setSelfie(file);
        setSelfiePreview(previewUrl);
        break;
      default:
        break;
    }
  };

  const validateStep1 = () => {
    if (!idNumber.trim()) {
      toast('Weka namba ya kitambulisho', 'error');
      return false;
    }
    
    if (idType === 'nida' && !/^\d{20}$/.test(idNumber)) {
      toast('NIDA lazima iwe na tarakimu 20', 'error');
      return false;
    }
    
    if (idType === 'passport') {
      if (!/^[A-Z]{2}\d{7}$/.test(idNumber) && !/^\d{8,9}$/.test(idNumber)) {
        toast('Nambari ya pasipoti si sahihi. Mfano: AB1234567 au 12345678', 'error');
        return false;
      }
    }
    
    if (idType === 'driving_license' && !/^[A-Z0-9]{6,15}$/i.test(idNumber)) {
      toast('Nambari ya leseni si sahihi', 'error');
      return false;
    }
    
    return true;
  };

  const validateStep2 = () => {
    if (!idDocumentFront) {
      toast('Pakia picha ya mbele ya kitambulisho', 'error');
      return false;
    }
    
    if ((idType === 'nida' || idType === 'driving_license') && !idDocumentBack) {
      toast('Pakia picha ya nyuma ya kitambulisho', 'error');
      return false;
    }
    
    if (!selfie) {
      toast('Pakia picha yako (selfie) na kitambulisho mkononi', 'error');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('id_type', idType);
      formData.append('id_number', idNumber.trim());
      if (phoneNumber) formData.append('phone_number', phoneNumber);
      if (idDocumentFront) formData.append('id_document_front', idDocumentFront);
      if (idDocumentBack) formData.append('id_document_back', idDocumentBack);
      if (selfie) formData.append('selfie', selfie);
      
      await api.post('/verification/submit', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      toast('Ombi lako limewasilishwa! Tutakujulisha ndani ya masaa 24.', 'success');
      
      // Refresh verification status
      const statusRes = await api.get('/verification/status');
      setVerificationStatus(statusRes.data.data);
      
      // Reset form
      setStep(1);
      setIdDocumentFront(null);
      setIdDocumentBack(null);
      setSelfie(null);
      
    } catch (err) {
      toast(err.response?.data?.message || 'Hitilafu wakati wa kutuma ombi', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusDisplay = () => {
    if (user?.verified || user?.is_verified) {
      return {
        title: 'Akaunti Yako Imethibitishwa ✅',
        message: 'Umethibitishwa kikamilifu. Unaweza kutumia huduma zote za MakaziPlus.',
        color: 'bg-green-50 border-green-200',
        textColor: 'text-green-700',
        icon: '✅'
      };
    }
    
    if (verificationStatus?.status === 'pending') {
      return {
        title: 'Uthibitisho Unasubiriwa ⏳',
        message: `Ombi lako la uthibitisho limeshafika. Tunaukagua na tutakujulisha ndani ya masaa 24.`,
        color: 'bg-yellow-50 border-yellow-200',
        textColor: 'text-yellow-700',
        icon: '⏳'
      };
    }
    
    if (verificationStatus?.status === 'rejected') {
      return {
        title: 'Uthibitisho Umekataliwa ❌',
        message: verificationStatus?.admin_notes || 'Ombi lako limekataliwa. Tafadhali wasiliana na msaada kwa maelezo zaidi.',
        color: 'bg-red-50 border-red-200',
        textColor: 'text-red-700',
        icon: '❌'
      };
    }
    
    return null;
  };

  const statusDisplay = getStatusDisplay();
  const isVerified = user?.verified || user?.is_verified;
  const hasPendingRequest = verificationStatus?.status === 'pending';
  const hasRejectedRequest = verificationStatus?.status === 'rejected';

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!user) {
    navigate('/auth');
    return null;
  }

  // If already verified, show success page
  if (isVerified) {
    return (
      <div className="min-h-screen bg-surface pb-24 md:pb-8">
        <TopBar title="Uthibitisho wa Akaunti" showBack />
        
        <div className="max-w-md mx-auto px-4 pt-8">
          <div className="bg-white rounded-3xl p-8 text-center shadow-card border border-green-100">
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <span className="text-5xl">✅</span>
            </div>
            <h1 className="font-serif text-2xl font-semibold text-ink mb-2">Umethibitishwa!</h1>
            <p className="text-sm text-ink-5 mb-6">
              Akaunti yako imethibitishwa kikamilifu. Una nembo ya uthibitisho kwenye profaili yako.
            </p>
            
            <div className="bg-primary-50 rounded-2xl p-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white">
                  ✓
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-primary">Manufaa ya Kuwa Mthibitishwa</p>
                  <p className="text-2xs text-primary-600">Wateja wanakuamini zaidi, bookings nyingi, na mauzo zaidi</p>
                </div>
              </div>
            </div>
            
            <button
              onClick={() => navigate('/profile')}
              className="btn-primary"
            >
              Rudi kwenye Profaili
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If pending request, show waiting page
  if (hasPendingRequest) {
    return (
      <div className="min-h-screen bg-surface pb-24 md:pb-8">
        <TopBar title="Uthibitisho wa Akaunti" showBack />
        
        <div className="max-w-md mx-auto px-4 pt-8">
          <div className="bg-white rounded-3xl p-8 text-center shadow-card border border-yellow-100">
            <div className="w-24 h-24 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-5 animate-pulse">
              <span className="text-5xl">⏳</span>
            </div>
            <h1 className="font-serif text-2xl font-semibold text-ink mb-2">Inakaguliwa...</h1>
            <p className="text-sm text-ink-5 mb-4">
              Ombi lako la uthibitisho limeshafika. Tunaukagua na tutakujulisha ndani ya masaa 24.
            </p>
            
            <div className="bg-yellow-50 rounded-2xl p-4 mb-6">
              <p className="text-xs text-yellow-700">
                📌 Unaweza kuendelea kutumia MakaziPlus wakati ombi lako linakaguliwa.
              </p>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm p-3 bg-surface rounded-xl">
                <span className="text-ink-5">Aina ya Kitambulisho</span>
                <span className="font-semibold text-ink capitalize">{verificationRequest?.id_type || idType}</span>
              </div>
              <div className="flex items-center justify-between text-sm p-3 bg-surface rounded-xl">
                <span className="text-ink-5">Namba ya Kitambulisho</span>
                <span className="font-semibold text-ink">{verificationRequest?.id_number || idNumber}</span>
              </div>
              <div className="flex items-center justify-between text-sm p-3 bg-surface rounded-xl">
                <span className="text-ink-5">Tarehe ya Kutuma</span>
                <span className="font-semibold text-ink">
                  {verificationRequest?.created_at ? new Date(verificationRequest.created_at).toLocaleDateString() : 'Leo'}
                </span>
              </div>
            </div>
            
            <button
              onClick={() => navigate('/profile')}
              className="btn-primary mt-6"
            >
              Rudi kwenye Profaili
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main verification form
  return (
    <div className="min-h-screen bg-surface pb-24 md:pb-8">
      <TopBar title="Thibitisha Akaunti Yako" showBack />
      
      <div className="max-w-md mx-auto px-4 py-4">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-20 h-20 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🔒</span>
          </div>
          <h1 className="font-serif text-2xl font-semibold text-ink">Uthibitisho wa Utambulisho</h1>
          <p className="text-sm text-ink-5 mt-1">Jaza taarifa zako hapa chini ili kuthibitisha akaunti yako</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all
                ${step >= s ? 'bg-primary text-white' : 'bg-surface-3 text-ink-5'}`}
              >
                {step > s ? '✓' : s}
              </div>
              {s < 3 && (
                <div className={`w-12 h-0.5 mx-1 transition-all ${step > s ? 'bg-primary' : 'bg-surface-3'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: ID Information */}
        {step === 1 && (
          <div className="bg-white rounded-2xl p-5 shadow-soft border border-surface-4 space-y-5 animate-fade-in">
            <div>
              <label className="block text-xs font-bold text-ink-4 uppercase tracking-wider mb-2">
                Aina ya Kitambulisho
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'nida', label: 'NIDA', icon: '🪪', desc: 'Tarakimu 20' },
                  { id: 'passport', label: 'Pasipoti', icon: '📘', desc: 'AB1234567' },
                  { id: 'driving_license', label: 'Leseni', icon: '🚗', desc: 'Kwa Madereva' },
                  { id: 'tin', label: 'TIN', icon: '📄', desc: 'Namba ya Kodi' },
                ].map(type => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setIdType(type.id)}
                    className={`p-3 rounded-xl border-2 text-center transition-all active:scale-95
                      ${idType === type.id ? 'border-primary bg-primary-50' : 'border-surface-4'}`}
                  >
                    <div className="text-2xl mb-1">{type.icon}</div>
                    <div className={`text-xs font-bold ${idType === type.id ? 'text-primary' : 'text-ink-4'}`}>
                      {type.label}
                    </div>
                    <div className="text-2xs text-ink-5">{type.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-ink-4 uppercase tracking-wider mb-2">
                Namba ya Kitambulisho
                {idType === 'nida' && <span className="text-primary ml-1">(Tarakimu 20)</span>}
              </label>
              <input
                type="text"
                value={idNumber}
                onChange={(e) => setIdNumber(e.target.value)}
                placeholder={idType === 'nida' ? '12345678901234567890' : 'Weka namba yako'}
                className="input-field font-mono"
                maxLength={idType === 'nida' ? 20 : 50}
              />
              {idType === 'nida' && idNumber && !/^\d{20}$/.test(idNumber) && (
                <p className="text-xs text-red-500 mt-1">⚠️ NIDA lazima iwe na tarakimu 20</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-ink-4 uppercase tracking-wider mb-2">
                Nambari ya Simu (Kwa Uthibitisho)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-5">+255</span>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="7XX XXX XXX"
                  className="input-field pl-14"
                />
              </div>
              <p className="text-2xs text-ink-5 mt-1">
                Namba ya simu itakayotumiwa kuthibitisha utambulisho wako
              </p>
            </div>

            <button
              onClick={() => validateStep1() && setStep(2)}
              className="btn-primary mt-2"
            >
              Endelea →
            </button>
          </div>
        )}

        {/* Step 2: Document Upload */}
        {step === 2 && (
          <div className="bg-white rounded-2xl p-5 shadow-soft border border-surface-4 space-y-5 animate-fade-in">
            <div className="bg-blue-50 rounded-xl p-3 text-xs text-blue-700">
              <span className="font-bold">📌</span> Hakikisha picha zako zinaonekana vizuri na taarifa zinasomeka.
            </div>

            {/* Front of ID */}
            <div>
              <label className="block text-xs font-bold text-ink-4 uppercase tracking-wider mb-2">
                Picha ya Mbele ya Kitambulisho *
              </label>
              <div className="border-2 border-dashed border-surface-4 rounded-xl p-4 text-center cursor-pointer hover:border-primary transition-all"
                onClick={() => document.getElementById('front-input').click()}
              >
                <input id="front-input" type="file" accept="image/*" className="hidden"
                  onChange={(e) => handleFileChange(e, 'front')} />
                {frontPreview ? (
                  <div className="relative">
                    <img src={frontPreview} alt="Front of ID" className="max-h-32 mx-auto rounded-lg" />
                    <button
                      onClick={(e) => { e.stopPropagation(); setFrontPreview(''); setIdDocumentFront(null); }}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full text-white text-xs"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="text-3xl mb-2">📷</div>
                    <p className="text-xs text-ink-5">Bonyeza kupakia picha ya mbele</p>
                  </div>
                )}
              </div>
            </div>

            {/* Back of ID (for NIDA and Driving License) */}
            {(idType === 'nida' || idType === 'driving_license') && (
              <div>
                <label className="block text-xs font-bold text-ink-4 uppercase tracking-wider mb-2">
                  Picha ya Nyuma ya Kitambulisho *
                </label>
                <div className="border-2 border-dashed border-surface-4 rounded-xl p-4 text-center cursor-pointer hover:border-primary transition-all"
                  onClick={() => document.getElementById('back-input').click()}
                >
                  <input id="back-input" type="file" accept="image/*" className="hidden"
                    onChange={(e) => handleFileChange(e, 'back')} />
                  {backPreview ? (
                    <div className="relative">
                      <img src={backPreview} alt="Back of ID" className="max-h-32 mx-auto rounded-lg" />
                      <button
                        onClick={(e) => { e.stopPropagation(); setBackPreview(''); setIdDocumentBack(null); }}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full text-white text-xs"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div className="text-3xl mb-2">📷</div>
                      <p className="text-xs text-ink-5">Bonyeza kupakia picha ya nyuma</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Selfie with ID */}
            <div>
              <label className="block text-xs font-bold text-ink-4 uppercase tracking-wider mb-2">
                Selfie na Kitambulisho Mkononi *
              </label>
              <div className="border-2 border-dashed border-surface-4 rounded-xl p-4 text-center cursor-pointer hover:border-primary transition-all"
                onClick={() => document.getElementById('selfie-input').click()}
              >
                <input id="selfie-input" type="file" accept="image/*" className="hidden"
                  onChange={(e) => handleFileChange(e, 'selfie')} />
                {selfiePreview ? (
                  <div className="relative">
                    <img src={selfiePreview} alt="Selfie with ID" className="max-h-32 mx-auto rounded-lg" />
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelfiePreview(''); setSelfie(null); }}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full text-white text-xs"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="text-3xl mb-2">🤳</div>
                    <p className="text-xs text-ink-5">Piga picha yako ukiwa na kitambulisho mkononi</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="flex-1 py-3 border-2 border-surface-4 text-ink-4 rounded-xl font-semibold text-sm">
                ← Nyuma
              </button>
              <button onClick={() => validateStep2() && setStep(3)} className="flex-1 btn-primary">
                Endelea →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Review & Submit */}
        {step === 3 && (
          <div className="bg-white rounded-2xl p-5 shadow-soft border border-surface-4 space-y-5 animate-fade-in">
            <h3 className="text-sm font-bold text-ink">Kagua Taarifa Zako</h3>
            
            <div className="space-y-3">
              <div className="flex justify-between text-sm p-3 bg-surface rounded-xl">
                <span className="text-ink-5">Aina ya Kitambulisho</span>
                <span className="font-semibold text-ink capitalize">{idType}</span>
              </div>
              <div className="flex justify-between text-sm p-3 bg-surface rounded-xl">
                <span className="text-ink-5">Namba ya Kitambulisho</span>
                <span className="font-semibold text-ink font-mono">{idNumber}</span>
              </div>
              {phoneNumber && (
                <div className="flex justify-between text-sm p-3 bg-surface rounded-xl">
                  <span className="text-ink-5">Namba ya Simu</span>
                  <span className="font-semibold text-ink">+255 {phoneNumber}</span>
                </div>
              )}
              <div className="flex justify-between text-sm p-3 bg-surface rounded-xl">
                <span className="text-ink-5">Picha ya Mbele</span>
                <span className="text-green-600">✓ Imepakiwa</span>
              </div>
              {(idType === 'nida' || idType === 'driving_license') && (
                <div className="flex justify-between text-sm p-3 bg-surface rounded-xl">
                  <span className="text-ink-5">Picha ya Nyuma</span>
                  <span className="text-green-600">✓ Imepakiwa</span>
                </div>
              )}
              <div className="flex justify-between text-sm p-3 bg-surface rounded-xl">
                <span className="text-ink-5">Selfie</span>
                <span className="text-green-600">✓ Imepakiwa</span>
              </div>
            </div>

            <div className="bg-yellow-50 rounded-xl p-3 text-xs text-yellow-700">
              <span className="font-bold">⚠️</span> Hakikisha taarifa zako ni sahihi. Utoaji wa taarifa zisizo sahihi unaweza kusababisha kukataliwa kwa ombi lako.
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="flex-1 py-3 border-2 border-surface-4 text-ink-4 rounded-xl font-semibold text-sm">
                ← Nyuma
              </button>
              <button onClick={handleSubmit} disabled={submitting} className="flex-1 btn-primary">
                {submitting ? <><Spinner size="sm" color="white" /> Inatuma...</> : 'Tuma Ombi'}
              </button>
            </div>
          </div>
        )}

        {/* Info footer */}
        <div className="text-center mt-6">
          <p className="text-2xs text-ink-5">
            MakaziPlus inatumia teknolojia ya usalama ya hali ya juu kulinda taarifa zako.
            <br />
            Taarifa zako hazitashirikiwa na watu wengine.
          </p>
        </div>
      </div>
    </div>
  );
}