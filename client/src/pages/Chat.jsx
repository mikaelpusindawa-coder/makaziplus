import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../hooks/useSocket';
import { TopBar } from '../components/layout/TopBar';
import { Spinner, EmptyState } from '../components/common/Spinner';
import { getAvatar, msgTime, timeAgo } from '../utils/helpers';
import api from '../utils/api';

export default function Chat() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [convos, setConvos] = useState([]);
  const [messages, setMessages] = useState([]);
  const [contact, setContact] = useState(null);
  const [text, setText] = useState('');
  const [view, setView] = useState('list');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState(false);
  const [error, setError] = useState(null);

  const bottomRef = useRef(null);
  const typingTimer = useRef(null);
  const inputRef = useRef(null);

  const { sendMessage, startTyping, stopTyping } = useSocket((event, data) => {
    if (event === 'new_message' && data.from_user_id !== user?.id) {
      setMessages(prev => [...prev, data]);
      scrollBottom();
    }
    if (event === 'message_sent') {
      setMessages(prev => {
        const exists = prev.find(m => m.id === data.id);
        return exists ? prev : [...prev, data];
      });
      scrollBottom();
    }
    if (event === 'user_typing') setTyping(true);
    if (event === 'user_stop_typing') setTyping(false);
  });

  const scrollBottom = () => setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);

  const fetchConvos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await api.get('/messages/conversations');
      setConvos(r.data.data || []);
    } catch (err) {
      console.error('Fetch conversations error:', err);
      setError('Hitilafu ya kupakia mazungumzo');
    } finally {
      setLoading(false);
    }
  }, []);

  const openChat = useCallback(async (userId) => {
    try {
      // Get user info
      const userRes = await api.get(`/users/${userId}/info`).catch(() => ({ data: { user: { id: userId, name: 'Mtumiaji', avatar: null } } }));
      const contactData = userRes.data.user || { id: userId, name: `Mtumiaji ${userId}`, avatar: null };
      setContact(contactData);
      
      // Get messages
      const msgRes = await api.get(`/messages/${userId}`);
      setMessages(msgRes.data.data || []);
      setView('chat');
      setTimeout(() => {
        scrollBottom();
        inputRef.current?.focus();
      }, 100);
    } catch (err) {
      console.error('Open chat error:', err);
      // Still open chat even if messages fail
      setContact({ id: userId, name: `Mtumiaji ${userId}`, avatar: null });
      setMessages([]);
      setView('chat');
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchConvos();
    } else {
      setLoading(false);
    }
  }, [user, fetchConvos]);

  useEffect(() => {
    const uid = searchParams.get('userId');
    if (uid && user) {
      openChat(parseInt(uid));
    }
  }, [searchParams, user, openChat]);

  const handleSend = async () => {
    if (!text.trim() || !contact) return;
    const msg = text.trim();
    setText('');
    setSending(true);
    stopTyping(contact.id);
    try {
      sendMessage(contact.id, msg);
      await api.post('/messages', { to_user_id: contact.id, message: msg });
    } catch (err) {
      console.error('Send message error:', err);
    } finally {
      setSending(false);
    }
  };

  const handleTyping = (val) => {
    setText(val);
    if (!contact) return;
    startTyping(contact.id);
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => stopTyping(contact.id), 1500);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-surface pb-20">
        <TopBar title="Mazungumzo" />
        <EmptyState icon="💬" title="Ingia kwanza" subtitle="Unahitaji kuingia ili kuona mazungumzo yako"
          action={{ label: 'Ingia', onClick: () => navigate('/auth') }} />
      </div>
    );
  }

  if (view === 'chat' && contact) {
    const contactImg = getAvatar(contact);
    return (
      <div className="fixed inset-0 bg-white flex flex-col z-50 max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center gap-2.5 px-3.5 py-3 bg-white border-b border-black/7 shadow-sm"
          style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}>
          <button onClick={() => { setView('list'); fetchConvos(); }}
            className="w-8 h-8 bg-surface rounded-full flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-ink" fill="none" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-primary-pale">
            <img src={contactImg} alt={contact.name} className="w-full h-full object-cover" loading="lazy" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-bold text-ink truncate">{contact.name}</div>
            <div className="text-2xs text-green-500 font-medium">
              {typing ? 'Anaandika...' : '● Online sasa hivi'}
            </div>
          </div>
          <button onClick={() => alert(`📞 Inapigia ${contact.phone || contact.name}...`)}
            className="w-8 h-8 bg-surface rounded-full flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-ink-3" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.62 3.38a2 2 0 0 1 1.99-2.18h3a2 2 0 0 1 2 1.72c.12.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L7.91 9c1.37 2.37 3.71 4.71 6.08 6.09l.97-.97a2 2 0 0 1 2.11-.45c.91.34 1.85.58 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-2.5 bg-surface">
          {messages.length === 0 && (
            <div className="text-center py-12 text-xs text-ink-4">Anza mazungumzo na {contact.name} 👋</div>
          )}
          {messages.map((m, i) => {
            const isMe = m.from_user_id === user.id;
            return (
              <div key={m.id || i} className={`flex gap-2 items-end ${isMe ? 'justify-end' : 'justify-start'}`}>
                {!isMe && (
                  <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 bg-primary-pale">
                    <img src={contactImg} alt="" className="w-full h-full object-cover" />
                  </div>
                )}
                <div className={`max-w-[72%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed
                  ${isMe ? 'bg-primary text-white rounded-br-sm' : 'bg-white text-ink shadow-sm rounded-bl-sm'}`}>
                  {m.message}
                  <span className={`block text-[9px] mt-1.5 opacity-55`}>{msgTime(m.created_at)}</span>
                </div>
              </div>
            );
          })}
          {typing && (
            <div className="flex gap-2 items-end">
              <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 bg-primary-pale">
                <img src={contactImg} alt="" className="w-full h-full object-cover" />
              </div>
              <div className="bg-white rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                <div className="flex gap-1">
                  {[0, 1, 2].map(i => <div key={i} className="w-1.5 h-1.5 bg-ink-4 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="flex items-center gap-2.5 px-3 py-2.5 bg-white border-t border-black/7"
          style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
          <textarea
            ref={inputRef}
            value={text}
            onChange={e => handleTyping(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Andika ujumbe..." rows={1}
            className="flex-1 resize-none border-2 border-black/10 rounded-2xl px-3.5 py-2.5 text-sm text-ink bg-surface focus:border-primary focus:bg-white outline-none max-h-28" />
          <button onClick={handleSend} disabled={sending || !text.trim()}
            className="w-10 h-10 bg-primary rounded-full flex items-center justify-center flex-shrink-0 disabled:opacity-50 transition-all active:scale-95">
            <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-white" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface pb-20">
      <TopBar title="Mazungumzo" />
      <div className="px-4 pt-4 pb-2">
        <p className="text-xs text-ink-4">{convos.length} mazungumzo yanayoendelea</p>
      </div>
      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : error ? (
        <EmptyState icon="⚠️" title="Hitilafu" subtitle={error} />
      ) : convos.length ? (
        <div>
          {convos.map(c => {
            const img = getAvatar(c);
            return (
              <button key={c.id} onClick={() => openChat(c.id)}
                className="w-full flex items-center gap-3 px-4 py-3.5 border-b border-black/4 hover:bg-surface transition-colors text-left">
                <div className="relative w-11 h-11 rounded-full overflow-hidden flex-shrink-0 bg-primary-pale">
                  <img src={img} alt={c.name} className="w-full h-full object-cover" loading="lazy" />
                  <div className="absolute bottom-0.5 right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-ink flex items-center gap-1.5">
                    {c.name}
                    {c.plan === 'pro' && <span className="bg-primary-pale text-primary text-[9px] font-bold px-1.5 rounded-full">✓ Pro</span>}
                  </div>
                  <div className="text-xs text-ink-4 truncate mt-0.5">{c.last_message || 'Anza mazungumzo...'}</div>
                </div>
                <div className="flex-shrink-0 text-right">
                  <div className="text-[10px] text-ink-5">{c.last_time ? timeAgo(c.last_time) : ''}</div>
                  {c.unread > 0 && (
                    <div className="w-4.5 h-4.5 bg-primary text-white rounded-full text-[9px] font-bold flex items-center justify-center ml-auto mt-1">
                      {c.unread}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <EmptyState icon="💬" title="Hakuna mazungumzo" subtitle="Fungua mali yoyote na ubonyeze 'Wasiliana' kuanza" />
      )}
    </div>
  );
}