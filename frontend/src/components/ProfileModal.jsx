import React, { useState } from 'react';
import { X, Camera, Mail, User, Check, Loader2 } from 'lucide-react';

export default function ProfileModal({ isOpen, onClose, user, onUpdate }) {
  const [username, setUsername] = useState(user?.username || '');
  const [profilePic, setProfilePic] = useState(user?.profile_pic || '');
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState(null); // 'success' or 'error'

  if (!isOpen) return null;

  const handleSave = async () => {
    setIsSaving(true);
    setStatus(null);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          profile_pic: profilePic
        })
      });
      
      if (res.ok) {
        const data = await res.json();
        onUpdate(data);
        setStatus('success');
        setTimeout(() => setStatus(null), 3000);
      } else {
        setStatus('error');
      }
    } catch (err) {
      console.error(err);
      setStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="profile-modal-content glow-green-card">
        <button className="modal-close" onClick={onClose}>
          <X size={20} />
        </button>

        <h2 className="modal-header">User Profile</h2>
        
        <div className="profile-edit-body">
          {/* Avatar Preview & URL Input */}
          <div className="avatar-preview-section">
            <div className="modal-avatar-wrapper">
              {profilePic ? (
                <img src={profilePic} alt="Preview" />
              ) : (
                <div className="avatar-placeholder">{username?.charAt(0).toUpperCase()}</div>
              )}
              <div className="camera-badge">
                <Camera size={14} />
              </div>
            </div>
            <div className="input-group">
              <label>Profile Picture URL</label>
              <input 
                type="text" 
                placeholder="https://example.com/image.jpg"
                value={profilePic}
                onChange={(e) => setProfilePic(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-divider"></div>

          {/* User Fields */}
          <div className="modal-fields">
            <div className="input-group">
              <label><User size={14} /> Username</label>
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <div className="input-group disabled">
              <label><Mail size={14} /> Email Address</label>
              <input 
                type="text" 
                value={user?.email}
                disabled
              />
              <span className="field-note">Email cannot be changed</span>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          <button 
            className={`btn-save ${status === 'success' ? 'btn-success' : ''}`}
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? <Loader2 className="animate-spin" size={18} /> : (status === 'success' ? <Check size={18} /> : 'Save Changes')}
          </button>
        </div>
      </div>
    </div>
  );
}
