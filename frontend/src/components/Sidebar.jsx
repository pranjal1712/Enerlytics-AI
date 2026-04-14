import React, { useState, useEffect } from 'react';
import { Plus, MessageSquare, MoreVertical, Trash2, Share2, User, ChevronDown, LogOut, Settings, FileText, Menu } from 'lucide-react';

export default function Sidebar({ 
  sessions, 
  activeSession, 
  onNewChat, 
  onSelectSession, 
  onDeleteSession, 
  onShareSession,
  userProfile,
  onLogout,
  onOpenProfile,
  initialDocs,
  isOpen,
  onClose
}) {
  const [isHistoryOpen, setIsHistoryOpen] = useState(true);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState(null);
  const [documents, setDocuments] = useState(initialDocs || []);
  const [isLibraryOpen, setIsLibraryOpen] = useState(true);

  useEffect(() => {
    if (initialDocs) setDocuments(initialDocs);
  }, [initialDocs]);

  // Click-away listener to close menus
  useEffect(() => {
    const handleClickAway = () => {
      setActiveMenu(null);
      setIsProfileMenuOpen(false);
    };
    if (activeMenu || isProfileMenuOpen) {
      window.addEventListener('click', handleClickAway);
    }
    return () => window.removeEventListener('click', handleClickAway);
  }, [activeMenu, isProfileMenuOpen]);

  const handleDocClick = (doc) => {
    if (doc.linked_session_id) {
        // Find session in pre-fetched sessions list if possible, 
        // or just pass a mock session object that onSelectSession handles.
        onSelectSession({ id: doc.linked_session_id, title: doc.name });
    } else {
        alert("This document is being processed. History will be available shortly.");
    }
  };

  return (
    <aside className={`sidebar-container ${isOpen ? 'open' : ''}`}>
      {/* Top Branding */}
      <div className="sidebar-header">
        <div className="flex items-center gap-3">
          <div className="logo-brand-container" style={{ width: '32px', height: '32px' }}>
            <img src="/logo.png" alt="Logo" className="logo-brand-img" />
          </div>
          <span className="sidebar-brand-name">Enerlytics <span className="text-energy">AI</span></span>
        </div>
        
        {/* Mobile Close Button */}
        <button className="sidebar-close-btn" onClick={onClose}>
          <Menu size={20} />
        </button>
      </div>

      {/* New Chat Action */}
      <button className="new-chat-btn" onClick={onNewChat}>
        <Plus size={20} />
        <span>New Analysis</span>
      </button>

      {/* Main Navigation */}
      <div className="sidebar-nav">
        {/* Chat History Section */}
        <div 
          className="nav-group-header" 
          onClick={() => setIsHistoryOpen(!isHistoryOpen)}
        >
          <div className="flex items-center gap-2">
            <MessageSquare size={16} />
            <span>Your Chats</span>
          </div>
          <ChevronDown size={14} className={isHistoryOpen ? 'rotate-0' : 'rotate-[-90deg]'} style={{ transition: '0.3s' }} />
        </div>

        {isHistoryOpen && (
          <div className="sessions-list">
            {sessions.map((session) => (
              <div 
                key={session.id} 
                className={`session-item ${activeSession?.id === session.id ? 'active' : ''}`}
                onClick={() => onSelectSession(session)}
              >
                <span className="session-title">{session.title}</span>
                
                <div className="item-actions">
                  <button 
                    className="action-trigger"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMenu(activeMenu === session.id ? null : session.id);
                    }}
                  >
                    <MoreVertical size={14} />
                  </button>
                  
                  {activeMenu === session.id && (
                    <div className="item-dropdown-menu">
                      <button onClick={(e) => { e.stopPropagation(); onShareSession(session); setActiveMenu(null); }}>
                        <Share2 size={12} /> Share
                      </button>
                      <button className="text-red-400" onClick={(e) => { e.stopPropagation(); onDeleteSession(session.id); setActiveMenu(null); }}>
                        <Trash2 size={12} /> Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {sessions.length === 0 && <div className="empty-history">No recent chats</div>}
          </div>
        )}

        {/* Reports Library Section [NEW] */}
        <div className="mt-6">
            <div 
                className="nav-group-header" 
                onClick={() => setIsLibraryOpen(!isLibraryOpen)}
            >
                <div className="flex items-center gap-2">
                    <FileText size={16} />
                    <span>Reports Library</span>
                </div>
                <ChevronDown size={14} className={isLibraryOpen ? 'rotate-0' : 'rotate-[-90deg]'} style={{ transition: '0.3s' }} />
            </div>

            {isLibraryOpen && (
                <div className="sessions-list">
                    {documents.map((doc) => (
                        <div 
                            key={doc.id} 
                            className={`session-item doc-item ${activeSession?.id === doc.linked_session_id ? 'active' : ''}`}
                            onClick={() => handleDocClick(doc)}
                        >
                            <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                                <div className="doc-icon-small flex-shrink-0">PDF</div>
                                <span className="session-title truncate">{doc.name}</span>
                            </div>

                            <div className="item-actions flex-shrink-0">
                                <button 
                                    className="action-trigger"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveMenu(activeMenu === doc.id ? null : doc.id);
                                    }}
                                >
                                    <MoreVertical size={14} />
                                </button>
                                
                                {activeMenu === doc.id && (
                                    <div className="item-dropdown-menu">
                                        <button onClick={(e) => { e.stopPropagation(); onShareSession({ id: doc.linked_session_id, title: doc.name }); setActiveMenu(null); }}>
                                            <Share2 size={12} /> Share
                                        </button>
                                        <button className="text-red-400" onClick={(e) => { e.stopPropagation(); onDeleteSession(doc.linked_session_id); setActiveMenu(null); }}>
                                            <Trash2 size={12} /> Delete
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    {documents.length === 0 && <div className="empty-history">No reports indexed yet.</div>}
                </div>
            )}
        </div>
      </div>

      {/* Profile Card Fixed at Bottom */}
      <div className="sidebar-footer">
        <div 
          className={`user-profile-card ${isProfileMenuOpen ? 'active' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            setIsProfileMenuOpen(!isProfileMenuOpen);
          }}
        >
          <div className="avatar-wrapper">
            {userProfile?.profile_pic ? (
              <img src={userProfile.profile_pic} alt="Profile" />
            ) : (
              <div className="avatar-placeholder">{userProfile?.username?.charAt(0).toUpperCase()}</div>
            )}
            <div className="status-indicator"></div>
          </div>
          
          <div className="user-info">
            <span className="user-name">{userProfile?.username}</span>
            <span className="user-email">{userProfile?.email}</span>
          </div>
          
          <ChevronDown size={14} className="ml-auto opacity-40" />

          {isProfileMenuOpen && (
            <div className="profile-dropdown-menu">
              <button onClick={(e) => { e.stopPropagation(); onOpenProfile(); setIsProfileMenuOpen(false); }}>
                <Settings size={14} /> Profile Settings
              </button>
              <div className="menu-divider"></div>
              <button className="text-red-400" onClick={(e) => { e.stopPropagation(); onLogout(); setIsProfileMenuOpen(false); }}>
                <LogOut size={14} /> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
