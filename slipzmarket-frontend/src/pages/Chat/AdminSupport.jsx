import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { API_URL, SOCKET_URL } from '../../utils/api';
import { 
  Search, Send, MessageCircle, User, Loader2, 
  ChevronRight, Shield, Phone, CornerDownLeft,
  Paperclip, MoreVertical, Bot, Headset, Star, Trash2, Copy, CheckCircle
} from 'lucide-react';

export const AdminSupport = () => {
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [reply, setReply] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const activeSessionIdRef = useRef(null);

  // Auto-scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Init Socket & Fetch Sessions
  useEffect(() => {
    const token = localStorage.getItem('slipz_token');
    if (!token) return;

    const socketEndpoint = SOCKET_URL || API_URL.replace(/\/api\/?$/, '') || window.location.origin;
    socketRef.current = io(socketEndpoint, {
      auth: { token },
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });

    socketRef.current.on('connect', () => {
      console.log('AdminSupport socket connected:', socketRef.current.id, 'endpoint:', socketEndpoint);
      socketRef.current.emit('join_admin_room');
    });

    const fetchSessions = async () => {
      try {
        const res = await axios.get(`${API_URL}/chat/admin/sessions`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        const fetchedSessions = Array.isArray(res.data) ? res.data : (res.data.sessions || []);
        setSessions(fetchedSessions);
      } catch (err) {
        console.error("Failed to fetch sessions:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();

    socketRef.current.on('new_escalation', (data) => {
      setSessions(prev => [data, ...prev.filter(s => s.id !== data.id)]);
    });

    // REAL-TIME LISTENER FOR INCOMING USER MESSAGES
    socketRef.current.on('new_message', (payload) => {
      const incoming = payload?.message || payload;
      if (!incoming || !payload?.sessionId) return;

      setSessions(prev => prev.map(s => {
        if (s.id !== payload.sessionId) return s;
        return {
          ...s,
          updatedAt: new Date().toISOString(),
          unreadCount: (s.unreadCount || 0) + 1,
        };
      }));

      if (activeSessionIdRef.current === payload.sessionId) {
        setMessages(prev => {
          if (prev.find(m => m.id === incoming.id)) return prev;
          return [...prev, incoming];
        });
      }
    });

    socketRef.current.on('agent_reply', (payload) => {
      const incoming = payload?.message || payload;
      if (!incoming || !payload?.sessionId) return;

      if (activeSessionIdRef.current === payload.sessionId) {
        setMessages(prev => {
          if (prev.find(m => m.id === incoming.id)) return prev;
          return [...prev, incoming];
        });
      }
    });

    socketRef.current.on('session_updated', (updatedSession) => {
      if (!updatedSession?.id) return;
      setSessions(prev => {
        if (updatedSession.status === 'CLOSED') {
          return prev.filter(s => s.id !== updatedSession.id);
        }
        return prev.map(s => s.id === updatedSession.id ? { ...s, ...updatedSession } : s);
      });
      if (activeSessionIdRef.current === updatedSession.id) {
        if (updatedSession.status === 'CLOSED') {
          setActiveSession(null);
          activeSessionIdRef.current = null;
        } else {
          setActiveSession(prev => prev ? { ...prev, ...updatedSession } : prev);
        }
      }
    });

    socketRef.current.on('session_closed', ({ sessionId }) => {
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      if (activeSessionIdRef.current === sessionId) {
        setActiveSession(null);
        activeSessionIdRef.current = null;
      }
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    }
  }, []);

  const isSessionActive = (session) => {
    if (!session) return false;
    return session.status !== 'CLOSED';
  };

  // Load Session Data
  const openSession = async (session) => {
    activeSessionIdRef.current = session.id;
    setActiveSession(session);
    setMessages([]); 
    setInternalNotes(session.internalNotes || '');
    const token = localStorage.getItem('slipz_token');
    
    try {
      const res = await axios.get(`${API_URL}/chat/admin/sessions/${session.id}`, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      setMessages(res.data.messages || []);
    } catch (err) {
      console.error("Error loading session messages:", err);
    }
  };

  // Send Message Logic
  const handleSend = async () => {
    if (!reply.trim() || !activeSession) return;
    
    const token = localStorage.getItem('slipz_token');
    const newMsg = { 
      id: Date.now().toString(), 
      text: reply, 
      senderRole: 'AGENT',
      createdAt: new Date().toISOString(),
      isStarred: false
    };
    
    setMessages(prev => [...prev, newMsg]);
    setReply('');
    
    try {
      await axios.post(`${API_URL}/chat/admin/reply`, 
        { sessionId: activeSession.id, text: newMsg.text },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (err) {
      console.error("Failed to send reply:", err);
    }
  };

  const handleResolveSession = async () => {
    if (!activeSession) return;
    const token = localStorage.getItem('slipz_token');

    try {
      await axios.patch(`${API_URL}/chat/admin/sessions/${activeSession.id}/resolve`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSessions(prev => prev.filter(s => s.id !== activeSession.id));
      setActiveSession(null);
      activeSessionIdRef.current = null;
    } catch (err) {
      console.error('Failed to resolve session:', err);
    }
  };

  const handleEscalateSession = async () => {
    if (!activeSession) return;
    const token = localStorage.getItem('slipz_token');

    try {
      const res = await axios.patch(`${API_URL}/chat/admin/sessions/${activeSession.id}/status`,
        { status: 'AWAITING_AGENT' },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const updatedSession = { ...activeSession, ...res.data.session };
      setActiveSession(updatedSession);
      setSessions(prev => prev.map(s => s.id === activeSession.id ? updatedSession : s));
    } catch (err) {
      console.error('Failed to escalate session:', err);
    }
  };

  const handleSaveNotes = async () => {
    if (!activeSession) return;
    const token = localStorage.getItem('slipz_token');

    try {
      const res = await axios.patch(`${API_URL}/chat/admin/sessions/${activeSession.id}/internal-notes`,
        { internalNotes },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setActiveSession(res.data.session);
    } catch (err) {
      console.error('Failed to save internal notes:', err);
    }
  };

  const handleStarMessage = async (messageId, currentStatus) => {
    setMessages(prev => prev.map(m => 
      m.id === messageId ? { ...m, isStarred: !currentStatus } : m
    ));

    try {
      const token = localStorage.getItem('slipz_token');
      await axios.patch(`${API_URL}/chat/admin/messages/${messageId}/star`, 
        { isStarred: !currentStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (err) {
      console.error("Failed to star message:", err);
      setMessages(prev => prev.map(m => 
        m.id === messageId ? { ...m, isStarred: currentStatus } : m
      ));
    }
  };

  const handleCopyMessage = async (messageText) => {
    try {
      await navigator.clipboard.writeText(messageText);
    } catch (err) {
      console.error('Failed to copy message:', err);
    }
  };

  const handleQuoteMessage = (messageText) => {
    const quoted = `> ${messageText.replace(/\n/g, '\n> ')}\n\n`;
    setReply(prev => (prev ? `${prev}\n${quoted}` : quoted));
  };

  const handleDeleteMessage = async (messageId) => {
    if (!window.confirm('Delete this message permanently?')) return;

    const previousMessages = messages;
    setMessages(prev => prev.filter(m => m.id !== messageId));

    try {
      const token = localStorage.getItem('slipz_token');
      await axios.delete(`${API_URL}/chat/admin/messages/${messageId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (err) {
      console.error('Failed to delete message:', err);
      setMessages(previousMessages);
    }
  };

  // Handle Enter to send, Shift+Enter for new line
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const filteredSessions = sessions.filter(s => 
    s.user?.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.user?.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTime = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex h-screen bg-[#f9fafb] text-[#2a1b1b] font-sans overflow-hidden">
      
      {/* 1. SIDEBAR */}
      <div className="w-80 bg-white border-r border-[#d8cdcd] flex flex-col shrink-0 z-10 shadow-[2px_0_10px_rgba(0,0,0,0.02)]">
        <div className="p-5 border-b border-[#d8cdcd] shrink-0">
          <h2 className="font-bold text-[16px] flex items-center justify-between text-[#800000]">
            <span className="flex items-center gap-2"><MessageCircle size={18} /> Support Queue</span>
            <span className="bg-[#f5f2f2] text-[#2a1b1b] px-2 py-0.5 rounded-full text-xs">{sessions.length}</span>
          </h2>
          <div className="mt-4 relative">
            <Search size={14} className="absolute left-3 top-2.5 text-[#7a6b6b]" />
            <input 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-[#f5f2f2] border-transparent rounded-lg text-sm focus:outline-none focus:bg-white focus:border-[#800000] focus:ring-1 focus:ring-[#800000] transition-all" 
              placeholder="Search users..." 
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="flex justify-center mt-10"><Loader2 className="animate-spin text-[#800000]" /></div>
          ) : filteredSessions.length === 0 ? (
            <div className="text-center text-[#7a6b6b] text-sm mt-10">No sessions found.</div>
          ) : (
            filteredSessions.map(s => (
              <div 
                key={s.id} 
                onClick={() => openSession(s)} 
                className={`p-4 border-b border-[#d8cdcd] cursor-pointer transition-colors flex items-center justify-between
                  ${activeSession?.id === s.id ? 'bg-[#800000]/5 border-l-4 border-l-[#800000]' : 'hover:bg-[#f5f2f2] border-l-4 border-l-transparent'}`}
              >
                <div className="overflow-hidden">
                  <div className="font-bold text-[14px] truncate">{s.user?.firstName || 'Unknown User'}</div>
                  <div className="text-[12px] text-[#7a6b6b] truncate mt-0.5">{s.user?.email}</div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <div className="flex items-center gap-2">
                    {s.unreadCount > 0 && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#800000] text-white uppercase">
                        {s.unreadCount}
                      </span>
                    )}
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                      s.status === 'AGENT_HANDLING' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {s.status.replace('_', ' ')}
                    </span>
                  </div>
                  <ChevronRight size={14} className="text-[#d8cdcd]" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 2. CHAT AREA */}
      <div className="flex-1 flex flex-col border-r border-[#d8cdcd] bg-white min-w-100">
        <div className="h-16 border-b border-[#d8cdcd] flex items-center justify-between px-6 shrink-0 bg-white z-10">
          {activeSession ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#800000] text-white flex items-center justify-center font-bold">
                {activeSession.user?.firstName?.charAt(0) || 'U'}
              </div>
              <div>
                <h3 className="font-bold text-[15px]">{activeSession.user?.firstName}</h3>
                <p className={`text-[12px] flex items-center gap-1 ${isSessionActive(activeSession) ? 'text-green-600' : 'text-[#7a6b6b]'}`}>
                <span className={`w-2 h-2 rounded-full ${isSessionActive(activeSession) ? 'bg-green-500' : 'bg-gray-400'}`} />
                {isSessionActive(activeSession) ? 'Active Now' : 'Inactive'}
              </p>
              </div>
            </div>
          ) : (
            <div className="font-bold text-[#7a6b6b]">Select a session to begin</div>
          )}
          
          {activeSession && (
            <div className="flex gap-2">
              <button className="p-2 text-[#7a6b6b] hover:bg-[#f5f2f2] rounded-lg transition-colors"><Phone size={18} /></button>
              <button className="p-2 text-[#7a6b6b] hover:bg-[#f5f2f2] rounded-lg transition-colors"><MoreVertical size={18} /></button>
            </div>
          )}
        </div>
        
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#f9fafb]">
          {!activeSession ? (
            <div className="h-full flex flex-col items-center justify-center text-[#7a6b6b]">
              <MessageCircle size={48} className="text-[#d8cdcd] mb-4" />
              <p>Your workspace is ready.</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center text-[#7a6b6b] text-sm mt-4 bg-white py-2 px-4 rounded-full inline-block mx-auto border border-[#d8cdcd] shadow-sm">
              Beginning of chat history
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((m, i) => {
                const isAgent = m.senderRole === 'AGENT';
                const isBot = m.senderRole === 'BOT' || m.senderRole === 'SYSTEM';

                return (
                  // 👉 HOVER GROUP ADDED HERE
                  <div key={m.id || i} className={`flex items-end gap-2 group relative ${isAgent ? 'justify-end' : 'justify-start'}`}>
                    
                    {!isAgent && (
                      <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center shrink-0 mb-4">
                         {isBot ? <Bot size={16}/> : <User size={16}/>}
                      </div>
                    )}

                    <div className={`flex flex-col max-w-[70%] ${isAgent ? 'items-end' : 'items-start'}`}>
                      <div className={`flex items-center gap-2 mb-2 transition-opacity duration-200 opacity-0 group-hover:opacity-100 ${isAgent ? 'justify-end' : 'justify-start'}`}>
                        <button
                          onClick={() => handleStarMessage(m.id, m.isStarred)}
                          className="p-1 text-[#7a6b6b] hover:text-[#800000] hover:bg-[#f5f2f2] rounded transition-colors"
                          title={m.isStarred ? 'Unstar message' : 'Star message'}
                        >
                          <Star size={14} className={m.isStarred ? 'fill-[#800000] text-[#800000]' : ''} />
                        </button>
                        <button
                          onClick={() => handleCopyMessage(m.text)}
                          className="p-1 text-[#7a6b6b] hover:text-[#800000] hover:bg-[#f5f2f2] rounded transition-colors"
                          title="Copy message"
                        >
                          <Copy size={14} />
                        </button>
                        <button
                          onClick={() => handleQuoteMessage(m.text)}
                          className="p-1 text-[#7a6b6b] hover:text-[#800000] hover:bg-[#f5f2f2] rounded transition-colors"
                          title="Quote message"
                        >
                          <CornerDownLeft size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteMessage(m.id)}
                          className="p-1 text-[#7a6b6b] hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Delete message"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      <div className={`px-4 py-2.5 text-[14px] shadow-sm leading-relaxed whitespace-pre-wrap ${
                        isAgent 
                          ? 'bg-[#800000] text-white rounded-2xl rounded-br-sm' 
                          : isBot
                          ? 'bg-orange-50 border border-orange-200 text-orange-800 rounded-2xl rounded-bl-sm text-center'
                          : 'bg-white border border-[#d8cdcd] text-[#2a1b1b] rounded-2xl rounded-bl-sm' 
                      }`}>
                        {m.text}
                      </div>
                      
                      <span className="text-[10px] text-[#7a6b6b] mt-1 mx-1">
                        {formatTime(m.createdAt)}
                      </span>
                    </div>

                    {isAgent && (
                      <div className="w-8 h-8 rounded-full bg-[#800000] text-white flex items-center justify-center shrink-0 mb-4">
                        <Headset size={16}/>
                      </div>
                    )}

                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        {activeSession && (
          <div className="p-4 bg-white border-t border-[#d8cdcd] shrink-0">
            <div className="flex items-end gap-3 bg-[#f5f2f2] border border-[#d8cdcd] rounded-xl p-2 focus-within:border-[#800000] focus-within:ring-1 focus-within:ring-[#800000] transition-all">
              <button className="p-2 text-[#7a6b6b] hover:text-[#2a1b1b] transition-colors shrink-0">
                <Paperclip size={18} />
              </button>
              
              <textarea 
                value={reply} 
                onChange={(e) => setReply(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                className="flex-1 bg-transparent border-none focus:ring-0 text-[14px] resize-none max-h-32 py-2 outline-none custom-scrollbar" 
                placeholder="Type your reply... (Shift + Enter for new line)" 
                style={{ minHeight: '40px' }}
              />
              
              <button 
                onClick={handleSend} 
                disabled={!reply.trim()}
                className="bg-[#800000] text-white p-2.5 rounded-lg flex items-center justify-center shrink-0 disabled:opacity-50 hover:bg-[#660000] transition-colors"
              >
                <Send size={16} className="ml-0.5" />
              </button>
            </div>
            <div className="text-[10px] text-center text-[#7a6b6b] mt-2">
              Press <span className="font-bold">Enter</span> to send, <span className="font-bold">Shift + Enter</span> for new line.
            </div>
          </div>
        )}
      </div>

      {/* 3. CONTEXT PANEL */}
      <div className="w-80 bg-white p-6 shrink-0 overflow-y-auto hidden lg:block">
        <h3 className="font-bold text-[15px] flex items-center gap-2 mb-6 text-[#2a1b1b]">
          <User size={18} className="text-[#800000]" /> Support Panel
        </h3>
        
        {activeSession ? (
          <div className="space-y-6">
            <div className="bg-[#f9fafb] border border-[#d8cdcd] rounded-2xl p-4 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] text-[#7a6b6b] uppercase font-bold tracking-wider">Customer</p>
                  <p className="text-[14px] font-semibold text-[#2a1b1b] truncate">{activeSession.user?.firstName || 'Unknown'}</p>
                </div>
                <span className={`text-[11px] px-2 py-1 rounded-full font-semibold ${isSessionActive(activeSession) ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'}`}>
                  {isSessionActive(activeSession) ? 'Active Now' : 'Inactive'}
                </span>
              </div>

              <div className="grid gap-3">
                <div className="p-3 bg-white rounded-2xl border border-[#d8cdcd]">
                  <p className="text-[10px] uppercase tracking-wider text-[#7a6b6b]">Email</p>
                  <p className="text-[13px] text-[#2a1b1b] truncate" title={activeSession.user?.email}>{activeSession.user?.email}</p>
                </div>
                <div className="p-3 bg-white rounded-2xl border border-[#d8cdcd]">
                  <p className="text-[10px] uppercase tracking-wider text-[#7a6b6b]">Session status</p>
                  <p className="text-[13px] font-semibold text-[#2a1b1b]">{activeSession.status.replace('_', ' ')}</p>
                </div>
                <div className="p-3 bg-white rounded-2xl border border-[#d8cdcd]">
                  <p className="text-[10px] uppercase tracking-wider text-[#7a6b6b]">Last activity</p>
                  <p className="text-[13px] text-[#2a1b1b]">{formatTime(activeSession.updatedAt || activeSession.createdAt)}</p>
                </div>
              </div>
            </div>

            <div className="bg-[#f9fafb] border border-[#d8cdcd] rounded-2xl p-4 space-y-3">
              <p className="text-[11px] text-[#7a6b6b] uppercase font-bold tracking-wider">Room checkers</p>
              <div className="grid gap-3">
                <div className="flex items-center justify-between px-3 py-3 rounded-2xl bg-white border border-[#d8cdcd]">
                  <span className="text-[13px] text-[#2a1b1b]">Message count</span>
                  <span className="font-bold text-[#800000]">{messages.length}</span>
                </div>
                <div className="flex items-center justify-between px-3 py-3 rounded-2xl bg-white border border-[#d8cdcd]">
                  <span className="text-[13px] text-[#2a1b1b]">Unread alerts</span>
                  <span className="font-bold text-[#800000]">{activeSession.unreadCount || 0}</span>
                </div>
                <div className="flex items-center justify-between px-3 py-3 rounded-2xl bg-white border border-[#d8cdcd]">
                  <span className="text-[13px] text-[#2a1b1b]">Room active</span>
                  <span className={`font-bold ${isSessionActive(activeSession) ? 'text-emerald-700' : 'text-gray-600'}`}>{isSessionActive(activeSession) ? 'Yes' : 'No'}</span>
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <p className="text-[11px] text-[#7a6b6b] uppercase font-bold tracking-wider mb-2">Actions</p>
                <button onClick={handleResolveSession} className="w-full flex items-center justify-center gap-2 bg-white border border-[#d8cdcd] text-[#2a1b1b] hover:bg-[#f5f2f2] py-3 rounded-2xl text-[13px] font-bold transition-colors mb-2">
                  <CheckCircle size={16} className="text-green-600" /> Mark as Resolved
                </button>
                <button onClick={handleEscalateSession} className="w-full flex items-center justify-center gap-2 bg-white border border-[#d8cdcd] text-[#800000] hover:bg-red-50 py-3 rounded-2xl text-[13px] font-bold transition-colors">
                  <Shield size={16} /> Escalate Ticket
                </button>
              </div>

              <div>
                <p className="text-[11px] text-[#7a6b6b] uppercase font-bold tracking-wider mb-2">Internal Notes</p>
                <textarea
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  className="w-full border border-[#d8cdcd] rounded-2xl p-3 text-[13px] bg-[#f9fafb] focus:bg-white focus:outline-none focus:border-[#800000]"
                  rows={5}
                  placeholder="Leave a note for other agents..."
                />
                <button onClick={handleSaveNotes} className="mt-2 w-full bg-[#800000] text-white hover:bg-[#660000] py-3 rounded-2xl text-[13px] font-bold transition-colors">
                  Save Note
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center text-[#7a6b6b] mt-16 flex flex-col items-center">
            <div className="w-16 h-16 bg-[#f5f2f2] rounded-full flex items-center justify-center mb-4">
              <Shield size={24} className="text-[#d8cdcd]" />
            </div>
            <p className="text-sm">Context panel will populate when a session is selected.</p>
          </div>
        )}
      </div>
    </div>
  );
};