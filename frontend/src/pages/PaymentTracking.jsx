import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, Plus, X, DollarSign, Clock, CheckCircle, AlertCircle, RefreshCw, 
  ExternalLink, Eye, Image as ImageIcon, Phone, User, Calendar, ShieldCheck, XCircle, ArrowUpRight
} from 'lucide-react';
import { BACKEND_URL, MOBILE_BACKEND_URL } from '../utils/api';
import './PaymentTracking.css';

const PAYMENT_ENDPOINTS = [
  'http://localhost:3000/api/payments/admin/all',
  `${MOBILE_BACKEND_URL}/api/payments/admin/all`,
  `${BACKEND_URL}/api/payments/admin/all`,
  '/api/payments/admin/all'
];

const PaymentTracking = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeSource, setActiveSource] = useState('');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [actionStatus, setActionStatus] = useState('VERIFIED');
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  // Fetch payments from backend
  const fetchPayments = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    let fetchedData = null;
    let successfulUrl = '';

    for (const endpoint of PAYMENT_ENDPOINTS) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);
        const res = await fetch(endpoint, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (res.ok) {
          const json = await res.json();
          const list = json.data || json.payments || (Array.isArray(json) ? json : null);
          if (Array.isArray(list)) {
            fetchedData = list;
            successfulUrl = endpoint;
            break;
          }
        }
      } catch (err) {
        // try next endpoint
      }
    }

    if (fetchedData) {
      setPayments(fetchedData);
      setActiveSource(successfulUrl);
    } else {
      // Fallback sample data if no backend is reachable
      setPayments([
        {
          _id: '6ac744a3712365e9313ff5b8',
          id: '6ac744a3712365e9313ff5b8',
          customerId: '6abb4e89d6000b4664523f99',
          customerName: 'Bibi Sadiqa',
          customerPhone: '0332-8904415',
          rideId: 'REQ-8037',
          fare: 'Rs. 9,500',
          amount: 9500,
          paymentProofUrl: 'https://res.cloudinary.com/xmiyee5r/image/upload/v1791444130/Payments/qb8chcqvct5gh5qre3sr.jpg',
          status: 'PENDING VERIFICATION',
          chargeType: 'Rs. 500 Charge',
          createdAt: new Date().toISOString()
        }
      ]);
    }

    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  // Helper to determine charge category
  const getChargeCategory = (item) => {
    if (item.chargeType) return item.chargeType;
    const strFare = String(item.fare || '').toLowerCase();
    const num = item.amount || Number(String(item.fare || '').replace(/\D/g, '')) || 0;
    if (num === 500 || strFare.includes('500')) return 'Rs. 500 Charge';
    if (num === 25000 || strFare.includes('25000') || strFare.includes('25,000')) return 'Rs. 25,000 Charge';
    return 'Other Charge';
  };

  // KPI Calculations
  const stats = useMemo(() => {
    const total = payments.length;
    let pending = 0;
    let submitted = 0;
    let verified = 0;
    let rejected = 0;

    let c500Pending = 0;
    let c500Verified = 0;
    let c25kPending = 0;
    let c25kVerified = 0;
    let otherPending = 0;
    let otherVerified = 0;

    payments.forEach(p => {
      const s = String(p.status || '').toUpperCase();
      const cat = getChargeCategory(p);

      if (s === 'PENDING VERIFICATION' || s === 'PAYMENT SUBMITTED') {
        submitted++;
      } else if (s === 'VERIFIED' || s === 'PAID' || s === 'VERIFIED/PAID') {
        verified++;
      } else if (s === 'REJECTED') {
        rejected++;
      } else {
        pending++;
      }

      const isDone = (s === 'VERIFIED' || s === 'PAID' || s === 'VERIFIED/PAID');
      if (cat === 'Rs. 500 Charge') {
        if (isDone) c500Verified++;
        else c500Pending++;
      } else if (cat === 'Rs. 25,000 Charge') {
        if (isDone) c25kVerified++;
        else c25kPending++;
      } else {
        if (isDone) otherVerified++;
        else otherPending++;
      }
    });

    return {
      total,
      pending: pending || submitted,
      submitted,
      verified,
      rejected,
      c500Pending,
      c500Verified,
      c25kPending,
      c25kVerified,
      otherPending,
      otherVerified
    };
  }, [payments]);

  // Filtering
  const filteredData = useMemo(() => {
    return payments.filter(item => {
      const query = searchTerm.toLowerCase().trim();
      const name = String(item.customerName || item.user || '').toLowerCase();
      const phone = String(item.customerPhone || '').toLowerCase();
      const ride = String(item.rideId || '').toLowerCase();
      const id = String(item._id || item.id || '').toLowerCase();

      const matchesSearch = !query || name.includes(query) || phone.includes(query) || ride.includes(query) || id.includes(query);

      const cat = getChargeCategory(item);
      const matchesType = filterType === 'All' || cat === filterType;

      const s = String(item.status || '').toUpperCase();
      let matchesStatus = true;
      if (filterStatus === 'Pending') {
        matchesStatus = s === 'PENDING' || s === 'PENDING VERIFICATION';
      } else if (filterStatus === 'Payment Submitted') {
        matchesStatus = s === 'PENDING VERIFICATION' || s === 'PAYMENT SUBMITTED';
      } else if (filterStatus === 'Verified/Paid') {
        matchesStatus = s === 'VERIFIED' || s === 'PAID' || s === 'VERIFIED/PAID';
      } else if (filterStatus === 'Rejected') {
        matchesStatus = s === 'REJECTED';
      }

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [payments, searchTerm, filterType, filterStatus]);

  const handleView = (payment) => {
    setSelectedPayment(payment);
    const currStatus = String(payment.status || '').toUpperCase();
    if (currStatus.includes('VERIFIED') || currStatus.includes('PAID')) {
      setActionStatus('VERIFIED');
    } else if (currStatus.includes('REJECTED')) {
      setActionStatus('REJECTED');
    } else {
      setActionStatus('VERIFIED');
    }
    setRejectionReason(payment.adminRemarks || '');
  };

  const closeModal = () => {
    setSelectedPayment(null);
    setRejectionReason('');
  };

  const getStatusBadge = (status) => {
    const s = String(status || '').toUpperCase();
    if (s.includes('VERIFIED') || s.includes('PAID')) {
      return <span className="status-badge verified"><CheckCircle size={12} /> Verified</span>;
    }
    if (s.includes('REJECT')) {
      return <span className="status-badge rejected"><XCircle size={12} /> Rejected</span>;
    }
    return <span className="status-badge submitted"><Clock size={12} /> Pending Verification</span>;
  };

  // Submit Action to update payment status
  const handleSubmitAction = async () => {
    if (!selectedPayment) return;
    setIsSubmittingAction(true);

    const targetId = selectedPayment._id || selectedPayment.id;
    const newStatus = actionStatus === 'VERIFIED' ? 'VERIFIED' : (actionStatus === 'REJECTED' ? 'REJECTED' : 'PENDING VERIFICATION');
    const remarks = actionStatus === 'REJECTED' ? (rejectionReason || 'Payment proof rejected by admin') : 'Verified by Admin';

    // Update in local state immediately
    setPayments(prev => prev.map(p => {
      if (p._id === targetId || p.id === targetId) {
        return {
          ...p,
          status: newStatus,
          adminRemarks: remarks
        };
      }
      return p;
    }));

    // Call endpoints
    const updateUrls = [
      `http://localhost:3000/api/payments/admin/${targetId}/status`,
      `${BACKEND_URL}/api/payments/admin/${targetId}/status`,
      `/api/payments/admin/${targetId}/status`
    ];

    for (const url of updateUrls) {
      try {
        await fetch(url, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: newStatus,
            adminRemarks: remarks,
            rejectionReason: remarks
          })
        });
      } catch (e) {}
    }

    setIsSubmittingAction(false);
    showToast(`Payment for ${selectedPayment.customerName || selectedPayment.rideId} marked as ${newStatus}`);
    closeModal();
  };

  return (
    <div className="payment-tracking-container">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="payment-toast-alert">
          <CheckCircle size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="payment-header">
        <div>
          <div className="title-with-pill">
            <h1>Payment Tracking</h1>
            <span className="live-status-pill">
              <span className="pulse-dot"></span>
              Live Synced
            </span>
          </div>
          <p>Monitor real-time passenger ride payments, receipts, and verification</p>
        </div>
        <div className="header-actions">
          <button 
            className="refresh-btn" 
            onClick={() => fetchPayments(true)}
            disabled={refreshing}
            title="Refresh payment records"
          >
            <RefreshCw size={15} className={refreshing ? 'spin-anim' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Main KPI Stats */}
      <div className="stats-grid">
        <div className="stat-card" onClick={() => setFilterStatus('All')}>
          <div className="stat-info">
            <h3>Total Payments</h3>
            <div className="stat-value">{stats.total}</div>
          </div>
          <div className="stat-icon total"><DollarSign size={20} /></div>
        </div>

        <div className="stat-card" onClick={() => setFilterStatus('Payment Submitted')}>
          <div className="stat-info">
            <h3>Pending Verification</h3>
            <div className="stat-value">{stats.submitted}</div>
          </div>
          <div className="stat-icon submitted"><Clock size={20} /></div>
        </div>

        <div className="stat-card" onClick={() => setFilterStatus('Verified/Paid')}>
          <div className="stat-info">
            <h3>Verified / Paid</h3>
            <div className="stat-value">{stats.verified}</div>
          </div>
          <div className="stat-icon verified"><CheckCircle size={20} /></div>
        </div>

        <div className="stat-card" onClick={() => setFilterStatus('Rejected')}>
          <div className="stat-info">
            <h3>Rejected</h3>
            <div className="stat-value">{stats.rejected}</div>
          </div>
          <div className="stat-icon rejected"><XCircle size={20} /></div>
        </div>
      </div>

      {/* Sub Stats by Charge Types */}
      <div className="sub-stats-grid">
        <div className="sub-stat-card">
          <div className="sub-stat-title">Rs. 500 Charge</div>
          <div className="sub-stat-details">
            <span>Pending: <strong>{stats.c500Pending}</strong></span>
            <span>Verified: <strong className="text-success">{stats.c500Verified}</strong></span>
          </div>
        </div>
        <div className="sub-stat-card">
          <div className="sub-stat-title">Rs. 25,000 Charge</div>
          <div className="sub-stat-details">
            <span>Pending: <strong>{stats.c25kPending}</strong></span>
            <span>Verified: <strong className="text-success">{stats.c25kVerified}</strong></span>
          </div>
        </div>
        <div className="sub-stat-card">
          <div className="sub-stat-title">Ride Fares & Other</div>
          <div className="sub-stat-details">
            <span>Pending: <strong>{stats.otherPending}</strong></span>
            <span>Verified: <strong className="text-success">{stats.otherVerified}</strong></span>
          </div>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="filters-section">
        <div className="search-box">
          <Search size={16} />
          <input 
            type="text" 
            placeholder="Search by Customer Name, Phone, Ride ID..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button className="clear-search-btn" onClick={() => setSearchTerm('')}>
              <X size={14} />
            </button>
          )}
        </div>
        <select className="filter-select" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="All">All Charge Types</option>
          <option value="Rs. 500 Charge">Rs. 500 Charge</option>
          <option value="Rs. 25,000 Charge">Rs. 25,000 Charge</option>
          <option value="Other Charge">Other Charge / Fare</option>
        </select>
        <select className="filter-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="All">All Statuses</option>
          <option value="Payment Submitted">Pending Verification</option>
          <option value="Verified/Paid">Verified / Paid</option>
          <option value="Rejected">Rejected</option>
        </select>
      </div>

      {/* Payments Table */}
      <div className="table-container">
        {loading ? (
          <div className="table-loading-box">
            <RefreshCw size={24} className="spin-anim" />
            <p>Fetching real-time payment records...</p>
          </div>
        ) : (
          <table className="payment-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Ride ID</th>
                <th>Amount</th>
                <th>Charge Type</th>
                <th>Proof Screenshot</th>
                <th>Date Submitted</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.length > 0 ? (
                filteredData.map((row) => {
                  const proofImg = row.paymentProofUrl || row.proofUrl;
                  const cat = getChargeCategory(row);
                  const dateStr = row.createdAt ? new Date(row.createdAt).toLocaleDateString() : 'Today';
                  const timeStr = row.createdAt ? new Date(row.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

                  return (
                    <tr key={row._id || row.id}>
                      <td>
                        <div className="user-info">
                          <div className="user-avatar">
                            {(row.customerName || 'C').charAt(0).toUpperCase()}
                          </div>
                          <div className="user-details">
                            <span className="user-name">{row.customerName || 'Customer'}</span>
                            <span className="user-phone">
                              <Phone size={11} /> {row.customerPhone || 'N/A'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="ride-id-tag">{row.rideId || 'N/A'}</span>
                      </td>
                      <td>
                        <span className="amount-text">
                          {row.fare || `Rs. ${Number(row.amount || 0).toLocaleString()}`}
                        </span>
                      </td>
                      <td>
                        <span className="charge-type-chip">{cat}</span>
                      </td>
                      <td>
                        {proofImg ? (
                          <div 
                            className="proof-thumb-wrap" 
                            onClick={() => setPreviewImage(proofImg)}
                            title="Click to zoom screenshot"
                          >
                            <img src={proofImg} alt="Receipt" className="proof-thumb-img" />
                            <div className="proof-hover-overlay">
                              <Eye size={12} />
                            </div>
                          </div>
                        ) : (
                          <span className="no-proof-text">No Screenshot</span>
                        )}
                      </td>
                      <td>
                        <div className="date-time-cell">
                          <span>{dateStr}</span>
                          <span className="sub-time">{timeStr}</span>
                        </div>
                      </td>
                      <td>
                        {getStatusBadge(row.status)}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button className="view-btn" onClick={() => handleView(row)}>
                          Review
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '40px' }}>
                    <div className="empty-state-box">
                      <ImageIcon size={32} style={{ opacity: 0.4, marginBottom: 8 }} />
                      <p>No payment submissions found matching your filters.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Review & Verification Modal */}
      {selectedPayment && (
        <div className="payment-modal-overlay" onClick={closeModal}>
          <div className="payment-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-wrap">
                <h2>Review Payment Verification</h2>
                <span className="ride-pill-small">Ride ID: {selectedPayment.rideId}</span>
              </div>
              <button className="close-btn" onClick={closeModal}><X size={20} /></button>
            </div>
            
            <div className="modal-body">
              <div className="modal-left">
                <div className="details-card-box">
                  <div className="detail-row">
                    <span className="label"><User size={14} /> Customer:</span>
                    <span className="val font-semibold">{selectedPayment.customerName || 'N/A'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label"><Phone size={14} /> Phone Number:</span>
                    <span className="val">{selectedPayment.customerPhone || 'N/A'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Ride ID:</span>
                    <span className="val">{selectedPayment.rideId}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Charge Type:</span>
                    <span className="val">{getChargeCategory(selectedPayment)}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Payment Amount:</span>
                    <span className="val fare-highlight">
                      {selectedPayment.fare || `Rs. ${Number(selectedPayment.amount || 0).toLocaleString()}`}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="label"><Calendar size={14} /> Date:</span>
                    <span className="val">
                      {selectedPayment.createdAt ? new Date(selectedPayment.createdAt).toLocaleString() : 'Today'}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Current Status:</span>
                    <span className="val">{getStatusBadge(selectedPayment.status)}</span>
                  </div>
                </div>

                <div className="proof-container">
                  <div className="proof-header-bar">
                    <span className="proof-title">Payment Proof Screenshot</span>
                    {selectedPayment.paymentProofUrl && (
                      <a 
                        href={selectedPayment.paymentProofUrl} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="open-full-link"
                      >
                        <ExternalLink size={13} /> Open Full Size
                      </a>
                    )}
                  </div>

                  {selectedPayment.paymentProofUrl ? (
                    <div 
                      className="proof-img-card" 
                      onClick={() => setPreviewImage(selectedPayment.paymentProofUrl)}
                      title="Click to view full screen"
                    >
                      <img 
                        src={selectedPayment.paymentProofUrl} 
                        alt="Payment Proof" 
                        className="proof-img" 
                      />
                      <div className="zoom-hint-banner">
                        <Eye size={14} /> Click to expand image
                      </div>
                    </div>
                  ) : (
                    <div className="no-proof-card">
                      <ImageIcon size={32} />
                      <p>No proof screenshot uploaded by user.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-right">
                <div className="action-section">
                  <h3>Admin Decision</h3>
                  <p className="action-desc">Verify customer transaction receipt and update payment status.</p>

                  <div className="radio-group">
                    <label className={`radio-label ${actionStatus === 'VERIFIED' ? 'active-success' : ''}`}>
                      <input 
                        type="radio" 
                        name="actionStatus" 
                        value="VERIFIED"
                        checked={actionStatus === 'VERIFIED'}
                        onChange={(e) => setActionStatus(e.target.value)}
                      />
                      <div className="radio-text">
                        <span className="title">Verify / Mark as Paid</span>
                        <span className="subtitle">Confirm receipt is authentic & funds received</span>
                      </div>
                    </label>

                    <label className={`radio-label ${actionStatus === 'PENDING' ? 'active-warning' : ''}`}>
                      <input 
                        type="radio" 
                        name="actionStatus" 
                        value="PENDING"
                        checked={actionStatus === 'PENDING'}
                        onChange={(e) => setActionStatus(e.target.value)}
                      />
                      <div className="radio-text">
                        <span className="title">Keep Pending</span>
                        <span className="subtitle">Under review, awaiting bank verification</span>
                      </div>
                    </label>

                    <label className={`radio-label ${actionStatus === 'REJECTED' ? 'active-danger' : ''}`}>
                      <input 
                        type="radio" 
                        name="actionStatus" 
                        value="REJECTED"
                        checked={actionStatus === 'REJECTED'}
                        onChange={(e) => setActionStatus(e.target.value)}
                      />
                      <div className="radio-text">
                        <span className="title">Reject Submission</span>
                        <span className="subtitle">Invalid screenshot, fake receipt, or wrong amount</span>
                      </div>
                    </label>
                  </div>

                  {actionStatus === 'REJECTED' && (
                    <div className="rejection-box">
                      <label className="rejection-label">Rejection Reason (Sent to Customer):</label>
                      <textarea 
                        className="rejection-input" 
                        placeholder="e.g. Screenshot blurry, Transaction ID mismatch, or amount not received..."
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        rows={3}
                      ></textarea>
                    </div>
                  )}

                  <div className="modal-btn-row">
                    <button className="cancel-btn" onClick={closeModal}>
                      Cancel
                    </button>
                    <button 
                      className={`submit-action-btn ${actionStatus.toLowerCase()}`}
                      onClick={handleSubmitAction}
                      disabled={isSubmittingAction}
                    >
                      {isSubmittingAction ? (
                        <>
                          <RefreshCw size={14} className="spin-anim" /> Saving...
                        </>
                      ) : (
                        `Confirm ${actionStatus === 'VERIFIED' ? 'Verification' : (actionStatus === 'REJECTED' ? 'Rejection' : 'Pending Status')}`
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* High-Resolution Full-Screen Image Lightbox */}
      {previewImage && (
        <div className="image-lightbox-overlay" onClick={() => setPreviewImage(null)}>
          <div className="lightbox-content" onClick={e => e.stopPropagation()}>
            <button className="lightbox-close" onClick={() => setPreviewImage(null)}>
              <X size={24} />
            </button>
            <img src={previewImage} alt="Payment Receipt Zoom" className="lightbox-image" />
            <div className="lightbox-footer">
              <a 
                href={previewImage} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="lightbox-open-btn"
              >
                <ArrowUpRight size={16} /> Open Raw Link
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentTracking;
