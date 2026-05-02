import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { TopBar } from '../components/layout/TopBar';
import { Spinner } from '../components/common/Spinner';
import api from '../utils/api';

// FAQ Accordion Item
const FaqItem = ({ question, answer, isOpen, onToggle }) => {
  return (
    <div className="border-b border-surface-4 last:border-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between py-4 px-2 text-left hover:bg-surface transition-colors"
      >
        <span className="text-sm font-semibold text-ink pr-4">{question}</span>
        <svg
          className={`w-5 h-5 text-ink-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div className="px-2 pb-4 animate-fade-in">
          <p className="text-sm text-ink-4 leading-relaxed">{answer}</p>
        </div>
      )}
    </div>
  );
};

// Contact Card Component
const ContactCard = ({ icon, label, value, action, onClick }) => {
  return (
    <button
      onClick={onClick || (() => window.location.href = action)}
      className="flex items-center gap-3.5 bg-white rounded-2xl px-4 py-3.5 shadow-soft border border-surface-4 hover:border-primary/30 hover:bg-primary-50 transition-all active:scale-[.99] w-full text-left"
    >
      <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center text-lg flex-shrink-0">
        {icon}
      </div>
      <div>
        <div className="text-xs font-bold text-ink-4 uppercase tracking-wider">{label}</div>
        <div className="text-sm font-semibold text-ink">{value}</div>
      </div>
      <svg className="w-4 h-4 stroke-ink-6 ml-auto flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </button>
  );
};

// Quick Link Component
const QuickLink = ({ icon, label, path, onClick }) => {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => onClick ? onClick() : navigate(path)}
      className="bg-white rounded-2xl py-3.5 flex flex-col items-center gap-1.5 shadow-soft border border-surface-4 active:scale-95 transition-all hover:border-primary/30 hover:bg-primary-50 flex-1"
    >
      <span className="text-xl">{icon}</span>
      <span className="text-2xs font-semibold text-ink-4 text-center leading-tight">{label}</span>
    </button>
  );
};

// Tab Component
const Tab = ({ active, onClick, label, icon }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all
      ${active ? 'bg-primary text-white shadow-green' : 'bg-white text-ink-4 hover:bg-surface'}`}
  >
    <span>{icon}</span> {label}
  </button>
);

export default function HelpCenter() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState('faq');
  const [faqs, setFaqs] = useState([]);
  const [loadingFaqs, setLoadingFaqs] = useState(true);
  const [openFaqId, setOpenFaqId] = useState(null);
  
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Load FAQs
  useEffect(() => {
    const loadFaqs = async () => {
      setLoadingFaqs(true);
      try {
        const r = await api.get('/help/faqs');
        setFaqs(r.data.data || []);
      } catch (err) {
        // Fallback FAQs if API fails
        setFaqs([
          { id: 1, question: 'Jinsi ya kuunda akaunti?', answer: 'Bonyeza "Jisajili" kwenye ukurasa wa kuingia. Jaza maelezo yako na utume. Utapewa taarifa kwenye barua pepe yako.' },
          { id: 2, question: 'Je, ni bei gani ya kuweka tangazo?', answer: 'Kuweka tangazo la kawaida ni bure. Kwa tangazo la Premium unalipa TSh 10,000 kwa wiki au TSh 30,000 kwa mwezi.' },
          { id: 3, question: 'Jinsi ya kuwasiliana na dalali?', answer: 'Bonyeza kitufe cha "Wasiliana" kwenye ukurasa wa mali. Utapata uwezo wa kuzungumza na dalali kwa njia ya mazungumzo.' },
          { id: 4, question: 'Je, ninauwezo wa kubadilisha nywila?', answer: 'Ndiyo. Nenda kwenye "Akaunti" → "Mipangilio" na ufuate maagizo ya kubadilisha nywila.' },
          { id: 5, question: 'Je, taarifa zangu ziko salama?', answer: 'Ndiyo. Tunatumia teknolojia ya kisasa ya usalama (bcrypt, JWT, HTTPS) kulinda taarifa zako zote.' },
          { id: 6, question: 'Ninawezaje kuthibitisha akaunti yangu?', answer: 'Nenda kwenye Akaunti → Thibitisha Utambulisho. Jaza namba ya NIDA au pasipoti yako kisha subiri uthibitisho wa admin.' },
          { id: 7, question: 'Je, ninaweza kubatilisha malipo?', answer: 'Malipo ya digital hayabatilishwi mara baada ya kuthibitishwa. Wasiliana na msaada wetu kwa masuala ya malipo.' },
          { id: 8, question: 'Jinsi ya kuongeza mali kwenye orodha?', answer: 'Unahitaji akaunti ya Dalali au Mwenye Nyumba. Bonyeza kitufe cha + chini ya skrini na jaza maelezo ya mali yako.' },
        ]);
      } finally {
        setLoadingFaqs(false);
      }
    };
    loadFaqs();
  }, []);

  const handleSubmitTicket = async (e) => {
    e.preventDefault();
    if (!user) {
      toast('Ingia kwanza kutuma ombi', 'error');
      navigate('/auth');
      return;
    }
    if (!subject.trim() || !message.trim()) {
      toast('Jaza sehemu zote', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/help/tickets', {
        subject: subject.trim(),
        message: message.trim()
      });
      toast('Ombi lako limetumwa! Tutajibu hivi karibuni. ✅', 'success');
      setSubject('');
      setMessage('');
    } catch (err) {
      toast(err.response?.data?.message || 'Hitilafu ya seva', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const CONTACTS = [
    { icon: '📧', label: 'Barua Pepe', value: 'support@makaziplus.co.tz', action: 'mailto:support@makaziplus.co.tz' },
    { icon: '📞', label: 'Simu', value: '+255 700 000 000', action: 'tel:+255700000000' },
    { icon: '💬', label: 'WhatsApp', value: '+255 700 000 001', action: 'https://wa.me/255700000001' },
  ];

  const QUICK_LINKS = [
    { icon: '🔔', label: 'Arifa', path: '/notifications' },
    { icon: '⭐', label: 'Upgradi Akaunti', path: '/subscription' },
    { icon: '👤', label: 'Hariri Profaili', path: '/profile' },
    { icon: '🏠', label: 'Matangazo Yangu', path: '/dashboard' },
    { icon: '🔒', label: 'Thibitisha Akaunti', path: '/verification' },
    { icon: '📅', label: 'Bookings Zangu', path: '/bookings' },
  ];

  return (
    <div className="min-h-screen bg-surface pb-24 md:pb-8 animate-fade-in-up">
      <TopBar title="Msaada & Mwongozo" showBack />

      {/* Hero Section */}
      <div className="bg-gradient-to-br from-primary to-primary-light px-5 py-6 relative overflow-hidden">
        <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-white/5 rounded-full" />
        <h1 className="font-serif text-xl font-semibold text-white">Jinsi Tunaweza Kusaidia? 🤝</h1>
        <p className="text-white/50 text-sm mt-1">Maswali, msaada wa kiufundi, na zaidi</p>
      </div>

      {/* Quick Links */}
      <div className="px-3 mt-4">
        <p className="text-xs font-bold text-ink-5 uppercase tracking-wider mb-2.5 px-1">Viungo vya Haraka</p>
        <div className="grid grid-cols-3 gap-2">
          {QUICK_LINKS.map(link => (
            <QuickLink key={link.path} icon={link.icon} label={link.label} path={link.path} />
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar px-3 mt-4 mb-3">
        <Tab active={activeTab === 'faq'} onClick={() => setActiveTab('faq')} label="Maswali" icon="❓" />
        <Tab active={activeTab === 'support'} onClick={() => setActiveTab('support')} label="Msaada" icon="🎫" />
        <Tab active={activeTab === 'privacy'} onClick={() => setActiveTab('privacy')} label="Faragha" icon="🔒" />
        <Tab active={activeTab === 'terms'} onClick={() => setActiveTab('terms')} label="Masharti" icon="📜" />
      </div>

      {/* FAQ Section */}
      {activeTab === 'faq' && (
        <div className="px-3">
          <div className="bg-white rounded-2xl shadow-soft overflow-hidden border border-surface-4">
            {loadingFaqs ? (
              <div className="flex justify-center py-12"><Spinner /></div>
            ) : (
              faqs.map((faq) => (
                <FaqItem
                  key={faq.id}
                  question={faq.question}
                  answer={faq.answer}
                  isOpen={openFaqId === faq.id}
                  onToggle={() => setOpenFaqId(openFaqId === faq.id ? null : faq.id)}
                />
              ))
            )}
          </div>
          
          {/* Still need help? */}
          <div className="mt-4 bg-primary-50 rounded-2xl p-4 text-center">
            <p className="text-sm font-semibold text-primary mb-2">Bado unahitaji msaada?</p>
            <p className="text-xs text-ink-5 mb-3">Wasiliana nasi moja kwa moja kwa njia zifuatazo</p>
            <button
              onClick={() => setActiveTab('support')}
              className="px-4 py-2 bg-primary text-white rounded-full text-xs font-bold"
            >
              Wasiliana Nasi →
            </button>
          </div>
        </div>
      )}

      {/* Support Section */}
      {activeTab === 'support' && (
        <div className="px-3 space-y-4">
          {/* Contact Cards */}
          <div>
            <p className="text-xs font-bold text-ink-5 uppercase tracking-wider mb-2.5 px-1">📞 Wasiliana Nasi</p>
            <div className="space-y-2">
              {CONTACTS.map(contact => (
                <ContactCard key={contact.label} {...contact} />
              ))}
            </div>
          </div>

          {/* Support Ticket Form */}
          <div>
            <p className="text-xs font-bold text-ink-5 uppercase tracking-wider mb-2.5 px-1">🎫 Tuma Ombi la Msaada</p>
            <div className="bg-white rounded-2xl p-4 shadow-soft border border-surface-4">
              {!user && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-center">
                  <p className="text-xs text-amber-700 font-medium">
                    Unahitaji <button onClick={() => navigate('/auth')} className="underline font-bold">kuingia</button> ili kutuma ombi
                  </p>
                </div>
              )}
              
              <form onSubmit={handleSubmitTicket} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-ink-4 uppercase tracking-wider mb-1.5">Mada</label>
                  <input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Elezea tatizo kwa ufupi..."
                    className="input-field"
                    disabled={!user}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-ink-4 uppercase tracking-wider mb-1.5">Ujumbe</label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={4}
                    placeholder="Elezea tatizo lako kwa undani zaidi..."
                    className="input-field resize-none"
                    disabled={!user}
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting || !user || !subject || !message}
                  className="btn-primary"
                >
                  {submitting ? <><Spinner size="sm" color="white" /> Inatuma...</> : '📤 Tuma Ombi'}
                </button>
              </form>
            </div>
          </div>

          {/* Info message about ticket tracking */}
          <div className="bg-blue-50 rounded-2xl p-4 text-center">
            <p className="text-xs text-blue-700">
              📌 Ombi lako litajibiwa ndani ya masaa 24. Tutawasiliana nawe kwa barua pepe.
            </p>
          </div>
        </div>
      )}

      {/* Privacy Policy Section */}
      {activeTab === 'privacy' && (
        <div className="px-3">
          <div className="bg-white rounded-2xl shadow-soft border border-surface-4 p-5">
            <div className="text-center mb-5">
              <div className="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center text-2xl mx-auto mb-3">
                🔒
              </div>
              <h2 className="font-serif text-xl font-semibold text-ink">Sera ya Faragha</h2>
              <p className="text-2xs text-ink-5 mt-1">Ilisasishwa: Januari 2025</p>
            </div>

            <div className="space-y-4 text-sm text-ink-4 leading-relaxed">
              <div>
                <h3 className="font-semibold text-ink mb-2">1. Taarifa Tunazokusanya</h3>
                <p>MakaziPlus inakusanya taarifa zako za msingi kama vile jina, barua pepe, namba ya simu, na taarifa za utambulisho (NIDA, pasipoti) kwa ajili ya kuthibitisha utambulisho wako na kutoa huduma zetu.</p>
              </div>
              <div>
                <h3 className="font-semibold text-ink mb-2">2. Matumizi ya Taarifa</h3>
                <p>Taarifa zako hutumika kwa ajili ya kuwezesha mawasiliano kati ya wateja na wauzaji, kukupa taarifa za matangazo unayoyapenda, na kuboresha huduma zetu.</p>
              </div>
              <div>
                <h3 className="font-semibold text-ink mb-2">3. Kushiriki Taarifa</h3>
                <p>Hatutashiriki taarifa zako na watu wengine bila idhini yako, isipokuwa kama inavyotakiwa na sheria. Taarifa za mawasiliano kati ya wateja na wauzaji zinaweza kuonekana kwa pande zote mbili.</p>
              </div>
              <div>
                <h3 className="font-semibold text-ink mb-2">4. Usalama wa Taarifa</h3>
                <p>Tunatumia teknolojia ya kisasa ya usalama (bcrypt, JWT, HTTPS, encryption) kulinda taarifa zako zote dhidi ya upotevu, matumizi mabaya, au ufikiaji usioidhinishwa.</p>
              </div>
              <div>
                <h3 className="font-semibold text-ink mb-2">5. Haki Zako</h3>
                <p>Una haki ya kuomba taarifa zako zifutwe wakati wowote kwa mujibu wa sheria za ulinzi wa data. Wasiliana nasi kwa barua pepe kwa maombi ya kufuta akaunti.</p>
              </div>
              <div className="bg-primary-50 rounded-xl p-3 mt-3">
                <p className="text-xs text-primary-600">Kwa maswali yoyote kuhusu Sera ya Faragha, wasiliana nasi kwa support@makaziplus.co.tz</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Terms of Service Section */}
      {activeTab === 'terms' && (
        <div className="px-3">
          <div className="bg-white rounded-2xl shadow-soft border border-surface-4 p-5">
            <div className="text-center mb-5">
              <div className="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center text-2xl mx-auto mb-3">
                📜
              </div>
              <h2 className="font-serif text-xl font-semibold text-ink">Masharti ya Matumizi</h2>
              <p className="text-2xs text-ink-5 mt-1">Ilisasishwa: Januari 2025</p>
            </div>

            <div className="space-y-4 text-sm text-ink-4 leading-relaxed">
              <div>
                <h3 className="font-semibold text-ink mb-2">1. Kukubali Masharti</h3>
                <p>Kwa kutumia MakaziPlus, unakubali kuwa umesoma, kuelewa, na kukubali masharti haya kikamilifu. Kama hukubali, tafadhali usitumie huduma zetu.</p>
              </div>
              <div>
                <h3 className="font-semibold text-ink mb-2">2. Usahihi wa Taarifa</h3>
                <p>Unawajibika kuhakikisha kuwa taarifa zako ni sahihi na za kweli. Utoaji wa taarifa zisizo sahihi unaweza kusababisha kufutwa kwa akaunti yako.</p>
              </div>
              <div>
                <h3 className="font-semibold text-ink mb-2">3. Matumizi ya Platform</h3>
                <p>MakaziPlus ni kiungo kati ya wateja na wauzaji. Hatuhusiki na miamala kati ya wateja na wauzaji. Wateja wanawajibika kuthibitisha taarifa za mali kabla ya kufanya maamuzi.</p>
              </div>
              <div>
                <h3 className="font-semibold text-ink mb-2">4. Matangazo na Mali</h3>
                <p>Wauzaji wanawajibika kuhakikisha kuwa matangazo yao ni sahihi na yanawakilisha mali kwa ukweli. MakaziPlus ina haki ya kuondoa matangazo yoyote yanayokiuka sheria au kanuni zetu.</p>
              </div>
              <div>
                <h3 className="font-semibold text-ink mb-2">5. Malipo na Kughairi</h3>
                <p>Malipo ya premium na matangazo ya kulipia hayawezi kughairiwa mara baada ya kuthibitishwa. Tafadhali soma maelezo ya kila mpango kabla ya kulipa.</p>
              </div>
              <div className="bg-primary-50 rounded-xl p-3 mt-3">
                <p className="text-xs text-primary-600">Kwa maswali yoyote kuhusu Masharti ya Matumizi, wasiliana nasi kwa support@makaziplus.co.tz</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Version Info */}
      <div className="px-3 mt-6">
        <div className="bg-surface-3 rounded-2xl p-4 text-center space-y-1">
          <p className="text-xs font-bold text-ink-4">MakaziPlus v4.0 — Tanzania 🇹🇿</p>
          <p className="text-2xs text-ink-6">© 2025 MakaziPlus. Haki zote zimehifadhiwa.</p>
          <div className="flex justify-center gap-4 mt-2">
            <button onClick={() => setActiveTab('privacy')} className="text-2xs text-primary hover:underline">Sera ya Faragha</button>
            <button onClick={() => setActiveTab('terms')} className="text-2xs text-primary hover:underline">Masharti ya Matumizi</button>
            <button onClick={() => window.open('mailto:support@makaziplus.co.tz')} className="text-2xs text-primary hover:underline">Wasiliana Nasi</button>
          </div>
        </div>
      </div>
    </div>
  );
}