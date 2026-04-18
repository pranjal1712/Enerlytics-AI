import { useState, useRef, useEffect } from 'react';
import { Send, LogOut, FileText, File, ArrowRight, Plus, Upload as UploadIcon, Loader2, Menu, MoreVertical, Settings } from 'lucide-react';

import { useNavigate, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import ProfileModal from '../components/ProfileModal';
import NeuralBoot from '../components/NeuralBoot';
import TypedMarkdown from '../components/TypedMarkdown';
import { apiFetch } from '../api';

export default function Chat({ userProfile: propProfile, initialSessions, initialDocs, refreshWorkspace, setAuth }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadingType, setUploadingType] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [hasDocuments, setHasDocuments] = useState(initialDocs?.length > 0);
  const [isDragging, setIsDragging] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  // SESSION & PROFILE STATE
  const [sessions, setSessions] = useState(initialSessions || []);
  const [documents, setDocuments] = useState(initialDocs || []);
  const [activeSession, setActiveSession] = useState(null);
  const [userProfile, setUserProfile] = useState(propProfile);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isBooting, setIsBooting] = useState(true);
  const [isDataLoaded, setIsDataLoaded] = useState(!!propProfile);

  const [isTraceOpen, setIsTraceOpen] = useState(false);
  const [traceSources, setTraceSources] = useState([]);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchStatus, setSearchStatus] = useState("Searching technical assets...");


  const messagesEndRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const searchSteps = [
    "Searching technical assets...",
    "Analyzing energy vectors...",
    "Cross-referencing documents...",
    "⚡ Synthesizing response...",
    "Neural mapping complete..."
  ];

  useEffect(() => {
    let interval;
    if (isLoading) {
      let step = 0;
      setSearchStatus(searchSteps[0]);
      interval = setInterval(() => {
        step = (step + 1) % searchSteps.length;
        setSearchStatus(searchSteps[step]);
      }, 1500);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  // Initial Data Fetch - Unified for speed
  const didInit = useRef(false);

  // Initial Sync from Props
  useEffect(() => {
    if (propProfile) {
      setUserProfile(propProfile);
      setIsDataLoaded(true);
    }
    if (initialSessions) setSessions(initialSessions);
    if (initialDocs) {
      setDocuments(initialDocs);
      setHasDocuments(initialDocs.length > 0);
    }
  }, [propProfile, initialSessions, initialDocs]);

  // Handle Session Recovery vs Fresh Start on Refresh
  useEffect(() => {
    const initChat = async () => {
      if (didInit.current) return;
      didInit.current = true;

      // 1. FORCE RESET IMMEDIATELY
      localStorage.removeItem('activeSessionId');
      setActiveSession(null);
      setMessages([]);
      setIsBooting(true);

      try {
        if (location.state?.sessionId) {
          // Navigated via Sidebar
          await handleSelectSession({ id: location.state.sessionId });
        } else {
          // Fresh Boot / Refresh -> Show Welcome Screen (No Auto-New Chat)
          setActiveSession(null);
          setMessages([]);
        }
      } catch (err) {
        console.error("Initialization failed:", err);
      } finally {
        // Only release the boot screen once initialization is done
        setTimeout(() => setIsBooting(false), 1200);
      }
    };

    initChat();
  }, []);

  const handleForceNewChat = async () => {
    try {
      const res = await apiFetch('/chats/new', {
        method: 'POST'
      });
      if (res.ok) {
        const data = await res.json();
        setSessions(prev => [data, ...prev]);
        setActiveSession(data);
        localStorage.setItem('activeSessionId', data.id);
        setMessages([]);
        setHasDocuments(false);
      }
    } catch (err) {
      console.error("Failed to create new chat:", err);
    }
  };

  // Local state update functions for when children mutate data
  const fetchSessions = async () => {
    try {
      const res = await apiFetch('/chats');
      if (res.ok) {
        const data = await res.json();
        setSessions(data);
      }
    } catch (err) {
      console.error("Sessions fetch failed:", err);
    }
  };

  const fetchChatHistory = async (sid) => {
    setIsHistoryLoading(true);
    try {
      const res = await apiFetch(`/chat/history?session_id=${sid}`);
      if (res.ok) {
        const data = await res.json();
        const formatted = data.map(m => ({
          role: m.role,
          content: m.content
        }));
        setMessages(formatted);
        if (formatted.length > 0) setHasDocuments(true);
      }
    } catch (err) {
      console.error("History fetch failed:", err);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const handleNewChat = async () => {
    try {
      const res = await apiFetch('/chats/new', {
        method: 'POST'
      });
      if (res.ok) {
        const data = await res.json();
        setSessions([data, ...sessions]);
        setActiveSession(data);
        localStorage.setItem('activeSessionId', data.id); // Persist for refresh
        setMessages([]);
        setHasDocuments(false);
        if (refreshWorkspace) refreshWorkspace();
      }
    } catch (err) {
      console.error("Failed to create new chat:", err);
    }
  };

  const handleSelectSession = (session) => {
    setActiveSession(session);
    localStorage.setItem('activeSessionId', session.id); // Persist for refresh
    setMessages([]);
    setHasDocuments(false);
    fetchChatHistory(session.id);
  };

  // Drag and Drop Logic
  const onDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      navigate('/upload'); // Future: pass files to upload
    }
  };

  const handleDeleteSession = async (sid) => {
    try {
      const res = await apiFetch(`/chats/${sid}`, {
        method: 'DELETE'
      });
      
      if (res.ok) {
        // Only update local state if the server confirmed deletion
        setSessions(sessions.filter(s => s.id !== sid));
        setDocuments(documents.filter(d => d.linked_session_id !== sid));

        if (activeSession?.id === sid) {
          setActiveSession(null);
          setMessages([]);
        }
        if (refreshWorkspace) refreshWorkspace();
      } else {
        console.error("Server rejected the deletion request.");
        alert("Failed to delete. Please try again.");
      }
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Network Error: Could not reach the server to delete.");
    }
  };

  const handleUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    // Ensure we have a session before uploading
    let currentSession = activeSession;
    if (!currentSession) {
      try {
        const res = await apiFetch('/chats/new', {
          method: 'POST'
        });
        if (res.ok) {
          currentSession = await res.json();
          setSessions([currentSession, ...sessions]);
          setActiveSession(currentSession);
        }
      } catch (err) {
        setUploadError("Failed to initialize chat session.");
        return;
      }
    }

    setUploadingType(type);
    setIsUploading(true);
    setUploadProgress(0);
    setUploadError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await apiFetch('/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const duration = 2500;
        const interval = 30;
        const step = 100 / (duration / interval);

        const timer = setInterval(() => {
          setUploadProgress(prev => {
            const next = prev + step;
            if (next >= 100) {
              clearInterval(timer);
              setTimeout(() => {
                setUploadingType(null);
                setMessages([{ role: 'ai', content: `Success! I have indexed and analyzed the ${type.toUpperCase()}. How can I help you today?`, isNew: true }]);
                setHasDocuments(true);
              }, 400);
              return 100;
            }
            return next;
          });
        }, interval);

      } else {
        const error = await res.json();
        setUploadError(error.detail || "Upload rejected. Energy documents only.");
        setUploadingType(null);
        setTimeout(() => setUploadError(null), 6000);
      }
    } catch (err) {
      console.error(err);
      setUploadError("Network Error: Could not reach the validation server.");
      setUploadingType(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const queryForTitle = input;
    const userMsg = { role: 'user', content: queryForTitle };
    setMessages(prev => [...prev, userMsg]);
    setInput('');

    // Auto-rename session on first message to reflect the user's question
    if (messages.length === 0 && activeSession?.title === "New Analysis") {
      const newTitle = queryForTitle.length > 50 ? queryForTitle.substring(0, 47) + "..." : queryForTitle;
      apiFetch(`/chats/${activeSession.id}/title`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle })
      }).then(res => {
        if (res.ok) {
          const updated = { ...activeSession, title: newTitle };
          setActiveSession(updated);
          setSessions(prev => prev.map(s => s.id === activeSession.id ? updated : s));
        }
      }).catch(err => console.error("Rename failed:", err));
    }

    setIsLoading(true);
    try {
      const res = await apiFetch('/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: input,
          session_id: activeSession?.id
        })
      });

      if (!res.ok) {
        if (res.status === 429) {
          setMessages(prev => [...prev, { role: 'ai', content: 'Rate limit exceeded. Please try again later.' }]);
        }
        return;
      }

      const contentType = res.headers.get('content-type');

      if (contentType && contentType.includes('application/json')) {
        const data = await res.json();
        setMessages(prev => [...prev, { role: 'ai', content: data.response, isNew: true, isStreaming: false }]);
        return;
      }

      setIsLoading(false);
      setMessages(prev => [...prev, { role: 'ai', content: '', isNew: true, isStreaming: true }]);
      let accumulatedContent = '';
      let done = false;
      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          const chunkText = decoder.decode(value, { stream: true });

          if (chunkText.includes('[METADATA]:')) {
            try {
              const parts = chunkText.split('\n\n');
              const metaPart = parts.find(p => p.startsWith('[METADATA]:'));
              if (metaPart) {
                const metadata = JSON.parse(metaPart.replace('[METADATA]: ', ''));
                setMessages(prev => {
                  const next = [...prev];
                  next[next.length - 1] = { ...next[next.length - 1], sources: metadata.chunks };
                  return next;
                });
                const bodyText = parts.filter(p => !p.startsWith('[METADATA]:')).join('\n\n');
                if (bodyText) {
                  accumulatedContent += bodyText;
                  setMessages(prev => {
                    const next = [...prev];
                    next[next.length - 1] = { ...next[next.length - 1], content: accumulatedContent };
                    return next;
                  });
                }
                continue;
              }
            } catch (e) { console.error(e); }
          }

          accumulatedContent += chunkText;
          setMessages(prev => {
            const next = [...prev];
            const lastMessage = next[next.length - 1];
            next[next.length - 1] = { 
              ...lastMessage, 
              content: accumulatedContent,
              isStreaming: true 
            };
            return next;
          });
        }
      }

      // Generation finished
      setMessages(prev => {
        const newMessages = [...prev];
        if (newMessages.length > 0) {
          newMessages[newMessages.length - 1].isStreaming = false;
        }
        return newMessages;
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch(getApiUrl('/api/auth/logout'), {
        method: 'POST',
        credentials: 'include'
      });
    } catch (err) {
      console.error("Logout network error (ignored):", err);
    } finally {
      // 🛡️ GUARANTEED CLEANUP: Always clear local session regardless of server status
      localStorage.removeItem('access_token');
      localStorage.removeItem('user_email');
      if (setAuth) setAuth(false);
      // 🛡️ FULL STATE RESET: Force reload to clear all React memory
      window.location.href = '/login';
    }
  };

  // Intelligent Auto-Scroll: Only snap to bottom for new USER messages
  useEffect(() => {
    const lastMsg = messages[messages.length - 1];
    if (lastMsg?.role === 'user' || (lastMsg?.role === 'ai' && !lastMsg?.isStreaming)) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  if (isBooting) {
    return <NeuralBoot onComplete={() => { }} />;
  }

  return (
    <div
      className="dashboard-layout"
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {isDragging && (
        <div className="drag-overlay">
          <div className="drag-message-glow">
            <UploadIcon size={80} className="drag-icon-pulse" />
            <h2>Drop Energy Technical Assets</h2>
            <p>Release to initiate Neural Analysis Pipeline</p>
          </div>
        </div>
      )}

      <Sidebar
        sessions={sessions}
        activeSession={activeSession}
        initialDocs={documents}
        onNewChat={() => { handleNewChat(); setIsMobileSidebarOpen(false); }}
        onSelectSession={(s) => { handleSelectSession(s); setIsMobileSidebarOpen(false); }}
        onDeleteSession={handleDeleteSession}
        onShareSession={(s) => alert(`Analysis shared! Reference ID: ${s.id}`)}
        userProfile={userProfile}
        onLogout={handleLogout}
        onOpenProfile={() => { setIsProfileOpen(true); setIsMobileSidebarOpen(false); }}
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
      />

      {isMobileSidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setIsMobileSidebarOpen(false)}></div>
      )}

      <main className="main-chat">
        {/* Mobile Header Toggle */}
        <header className="mobile-header">
          <button className="mobile-brand-btn" onClick={() => setIsMobileSidebarOpen(true)}>
            <Menu size={20} className="text-energy" />
            <span>Enerlytics <span className="text-energy">AI</span></span>
          </button>

          <div className="mobile-menu-container">
            <button className="mobile-menu-btn" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
              <MoreVertical size={20} />
            </button>

            {isMobileMenuOpen && (
              <>
                <div className="mobile-menu-overlay" onClick={() => setIsMobileMenuOpen(false)} />
                <div className="mobile-menu-dropdown glow-green-card">
                  <button onClick={() => { setIsMobileMenuOpen(false); navigate('/upload'); }}>
                    <Plus size={18} />
                    <span>Upload Documents</span>
                  </button>
                  <button onClick={() => { setIsMobileMenuOpen(false); setIsProfileOpen(true); }}>
                    <Settings size={18} />
                    <span>Profile Settings</span>
                  </button>
                  <div className="menu-divider-h"></div>
                  <button className="text-red-400" onClick={() => { setIsMobileMenuOpen(false); handleLogout(); }}>
                    <LogOut size={18} />
                    <span>Sign Out</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </header>


        {/* Navigation Icon to Upload Page */}
        <div className="chat-top-actions">
          <button
            className="action-icon-btn glow-green"
            onClick={() => navigate('/upload')}
            title="Upload New Documents"
          >
            <Plus size={20} />
            <span>Upload</span>
          </button>
        </div>

        {isHistoryLoading ? (
          <div className="messages-container empty-state-container">
            <div className="flex flex-col items-center gap-4">
              <div className="loading-pulse-neural"></div>
              <p className="text-energy text-sm animate-pulse tracking-widest font-mono">RECOVERING TECHNICAL MAP...</p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="messages-container empty-state-container">
            <div className="welcome-hero">
              <h1 className="hero-title">Ready to <span className="text-energy">Assist</span></h1>
              <p className="hero-subtitle">
                Got technical questions? Ask the AI co-pilot about your
                uploaded energy files now.
              </p>
            </div>

            <div className="status-indicator-grid">
              <div className="status-chip">
                <span className="chip-dot"></span>
                Frequency Response Stable
              </div>
            </div>
          </div>
        ) : (
          <div className="messages-container">
            {messages.map((msg, i) => (
              <div key={i} className={`message ${msg.role}`}>
                <div className="bubble">
                  {msg.role === 'ai' ? (
                    <>
                      <TypedMarkdown
                        key={`${i}-${msg.content.length}`}
                        content={msg.content}
                        isStreaming={msg.isStreaming}
                        animate={msg.isNew}
                      />
                      {msg.sources && msg.sources.length > 0 && (
                        <div className="message-actions mt-4 pt-4 border-t border-white/5">
                          <button
                            className="text-[10px] uppercase tracking-wider font-bold text-energy opacity-50 hover:opacity-100 transition-opacity flex items-center gap-2"
                            onClick={() => {
                              setTraceSources(msg.sources);
                              setIsTraceOpen(true);
                            }}
                          >
                            <FileText size={12} />
                            View Analytical Trace
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    msg.content
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="message ai">
                <div className="bubble thinking-bubble">
                  <div className="flex items-center gap-3">
                    <div className="loading-pulse-neural"></div>
                    <span className="text-xs font-mono text-energy/70 tracking-tighter animate-pulse">
                      {searchStatus}
                    </span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}

        {activeSession && (
          <div className="chat-input-container">
            <textarea
              className="chat-input"
              rows="1"
              placeholder="Ask about solar energy, power systems..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            />
            <button className="chat-submit" onClick={handleSend}><Send size={20} /></button>
          </div>
        )}
      </main>

      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        user={userProfile}
        onUpdate={(newData) => setUserProfile({ ...userProfile, ...newData })}
      />

      {/* ANALYTICAL TRACE MODAL */}
      {isTraceOpen && (
        <div className="modal-overlay" onClick={() => setIsTraceOpen(false)}>
          <div className="trace-modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header border-b border-white/10 pb-4 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-energy/10 rounded-lg">
                  <FileText className="text-energy" size={20} />
                </div>
                <h2 className="text-xl font-bold font-accent tracking-tight">Analytical Trace</h2>
              </div>
              <button className="text-white/40 hover:text-white transition-colors" onClick={() => setIsTraceOpen(false)}>
                <Plus size={24} className="rotate-45" />
              </button>
            </div>

            <div className="trace-scroll-area mt-6">
              <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-white/30 mb-6">Recovered Vector Evidence</p>

              <div className="space-y-6">
                {traceSources.map((source, idx) => (
                  <div key={idx} className="trace-card">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                        <File size={12} className="text-energy" />
                        <span className="text-xs font-mono text-white/60">{source.doc_name}</span>
                      </div>
                      <div className="px-2 py-0.5 bg-white/5 rounded text-[10px] font-mono text-white/40">
                        Score: {source.score}
                      </div>
                    </div>
                    <div className="text-sm leading-relaxed text-white/80 font-inter bg-white/5 p-4 rounded-xl border border-white/5 italic">
                      "{source.text}"
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-white/10">
              <p className="text-[10px] text-white/20 font-mono text-center">
                INTERNAL NEURAL PIPELINE: RETRIEVAL_VERIFIED // SIMILARITY_THRESHOLD_MET
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
