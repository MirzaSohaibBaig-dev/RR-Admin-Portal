import React, { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import io from 'socket.io-client';
import { 
  Users, Calendar, FileText, Settings, Bell, Search, Car, AlertCircle, AlertTriangle, LogOut, Sun, Moon, X, KeyRound, Star, CreditCard,
  User, Mail, Lock, Eye, EyeOff, Camera, Check, Shield, RefreshCw
} from 'lucide-react';
import { BACKEND_URL } from '../utils/api';
import './AdminLayout.css';

const AdminLayout = ({ user, onLogout, onUpdateUser }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const notifDropdownRef = useRef(null);
  const fileInputRef = useRef(null);

  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState('Profile');
  const [profileName, setProfileName] = useState(user?.name || '');
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmNewPw, setConfirmNewPw] = useState('');
  const [settingsMsg, setSettingsMsg] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(() => {
    try {
      return localStorage.getItem('rr_admin_avatar') || user?.avatar || '';
    } catch (e) {
      return '';
    }
  });

  const handleAvatarUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 4 * 1024 * 1024) {
        alert('File size must be under 4MB');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target.result;
        setAvatarUrl(result);
        try {
          localStorage.setItem('rr_admin_avatar', result);
        } catch (err) {}
      };
      reader.readAsDataURL(file);
    }
  };
  
  // Unread badge and notification states
  const [unreadIssuesCount, setUnreadIssuesCount] = useState(0);
  const [pendingReplacementsCount, setPendingReplacementsCount] = useState(0);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [recentNotifications, setRecentNotifications] = useState([]);

  // Mark issues as seen/read so badge disappears immediately
  const markIssuesAsSeen = () => {
    localStorage.setItem('admin_issues_last_seen_time', Date.now().toString());
    setUnreadIssuesCount(0);
  };

  // Mark replacement requests as seen/read so badge disappears immediately
  const markReplacementsAsSeen = () => {
    localStorage.setItem('admin_replacements_last_seen_time', Date.now().toString());
    setPendingReplacementsCount(0);
  };

  // When admin navigates to /driver-issues, automatically clear badge
  useEffect(() => {
    if (location.pathname === '/driver-issues') {
      markIssuesAsSeen();
    }
  }, [location.pathname]);

  // When admin navigates to /driver-replacement, automatically clear badge
  useEffect(() => {
    if (location.pathname === '/driver-replacement') {
      markReplacementsAsSeen();
    }
  }, [location.pathname]);

  // Click outside to close notification dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(event.target)) {
        setIsNotificationOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Real-time listener and fetch for driver reported issues
  useEffect(() => {
    const fetchCount = async () => {
      const urls = [
        'http://localhost:5000/admin/issues',
        'http://localhost:5000/admin/issues',
        'http://localhost:5000/admin/issues',
        'http://localhost:5000/api/issues'
      ];
      const token = localStorage.getItem('adminToken') || localStorage.getItem('admin_token') || '';
      for (const url of urls) {
        try {
          const res = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            const list = data.issues || data.data || [];
            setRecentNotifications(list.slice(0, 6));

            // If user is currently looking at Reported Issues, badge stays 0
            if (window.location.pathname === '/driver-issues') {
              setUnreadIssuesCount(0);
              break;
            }

            const lastSeenStr = localStorage.getItem('admin_issues_last_seen_time');
            if (!lastSeenStr) {
              const pending = list.filter(i => (i.status || 'Pending') === 'Pending');
              setUnreadIssuesCount(pending.length);
            } else {
              const lastSeenTime = parseInt(lastSeenStr, 10);
              const newUnseen = list.filter(i => {
                const createdTime = new Date(i.createdAt || 0).getTime();
                return createdTime > lastSeenTime && (i.status || 'Pending') === 'Pending';
              });
              setUnreadIssuesCount(newUnseen.length);
            }
            break;
          }
        } catch (e) {}
      }
    };

    const fetchReplacementsCount = async () => {
      if (window.location.pathname === '/driver-replacement') {
        setPendingReplacementsCount(0);
        return;
      }
      const urls = [
        `${BACKEND_URL}/api/replacement-requests`,
        'http://localhost:5000/api/replacement-requests',
        '/api/replacement-requests'
      ];
      for (const url of urls) {
        try {
          const res = await fetch(url);
          if (res.ok) {
            const data = await res.json();
            const list = data.data || [];
            const lastSeenStr = localStorage.getItem('admin_replacements_last_seen_time');
            if (!lastSeenStr) {
              const pending = data.pendingCount !== undefined ? data.pendingCount : list.filter(r => (r.status || '').toLowerCase() === 'pending').length;
              setPendingReplacementsCount(pending);
            } else {
              const lastSeenTime = parseInt(lastSeenStr, 10);
              const newUnseen = list.filter(r => {
                const createdTime = new Date(r.createdAt || 0).getTime();
                return createdTime > lastSeenTime && (r.status || '').toLowerCase() === 'pending';
              });
              setPendingReplacementsCount(newUnseen.length);
            }
            break;
          }
        } catch (e) {}
      }
    };

    fetchCount();
    fetchReplacementsCount();
    const interval = setInterval(() => {
      fetchCount();
      fetchReplacementsCount();
    }, 25000);

    const socketUrls = [BACKEND_URL || 'http://localhost:5000'];
    const sockets = [];
    socketUrls.forEach(sUrl => {
      try {
        const s = io(sUrl, { transports: ['polling', 'websocket'] });
        s.on('new_issue_report', (newIssue) => {
          if (window.location.pathname !== '/driver-issues') {
            setUnreadIssuesCount(prev => prev + 1);
          }
          if (newIssue) {
            setRecentNotifications(prev => [newIssue, ...prev.filter(x => x.issueId !== newIssue.issueId).slice(0, 5)]);
          }
        });
        s.on('new-issue-report', (newIssue) => {
          if (window.location.pathname !== '/driver-issues') {
            setUnreadIssuesCount(prev => prev + 1);
          }
          if (newIssue) {
            setRecentNotifications(prev => [newIssue, ...prev.filter(x => x.issueId !== newIssue.issueId).slice(0, 5)]);
          }
        });
        s.on('issue_updated', () => {
          fetchCount();
        });
        s.on('replacement-request-updated', () => {
          if (window.location.pathname !== '/driver-replacement') {
            fetchReplacementsCount();
          } else {
            setPendingReplacementsCount(0);
          }
        });
        s.on('replacement-updated', () => {
          if (window.location.pathname !== '/driver-replacement') {
            fetchReplacementsCount();
          } else {
            setPendingReplacementsCount(0);
          }
        });
        s.on('new_replacement_request', () => {
          if (window.location.pathname !== '/driver-replacement') {
            setPendingReplacementsCount(prev => prev + 1);
          }
        });
        s.on('new-replacement-request', () => {
          if (window.location.pathname !== '/driver-replacement') {
            setPendingReplacementsCount(prev => prev + 1);
          }
        });
        s.on('customer-fare-response', (data) => {
          setUnreadIssuesCount(prev => prev + 1);
          if (data) {
            setRecentNotifications(prev => [{ ...data, type: 'fare-response', notifId: Date.now() + Math.random() }, ...prev].slice(0, 5));
          }
        });
        s.on('admin-notification', (data) => {
          setUnreadIssuesCount(prev => prev + 1);
          if (data) {
            setRecentNotifications(prev => [{ ...data, type: 'fare-response', notifId: Date.now() + Math.random() }, ...prev].slice(0, 5));
          }
        });
        sockets.push(s);
      } catch (e) {}
    });

    return () => {
      clearInterval(interval);
      sockets.forEach(s => s.disconnect());
    };
  }, []);

  useEffect(() => {
    if (user?.name) setProfileName(user.name);
  }, [user]);

  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  const initial = user?.name ? user.name.charAt(0).toUpperCase() : 'A';

  const handleSaveProfile = () => {
    if (!profileName.trim()) {
      alert('Please enter a valid name.');
      return;
    }

    if (newPw) {
      if (newPw.length < 6) {
        alert('New password must be at least 6 characters.');
        return;
      }
      if (newPw !== confirmNewPw) {
        alert('New passwords do not match.');
        return;
      }
    }

    const updated = {
      ...user,
      name: profileName.trim(),
      password: newPw ? newPw : user.password
    };

    if (onUpdateUser) {
      onUpdateUser(updated);
    }

    // Also update in registered users list in localStorage
    try {
      const data = localStorage.getItem('rr_registered_users');
      if (data) {
        const users = JSON.parse(data);
        const idx = users.findIndex(u => u.email.toLowerCase() === user.email.toLowerCase());
        if (idx !== -1) {
          users[idx] = { ...users[idx], ...updated };
          localStorage.setItem('rr_registered_users', JSON.stringify(users));
        }
      }
    } catch (e) {
      console.error(e);
    }

    alert('Profile updated successfully!');
    setIsSettingsOpen(false);
    setCurrentPw('');
    setNewPw('');
    setConfirmNewPw('');
  };

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2 className="brand-logo">R&R Dispatcher</h2>
        </div>
        
        <nav className="sidebar-nav" aria-label="Sidebar Navigation">
          <div className="nav-category">APPROVALS & SECURITY</div>
          <ul className="nav-list">
            <li className="nav-item">
              <NavLink to="/driver-approval" className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
                <Users size={18} />
                <span className="nav-label">Driver Approval</span>
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink to="/password-resets" className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
                <KeyRound size={18} />
                <span className="nav-label">Password Resets</span>
              </NavLink>
            </li>
          </ul>

          <div className="nav-category">OPERATIONS</div>
          <ul className="nav-list">
            <li className="nav-item">
              <NavLink to="/driver-selection" className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
                <Car size={18} />
                <span className="nav-label">Ride Dispatch</span>
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink 
                to="/driver-replacement" 
                className={({isActive}) => isActive ? "nav-link active" : "nav-link"}
                onClick={markReplacementsAsSeen}
              >
                <RefreshCw size={18} />
                <span className="nav-label">Driver Replacement</span>
                {pendingReplacementsCount > 0 && (
                  <span className="nav-issue-counter" style={{ background: '#f59e0b', color: '#ffffff' }}>
                    {pendingReplacementsCount}
                  </span>
                )}
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink 
                to="/driver-issues" 
                className={({isActive}) => isActive ? "nav-link active" : "nav-link"}
                onClick={markIssuesAsSeen}
              >
                <AlertTriangle size={18} />
                <span className="nav-label">Reported Issues</span>
                {unreadIssuesCount > 0 && (
                  <span className="nav-issue-counter">{unreadIssuesCount}</span>
                )}
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink to="/driver-rating" className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
                <Star size={18} />
                <span className="nav-label">Driver Rating</span>
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink to="/ride-pool" className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
                <FileText size={18} />
                <span className="nav-label">Ride Pool</span>
              </NavLink>
            </li>
          </ul>

          <div className="nav-category">MANAGEMENT</div>
          <ul className="nav-list">
            <li className="nav-item">
              <NavLink to="/pending-rides" className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
                <AlertCircle size={18} />
                <span className="nav-label">Pending Rides</span>
              </NavLink>
            </li>
          </ul>

          <div className="nav-category">FINANCE</div>
          <ul className="nav-list">
            <li className="nav-item">
              <NavLink to="/payment-tracking" className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
                <CreditCard size={18} />
                <span className="nav-label">Payment Tracking</span>
              </NavLink>
            </li>
          </ul>

          <div className="nav-category">SETTINGS</div>
          <ul className="nav-list">
            <li className="nav-item">
              <NavLink to="/terms-conditions" className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
                <Settings size={18} />
                <span className="nav-label">Terms & Conditions</span>
              </NavLink>
            </li>
          </ul>
        </nav>

        <div className="sidebar-footer">
          <div 
            className="profile-widget" 
            onClick={() => setIsSettingsOpen(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setIsSettingsOpen(true);
              }
            }}
            role="button"
            tabIndex={0}
            title="Account Settings"
            aria-label="Open Account Settings"
          >
            <div 
              className="avatar" 
              style={avatarUrl ? {backgroundImage: `url(${avatarUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', color: 'transparent'} : {}}
              aria-hidden="true"
            >
              {!avatarUrl && initial}
            </div>
            <div className="profile-info">
              <span className="name" title={user?.name || 'sohaib'}>{user?.name || 'sohaib'}</span>
              <span className="email" title={user?.email || 'sohaib@rrdispatcher.com'}>{user?.email || 'sohaib@rrdispatcher.com'}</span>
            </div>
            <button 
              type="button" 
              className="logout-btn" 
              title="Logout" 
              aria-label="Logout"
              onClick={(e) => { e.stopPropagation(); onLogout(); }}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Modern Account Settings Modal */}
      {isSettingsOpen && (
        <div className="modal-overlay fade-in settings-modal-overlay" style={{zIndex: 1000}} onClick={() => setIsSettingsOpen(false)}>
          <div className="glass-panel modal-content settings-modal-card" style={{maxWidth: '620px'}} onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="settings-modal-header">
              <div className="d-flex align-items-center gap-3">
                <div className="settings-header-icon-box">
                  <Settings size={20} className="text-primary" />
                </div>
                <div>
                  <h2 className="settings-modal-title">Account Settings</h2>
                  <p className="settings-modal-subtitle">Manage your administrator profile details and security credentials</p>
                </div>
              </div>
              <button className="settings-close-btn" onClick={() => setIsSettingsOpen(false)} title="Close settings">
                <X size={18} />
              </button>
            </div>

            {/* Sub-header Tabs */}
            <div className="settings-tabs-row">
              <button 
                className={`settings-tab-btn ${settingsTab === 'Profile' ? 'active' : ''}`}
                onClick={() => setSettingsTab('Profile')}
              >
                <User size={15} />
                <span>Profile Settings</span>
              </button>
              <button 
                className={`settings-tab-btn ${settingsTab === 'Privacy' ? 'active' : ''}`}
                onClick={() => setSettingsTab('Privacy')}
              >
                <Shield size={15} />
                <span>Privacy Policy</span>
              </button>
            </div>
            
            <div className="settings-modal-body">
              {settingsTab === 'Profile' && (
                <div className="fade-in">
                  {/* Profile Hero Avatar Strip */}
                  <div className="settings-profile-hero">
                    <div className="settings-avatar-wrapper">
                      <div className="settings-avatar-ring">
                        {avatarUrl ? (
                          <img src={avatarUrl} alt="Avatar" className="settings-avatar-img" />
                        ) : (
                          <div className="settings-avatar-circle">{initial}</div>
                        )}
                      </div>
                      <button 
                        type="button" 
                        className="settings-avatar-camera-badge"
                        onClick={() => fileInputRef.current?.click()}
                        title="Upload new profile picture"
                      >
                        <Camera size={13} />
                      </button>
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        accept="image/*" 
                        style={{ display: 'none' }} 
                        onChange={handleAvatarUpload}
                      />
                    </div>
                    <div className="settings-profile-meta">
                      <div className="settings-profile-name-row">
                        <h3 className="settings-profile-name">{profileName || user?.name || 'Administrator'}</h3>
                        <span className="settings-role-badge">Super Admin</span>
                      </div>
                      <p className="settings-profile-email">{user?.email || 'admin@rrdispatcher.com'}</p>
                      <button 
                        type="button" 
                        className="settings-upload-text-btn"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Camera size={13} /> Change Photo
                      </button>
                    </div>
                  </div>

                  {/* Section 1: Personal Information */}
                  <div className="settings-section">
                    <div className="settings-section-header">
                      <span className="settings-section-title">Personal Information</span>
                    </div>
                    <div className="settings-form-grid">
                      <div className="settings-field-group">
                        <label className="settings-label">Full Name</label>
                        <div className="settings-input-wrapper">
                          <User size={16} className="settings-input-icon" />
                          <input 
                            type="text" 
                            className="settings-modern-input" 
                            value={profileName} 
                            onChange={(e) => setProfileName(e.target.value)} 
                            placeholder="Enter your full name" 
                          />
                        </div>
                      </div>

                      <div className="settings-field-group">
                        <label className="settings-label d-flex align-items-center justify-content-between">
                          <span>Email Address</span>
                          <span className="settings-badge-readonly">Verified • Read-only</span>
                        </label>
                        <div className="settings-input-wrapper disabled">
                          <Mail size={16} className="settings-input-icon" />
                          <input 
                            type="email" 
                            className="settings-modern-input disabled" 
                            value={user?.email || 'sohaib@rrdispatcher.com'} 
                            readOnly 
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Security & Password */}
                  <div className="settings-section mt-4">
                    <div className="settings-section-header">
                      <div>
                        <span className="settings-section-title">Security & Password</span>
                        <p className="settings-section-caption">Leave fields blank if you do not want to change your password</p>
                      </div>
                    </div>

                    <div className="settings-form-grid">
                      <div className="settings-field-group">
                        <label className="settings-label">Current Password</label>
                        <div className="settings-input-wrapper">
                          <Lock size={16} className="settings-input-icon" />
                          <input 
                            type={showCurrentPw ? "text" : "password"} 
                            className="settings-modern-input" 
                            placeholder="Enter current password" 
                            value={currentPw}
                            onChange={(e) => setCurrentPw(e.target.value)}
                          />
                          <button 
                            type="button" 
                            className="settings-pw-toggle" 
                            onClick={() => setShowCurrentPw(!showCurrentPw)}
                            tabIndex={-1}
                            title={showCurrentPw ? "Hide password" : "Show password"}
                          >
                            {showCurrentPw ? <EyeOff size={15} /> : <Eye size={15} />}
                          </button>
                        </div>
                      </div>

                      <div className="settings-field-group">
                        <label className="settings-label">New Password</label>
                        <div className="settings-input-wrapper">
                          <Lock size={16} className="settings-input-icon" />
                          <input 
                            type={showNewPw ? "text" : "password"} 
                            className="settings-modern-input" 
                            placeholder="Min. 6 characters" 
                            value={newPw}
                            onChange={(e) => setNewPw(e.target.value)}
                          />
                          <button 
                            type="button" 
                            className="settings-pw-toggle" 
                            onClick={() => setShowNewPw(!showNewPw)}
                            tabIndex={-1}
                            title={showNewPw ? "Hide password" : "Show password"}
                          >
                            {showNewPw ? <EyeOff size={15} /> : <Eye size={15} />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="settings-field-group mt-3">
                      <label className="settings-label">Confirm New Password</label>
                      <div className="settings-input-wrapper">
                        <Lock size={16} className="settings-input-icon" />
                        <input 
                          type={showConfirmPw ? "text" : "password"} 
                          className="settings-modern-input" 
                          placeholder="Re-enter your new password" 
                          value={confirmNewPw}
                          onChange={(e) => setConfirmNewPw(e.target.value)}
                        />
                        <button 
                          type="button" 
                          className="settings-pw-toggle" 
                          onClick={() => setShowConfirmPw(!showConfirmPw)}
                          tabIndex={-1}
                          title={showConfirmPw ? "Hide password" : "Show password"}
                        >
                          {showConfirmPw ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Modal Action Buttons */}
                  <div className="settings-modal-footer mt-4">
                    <button 
                      type="button" 
                      className="settings-cancel-btn" 
                      onClick={() => setIsSettingsOpen(false)}
                    >
                      Cancel
                    </button>
                    <button 
                      type="button" 
                      className="settings-save-btn" 
                      onClick={handleSaveProfile}
                    >
                      <Check size={16} /> Save Changes
                    </button>
                  </div>
                </div>
              )}

              {settingsTab === 'Privacy' && (
                <div className="fade-in settings-privacy-content">
                  <div className="privacy-badge-pill mb-2">
                    <Shield size={14} className="text-primary" /> Official Policy
                  </div>
                  <h4 className="privacy-heading">R&R Dispatcher Privacy & Data Policy</h4>
                  <p className="privacy-meta">Last revised: August 2026 • Version 2.4</p>
                  
                  <div className="privacy-card-box mt-3">
                    <h5>1. Data Protection & Encryption</h5>
                    <p>All passenger and driver phone numbers, CNIC verification records, and trip coordinates are encrypted using industry-standard AES-256 protocols.</p>
                  </div>

                  <div className="privacy-card-box mt-2">
                    <h5>2. Dispatch Tracking Compliance</h5>
                    <p>GPS tracking logs are strictly maintained for safety audit trails and dispute resolutions. Records are purged according to data retention regulations.</p>
                  </div>

                  <div className="privacy-card-box mt-2">
                    <h5>3. Access Permissions</h5>
                    <p>Only verified super administrators have credentials to modify ride schedules, fares, and system-level driver assignments.</p>
                  </div>

                  <div className="settings-modal-footer mt-4">
                    <button className="settings-save-btn w-100 justify-content-center" onClick={() => setIsSettingsOpen(false)}>
                      <Check size={16} /> Acknowledge & Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="main-content">
        {/* Header */}
        <header className="top-header">
          <div className="search-container">
            <Search size={18} className="search-icon" />
            <input type="text" placeholder="Search globally..." />
          </div>
          
          <div className="header-actions">
            <div className="notification-bell-wrapper" ref={notifDropdownRef}>
              <button 
                className="icon-btn notification-bell-btn" 
                onClick={() => {
                  markIssuesAsSeen();
                  setIsNotificationOpen(prev => !prev);
                }}
                title={unreadIssuesCount > 0 ? `${unreadIssuesCount} new reported issues (click to view)` : 'Notifications'}
              >
                <Bell size={19} />
                {unreadIssuesCount > 0 && (
                  <span className="bell-badge">{unreadIssuesCount}</span>
                )}
              </button>

              {/* Notification Dropdown Menu */}
              {isNotificationOpen && (
                <div className="notification-dropdown fade-in">
                  <div className="notif-dropdown-header">
                    <div className="notif-dropdown-title">
                      <AlertTriangle size={16} className="text-warning mr-1" />
                      <span>Driver Issue Alerts</span>
                    </div>
                    <button 
                      className="notif-clear-btn"
                      onClick={() => {
                        markIssuesAsSeen();
                        setIsNotificationOpen(false);
                      }}
                    >
                      Clear Badge
                    </button>
                  </div>

                  <div className="notif-dropdown-body">
                    {recentNotifications.length === 0 ? (
                      <div className="notif-empty">No recent notifications.</div>
                    ) : (
                      recentNotifications.map((item, idx) => {
                        const isFareResponse = item.type === 'fare-response';
                        const isAccepted = item.action === 'ACCEPTED';
                        
                        if (isFareResponse) {
                          return (
                            <div 
                              key={item.notifId || item.rideId || idx}
                              className="notif-dropdown-item"
                              onClick={() => {
                                markIssuesAsSeen();
                                setIsNotificationOpen(false);
                                navigate('/ride-dispatch');
                              }}
                            >
                              <div className="notif-item-icon" style={{ color: isAccepted ? '#10B981' : '#EF4444' }}>
                                <Bell size={16} />
                              </div>
                              <div className="notif-item-info">
                                <div className="notif-item-top">
                                  <span className="notif-item-name">{item.title || (isAccepted ? '✅ Fare Approved' : '❌ Fare Rejected')}</span>
                                </div>
                                <div className="notif-item-desc" style={{ marginTop: '4px', color: '#64748B', fontSize: '0.8rem' }}>
                                  {item.message || `Customer ${item.customerName || ''} has ${item.action || 'responded'} to the fare ${item.fareFormatted || ''}.`}
                                </div>
                              </div>
                            </div>
                          );
                        }

                        // Original Driver Issue Notification
                        return (
                          <div 
                            key={item.issueId || item._id || idx}
                            className="notif-dropdown-item"
                            onClick={() => {
                              markIssuesAsSeen();
                              setIsNotificationOpen(false);
                              navigate('/driver-issues');
                            }}
                          >
                            <div className="notif-item-icon">
                              <AlertCircle size={16} />
                            </div>
                            <div className="notif-item-info">
                              <div className="notif-item-top">
                                <span className="notif-item-name">{item.driverName || 'Driver'}</span>
                                <span className={`notif-item-status ${(item.status || 'Pending').toLowerCase()}`}>
                                  {item.status || 'Pending'}
                                </span>
                              </div>
                              <div className="notif-item-reason">{item.reason || 'Road Issue'}</div>
                              {item.description && (
                                <div className="notif-item-desc">{item.description}</div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="notif-dropdown-footer">
                    <button 
                      className="notif-view-all-btn"
                      onClick={() => {
                        markIssuesAsSeen();
                        setIsNotificationOpen(false);
                        navigate('/driver-issues');
                      }}
                    >
                      View All in Reported Issues →
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button className="icon-btn theme-toggle-btn" onClick={toggleTheme}>
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
        </header>

        {/* Page Content */}
        <div className="page-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
