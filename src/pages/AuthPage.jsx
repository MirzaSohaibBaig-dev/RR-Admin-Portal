import React, { useState } from 'react';
import { Mail, Lock, User, Phone, ChevronRight, CheckCircle, Eye, EyeOff, ShieldCheck, AlertCircle } from 'lucide-react';
import './AuthPage.css';

const DEFAULT_USERS = [
  {
    name: 'Admin User',
    email: 'admin@rrdispatcher.com',
    password: 'password123',
    phone: '+92 300 1234567'
  }
];

const getStoredUsers = () => {
  try {
    const data = localStorage.getItem('rr_registered_users');
    if (data) return JSON.parse(data);
  } catch (e) {
    console.error(e);
  }
  return DEFAULT_USERS;
};

const saveUsers = (users) => {
  try {
    localStorage.setItem('rr_registered_users', JSON.stringify(users));
  } catch (e) {
    console.error(e);
  }
};

const AuthPage = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [formData, setFormData] = useState({ name: '', phone: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');

  const set = (field) => (e) => {
    setFormData({ ...formData, [field]: e.target.value });
    if (error) setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    const users = getStoredUsers();

    if (!isLogin) {
      // Signup flow
      if (!formData.name.trim()) {
        setError('Please enter your full name.');
        return;
      }
      if (!formData.phone.trim()) {
        setError('Please enter your phone number.');
        return;
      }
      if (!formData.email.trim()) {
        setError('Please enter your email address.');
        return;
      }
      if (formData.password.length < 6) {
        setError('Password must be at least 6 characters long.');
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match. Please re-enter.');
        return;
      }

      const existing = users.find(u => u.email.toLowerCase() === formData.email.trim().toLowerCase());
      if (existing) {
        setError('An account with this email already exists. Please log in.');
        return;
      }

      // Register new user
      const newUser = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        password: formData.password
      };

      const updatedUsers = [...users, newUser];
      saveUsers(updatedUsers);

      // Show success screen and prepare for login
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setIsLogin(true);
        setFormData({
          name: '',
          phone: '',
          email: newUser.email,
          password: '',
          confirmPassword: ''
        });
      }, 2500);

    } else {
      // Login flow — verify against registered users
      const emailTrimmed = formData.email.trim().toLowerCase();
      const matchedUser = users.find(u => u.email.toLowerCase() === emailTrimmed);

      if (!matchedUser) {
        setError('No account found with this email address. Please sign up first.');
        return;
      }

      if (matchedUser.password !== formData.password) {
        setError('Incorrect password. Please verify and try again.');
        return;
      }

      // Successful login
      localStorage.setItem('rr_current_user', JSON.stringify(matchedUser));
      onLogin(matchedUser);
    }
  };

  const switchMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setShowSuccess(false);
    setFormData({ name: '', phone: '', email: '', password: '', confirmPassword: '' });
  };

  return (
    <div className="auth-container-wrapper fade-in">
      <div className="auth-layout-grid">
        {/* Left Branding Panel */}
        <div className="auth-brand-side">
          <div className="brand-badge-top">
            <span className="brand-logo-icon">🚗</span>
            <span className="brand-badge-title">R&R DISPATCHER</span>
          </div>

          <div className="brand-hero-content">
            <h1 className="brand-hero-heading">
              Smart Fleet & Driver <br />
              <span className="brand-highlight">Dispatch Portal</span>
            </h1>
            <p className="brand-hero-desc">
              Manage driver registrations, automate ride pool dispatching, and monitor pending trips seamlessly in real-time.
            </p>

            <div className="brand-highlights-list">
              <div className="highlight-pill">
                <ShieldCheck size={18} className="pill-icon" />
                <span>Verified Driver Approvals</span>
              </div>
              <div className="highlight-pill">
                <CheckCircle size={18} className="pill-icon" />
                <span>Real-Time Ride Pool Management</span>
              </div>
              <div className="highlight-pill">
                <User size={18} className="pill-icon" />
                <span>Secure Multi-Admin Access</span>
              </div>
            </div>
          </div>

          <div className="brand-footer-note">
            <span>© 2026 R&R Dispatcher. All rights reserved.</span>
          </div>
        </div>

        {/* Right Form Panel */}
        <div className="auth-form-side">
          <div className="auth-card-box">
            {showSuccess ? (
              <div className="auth-success-state fade-in">
                <div className="success-pulse-ring">
                  <CheckCircle size={52} className="success-check-icon" />
                </div>
                <h2 className="success-title">Account Created!</h2>
                <p className="success-subtitle">
                  Your admin account has been created successfully. You can now login with your credentials.
                </p>
                <div className="success-timer-bar">
                  <div className="success-timer-fill"></div>
                </div>
              </div>
            ) : (
              <>
                <div className="auth-header-block">
                  <h2 className="auth-title">{isLogin ? 'Welcome Back' : 'Create Admin Account'}</h2>
                  <p className="auth-subtitle">
                    {isLogin
                      ? 'Sign in to access your dispatch management dashboard.'
                      : 'Register your admin profile to get started.'}
                  </p>
                </div>

                {error && (
                  <div className="auth-error-alert fade-in">
                    <AlertCircle size={18} className="error-icon" />
                    <span>{error}</span>
                  </div>
                )}

                <form className="auth-form-body" onSubmit={handleSubmit}>
                  {!isLogin && (
                    <>
                      <div className="auth-fields-row">
                        <div className="form-field-group">
                          <label>FULL NAME</label>
                          <div className="auth-field-input-box">
                            <User size={18} className="field-inner-icon" />
                            <input
                              type="text"
                              required
                              placeholder="e.g. Khawar Riaz"
                              value={formData.name}
                              onChange={set('name')}
                            />
                          </div>
                        </div>

                        <div className="form-field-group">
                          <label>PHONE NUMBER</label>
                          <div className="auth-field-input-box">
                            <Phone size={18} className="field-inner-icon" />
                            <input
                              type="tel"
                              required
                              placeholder="+92 3XX XXXXXXX"
                              value={formData.phone}
                              onChange={set('phone')}
                            />
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  <div className="form-field-group">
                    <label>EMAIL ADDRESS</label>
                    <div className="auth-field-input-box">
                      <Mail size={18} className="field-inner-icon" />
                      <input
                        type="email"
                        required
                        placeholder="admin@rrdispatcher.com"
                        value={formData.email}
                        onChange={set('email')}
                      />
                    </div>
                  </div>

                  {!isLogin ? (
                    <div className="auth-fields-row">
                      <div className="form-field-group">
                        <label>PASSWORD</label>
                        <div className="auth-field-input-box">
                          <Lock size={18} className="field-inner-icon" />
                          <input
                            type={showPw ? 'text' : 'password'}
                            required
                            placeholder="Min 6 characters"
                            value={formData.password}
                            onChange={set('password')}
                          />
                          <button
                            type="button"
                            className="field-toggle-btn"
                            onClick={() => setShowPw(!showPw)}
                            tabIndex={-1}
                          >
                            {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>

                      <div className="form-field-group">
                        <label>CONFIRM PASSWORD</label>
                        <div className="auth-field-input-box">
                          <Lock size={18} className="field-inner-icon" />
                          <input
                            type={showConfirmPw ? 'text' : 'password'}
                            required
                            placeholder="Re-type password"
                            value={formData.confirmPassword}
                            onChange={set('confirmPassword')}
                          />
                          <button
                            type="button"
                            className="field-toggle-btn"
                            onClick={() => setShowConfirmPw(!showConfirmPw)}
                            tabIndex={-1}
                          >
                            {showConfirmPw ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="form-field-group">
                      <label>PASSWORD</label>
                      <div className="auth-field-input-box">
                        <Lock size={18} className="field-inner-icon" />
                        <input
                          type={showPw ? 'text' : 'password'}
                          required
                          placeholder="Enter your password"
                          value={formData.password}
                          onChange={set('password')}
                        />
                        <button
                          type="button"
                          className="field-toggle-btn"
                          onClick={() => setShowPw(!showPw)}
                          tabIndex={-1}
                        >
                          {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                  )}

                  <button type="submit" className="auth-primary-submit-btn">
                    <span>{isLogin ? 'Sign In to Dashboard' : 'Create Account'}</span>
                    <ChevronRight size={18} />
                  </button>
                </form>

                <div className="auth-switch-footer">
                  <span>{isLogin ? "Don't have an admin account?" : 'Already have an account?'}</span>
                  <button type="button" className="auth-link-btn" onClick={switchMode}>
                    {isLogin ? 'Sign up' : 'Log in'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
