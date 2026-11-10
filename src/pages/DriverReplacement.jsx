import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import io from 'socket.io-client';
import { 
  RefreshCw, Search, CheckCircle2, AlertTriangle, Users, Car,
  Calendar, Clock, MapPin, Phone, Mail, User, ShieldCheck, 
  X, Check, Plus, Eye, Wind, Briefcase, ChevronRight, Sparkles,
  ArrowRight, ShieldAlert, Star, LayoutGrid, List
} from 'lucide-react';
import { BACKEND_URL } from '../utils/api';
import './DriverReplacement.css';

const SOCKET_URL = BACKEND_URL || 'http://localhost:5000';

const DriverReplacement = () => {
  // Main Data States
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // View Mode: 'cards' or 'table'
  const [viewMode, setViewMode] = useState('cards');

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'pending', 'assigned', 'rejected'

  // Driver Assignment Modal States
  const [assignModalReq, setAssignModalReq] = useState(null);
  const [availableDrivers, setAvailableDrivers] = useState([]);
  const [driverSearchQuery, setDriverSearchQuery] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);

  // View Details Modal State
  const [viewDetailsReq, setViewDetailsReq] = useState(null);

  // Toast State
  const [toastMessage, setToastMessage] = useState('');
  const toastTimeoutRef = useRef(null);

  const showToast = (msg) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(msg);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage('');
    }, 4500);
  };

  // 1. Fetch Replacement Requests from Backend
  const fetchRequests = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setRefreshing(true);

    const endpoints = [
      `${BACKEND_URL}/api/replacement-requests`,
      'http://localhost:5000/api/replacement-requests',
      '/api/replacement-requests'
    ];

    let success = false;
    const token = localStorage.getItem('token') || localStorage.getItem('admin_token') || '';

    for (const url of endpoints) {
      try {
        const res = await fetch(url, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (res.ok) {
          const json = await res.json();
          const list = json.data || (Array.isArray(json) ? json : []);
          setRequests(list);
          setLastUpdated(new Date());
          success = true;
          break;
        }
      } catch (err) {
        // Fallback to next endpoint
      }
    }

    if (!success) {
      console.warn('Could not connect to replacement endpoints, using fallback data');
    }

    setLoading(false);
    setRefreshing(false);
  }, []);

  // 2. Fetch Verified Drivers for Assignment
  const fetchDrivers = useCallback(async () => {
    const token = localStorage.getItem('token') || localStorage.getItem('admin_token') || '';
    const authHeader = token ? { Authorization: `Bearer ${token}` } : {};

    const driverEndpoints = [
      `${BACKEND_URL}/admin/driver/verified`,
      `${BACKEND_URL}/admin/driver`,
      'http://localhost:5000/admin/driver/verified',
      'http://localhost:5000/api/drivers'
    ];

    for (const dUrl of driverEndpoints) {
      try {
        const res = await fetch(dUrl, { headers: authHeader });
        if (res.ok) {
          const json = await res.json();
          const raw = json.data?.drivers || json.drivers || (Array.isArray(json.data) ? json.data : []);
          if (raw && raw.length > 0) {
            const mapped = raw.map(d => {
              const v = d.vehicleData || d.vehicleDetails || d.vehicleInfo || {};
              return {
                id: d._id || d.driverId || d.id,
                _id: d._id,
                name: d.Name || d.name || 'Driver',
                phone: d.PhoneNumber || d.phone || d.personalInfo?.phone || '+92 300 0000000',
                rating: d.rating || 4.9,
                vehicleMake: v.vehicleMake || v.make || 'Toyota',
                vehicleModel: v.vehicleModel || v.model || 'Corolla',
                vehiclePlate: v.registrationNumber || v.plateNumber || 'ISB-1000',
                vehicleCategory: v.category || 'Sedan Executive',
                ac: v.ac !== false,
                status: 'Available'
              };
            });
            setAvailableDrivers(mapped);
            break;
          }
        }
      } catch (e) {}
    }
  }, []);

  // Initial Load
  useEffect(() => {
    fetchRequests();
    fetchDrivers();
  }, [fetchRequests, fetchDrivers]);

  // Real-time Socket.IO Listeners
  useEffect(() => {
    let socket = null;
    try {
      socket = io(SOCKET_URL, { transports: ['polling', 'websocket'] });

      socket.on('replacement-request-updated', () => {
        fetchRequests(true);
      });
      socket.on('replacement-updated', () => {
        fetchRequests(true);
      });
      socket.on('new_replacement_request', () => {
        fetchRequests(true);
        showToast('New Emergency Replacement Request received!');
      });
      socket.on('new-replacement-request', () => {
        fetchRequests(true);
        showToast('New Emergency Replacement Request received from App!');
      });
      socket.on('replacement-requested', () => {
        fetchRequests(true);
        showToast('New Emergency Replacement Request received from App!');
      });
      socket.on('ride-dispatched', () => {
        fetchRequests(true);
      });
    } catch (e) {
      console.warn('Socket connection error:', e);
    }

    // Auto-polling fallback every 20 seconds
    const interval = setInterval(() => {
      fetchRequests(true);
    }, 20000);

    return () => {
      clearInterval(interval);
      if (socket) socket.disconnect();
    };
  }, [fetchRequests]);

  // Handle Driver Assignment
  const handleConfirmAssignment = async (driver) => {
    if (!assignModalReq || !driver) return;
    setIsAssigning(true);

    const reqId = assignModalReq._id || assignModalReq.requestId || assignModalReq.id;
    const patchBody = {
      driverId: driver.id || driver._id,
      driverName: driver.name,
      vehicle: `${driver.vehicleMake} ${driver.vehicleModel}`.trim() || 'Sedan Executive',
      remarks: `Assigned verified replacement driver ${driver.name}`
    };

    const endpoints = [
      `${BACKEND_URL}/api/replacement-requests/${reqId}/assign`,
      `http://localhost:5000/api/replacement-requests/${reqId}/assign`,
      `/api/replacement-requests/${reqId}/assign`
    ];

    let assigned = false;
    for (const url of endpoints) {
      try {
        const res = await fetch(url, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patchBody)
        });
        if (res.ok) {
          assigned = true;
          break;
        }
      } catch (err) {}
    }

    // Update local state optimistically
    setRequests(prev => prev.map(r => {
      const match = (r._id && String(r._id) === String(reqId)) ||
                    (r.requestId && String(r.requestId) === String(reqId)) ||
                    (r.id && String(r.id) === String(reqId));
      if (match) {
        return {
          ...r,
          status: 'ASSIGNED',
          assignedDriver: {
            driverId: driver.id || driver._id,
            name: driver.name,
            phone: driver.phone,
            vehicle: `${driver.vehicleMake} ${driver.vehicleModel}`.trim() || 'Sedan Executive',
            ac: true,
            assignedAt: new Date()
          }
        };
      }
      return r;
    }));

    setIsAssigning(false);
    setAssignModalReq(null);
    showToast(`Replacement Driver ${driver.name} assigned successfully! Ride dispatched.`);
  };

  // Handle Reject Request
  const handleRejectRequest = async (reqItem) => {
    const clientName = reqItem.clientName || reqItem.passengerName || 'Client';
    if (!window.confirm(`Are you sure you want to reject this replacement request for ${clientName}?`)) {
      return;
    }

    const reqId = reqItem._id || reqItem.requestId || reqItem.id;
    const endpoints = [
      `${BACKEND_URL}/api/replacement-requests/${reqId}/reject`,
      `http://localhost:5000/api/replacement-requests/${reqId}/reject`,
      `/api/replacement-requests/${reqId}/reject`
    ];

    for (const url of endpoints) {
      try {
        await fetch(url, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: 'Rejected by Dispatcher' })
        });
        break;
      } catch (e) {}
    }

    setRequests(prev => prev.map(r => {
      const match = (r._id && String(r._id) === String(reqId)) ||
                    (r.requestId && String(r.requestId) === String(reqId)) ||
                    (r.id && String(r.id) === String(reqId));
      return match ? { ...r, status: 'Rejected' } : r;
    }));

    showToast(`Replacement request for ${clientName} was rejected.`);
  };

  // KPI Calculations
  const stats = useMemo(() => {
    const total = requests.length;
    const pending = requests.filter(r => (r.status || '').toLowerCase() === 'pending').length;
    const assigned = requests.filter(r => (r.status || '').toUpperCase() === 'ASSIGNED').length;
    const rejected = requests.filter(r => (r.status || '').toLowerCase() === 'rejected').length;
    return { total, pending, assigned, rejected };
  }, [requests]);

  // Filtered List
  const filteredRequests = useMemo(() => {
    return requests.filter(item => {
      const status = (item.status || 'Pending').toLowerCase();
      if (statusFilter !== 'all') {
        if (statusFilter === 'pending' && status !== 'pending') return false;
        if (statusFilter === 'assigned' && status !== 'assigned') return false;
        if (statusFilter === 'rejected' && status !== 'rejected') return false;
      }

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const cName = (item.clientName || item.passengerName || '').toLowerCase();
      const cPhone = (item.clientPhone || item.passengerPhone || '').toLowerCase();
      const rId = (item.requestId || item.id || '').toLowerCase();
      const rsn = (item.reason || '').toLowerCase();
      const vPref = (item.preferences?.vehicleType || '').toLowerCase();

      return cName.includes(q) || cPhone.includes(q) || rId.includes(q) || rsn.includes(q) || vPref.includes(q);
    });
  }, [requests, statusFilter, searchQuery]);

  // Filtered Drivers inside Modal
  const modalFilteredDrivers = useMemo(() => {
    if (!driverSearchQuery.trim()) return availableDrivers;
    const q = driverSearchQuery.toLowerCase();
    return availableDrivers.filter(d => 
      d.name.toLowerCase().includes(q) || 
      d.phone.toLowerCase().includes(q) || 
      d.vehicleMake.toLowerCase().includes(q) || 
      d.vehicleModel.toLowerCase().includes(q)
    );
  }, [availableDrivers, driverSearchQuery]);

  return (
    <div className="replacement-page-container fade-in">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="repl-toast">
          <Sparkles size={16} className="text-warning" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="repl-header-card">
        <div className="repl-header-titles">
          <h1 className="repl-main-title">
            <div className="repl-title-icon-badge">
              <RefreshCw size={20} />
            </div>
            Driver Replacement Center
          </h1>
          <p className="repl-subtitle">
            Manage urgent driver reassignments when vehicles face road breakdowns or emergencies.
          </p>
        </div>

        <div className="repl-header-actions">
          <div className="repl-live-indicator">
            <span className="repl-pulse-dot"></span>
            Live Dispatch Active
          </div>

          <button 
            className="repl-refresh-btn"
            onClick={() => fetchRequests(false)}
            title="Refresh requests from database"
          >
            <RefreshCw size={14} className={refreshing ? 'spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* KPI Stats Dashboard Cards */}
      <div className="repl-stats-grid">
        <div className="repl-stat-card">
          <div className="repl-stat-info">
            <span className="repl-stat-label">Total Requests</span>
            <span className="repl-stat-val">{stats.total}</span>
            <span className="repl-stat-sub">Lifetime incidents</span>
          </div>
          <div className="repl-stat-icon-wrap blue">
            <Users size={20} />
          </div>
        </div>

        <div className="repl-stat-card alert">
          <div className="repl-stat-info">
            <span className="repl-stat-label">Urgent Pending</span>
            <span className="repl-stat-val" style={{ color: '#d97706' }}>{stats.pending}</span>
            <span className="repl-stat-sub">Needs immediate action</span>
          </div>
          <div className="repl-stat-icon-wrap amber">
            <AlertTriangle size={20} />
          </div>
        </div>

        <div className="repl-stat-card success">
          <div className="repl-stat-info">
            <span className="repl-stat-label">Drivers Assigned</span>
            <span className="repl-stat-val" style={{ color: '#16a34a' }}>{stats.assigned}</span>
            <span className="repl-stat-sub">Successfully dispatched</span>
          </div>
          <div className="repl-stat-icon-wrap green">
            <CheckCircle2 size={20} />
          </div>
        </div>

        <div className="repl-stat-card">
          <div className="repl-stat-info">
            <span className="repl-stat-label">Declined / Closed</span>
            <span className="repl-stat-val" style={{ color: '#64748b' }}>{stats.rejected}</span>
            <span className="repl-stat-sub">Rejected requests</span>
          </div>
          <div className="repl-stat-icon-wrap rose">
            <ShieldAlert size={20} />
          </div>
        </div>
      </div>

      {/* Toolbar & Filters with View Switcher */}
      <div className="repl-toolbar-card">
        <div className="repl-search-wrapper">
          <Search size={15} className="repl-search-icon" />
          <input 
            type="text"
            className="repl-search-input"
            placeholder="Search by client, phone, reason, vehicle, or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="repl-toolbar-right">
          {/* Status Filter Tabs */}
          <div className="repl-tabs-segmented">
            <button 
              type="button"
              className={`repl-tab-pill ${statusFilter === 'all' ? 'active' : ''}`}
              onClick={() => setStatusFilter('all')}
            >
              All <span className="repl-badge-chip">{stats.total}</span>
            </button>
            <button 
              type="button"
              className={`repl-tab-pill pending ${statusFilter === 'pending' ? 'active' : ''}`}
              onClick={() => setStatusFilter('pending')}
            >
              Pending <span className="repl-badge-chip">{stats.pending}</span>
            </button>
            <button 
              type="button"
              className={`repl-tab-pill assigned ${statusFilter === 'assigned' ? 'active' : ''}`}
              onClick={() => setStatusFilter('assigned')}
            >
              Assigned <span className="repl-badge-chip">{stats.assigned}</span>
            </button>
            <button 
              type="button"
              className={`repl-tab-pill ${statusFilter === 'rejected' ? 'active' : ''}`}
              onClick={() => setStatusFilter('rejected')}
            >
              Rejected <span className="repl-badge-chip">{stats.rejected}</span>
            </button>
          </div>

          {/* View Mode Switcher */}
          <div className="repl-view-switcher">
            <button 
              type="button"
              className={`repl-view-btn ${viewMode === 'cards' ? 'active' : ''}`}
              onClick={() => setViewMode('cards')}
              title="Compact Cards View"
            >
              <LayoutGrid size={14} /> Cards
            </button>
            <button 
              type="button"
              className={`repl-view-btn ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
              title="High-density Table View"
            >
              <List size={14} /> Table
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="repl-stat-card p-5 text-center d-flex flex-column align-items-center justify-content-center" style={{ minHeight: '260px' }}>
          <RefreshCw size={32} className="text-primary spin mb-2" />
          <h3 style={{ fontSize: '1.05rem', fontWeight: 600 }}>Loading Replacement Requests...</h3>
          <p className="text-secondary text-xs">Syncing with live MongoDB database</p>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="repl-stat-card p-5 text-center d-flex flex-column align-items-center justify-content-center" style={{ minHeight: '260px' }}>
          <ShieldCheck size={38} style={{ color: '#10b981', marginBottom: '0.75rem' }} />
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>No Replacement Requests Found</h3>
          <p className="text-secondary text-xs" style={{ maxWidth: '400px', margin: '0.3rem auto 0' }}>
            {searchQuery 
              ? 'No requests match your current search query. Try clearing the search box.' 
              : 'All clear! No pending emergency replacement requests at this time.'}
          </p>
        </div>
      ) : viewMode === 'table' ? (
        /* ================= HIGH-DENSITY TABLE VIEW ================= */
        <div className="repl-table-card fade-in">
          <div style={{ overflowX: 'auto' }}>
            <table className="repl-table">
              <thead>
                <tr>
                  <th>Request ID</th>
                  <th>Client</th>
                  <th>Reason</th>
                  <th>Schedule</th>
                  <th>Route</th>
                  <th>Vehicle Pref</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.map(item => {
                  const isAssigned = String(item.status || '').toUpperCase() === 'ASSIGNED';
                  const isRejected = String(item.status || '').toLowerCase() === 'rejected';
                  const reqId = item.requestId || item.displayId || item.id || 'RPL';
                  const cName = item.clientName || item.passengerName || 'Client';
                  const cPhone = item.clientPhone || item.passengerPhone || 'N/A';
                  const schedDate = item.scheduledDate || 'Today';
                  const slot = item.timeSlot || 'Immediate';
                  const rsn = item.reason || 'Vehicle Breakdown';
                  const pref = item.preferences || {};
                  const drv = item.assignedDriver || {};

                  return (
                    <tr key={item._id || reqId}>
                      <td>
                        <span className="repl-id-pill font-mono">{reqId}</span>
                      </td>
                      <td>
                        <div className="font-semibold text-slate-800">{cName}</div>
                        <div className="text-xs text-secondary">{cPhone}</div>
                      </td>
                      <td>
                        <span className="text-danger text-xs font-semibold d-inline-flex align-items-center gap-1">
                          <AlertTriangle size={12} /> {rsn}
                        </span>
                      </td>
                      <td>
                        <div className="text-xs">{schedDate}</div>
                        <div className="text-xs text-secondary">{slot}</div>
                      </td>
                      <td>
                        <div className="text-xs text-truncate" style={{ maxWidth: '180px' }} title={`${item.pickupLocation} ➔ ${item.dropoffLocation}`}>
                          {item.pickupLocation || 'Pickup'} ➔ {item.dropoffLocation || 'Dropoff'}
                        </div>
                      </td>
                      <td>
                        <span className="repl-chip">
                          <Car size={11} /> {pref.vehicleType || 'Sedan'}
                        </span>
                      </td>
                      <td>
                        <span className={`repl-status-badge ${isAssigned ? 'assigned' : isRejected ? 'rejected' : 'pending'}`}>
                          {item.status || 'Pending'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="d-flex align-items-center justify-content-end gap-1">
                          {isAssigned ? (
                            <>
                              <button 
                                className="repl-btn-view compact"
                                onClick={() => setViewDetailsReq(item)}
                                title="View Booking Details"
                              >
                                <Eye size={13} />
                              </button>
                              <button 
                                className="repl-btn-reassign compact"
                                onClick={() => setAssignModalReq(item)}
                                title="Reassign Driver"
                              >
                                <RefreshCw size={13} />
                              </button>
                            </>
                          ) : isRejected ? (
                            <button 
                              className="repl-btn-view compact"
                              onClick={() => setViewDetailsReq(item)}
                              title="View Details"
                            >
                              <Eye size={13} />
                            </button>
                          ) : (
                            <>
                              <button 
                                className="repl-btn-assign compact"
                                onClick={() => setAssignModalReq(item)}
                                title="Assign Driver"
                              >
                                <Plus size={13} /> Assign
                              </button>
                              <button 
                                className="repl-btn-view compact"
                                onClick={() => setViewDetailsReq(item)}
                                title="View Details"
                              >
                                <Eye size={13} />
                              </button>
                              <button 
                                className="repl-btn-reject compact"
                                onClick={() => handleRejectRequest(item)}
                                title="Reject"
                              >
                                <X size={13} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ================= COMPACT CARDS GRID (Sleek ~270px Height) ================= */
        <div className="repl-cards-grid">
          {filteredRequests.map(item => {
            const isAssigned = String(item.status || '').toUpperCase() === 'ASSIGNED';
            const isRejected = String(item.status || '').toLowerCase() === 'rejected';
            const reqId = item.requestId || item.displayId || item.id || 'RPL';
            const cName = item.clientName || item.passengerName || 'Client';
            const cPhone = item.clientPhone || item.passengerPhone || '+92 300 1234567';
            const schedDate = item.scheduledDate || 'Today';
            const slot = item.timeSlot || 'Immediate';
            const rsn = item.reason || 'Vehicle Issue';
            const pref = item.preferences || {};
            const notes = item.additionalNotes;
            const drv = item.assignedDriver || {};

            // ASSIGNED COMPACT CARD
            if (isAssigned) {
              return (
                <div key={item._id || reqId} className="repl-card compact assigned-state fade-in">
                  <div className="repl-card-header compact assigned-header">
                    <div className="d-flex align-items-center gap-2">
                      <div className="repl-assigned-check-icon">
                        <Check size={16} />
                      </div>
                      <div>
                        <div className="repl-client-name repl-dispatched-heading">Driver Dispatched</div>
                        <div className="repl-client-phone repl-dispatched-sub">Reassigned Successfully</div>
                      </div>
                    </div>
                    <span className="repl-id-pill font-mono">{reqId}</span>
                  </div>

                  <div className="repl-card-body compact">
                    <div className="repl-assigned-driver-row">
                      <div className="repl-drv-avatar">
                        {(drv.name || 'D').charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="repl-assigned-driver-title font-semibold text-xs text-truncate">{drv.name || 'Assigned Driver'}</div>
                        <div className="repl-assigned-driver-sub text-xs text-truncate">{drv.phone || '+92 312 9876543'} • {drv.vehicle || pref.vehicleType || 'Sedan'}</div>
                      </div>
                    </div>

                    <div className="repl-trip-row">
                      <div className="repl-trip-item">
                        <Calendar size={13} className="text-secondary" />
                        <span>{schedDate} ({slot})</span>
                      </div>
                      <div className="repl-trip-item">
                        <User size={13} className="text-primary" />
                        <span className="text-truncate">Client: {cName} ({cPhone})</span>
                      </div>
                    </div>
                  </div>

                  <div className="repl-card-footer compact">
                    <button 
                      className="repl-btn-view-booking compact"
                      onClick={() => setViewDetailsReq(item)}
                    >
                      <Eye size={14} /> Booking Details
                    </button>
                    <button 
                      className="repl-btn-reassign compact"
                      onClick={() => setAssignModalReq(item)}
                      title="Reassign another driver"
                    >
                      <RefreshCw size={13} />
                    </button>
                  </div>
                </div>
              );
            }

            // PENDING & REJECTED COMPACT CARD
            return (
              <div key={item._id || reqId} className="repl-card compact fade-in">
                {/* Header */}
                <div className="repl-card-header compact">
                  <div className="d-flex align-items-center gap-2" style={{ minWidth: 0 }}>
                    <div className="repl-client-avatar">
                      {cName.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div className="repl-client-name text-truncate">{cName}</div>
                      <div className="repl-client-phone text-truncate">{cPhone}</div>
                    </div>
                  </div>

                  <div className="d-flex align-items-center gap-1 flex-shrink-0">
                    <span className="repl-id-pill font-mono">{reqId}</span>
                    <span className={`repl-status-badge ${isRejected ? 'rejected' : 'pending'}`}>
                      {item.status || 'Pending'}
                    </span>
                  </div>
                </div>

                {/* Body */}
                <div className="repl-card-body compact">
                  {/* Emergency Reason Banner */}
                  <div className="repl-reason-compact-badge">
                    <AlertTriangle size={13} className="text-danger flex-shrink-0" />
                    <span className="font-semibold text-danger">Reason:</span>
                    <span className="text-truncate font-semibold text-danger">{rsn}</span>
                  </div>

                  {/* Schedule & Route */}
                  <div className="repl-trip-row">
                    <div className="repl-trip-item">
                      <Calendar size={13} className="text-secondary flex-shrink-0" />
                      <span className="text-truncate">{schedDate} ({slot})</span>
                    </div>
                    <div className="repl-trip-item">
                      <MapPin size={13} className="text-primary flex-shrink-0" />
                      <span className="text-truncate">{item.pickupLocation || 'Pickup'} ➔ {item.dropoffLocation || 'Dropoff'}</span>
                    </div>
                  </div>

                  {/* Preferences chips */}
                  <div className="repl-chips-wrap">
                    <span className="repl-chip"><Car size={11} /> {pref.vehicleType || 'Sedan'}</span>
                    <span className="repl-chip"><Wind size={11} /> {pref.acPreference || 'AC'}</span>
                    <span className="repl-chip"><Users size={11} /> {pref.genderPreference || 'Any'}</span>
                    {pref.vehicleArrangement && <span className="repl-chip">{pref.vehicleArrangement}</span>}
                  </div>

                  {/* Notes snippet */}
                  {notes && (
                    <div className="repl-note-snippet" title={notes}>
                      💬 "{notes}"
                    </div>
                  )}
                </div>

                {/* Footer Actions */}
                {!isRejected && (
                  <div className="repl-card-footer compact">
                    <button 
                      className="repl-btn-assign compact"
                      onClick={() => setAssignModalReq(item)}
                      title="Add in Pool & Assign Driver"
                    >
                      <Plus size={14} /> Assign Driver
                    </button>
                    <button 
                      className="repl-btn-view compact"
                      onClick={() => setViewDetailsReq(item)}
                      title="Full details"
                    >
                      <Eye size={14} />
                    </button>
                    <button 
                      className="repl-btn-reject compact"
                      onClick={() => handleRejectRequest(item)}
                      title="Reject request"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: Assign Replacement Driver */}
      {assignModalReq && (
        <div className="repl-modal-backdrop" onClick={() => !isAssigning && setAssignModalReq(null)}>
          <div className="repl-modal-card" onClick={e => e.stopPropagation()}>
            <div className="repl-modal-header">
              <div className="repl-modal-header-info">
                <h3>Assign Replacement Driver</h3>
                <span className="text-secondary text-xs">
                  For {assignModalReq.clientName || 'Client'} • {assignModalReq.preferences?.vehicleType || 'Sedan'} ({assignModalReq.timeSlot || 'Immediate'})
                </span>
              </div>
              <button 
                className="repl-modal-close-btn"
                disabled={isAssigning}
                onClick={() => setAssignModalReq(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="repl-modal-body">
              <div className="repl-driver-search-box">
                <Search size={15} className="repl-search-icon" />
                <input 
                  type="text"
                  placeholder="Filter verified drivers by name, phone, or car..."
                  value={driverSearchQuery}
                  onChange={e => setDriverSearchQuery(e.target.value)}
                />
              </div>

              <div className="repl-drivers-list">
                {modalFilteredDrivers.length === 0 ? (
                  <div className="p-4 text-center text-secondary text-xs">
                    <p>No verified drivers match your filter.</p>
                  </div>
                ) : (
                  modalFilteredDrivers.map(d => (
                    <div key={d.id || d._id} className="repl-driver-pick-row">
                      <div className="repl-driver-pick-info">
                        <div className="repl-driver-avatar">
                          {d.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="repl-driver-meta">
                          <div className="repl-driver-meta-title">
                            {d.name}
                            <span className="text-xs text-warning d-inline-flex align-items-center gap-1 font-semibold">
                              <Star size={11} fill="#f59e0b" color="#f59e0b" /> {d.rating}
                            </span>
                          </div>
                          <div className="repl-driver-meta-sub">
                            <span>{d.phone}</span>
                            <span>•</span>
                            <span>{d.vehicleMake} {d.vehicleModel} ({d.vehiclePlate})</span>
                            {d.ac && <span className="badge text-xs" style={{ background: '#e0f2fe', color: '#0284c7' }}>AC</span>}
                          </div>
                        </div>
                      </div>

                      <button 
                        className="repl-btn-pick-driver"
                        disabled={isAssigning}
                        onClick={() => handleConfirmAssignment(d)}
                      >
                        {isAssigning ? <RefreshCw size={13} className="spin" /> : <Check size={13} />}
                        Assign Driver
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: View Booking Details */}
      {viewDetailsReq && (
        <div className="repl-modal-backdrop" onClick={() => setViewDetailsReq(null)}>
          <div className="repl-modal-card" onClick={e => e.stopPropagation()}>
            <div className="repl-modal-header">
              <div className="repl-modal-header-info">
                <h3>Booking & Incident Details</h3>
                <span className="text-secondary text-xs">ID: {viewDetailsReq.requestId || viewDetailsReq.id || 'RPL'}</span>
              </div>
              <button className="repl-modal-close-btn" onClick={() => setViewDetailsReq(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="repl-modal-body">
              <div className="repl-driver-assigned-box">
                <span className="repl-section-title">Passenger Information</span>
                <div className="repl-item-row">
                  <div className="repl-icon-circle">
                    <User size={16} />
                  </div>
                  <div className="repl-item-content">
                    <div className="repl-item-name">{viewDetailsReq.clientName || 'Customer'}</div>
                    <div className="repl-item-sub">{viewDetailsReq.clientPhone || 'N/A'}</div>
                    <div className="repl-item-sub">{viewDetailsReq.clientEmail || 'No email provided'}</div>
                  </div>
                </div>
              </div>

              <div className="repl-driver-assigned-box">
                <span className="repl-section-title">Trip Route & Schedule</span>
                <div className="repl-item-row mb-2">
                  <div className="repl-icon-circle">
                    <Calendar size={16} />
                  </div>
                  <div className="repl-item-content">
                    <div className="repl-item-name">{viewDetailsReq.scheduledDate || 'Today'}</div>
                    <div className="repl-item-sub">{viewDetailsReq.timeSlot || 'Immediate'}</div>
                  </div>
                </div>
                <div className="repl-route-line">
                  <div className="repl-route-point">
                    <MapPin size={13} className="text-primary flex-shrink-0" />
                    <span>Pickup: {viewDetailsReq.pickupLocation || 'Pickup Location'}</span>
                  </div>
                  <div className="repl-route-point">
                    <ArrowRight size={13} className="text-secondary flex-shrink-0" />
                    <span>Drop: {viewDetailsReq.dropoffLocation || 'Drop-off Location'}</span>
                  </div>
                </div>
              </div>

              {viewDetailsReq.assignedDriver && (
                <div className="repl-driver-assigned-box repl-dispatched-box">
                  <span className="repl-section-title repl-dispatched-title">Dispatched Replacement Driver</span>
                  <div className="repl-item-row">
                    <div className="repl-icon-circle green">
                      <User size={16} />
                    </div>
                    <div className="repl-item-content">
                      <div className="repl-item-name">{viewDetailsReq.assignedDriver.name || 'Driver'}</div>
                      <div className="repl-item-sub">{viewDetailsReq.assignedDriver.phone || 'N/A'}</div>
                      <div className="repl-item-sub">{viewDetailsReq.assignedDriver.vehicle || 'Sedan Executive'}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DriverReplacement;
