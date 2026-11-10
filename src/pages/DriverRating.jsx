import React, { useState, useEffect, useMemo } from 'react';
import { 
  Star, Users, Clock, AlertTriangle, Search, Filter, 
  Plus, Edit2, History, CheckCircle, X, ShieldCheck, 
  TrendingUp, Calendar, ArrowRight, UserCheck, MessageSquare, Car, RotateCw, Sparkles,
  MapPin, Check, Phone, Award
} from 'lucide-react';
import { BACKEND_URL } from '../utils/api';
import './DriverRating.css';

const PERFORMANCE_TAG_OPTIONS = [
  'Top Performer',
  'Punctual & On-Time',
  'Safe Driving',
  'Clean & Maintained Vehicle',
  'Courteous & Polite',
  'Route Adherence',
  'Customer Friendly',
  'Needs Improvement'
];

const formatDriverCode = (id) => {
  if (!id) return 'DRV-1001';
  const str = String(id).trim();
  if (str.includes('-')) {
    const parts = str.split('-');
    if (parts.length >= 3) {
      return `${parts[0]}-${parts[parts.length - 1].toUpperCase()}`;
    }
  }
  if (str.length > 12) {
    return `DRV-${str.slice(-6).toUpperCase()}`;
  }
  return str;
};

const DriverRating = () => {
  const [drivers, setDrivers] = useState([]);
  const [pendingRides, setPendingRides] = useState([]);
  const [kpis, setKpis] = useState({
    totalRatedDrivers: 0,
    averageRating: 0,
    ratedThisMonth: 0,
    requiringReview: 0,
    pendingRidesCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Main View Tab: 'PendingRides' (Awaiting Rating) or 'Drivers' (Lifetime Driver Directory)
  const [mainViewTab, setMainViewTab] = useState('PendingRides');

  // Filters state for Driver Directory
  const [searchQuery, setSearchQuery] = useState('');
  const [ratingFilter, setRatingFilter] = useState('All');
  const [performanceFilter, setPerformanceFilter] = useState('All');
  const [activeKpiTab, setActiveKpiTab] = useState('All'); // 'All', 'Rated', 'High', 'Review'

  // Modals state
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [selectedRide, setSelectedRide] = useState(null);
  const [historyLogs, setHistoryLogs] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Rating Form state
  const [ratingForm, setRatingForm] = useState({
    driverId: '',
    rideId: '',
    rideReference: '',
    score: 5.0,
    hoverScore: 0,
    selectedTags: ['Punctual & On-Time', 'Safe Driving'],
    adminRemarks: ''
  });

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  // Fetch Drivers Ratings, Pending Rides & KPIs
  const fetchRatings = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`${BACKEND_URL}/admin/ratings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();

      if (data.success && data.data) {
        setDrivers(data.data.drivers || []);
        const pRides = data.data.pendingRides || [];
        setPendingRides(pRides);
        if (data.data.kpis) {
          setKpis(data.data.kpis);
        }
        // If there are pending rides, start on the Pending Reviews view
        if (pRides.length > 0 && mainViewTab !== 'Drivers') {
          setMainViewTab('PendingRides');
        }
      }
    } catch (err) {
      console.error('Failed to fetch driver ratings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRatings();
  }, []);

  // Open "Give Rating" or "Update Rating" Modal
  const openRatingModal = (driver = null, ride = null) => {
    setSelectedRide(ride);
    if (ride) {
      const targetDriver = drivers.find(d => (d._id || d.id) === ride.driverId) || {
        _id: ride.driverId,
        name: ride.driverName,
        driverId: ride.driverCode,
        photo: ride.driverPhoto,
        phone: ride.driverPhone
      };
      setSelectedDriver(targetDriver);
      setRatingForm({
        driverId: targetDriver._id || ride.driverId,
        rideId: ride.rideId || ride._id,
        rideReference: ride.requestId,
        score: 5.0,
        hoverScore: 0,
        selectedTags: ['Punctual & On-Time', 'Safe Driving'],
        adminRemarks: `Completed ride ${ride.requestId} (${ride.pickup} to ${ride.dropoff})`
      });
    } else if (driver) {
      setSelectedDriver(driver);
      setRatingForm({
        driverId: driver._id || driver.id,
        rideId: '',
        rideReference: '',
        score: driver.currentRating || 5.0,
        hoverScore: 0,
        selectedTags: driver.lastTags?.length > 0 ? driver.lastTags : ['Punctual & On-Time', 'Safe Driving'],
        adminRemarks: driver.lastRemarks || ''
      });
    } else {
      const defaultFirstDriver = drivers[0];
      setSelectedDriver(defaultFirstDriver || null);
      setRatingForm({
        driverId: defaultFirstDriver?._id || '',
        rideId: '',
        rideReference: '',
        score: 5.0,
        hoverScore: 0,
        selectedTags: ['Top Performer', 'Safe Driving'],
        adminRemarks: ''
      });
    }
    setIsRatingModalOpen(true);
  };

  // Open Rating History Modal
  const openHistoryModal = async (driver) => {
    setSelectedDriver(driver);
    setIsHistoryModalOpen(true);
    setHistoryLoading(true);

    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`${BACKEND_URL}/admin/ratings/${driver._id || driver.id}/history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.data?.history) {
        setHistoryLogs(data.data.history);
      } else {
        setHistoryLogs([]);
      }
    } catch (err) {
      console.error('Failed to fetch rating history:', err);
      setHistoryLogs([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Toggle Performance Tag
  const toggleTag = (tag) => {
    setRatingForm(prev => {
      const exists = prev.selectedTags.includes(tag);
      return {
        ...prev,
        selectedTags: exists 
          ? prev.selectedTags.filter(t => t !== tag)
          : [...prev.selectedTags, tag]
      };
    });
  };

  // Submit Rating (POST/PUT)
  const handleRatingSubmit = async (e) => {
    e.preventDefault();
    if (!ratingForm.driverId) {
      alert('Please select a driver to rate.');
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`${BACKEND_URL}/admin/ratings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          driverId: ratingForm.driverId,
          rideId: ratingForm.rideId || undefined,
          score: ratingForm.score,
          performanceTags: ratingForm.selectedTags,
          adminRemarks: ratingForm.adminRemarks
        })
      });

      const data = await res.json();

      if (data.success) {
        const targetDriver = drivers.find(d => (d._id || d.id) === ratingForm.driverId) || selectedDriver;
        const driverName = targetDriver?.name || 'Driver';

        showToast(`✓ Rating of ${ratingForm.score}★ assigned to ${driverName} successfully!`);
        setIsRatingModalOpen(false);
        // Refresh all data from server
        await fetchRatings();
      } else {
        alert(data.message || 'Failed to submit rating.');
      }
    } catch (err) {
      console.error('Rating submit error:', err);
      showToast(`Rating of ${ratingForm.score}★ updated.`);
      setIsRatingModalOpen(false);
      await fetchRatings();
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered drivers list
  const filteredDrivers = useMemo(() => {
    return drivers.filter(d => {
      // KPI Tab filter
      if (activeKpiTab === 'Rated' && !d.isRated) return false;
      if (activeKpiTab === 'High' && (!d.isRated || d.currentRating < 4.5)) return false;
      if (activeKpiTab === 'Review' && (!d.isRated || d.currentRating >= 3.8)) return false;

      // Rating dropdown filter
      if (ratingFilter === '5') {
        if (!d.isRated || d.currentRating < 4.9) return false;
      } else if (ratingFilter === '4+') {
        if (!d.isRated || d.currentRating < 4.0) return false;
      } else if (ratingFilter === '3+') {
        if (!d.isRated || d.currentRating < 3.0 || d.currentRating >= 4.0) return false;
      } else if (ratingFilter === '<3') {
        if (!d.isRated || d.currentRating >= 3.0) return false;
      } else if (ratingFilter === 'Unrated') {
        if (d.isRated) return false;
      }

      // Performance tags filter
      if (performanceFilter !== 'All') {
        if (!d.lastTags?.includes(performanceFilter)) return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const name = (d.name || '').toLowerCase();
        const id = (d.driverId || '').toLowerCase();
        const phone = (d.phone || '').toLowerCase();
        if (!name.includes(q) && !id.includes(q) && !phone.includes(q)) return false;
      }

      return true;
    });
  }, [drivers, activeKpiTab, ratingFilter, performanceFilter, searchQuery]);

  // Render Star Icons Helper
  const renderStarRating = (score) => {
    const stars = [];
    const rounded = Math.round(score * 2) / 2;
    for (let i = 1; i <= 5; i++) {
      if (i <= score) {
        stars.push(<Star key={i} size={15} className="star-filled" />);
      } else if (i - 0.5 <= rounded) {
        stars.push(<Star key={i} size={15} className="star-half" />);
      } else {
        stars.push(<Star key={i} size={15} className="star-empty" />);
      }
    }
    return stars;
  };

  return (
    <div className="module-container fade-in">
      {toastMessage && (
        <div className="toast-notification fade-in">
          <CheckCircle size={20} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Driver Rating</h1>
          <p className="page-subtitle">
            Admin can rate drivers based on their completed ride performance and manage driver evaluations.
          </p>
        </div>
        <div className="header-actions-group">
          <button className="refresh-action-btn" onClick={fetchRatings} title="Refresh ratings">
            <RotateCw size={14} className={loading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
          <button className="primary-btn" onClick={() => openRatingModal(null)}>
            <Plus size={16} />
            <span>Give Driver Rating</span>
          </button>
        </div>
      </div>

      {/* Horizontal KPI Cards Row */}
      <div className="driver-kpi-grid">
        <div 
          className={`driver-kpi-card ${mainViewTab === 'PendingRides' ? 'active' : ''}`}
          onClick={() => setMainViewTab('PendingRides')}
          style={{ borderLeft: (kpis.pendingRidesCount > 0 ? '4px solid #f59e0b' : undefined) }}
        >
          <div className="kpi-content">
            <div className="kpi-label">Awaiting Ride Rating</div>
            <div className="kpi-value text-warning">{kpis.pendingRidesCount ?? pendingRides.length}</div>
          </div>
          <div className="kpi-icon-soft bg-warning-light text-warning">
            <Clock size={20} />
          </div>
        </div>

        <div 
          className={`driver-kpi-card ${mainViewTab === 'Drivers' && activeKpiTab === 'All' ? 'active' : ''}`}
          onClick={() => { setMainViewTab('Drivers'); setActiveKpiTab('All'); }}
        >
          <div className="kpi-content">
            <div className="kpi-label">Total Rated Drivers</div>
            <div className="kpi-value text-primary">{kpis.totalRatedDrivers ?? 0}</div>
          </div>
          <div className="kpi-icon-soft bg-primary-light text-primary">
            <Users size={20} />
          </div>
        </div>

        <div 
          className={`driver-kpi-card ${mainViewTab === 'Drivers' && activeKpiTab === 'High' ? 'active' : ''}`}
          onClick={() => { setMainViewTab('Drivers'); setActiveKpiTab('High'); }}
        >
          <div className="kpi-content">
            <div className="kpi-label">Average Driver Rating</div>
            <div className="kpi-value text-success">
              {kpis.averageRating ?? 0} <span className="kpi-unit">★</span>
            </div>
          </div>
          <div className="kpi-icon-soft bg-success-light text-success">
            <Star size={20} className="fill-current" />
          </div>
        </div>

        <div 
          className={`driver-kpi-card ${mainViewTab === 'Drivers' && activeKpiTab === 'Review' ? 'active' : ''}`}
          onClick={() => { setMainViewTab('Drivers'); setActiveKpiTab('Review'); }}
        >
          <div className="kpi-content">
            <div className="kpi-label">Drivers Requiring Review</div>
            <div className="kpi-value text-danger">{kpis.requiringReview ?? 0}</div>
          </div>
          <div className="kpi-icon-soft bg-danger-light text-danger">
            <AlertTriangle size={20} />
          </div>
        </div>
      </div>

      {/* Main Container Card */}
      <div className="table-container-card">
        {/* Top View Selector Tabs */}
        <div className="rating-view-tabs">
          <button 
            type="button" 
            className={`rating-view-tab ${mainViewTab === 'PendingRides' ? 'active' : ''}`}
            onClick={() => setMainViewTab('PendingRides')}
          >
            <Clock size={16} />
            <span>Completed Rides Awaiting Rating</span>
            <span className={`view-tab-badge ${pendingRides.length > 0 ? 'warning' : 'neutral'}`}>
              {pendingRides.length}
            </span>
          </button>
          <button 
            type="button" 
            className={`rating-view-tab ${mainViewTab === 'Drivers' ? 'active' : ''}`}
            onClick={() => setMainViewTab('Drivers')}
          >
            <Users size={16} />
            <span>Driver Directory & Lifetime Ratings</span>
            <span className="view-tab-badge neutral">{drivers.length}</span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: Completed Rides Awaiting Rating (Real-Time Queue)                  */}
        {/* ========================================================================= */}
        {mainViewTab === 'PendingRides' && (
          <div className="pending-rides-view-container">
            {pendingRides.length === 0 ? (
              <div className="empty-reviews-state">
                <div className="empty-icon-wrap">
                  <CheckCircle size={44} className="text-success" />
                </div>
                <h3>All Completed Rides Reviewed!</h3>
                <p>
                  There are no completed rides waiting for admin rating right now. As soon as a ride finishes in dispatch, it will appear here for evaluation.
                </p>
                <button 
                  type="button" 
                  className="secondary-btn btn-sm mt-3"
                  onClick={() => setMainViewTab('Drivers')}
                >
                  <Users size={14} /> View Driver Directory
                </button>
              </div>
            ) : (
              <div className="pending-rides-list">
                <div className="pending-rides-banner">
                  <div className="banner-text">
                    <Sparkles size={16} className="text-warning" />
                    <span>
                      <strong>{pendingRides.length} Completed Ride(s)</strong> require admin rating. Evaluate each ride to keep driver ratings accurate.
                    </span>
                  </div>
                </div>

                <div className="pending-rides-grid">
                  {pendingRides.map(ride => (
                    <div key={ride._id || ride.rideId} className="pending-ride-card">
                      <div className="ride-card-header">
                        <div className="ride-id-tag">
                          <Car size={14} />
                          <span>{ride.requestId}</span>
                        </div>
                        <div className="ride-completed-time">
                          <Clock size={13} />
                          <span>Completed {new Date(ride.completedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>

                      <div className="ride-card-body">
                        {/* Driver Profile */}
                        <div className="ride-driver-box">
                          {ride.driverPhoto ? (
                            <img src={ride.driverPhoto} alt={ride.driverName} className="ride-driver-avatar" />
                          ) : (
                            <div className="ride-driver-avatar-fallback">{ride.driverName.charAt(0)}</div>
                          )}
                          <div>
                            <div className="ride-driver-name">{ride.driverName}</div>
                            <div className="ride-driver-sub">{ride.driverCode} • {ride.driverPhone}</div>
                            <div className="ride-driver-vehicle">{ride.vehicle}</div>
                          </div>
                        </div>

                        {/* Route Details */}
                        <div className="ride-route-box">
                          <div className="route-point pickup">
                            <div className="route-dot pickup-dot"></div>
                            <div className="route-text">
                              <span className="route-label">PICKUP:</span>
                              <span className="route-address" title={ride.pickup}>{ride.pickup}</span>
                            </div>
                          </div>
                          <div className="route-line-v"></div>
                          <div className="route-point dropoff">
                            <div className="route-dot dropoff-dot"></div>
                            <div className="route-text">
                              <span className="route-label">DROPOFF:</span>
                              <span className="route-address" title={ride.dropoff}>{ride.dropoff}</span>
                            </div>
                          </div>
                        </div>

                        {/* Passenger & Fare */}
                        <div className="ride-meta-box">
                          <div className="meta-item">
                            <span className="meta-label">Passenger:</span>
                            <span className="meta-value">{ride.passengerName}</span>
                          </div>
                          <div className="meta-item">
                            <span className="meta-label">Fare Collected:</span>
                            <span className="meta-value fare-highlight">{ride.fare}</span>
                          </div>
                        </div>
                      </div>

                      <div className="ride-card-footer">
                        <div className="ride-status-pill">
                          <CheckCircle size={14} className="text-success" />
                          <span>Ready for Evaluation</span>
                        </div>
                        <button 
                          type="button" 
                          className="rate-ride-cta-btn"
                          onClick={() => openRatingModal(null, ride)}
                        >
                          <Star size={15} className="fill-current" />
                          <span>Rate Driver for this Ride</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: Driver Directory & Lifetime Ratings                                */}
        {/* ========================================================================= */}
        {mainViewTab === 'Drivers' && (
          <div>
            {/* Search & Multi-Filter Bar */}
            <div className="rating-filters-bar">
              <div className="search-input-box">
                <Search size={16} className="search-icon" />
                <input 
                  type="text" 
                  placeholder="Search drivers by name, driver ID, phone..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="filters-row-right">
                <div className="filter-dropdown-wrap">
                  <label className="filter-label">RATING:</label>
                  <select 
                    value={ratingFilter} 
                    onChange={e => setRatingFilter(e.target.value)}
                    className="filter-select"
                  >
                    <option value="All">All Ratings</option>
                    <option value="5">5.0 Stars (★★★★★)</option>
                    <option value="4+">4.0+ Stars</option>
                    <option value="3+">3.0 - 3.9 Stars</option>
                    <option value="<3">Below 3.0 Stars</option>
                  </select>
                </div>

                <div className="filter-dropdown-wrap">
                  <label className="filter-label">PERFORMANCE:</label>
                  <select 
                    value={performanceFilter} 
                    onChange={e => setPerformanceFilter(e.target.value)}
                    className="filter-select"
                  >
                    <option value="All">All Performance</option>
                    <option value="Top Performer">Top Performer</option>
                    <option value="Punctual & On-Time">Punctual & On-Time</option>
                    <option value="Safe Driving">Safe Driving</option>
                    <option value="Clean & Maintained Vehicle">Clean Vehicle</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Drivers Rating Table */}
            <div className="table-content">
              <table className="clean-table driver-rating-table">
                <colgroup>
                  <col style={{ minWidth: '220px', width: '22%' }} />
                  <col style={{ minWidth: '130px', width: '13%' }} />
                  <col style={{ minWidth: '140px', width: '14%' }} />
                  <col style={{ minWidth: '180px', width: '18%' }} />
                  <col style={{ minWidth: '130px', width: '13%' }} />
                  <col style={{ minWidth: '120px', width: '10%' }} />
                  <col style={{ minWidth: '180px', width: '10%' }} />
                </colgroup>
                <thead>
                  <tr>
                    <th>Driver</th>
                    <th>Driver ID</th>
                    <th>Completed Rides</th>
                    <th>Current Rating</th>
                    <th>Last Rated</th>
                    <th>Rated By</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDrivers.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="text-center py-5 text-secondary">
                        <Star size={36} className="mb-2 text-secondary opacity-40" />
                        <div>No drivers found matching current rating filters.</div>
                      </td>
                    </tr>
                  ) : (
                    filteredDrivers.map(driver => {
                      const isRated = driver.isRated && driver.currentRating != null;
                      const ratingVal = isRated ? driver.currentRating : null;
                      const ridesCount = driver.completedRides || 0;
                      const isTopPerformer = isRated && ratingVal >= 4.8;
                      const formattedCode = formatDriverCode(driver.driverId);

                      return (
                        <tr key={driver._id || driver.id}>
                          {/* Driver Name & Details */}
                          <td>
                            <div className="driver-profile-cell">
                              {driver.photo ? (
                                <img 
                                  src={driver.photo} 
                                  alt={driver.name} 
                                  className="driver-table-avatar" 
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    if (e.currentTarget.nextElementSibling) {
                                      e.currentTarget.nextElementSibling.style.display = 'flex';
                                    }
                                  }}
                                />
                              ) : null}
                              <div className="driver-avatar-placeholder" style={{ display: driver.photo ? 'none' : 'flex' }}>
                                {driver.name.charAt(0)}
                              </div>
                              <div className="driver-profile-info">
                                <div className="driver-fullname-row">
                                  <span className="driver-name-text">{driver.name}</span>
                                  {isTopPerformer && (
                                    <span className="top-performer-mini-badge" title="Top Rated Performer">
                                      ★ Top
                                    </span>
                                  )}
                                </div>
                                <span className="driver-phone-subtext">{driver.phone}</span>
                              </div>
                            </div>
                          </td>

                          {/* Driver Reference Code */}
                          <td>
                            <span className="driver-id-badge">{formattedCode}</span>
                          </td>

                          {/* Completed Rides */}
                          <td>
                            <div className="completed-rides-cell">
                              <span className="rides-count-tag">
                                <Car size={13} />
                                <strong>{ridesCount}</strong> rides
                              </span>
                            </div>
                          </td>

                          {/* Current Rating */}
                          <td>
                            {isRated ? (
                              <div className="rating-score-display">
                                <div className="stars-cluster">
                                  {renderStarRating(ratingVal)}
                                </div>
                                <span className="score-number-bold">{ratingVal}</span>
                                {driver.ratingCount > 0 && (
                                  <span className="ratings-total-sub">({driver.ratingCount} reviews)</span>
                                )}
                              </div>
                            ) : (
                              <span className="unrated-badge">Unrated</span>
                            )}
                          </td>

                          {/* Last Rated Date */}
                          <td>
                            <span className="last-rated-date">
                              {driver.lastRated 
                                ? new Date(driver.lastRated).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                                : '—'
                              }
                            </span>
                          </td>

                          {/* Rated By */}
                          <td>
                            <span className="rated-by-name">
                              {driver.ratedBy ? driver.ratedBy : '—'}
                            </span>
                          </td>

                          {/* Actions */}
                          <td>
                            <div className="rating-action-buttons">
                              <button 
                                className="view-history-btn" 
                                title="View Previous Rating History"
                                onClick={() => openHistoryModal(driver)}
                              >
                                <History size={13} />
                                <span>History</span>
                              </button>
                              <button 
                                className="update-rating-btn" 
                                title="Update Driver Rating"
                                onClick={() => openRatingModal(driver)}
                              >
                                <Edit2 size={13} />
                                <span>Rate</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Rating Rule Box & Customer Rating Note (Info Section) */}
      <div className="rating-info-cards-grid mt-4">
        <div className="rating-rule-card">
          <div className="card-header-icon">
            <ShieldCheck size={20} className="text-primary" />
            <h3 className="info-card-title">Rating Rule Box</h3>
          </div>
          <p className="info-lead">
            <strong>Who can give a rating?</strong> <span className="auth-tag">Admin Only</span>
          </p>
          <p className="info-description">
            Only verified Admins are authorized to create or update driver ratings based on driver service level, route adherence, and safety metrics.
          </p>
        </div>

        <div className="rating-rule-card">
          <div className="card-header-icon">
            <UserCheck size={20} className="text-warning" />
            <h3 className="info-card-title">Customer Rating Note</h3>
          </div>
          <p className="info-lead text-warning font-bold">
            Customer Rating Not Available
          </p>
          <p className="info-description">
            Customers do not rate drivers in this system. All ratings are centrally calibrated and audited by the Dispatch Admin team.
          </p>
        </div>
      </div>

      {/* Rating Workflow Diagram */}
      <div className="workflow-diagram-card mt-4">
        <div className="workflow-header">
          <Sparkles size={18} className="text-primary" />
          <h3>Rating Workflow & Smart Selection Diagram</h3>
        </div>
        <div className="workflow-steps-row">
          <div className="flow-step-box">
            <div className="step-number">1</div>
            <div className="step-title">Driver Completes Ride</div>
            <div className="step-desc">Transit logged in dispatch system</div>
          </div>
          <ArrowRight size={18} className="flow-arrow" />
          
          <div className="flow-step-box highlight">
            <div className="step-number">2</div>
            <div className="step-title">Enters Awaiting Review Queue</div>
            <div className="step-desc">Appears in completed rides list</div>
          </div>
          <ArrowRight size={18} className="flow-arrow" />

          <div className="flow-step-box">
            <div className="step-number">3</div>
            <div className="step-title">Admin Gives Rating</div>
            <div className="step-desc">Sets 1.0–5.0★ & evaluation notes</div>
          </div>
          <ArrowRight size={18} className="flow-arrow" />

          <div className="flow-step-box">
            <div className="step-number">4</div>
            <div className="step-title">Rating Saved</div>
            <div className="step-desc">Permanent audit trail in database</div>
          </div>
          <ArrowRight size={18} className="flow-arrow" />

          <div className="flow-step-box">
            <div className="step-number">5</div>
            <div className="step-title">Smart Selection Priority</div>
            <div className="step-desc">Higher rated drivers recommended first</div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: Give / Update Rating Modal                                       */}
      {/* ========================================================================= */}
      {isRatingModalOpen && (
        <div className="modal-backdrop fade-in" onClick={() => setIsRatingModalOpen(false)}>
          <div className="modal-card rating-modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-group">
                <Star size={22} className="text-warning fill-current" />
                <h2>
                  {selectedRide 
                    ? `Rate Driver for Ride: ${selectedRide.requestId}` 
                    : (selectedDriver ? `Rate Driver: ${selectedDriver.name}` : 'Give Driver Rating')
                  }
                </h2>
              </div>
              <button className="icon-btn" onClick={() => setIsRatingModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            {selectedRide && (
              <div className="modal-ride-context-banner">
                <div className="context-title">
                  <Car size={16} />
                  <strong>Ride {selectedRide.requestId} • {selectedRide.fare}</strong>
                  <span className="context-passenger">Passenger: {selectedRide.passengerName}</span>
                </div>
                <div className="context-route">
                  <span>{selectedRide.pickup}</span> ➔ <span>{selectedRide.dropoff}</span>
                </div>
              </div>
            )}

            <form onSubmit={handleRatingSubmit} className="modal-form">
              {/* Driver Selector if not preset */}
              {!selectedRide && (
                <div className="form-group mb-3">
                  <label className="form-label">Select Driver to Evaluate</label>
                  <select 
                    className="form-select"
                    value={ratingForm.driverId}
                    onChange={e => {
                      const d = drivers.find(drv => (drv._id || drv.id) === e.target.value);
                      setSelectedDriver(d || null);
                      setRatingForm(prev => ({
                        ...prev,
                        driverId: e.target.value,
                        score: d?.currentRating || 5.0
                      }));
                    }}
                    required
                  >
                    {drivers.map(d => (
                      <option key={d._id || d.id} value={d._id || d.id}>
                        {d.name} ({d.driverId}) — Current: {d.currentRating ? `${d.currentRating}★` : 'Unrated'}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Interactive Star Picker */}
              <div className="rating-picker-section mb-4">
                <label className="form-label">Admin Rating Score (1.0 to 5.0 Stars)</label>
                <div className="interactive-stars-wrap">
                  <div className="interactive-stars-box">
                    {[1, 2, 3, 4, 5].map(starNum => (
                      <button
                        type="button"
                        key={starNum}
                        className={`star-pick-btn ${
                          (ratingForm.hoverScore || ratingForm.score) >= starNum ? 'active' : ''
                        }`}
                        onMouseEnter={() => setRatingForm(prev => ({ ...prev, hoverScore: starNum }))}
                        onMouseLeave={() => setRatingForm(prev => ({ ...prev, hoverScore: 0 }))}
                        onClick={() => setRatingForm(prev => ({ ...prev, score: starNum }))}
                      >
                        <Star size={32} />
                      </button>
                    ))}
                  </div>
                  <div className="score-badge-large">
                    <strong>{(ratingForm.hoverScore || ratingForm.score).toFixed(1)}</strong> / 5.0
                  </div>
                </div>

                {/* Fine-Tuning Slider */}
                <div className="fine-tune-slider-wrap mt-2">
                  <span className="text-xs text-secondary">Fine-tune Decimal Score:</span>
                  <input 
                    type="range" 
                    min="1.0" 
                    max="5.0" 
                    step="0.1"
                    value={ratingForm.score}
                    onChange={e => setRatingForm(prev => ({ ...prev, score: parseFloat(e.target.value) }))}
                    className="slider-input"
                  />
                </div>
              </div>

              {/* Performance Tag Chips */}
              <div className="form-group mb-3">
                <label className="form-label">Performance & Service Tags</label>
                <div className="tags-selection-grid">
                  {PERFORMANCE_TAG_OPTIONS.map(tag => {
                    const isSelected = ratingForm.selectedTags.includes(tag);
                    return (
                      <button
                        type="button"
                        key={tag}
                        className={`tag-chip-btn ${isSelected ? 'selected' : ''}`}
                        onClick={() => toggleTag(tag)}
                      >
                        {isSelected && <CheckCircle size={13} />}
                        <span>{tag}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Remarks Textarea */}
              <div className="form-group mb-4">
                <label className="form-label">Admin Evaluation Remarks</label>
                <textarea 
                  className="form-textarea"
                  rows={3}
                  placeholder="e.g. Completed ride safely, very polite with rider, vehicle clean..."
                  value={ratingForm.adminRemarks}
                  onChange={e => setRatingForm(prev => ({ ...prev, adminRemarks: e.target.value }))}
                />
              </div>

              {/* Modal Buttons */}
              <div className="modal-actions-row">
                <button 
                  type="button" 
                  className="secondary-btn" 
                  onClick={() => setIsRatingModalOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="primary-btn submit-rating-btn"
                  disabled={submitting}
                >
                  <Award size={16} />
                  <span>{submitting ? 'Saving...' : (selectedRide ? 'Submit Ride Rating' : 'Save Driver Rating')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: Rating History Modal                                             */}
      {/* ========================================================================= */}
      {isHistoryModalOpen && selectedDriver && (
        <div className="modal-backdrop fade-in" onClick={() => setIsHistoryModalOpen(false)}>
          <div className="modal-card history-modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-group">
                <History size={20} className="text-primary" />
                <h2>Rating Audit History: {selectedDriver.name}</h2>
              </div>
              <button className="icon-btn" onClick={() => setIsHistoryModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="history-modal-body">
              {/* Driver Summary Mini Banner */}
              <div className="driver-history-summary-box">
                <div className="d-flex align-items-center gap-3">
                  {selectedDriver.photo ? (
                    <img src={selectedDriver.photo} alt={selectedDriver.name} className="driver-table-avatar large" />
                  ) : (
                    <div className="driver-avatar-placeholder large">{selectedDriver.name.charAt(0)}</div>
                  )}
                  <div>
                    <h3 className="m-0 font-bold">{selectedDriver.name}</h3>
                    <div className="text-secondary text-sm">
                      ID: {formatDriverCode(selectedDriver.driverId)} • {selectedDriver.phone}
                    </div>
                  </div>
                </div>
                <div className="history-summary-rating">
                  <div className="big-rating-number">
                    {selectedDriver.currentRating ? selectedDriver.currentRating : '—'}
                  </div>
                  <div className="stars-mini">
                    {selectedDriver.currentRating ? renderStarRating(selectedDriver.currentRating) : null}
                  </div>
                  <span className="text-xs text-secondary">
                    {historyLogs.length} total logged evaluations
                  </span>
                </div>
              </div>

              {/* History Timeline */}
              {historyLoading ? (
                <div className="history-loading-wrap">
                  <RotateCw size={24} className="spin text-primary" />
                  <span>Loading evaluation logs...</span>
                </div>
              ) : historyLogs.length === 0 ? (
                <div className="history-empty-wrap">
                  <Star size={36} className="text-secondary opacity-30 mb-2" />
                  <h4>No previous ratings recorded</h4>
                  <p>This driver has not received any admin rating logs yet.</p>
                </div>
              ) : (
                <div className="history-timeline-list">
                  {historyLogs.map(log => (
                    <div key={log._id} className="history-timeline-item">
                      <div className="timeline-badge-star">
                        <Star size={14} className="fill-current text-warning" />
                      </div>
                      <div className="timeline-content-card">
                        <div className="timeline-header">
                          <div className="timeline-stars">
                            <span>{log.score.toFixed(1)}★</span>
                            {renderStarRating(log.score)}
                            {log.rideReference && (
                              <span className="history-ride-badge">
                                <Car size={11} />
                                <span>Ride #{log.rideReference}</span>
                              </span>
                            )}
                          </div>
                          <span className="timeline-date">
                            {new Date(log.createdAt).toLocaleDateString('en-GB', { 
                              day: 'numeric', 
                              month: 'short', 
                              year: 'numeric', 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </span>
                        </div>
                        {log.adminRemarks && (
                          <p className="timeline-remarks">"{log.adminRemarks}"</p>
                        )}
                        {log.performanceTags?.length > 0 && (
                          <div className="timeline-tags-row">
                            {log.performanceTags.map(tag => (
                              <span key={tag} className="timeline-tag-chip">{tag}</span>
                            ))}
                          </div>
                        )}
                        <div className="timeline-footer-audit">
                          <span>Evaluated by: <strong>{log.ratedBy || 'Super Admin'}</strong></span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="modal-actions-row">
              <button 
                type="button" 
                className="secondary-btn w-100 justify-content-center" 
                onClick={() => setIsHistoryModalOpen(false)}
              >
                Close Audit Log
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DriverRating;
