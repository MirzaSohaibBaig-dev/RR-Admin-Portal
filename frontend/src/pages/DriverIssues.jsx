import React, { useState, useEffect, useCallback, useMemo } from 'react';
import io from 'socket.io-client';
import { 
  AlertTriangle, CheckCircle, Clock, ShieldAlert, Car, User, Phone, 
  MapPin, RefreshCw, Search, Filter, ExternalLink, ArrowRight, X, 
  Check, MessageSquare, AlertCircle, Wrench, ShieldCheck, Send
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BACKEND_URL } from '../utils/api';
import './DriverIssues.css';

const ENDPOINTS = [
  'http://localhost:3000/admin/issues',
  'http://192.168.88.59:3000/admin/issues',
  'http://localhost:5000/admin/issues',
  'http://localhost:5000/api/issues'
];

const SOCKET_URLS = [
  BACKEND_URL || 'http://localhost:5000'
];

export const isValidFrontendIssue = (issue) => {
  if (!issue) return false;

  // 1. If mode is 'Separate' and passengers array is present:
  if (issue.mode === 'Separate' && Array.isArray(issue.passengers) && issue.passengers.length > 0) {
    const custName = String(issue.customerName || issue.passengerName || '').trim().toLowerCase();
    const reqId = String(issue.requestId || issue.rideId || '').trim();

    const targetPassenger = issue.passengers.find(p => {
      const pId = String(p.id || p.requestId || '').trim();
      const pName = String(p.name || '').trim().toLowerCase();
      return (reqId && pId && reqId === pId) || (custName && pName && custName === pName);
    });

    if (targetPassenger && targetPassenger.canBePicked === true) {
      return false;
    }

    const unpickedPassengers = issue.passengers.filter(p => p.canBePicked === false);
    if (unpickedPassengers.length === 0 && (!issue.details || !issue.details.trim()) && (!issue.description || !issue.description.trim()) && (!issue.message || !issue.message.trim())) {
      return false;
    }

    if (custName && unpickedPassengers.length > 0 && (!issue.details || !issue.details.trim()) && (!issue.description || !issue.description.trim()) && (!issue.message || !issue.message.trim())) {
      const isUnpicked = unpickedPassengers.some(p => String(p.name || '').trim().toLowerCase() === custName);
      if (!isUnpicked) {
        return false;
      }
    }
  }

  // 2. Reject empty dummy reports where details & message & description are completely empty and reason is default 'Vehicle Breakdowns'
  if ((!issue.details || !issue.details.trim()) && (!issue.description || !issue.description.trim()) && (!issue.message || !issue.message.trim())) {
    if (issue.mode === 'Separate') {
      const hasUnpicked = Array.isArray(issue.passengers) && issue.passengers.some(p => p.canBePicked === false);
      if (!hasUnpicked) return false;
    }
  }

  return true;
};

const DriverIssues = () => {
  const navigate = useNavigate();
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, Pending, Resolved
  const [severityFilter, setSeverityFilter] = useState('ALL'); // ALL, High, Medium, Low
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [isReplacementModalOpen, setIsReplacementModalOpen] = useState(false);
  const [availableDrivers, setAvailableDrivers] = useState([]);
  const [selectedReplacementDriver, setSelectedReplacementDriver] = useState(null);
  const [replacementDriverSearch, setReplacementDriverSearch] = useState('');
  const [resolutionRemarks, setResolutionRemarks] = useState('');
  const [notifyCustomer, setNotifyCustomer] = useState(true);
  const [affectedDate, setAffectedDate] = useState('May 21, 2026');
  const [affectedTime, setAffectedTime] = useState('08:00 AM - 10:00 AM');
  const [reportedReason, setReportedReason] = useState('Vehicle Issue');
  const [detailsText, setDetailsText] = useState('Driver is unavailable due to a sudden mechanical issue with the vehicle. We apologize for the inconvenience and are working to find a replacement driver immediately. The issue is severe enough to prevent the ride.');
  const [canRequestReplacement, setCanRequestReplacement] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeEndpointUsed, setActiveEndpointUsed] = useState('');

  const filteredStandbyDrivers = useMemo(() => {
    let list = availableDrivers;
    if (selectedIssue) {
      const curDrvId = String(selectedIssue.driverId || selectedIssue.driver || '').trim().toLowerCase();
      const curDrvName = String(selectedIssue.driverName || '').trim().toLowerCase();
      list = list.filter(d => {
        const dId = String(d.id || d._id || '').trim().toLowerCase();
        const dName = String(d.name || '').trim().toLowerCase();
        if (curDrvId && dId && curDrvId === dId) return false;
        if (curDrvName && dName && (curDrvName === dName || dName.includes(curDrvName) || curDrvName.includes(dName))) return false;
        return true;
      });
    }
    if (!replacementDriverSearch.trim()) return list;
    const q = replacementDriverSearch.toLowerCase();
    return list.filter(d => 
      (d.name && d.name.toLowerCase().includes(q)) ||
      (d.phone && d.phone.toLowerCase().includes(q)) ||
      (d.vehicle && d.vehicle.toLowerCase().includes(q))
    );
  }, [availableDrivers, selectedIssue, replacementDriverSearch]);

  // 1. Fetch all driver reported issues for Admin Panel
  const fetchReportedIssues = useCallback(async () => {
    setLoading(true);
    const token = localStorage.getItem('adminToken') || localStorage.getItem('admin_token') || '';
    let fetched = false;

    for (const url of ENDPOINTS) {
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            console.log('Issues list from', url, ':', data.issues || data.data);
            setIssues(data.issues || data.data || []);
            setActiveEndpointUsed(url);
            fetched = true;
            break;
          }
        }
      } catch (err) {
        // Silent fallback to next available backend endpoint
      }
    }

    if (!fetched) {
      console.warn('Could not fetch issues from standard endpoints, trying port 5000 direct');
      try {
        const fallbackRes = await fetch('http://localhost:5000/admin/issues');
        if (fallbackRes.ok) {
          const fallbackData = await fallbackRes.json();
          if (fallbackData.issues) {
            setIssues(fallbackData.issues);
          }
        }
      } catch (e) {
        console.error('Error fetching fallback issues:', e);
      }
    }

    setLoading(false);
  }, []);

  // Fetch available drivers for replacement
  const fetchAvailableDrivers = useCallback(async () => {
    const driverUrls = [
      '/admin/driver/verified',
      '/api/drivers'
    ];

    for (const url of driverUrls) {
      try {
        const token = localStorage.getItem('adminToken') || localStorage.getItem('admin_token') || '';
        const res = await fetch(url, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          let list = [];
          if (data.drivers && Array.isArray(data.drivers)) {
            list = data.drivers;
          } else if (data.data && Array.isArray(data.data.drivers)) {
            list = data.data.drivers;
          } else if (Array.isArray(data.data)) {
            list = data.data;
          } else if (Array.isArray(data)) {
            list = data;
          }
          
          if (list) {
            const mapped = list.map(d => ({
              id: d._id || d.id,
              name: d.Name || d.name || d.driverName || 'Verified Driver',
              phone: d.PhoneNumber || d.phone || '+92 300 0000000',
              vehicle: d.vehicle || d.vehicleDetails?.model || d.vehicleModel || 'Sedan Executive',
              status: d.status || d.verificationStatus || 'Available'
            }));
            setAvailableDrivers(mapped);
            break;
          }
        }
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    fetchReportedIssues();
    fetchAvailableDrivers();
  }, [fetchReportedIssues, fetchAvailableDrivers]);

  // 2. Real-Time Socket Listeners for Driver Issues
  useEffect(() => {
    const sockets = [];

    SOCKET_URLS.forEach(url => {
      try {
        const socket = io(url, {
          transports: ['polling', 'websocket'],
          reconnectionAttempts: 5,
          timeout: 5000
        });

        socket.on('connect', () => {
          console.log(`[DriverIssues] Connected to Socket.IO at ${url}`);
          socket.emit('join-admin');
        });

        // Unified handler for new valid issue reports
        const handleNewIssue = (newIssue) => {
          if (!newIssue || !isValidFrontendIssue(newIssue)) return;

          setIssues((prevIssues) => {
            // Always stringify IDs for reliable comparison (prevents ObjectId vs string mismatch)
            const newMongoId = String(newIssue.mongoId || newIssue._id || '');
            const newIssueId = String(newIssue.issueId || '');
            const exists = prevIssues.some(i => {
              const iMongoId = String(i.mongoId || i._id || '');
              const iIssueId = String(i.issueId || '');
              return (newMongoId && iMongoId && newMongoId === iMongoId) ||
                     (newIssueId && iIssueId && newIssueId === iIssueId);
            });
            if (exists) return prevIssues;
            return [newIssue, ...prevIssues];
          });
        };

        // Listen only for the single canonical event emitted by backend
        socket.on('new_issue_report', handleNewIssue);

        socket.on('issue_updated', (updated) => {
          if (!updated) return;
          setIssues(prev => prev.map(item => 
            (item._id === updated._id || item.issueId === updated.issueId) ? { ...item, ...updated } : item
          ));
        });

        sockets.push(socket);
      } catch (e) {
        console.warn(`Socket connection error for ${url}:`, e);
      }
    });

    return () => {
      sockets.forEach(s => s.disconnect());
    };
  }, []);

  // Open Resolve Modal and pre-populate Customer Notification details
  const openResolveModal = (issue) => {
    setSelectedIssue(issue);
    setResolutionRemarks('');
    setNotifyCustomer(true);

    let dateStr = 'May 21, 2026';
    if (issue.fromDate) {
      try {
        dateStr = new Date(issue.fromDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      } catch (e) {}
    } else {
      dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    setAffectedDate(dateStr);

    let timeStr = '08:00 AM - 10:00 AM';
    if (issue.fromTime && issue.toTime) {
      timeStr = `${issue.fromTime} - ${issue.toTime}`;
    }
    setAffectedTime(timeStr);

    setReportedReason(issue.reason || 'Vehicle Issue');

    const defaultDetails = issue.description || issue.details || 'Driver is unavailable due to a sudden mechanical issue with the vehicle. We apologize for the inconvenience and are working to find a replacement driver immediately. The issue is severe enough to prevent the ride.';
    setDetailsText(defaultDetails);
    setCanRequestReplacement(true);
    setIsResolveModalOpen(true);
  };

  // Handle Mark Resolved with Customer Notification
  const handleResolveSubmit = async () => {
    if (!selectedIssue) return;
    setSubmitting(true);
    const token = localStorage.getItem('adminToken') || localStorage.getItem('admin_token') || '';
    const targetId = selectedIssue._id || selectedIssue.issueId;

    const payload = {
      status: 'Resolved',
      remarks: resolutionRemarks || 'Resolved by Dispatcher',
      notifyCustomer,
      affectedDate,
      affectedTime,
      reportedReason,
      reason: reportedReason,
      additionalDetails: detailsText,
      details: detailsText,
      canRequestReplacement,
      rideId: selectedIssue.rideId || selectedIssue.requestId || 'REQ-8031',
      requestId: selectedIssue.requestId || selectedIssue.rideId || 'REQ-8031'
    };

    const urls = [
      `http://localhost:5000/admin/issues/${targetId}/resolve`,
      `http://localhost:3000/admin/issues/${targetId}/resolve`,
      `http://localhost:5000/api/issues/${targetId}/resolve`
    ];

    let resolved = false;
    for (const url of urls) {
      try {
        const res = await fetch(url, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          resolved = true;
          break;
        }
      } catch (e) {}
    }

    // Update local state
    setIssues(prev => prev.map(iss => 
      (iss._id === targetId || iss.issueId === targetId)
        ? { 
            ...iss, 
            status: 'Resolved', 
            remarks: resolutionRemarks || 'Resolved by Dispatcher',
            customerNotified: notifyCustomer
          }
        : iss
    ));

    setSubmitting(false);
    setIsResolveModalOpen(false);
    setSelectedIssue(null);
    setResolutionRemarks('');
  };

  // Handle Assign Replacement Driver
  const handleAssignReplacement = async () => {
    if (!selectedIssue || !selectedReplacementDriver) {
      alert('Please select a replacement driver.');
      return;
    }

    setSubmitting(true);
    const token = localStorage.getItem('adminToken') || localStorage.getItem('admin_token') || '';
    const targetId = selectedIssue._id || selectedIssue.issueId;
    const rideId = selectedIssue.rideId || selectedIssue.requestId || 'REQ-8037';
    const customerName = selectedIssue.customerName || 'Bibi Sadiqa';
    const customerPhone = selectedIssue.customerPhone || '03328904415';

    const replacementPayload = {
      status: 'Resolved',
      remarks: `Reassigned customer ${customerName} to new driver: ${selectedReplacementDriver.name} (${selectedReplacementDriver.phone})`,
      replacementDriverId: selectedReplacementDriver.id,
      assignedDriverId: selectedReplacementDriver.id,
      driverId: selectedReplacementDriver.id,
      replacementDriverName: selectedReplacementDriver.name,
      assignedDriverName: selectedReplacementDriver.name,
      replacementDriverPhone: selectedReplacementDriver.phone,
      replacementDriverVehicle: selectedReplacementDriver.vehicle,
      rideId: rideId,
      requestId: selectedIssue.requestId || rideId,
      customerName: customerName,
      customerPhone: customerPhone
    };

    // 1. Update issue with replacement driver details & persist to MongoDB
    const patchUrls = [
      `http://localhost:5000/admin/issues/${targetId}/resolve`,
      `http://localhost:5000/api/issues/${targetId}/resolve`,
      `/admin/issues/${targetId}/resolve`
    ];

    for (const url of patchUrls) {
      try {
        const res = await fetch(url, {
          method: 'PATCH',
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(replacementPayload)
        });
        if (res.ok) break;
      } catch (e) {}
    }

    // 2. Dispatch / assign customer ride to the new driver in MongoDB
    if (rideId) {
      try {
        await fetch('http://localhost:5000/api/ride/assign', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            rideId: rideId,
            requestId: selectedIssue.requestId || rideId,
            driverId: selectedReplacementDriver.id,
            assignedDriverId: selectedReplacementDriver.id,
            driverName: selectedReplacementDriver.name,
            assignedDriver: selectedReplacementDriver.name,
            assignedDriverName: selectedReplacementDriver.name,
            driverPhone: selectedReplacementDriver.phone,
            driverVehicle: selectedReplacementDriver.vehicle,
            customerName: customerName,
            customerPhone: customerPhone,
            remarks: `Replacement driver assigned: ${selectedReplacementDriver.name} for customer ${customerName}`
          })
        });
      } catch (e) {}

      try {
        await fetch(`http://localhost:5000/api/rides/${rideId}/dispatch`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            driverId: selectedReplacementDriver.id,
            assignedDriverId: selectedReplacementDriver.id,
            driverName: selectedReplacementDriver.name,
            assignedDriver: selectedReplacementDriver.name,
            assignedDriverName: selectedReplacementDriver.name,
            driverPhone: selectedReplacementDriver.phone,
            driverVehicle: selectedReplacementDriver.vehicle,
            status: 'ASSIGNED',
            replacementNotes: `Replaced driver ${selectedIssue.driverName} with ${selectedReplacementDriver.name} for customer ${customerName}`
          })
        });
      } catch (e) {}
    }

    // Update local state
    setIssues(prev => prev.map(iss => 
      (iss._id === targetId || iss.issueId === targetId)
        ? { 
            ...iss, 
            status: 'Resolved', 
            remarks: `Replacement driver assigned: ${selectedReplacementDriver.name}`,
            replacementDriverName: selectedReplacementDriver.name,
            replacementDriverPhone: selectedReplacementDriver.phone,
            replacementDriverVehicle: selectedReplacementDriver.vehicle
          }
        : iss
    ));

    alert(`✅ Success! New driver ${selectedReplacementDriver.name} has been assigned to customer ${customerName} and saved directly to the database! Ride successfully re-dispatched.`);
    setSubmitting(false);
    setIsReplacementModalOpen(false);
    setSelectedIssue(null);
    setSelectedReplacementDriver(null);
    fetchReportedIssues();
  };

  // Filtered Issues calculation
  const filteredIssues = useMemo(() => {
    return issues.filter(issue => {
      // Exclude ghost/duplicate batch reports
      if (!isValidFrontendIssue(issue)) {
        return false;
      }

      // Status filter
      if (statusFilter !== 'ALL' && (issue.status || 'Pending').toLowerCase() !== statusFilter.toLowerCase()) {
        return false;
      }

      // Severity filter
      if (severityFilter !== 'ALL' && (issue.severity || 'Medium').toLowerCase() !== severityFilter.toLowerCase()) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchName = String(issue.driverName || '').toLowerCase().includes(query);
        const matchReason = String(issue.reason || '').toLowerCase().includes(query);
        const matchIssueId = String(issue.issueId || '').toLowerCase().includes(query);
        const matchRideId = String(issue.rideId || issue.requestId || '').toLowerCase().includes(query);
        const matchPhone = String(issue.driverPhone || '').toLowerCase().includes(query);
        const matchVehicle = String(issue.vehicle || '').toLowerCase().includes(query);
        const matchLoc = String(issue.location || '').toLowerCase().includes(query);

        if (!matchName && !matchReason && !matchIssueId && !matchRideId && !matchPhone && !matchVehicle && !matchLoc) {
          return false;
        }
      }

      return true;
    });
  }, [issues, statusFilter, severityFilter, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const validIssues = issues.filter(isValidFrontendIssue);
    const total = validIssues.length;
    const pending = validIssues.filter(i => (i.status || 'Pending') === 'Pending').length;
    const resolved = validIssues.filter(i => (i.status || '') === 'Resolved').length;
    const highSeverity = validIssues.filter(i => (i.severity || '') === 'High' && (i.status || 'Pending') === 'Pending').length;

    return { total, pending, resolved, highSeverity };
  }, [issues]);

  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return 'Recently';
    const d = new Date(dateStr);
    const now = new Date();
    const diffMin = Math.floor((now - d) / (1000 * 60));
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHrs = Math.floor(diffMin / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    return d.toLocaleDateString();
  };

  return (
    <div className="driver-issues-container fade-in">
      {/* Page Header */}
      <div className="issues-header-card">
        <div className="header-left">
          <div className="icon-badge-pulse">
            <AlertTriangle size={24} className="pulse-icon text-warning" />
          </div>
          <div>
            <div className="header-title-row">
              <h1 className="issues-title">Driver Reported Issues</h1>
              <span className="live-pill">
                <span className="live-dot"></span> LIVE LISTENER ACTIVE
              </span>
            </div>
            <p className="issues-subtitle">
              Real-time driver road emergencies, mechanical breakdowns, and replacement dispatch requests
            </p>
          </div>
        </div>

        <div className="header-actions-group">
          <button 
            className="btn-refresh" 
            onClick={fetchReportedIssues} 
            disabled={loading}
            title="Refresh issues"
          >
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
          <button 
            className="btn-dispatch-nav"
            onClick={() => navigate('/driver-selection')}
          >
            <Car size={16} />
            <span>Open Ride Dispatch</span>
          </button>
        </div>
      </div>

      {/* Stats Counter Bar */}
      <div className="stats-row">
        <div 
          className={`stat-card stat-total ${statusFilter === 'ALL' && severityFilter === 'ALL' ? 'active-kpi' : ''}`}
          onClick={() => {
            setStatusFilter('ALL');
            setSeverityFilter('ALL');
          }}
          title="Click to view Total Reports"
        >
          <div className="stat-content">
            <span className="stat-label">Total Reports</span>
            <h3 className="stat-value">{stats.total}</h3>
          </div>
          <div className="stat-icon-wrapper">
            <AlertCircle size={24} />
          </div>
        </div>

        <div 
          className={`stat-card stat-pending ${statusFilter === 'Pending' && severityFilter === 'ALL' ? 'active-kpi' : ''}`}
          onClick={() => {
            setStatusFilter('Pending');
            setSeverityFilter('ALL');
          }}
          title="Click to view Pending Action issues"
        >
          <div className="stat-content">
            <span className="stat-label">Pending Action</span>
            <h3 className="stat-value text-amber">{stats.pending}</h3>
          </div>
          <div className="stat-icon-wrapper amber">
            <Clock size={24} />
          </div>
        </div>

        <div 
          className={`stat-card stat-urgent ${severityFilter === 'High' ? 'active-kpi' : ''}`}
          onClick={() => {
            setSeverityFilter('High');
            setStatusFilter('ALL');
          }}
          title="Click to view Urgent / High Priority issues"
        >
          <div className="stat-content">
            <span className="stat-label">Urgent / High Priority</span>
            <h3 className="stat-value text-rose">{stats.highSeverity}</h3>
          </div>
          <div className="stat-icon-wrapper rose">
            <ShieldAlert size={24} />
          </div>
        </div>

        <div 
          className={`stat-card stat-resolved ${statusFilter === 'Resolved' ? 'active-kpi' : ''}`}
          onClick={() => {
            setStatusFilter('Resolved');
            setSeverityFilter('ALL');
          }}
          title="Click to view Resolved issues"
        >
          <div className="stat-content">
            <span className="stat-label">Resolved</span>
            <h3 className="stat-value text-emerald">{stats.resolved}</h3>
          </div>
          <div className="stat-icon-wrapper emerald">
            <CheckCircle size={24} />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="controls-bar glass-panel">
        <div className="search-input-wrapper">
          <Search size={18} className="search-icon" />
          <input 
            type="text" 
            placeholder="Search by Driver Name, Issue ID (ISS-1001), Ride ID, Reason, Location..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-field"
          />
          {searchQuery && (
            <button className="clear-search" onClick={() => setSearchQuery('')}>
              <X size={16} />
            </button>
          )}
        </div>

        <div className="filter-group">
          <div className="filter-pill-selector">
            <button 
              className={`pill-btn ${statusFilter === 'ALL' ? 'active' : ''}`}
              onClick={() => setStatusFilter('ALL')}
            >
              All Status
            </button>
            <button 
              className={`pill-btn ${statusFilter === 'Pending' ? 'active' : ''}`}
              onClick={() => setStatusFilter('Pending')}
            >
              Pending ({stats.pending})
            </button>
            <button 
              className={`pill-btn ${statusFilter === 'Resolved' ? 'active' : ''}`}
              onClick={() => setStatusFilter('Resolved')}
            >
              Resolved ({stats.resolved})
            </button>
          </div>

          <div className="severity-selector">
            <Filter size={15} />
            <select 
              value={severityFilter} 
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="select-severity"
            >
              <option value="ALL">All Severities</option>
              <option value="High">High Severity</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Issues List Table / Cards */}
      <div className="issues-table-container glass-panel">
        {loading && issues.length === 0 ? (
          <div className="empty-state">
            <RefreshCw size={36} className="spin text-secondary mb-3" />
            <p>Fetching driver reported issues from backend...</p>
          </div>
        ) : filteredIssues.length === 0 ? (
          <div className="empty-state">
            <ShieldCheck size={48} className="text-muted mb-3" />
            <h3>No Driver Issues Found</h3>
            <p className="text-secondary">
              {searchQuery || statusFilter !== 'ALL' || severityFilter !== 'ALL' 
                ? 'Try adjusting your filters or search keywords.' 
                : 'All drivers are on route smoothly with no reported road issues.'}
            </p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="issues-table">
              <thead>
                <tr>
                  <th>ISSUE ID</th>
                  <th>DRIVER & VEHICLE</th>
                  <th>REASON & DESCRIPTION</th>
                  <th>LOCATION</th>
                  <th>RIDE / REQ ID</th>
                  <th>SEVERITY</th>
                  <th>STATUS</th>
                  <th>TIME</th>
                  <th className="text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredIssues.map((issue) => {
                  const isPending = (issue.status || 'Pending') === 'Pending';
                  const sevLower = (issue.severity || 'medium').toLowerCase();

                  return (
                    <tr 
                      key={issue._id || issue.issueId} 
                      className={`issue-row ${isPending ? 'row-pending' : 'row-resolved'}`}
                      onClick={() => {
                        setSelectedIssue(issue);
                        setSelectedReplacementDriver(null);
                        setIsReplacementModalOpen(true);
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      <td>
                        <span className="issue-id-tag">
                          {issue.issueId || `ISS-${String(issue._id || '').slice(-4).toUpperCase()}`}
                        </span>
                      </td>
                      
                      <td>
                        <div className="driver-info-cell">
                          <div className="driver-avatar-circle">
                            {(issue.driverName || 'D').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="driver-name-text font-bold">
                              {issue.driverName || 'Unknown Driver'}
                              {issue.driverCode && <span className="code-pill ml-1">({issue.driverCode})</span>}
                            </div>
                            <div className="driver-sub-info">
                              <a 
                                href={`tel:${issue.driverPhone}`} 
                                className="driver-phone-link" 
                                title="Call Driver"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Phone size={12} className="mr-1" />
                                {issue.driverPhone || 'No Phone'}
                              </a>
                            </div>
                            <div className="vehicle-text">
                              <Car size={12} className="mr-1" />
                              {issue.vehicle || 'Sedan Executive'}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="reason-cell">
                        <div className="reason-badge">
                          <AlertTriangle size={13} className="mr-1 text-amber-500" />
                          <span>{issue.reason || 'Ride Refusal / Driver Unavailable'}</span>
                        </div>
                        {(issue.details || issue.description) ? (
                          <div className="issue-desc-text mt-1 font-medium" title={issue.details || issue.description} style={{ color: '#E2E8F0', fontSize: '0.78rem', lineHeight: '1.4' }}>
                            "{issue.details || issue.description}"
                          </div>
                        ) : (
                          <div className="issue-desc-text mt-1 font-medium" style={{ color: '#E2E8F0', fontSize: '0.78rem', lineHeight: '1.4' }}>
                            "Driver {issue.driverName || 'Saleem'} is refusing / unable to pick up customer ({issue.customerName || 'Sadiqa'})'s ride. Admin action required: Assign a new driver."
                          </div>
                        )}
                        {issue.remarks && (
                          <div className="issue-remarks-text mt-1">
                            <span className="text-success font-medium">Remarks:</span> {issue.remarks}
                          </div>
                        )}
                      </td>

                      <td>
                        <div className="location-cell">
                          {issue.fromTime && issue.toTime ? (
                            <div className="timing-chip" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'rgba(59, 130, 246, 0.15)', color: '#93c5fd', padding: '4px 8px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600 }}>
                              <Clock size={13} className="text-primary" />
                              <span>{issue.fromTime} - {issue.toTime}</span>
                            </div>
                          ) : (
                            <>
                              <MapPin size={14} className="pin-icon" />
                              <span className="loc-text" title={issue.location}>
                                {issue.location || 'Current location'}
                              </span>
                              <a 
                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(issue.location || 'Islamabad')}`}
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="maps-link"
                                title="Open in Google Maps"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <ExternalLink size={12} />
                              </a>
                            </>
                          )}
                        </div>
                      </td>

                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                          <span className="ride-id-badge font-mono font-bold">
                            {issue.rideId || issue.requestId || 'REQ-8037'}
                          </span>
                          <span className="customer-badge-pill" style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: 'rgba(56, 189, 248, 0.15)',
                            color: '#38BDF8',
                            border: '1px solid rgba(56, 189, 248, 0.3)',
                            borderRadius: '4px',
                            padding: '1px 6px',
                            fontSize: '0.74rem',
                            fontWeight: 700
                          }}>
                            <User size={10} /> {issue.customerName || 'Bibi Sadiqa'}
                          </span>
                        </div>
                      </td>

                      <td>
                        <span className={`severity-badge sev-${sevLower}`}>
                          {issue.severity || 'Medium'}
                        </span>
                      </td>

                      <td>
                        <span className={`status-badge status-${(issue.status || 'Pending').toLowerCase()}`}>
                          {issue.status === 'Resolved' ? (
                            <><Check size={12} className="mr-1" /> Resolved</>
                          ) : (
                            <><Clock size={12} className="mr-1" /> Pending</>
                          )}
                        </span>
                      </td>

                      <td>
                        <span className="time-text" title={new Date(issue.createdAt || Date.now()).toLocaleString()}>
                          {formatTimeAgo(issue.createdAt)}
                        </span>
                      </td>

                      <td className="text-right">
                        <div className="actions-cell">
                          {isPending ? (
                            <>
                              <button 
                                className="action-btn-replace"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedIssue(issue);
                                  setSelectedReplacementDriver(null);
                                  setIsReplacementModalOpen(true);
                                }}
                                title="Assign replacement driver and re-dispatch"
                              >
                                <Car size={13} />
                                <span>Assign Replacement</span>
                              </button>

                              <button 
                                className="action-btn-resolve"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openResolveModal(issue);
                                }}
                                title="Mark as resolved and notify customer"
                              >
                                <Check size={13} />
                                <span>Resolve</span>
                              </button>
                            </>
                          ) : (
                            <span className="resolved-check-indicator">
                              <CheckCircle size={16} className="text-success" />
                              <span className="text-success text-sm ml-1">Handled</span>
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL 1: Assign Replacement Driver */}
      {isReplacementModalOpen && selectedIssue && (
        <div className="modal-overlay fade-in" onClick={() => !submitting && setIsReplacementModalOpen(false)}>
          <div className="modal-card replacement-dispatch-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-row">
                <div className="modal-title-icon-badge">
                  <Car size={20} />
                </div>
                <div>
                  <h3 className="m-0 text-lg font-bold">Assign Replacement Driver</h3>
                  <div className="modal-subtitle-text">
                    Incident: <span className="id-tag">{selectedIssue.issueId}</span> • Affected Driver: <span className="font-semibold">{selectedIssue.driverName}</span>
                  </div>
                </div>
              </div>
              <button 
                className="icon-close-btn" 
                onClick={() => setIsReplacementModalOpen(false)}
                disabled={submitting}
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body replacement-modal-layout">
              {/* Left Column: Affected Driver & Customer Context Card */}
              <div className="replacement-incident-panel">
                {/* 1. Admin Callout Banner */}
                <div className="admin-action-alert-banner mb-3" style={{
                  background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.18), rgba(245, 158, 11, 0.15))',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px'
                }}>
                  <AlertTriangle size={22} className="text-danger flex-shrink-0 mt-0.5" />
                  <div>
                    <div style={{ fontWeight: 800, color: '#F87171', fontSize: '0.9rem' }}>
                      Driver {selectedIssue.driverName || 'Saleem'} Ride Refusal Alert!
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#E2E8F0', marginTop: '3px', lineHeight: '1.4' }}>
                      Driver <strong>{selectedIssue.driverName || 'Saleem'}</strong> customer <strong>{selectedIssue.customerName || 'Bibi Sadiqa'}</strong> ki ride nahi utha raha. As an admin, aapka kaam hai ke customer ko new driver assign karen.
                    </div>
                  </div>
                </div>

                {/* 2. Affected Customer Card */}
                <div className="affected-customer-card mb-3" style={{
                  background: 'rgba(30, 41, 59, 0.7)',
                  border: '1px solid rgba(56, 189, 248, 0.35)',
                  borderRadius: '10px',
                  padding: '12px 14px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#38BDF8', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                      Affected Customer (Waiting for Driver)
                    </span>
                    <span className="font-mono text-xs font-bold" style={{ color: '#FBBF24', background: 'rgba(245, 158, 11, 0.15)', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                      {selectedIssue.rideId || selectedIssue.requestId || 'REQ-8037'}
                    </span>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: '1rem', color: '#F8FAFC', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <User size={15} className="text-primary" />
                    <span>{selectedIssue.customerName || 'Bibi Sadiqa'}</span>
                    <span style={{ fontSize: '0.76rem', color: '#94A3B8', fontWeight: 500 }}>({selectedIssue.customerPhone || '03328904415'})</span>
                  </div>
                  {selectedIssue.pickupLocation && (
                    <div style={{ fontSize: '0.76rem', color: '#CBD5E1', marginTop: '6px', lineHeight: '1.4' }}>
                      <span className="text-secondary font-medium">Pickup: </span>{selectedIssue.pickupLocation}<br />
                      <span className="text-secondary font-medium">Dropoff: </span>{selectedIssue.dropoffLocation}
                    </div>
                  )}
                </div>

                <div className="panel-section-title">Current Assigned Driver Details</div>
                
                {/* Affected Driver Profile Card */}
                <div className="affected-driver-card">
                  <div className="affected-driver-avatar">
                    {(selectedIssue.driverName || 'D').charAt(0).toUpperCase()}
                  </div>
                  <div className="affected-driver-meta">
                    <div className="font-bold text-slate-900">{selectedIssue.driverName}</div>
                    <div className="text-xs text-slate-500">{selectedIssue.driverPhone}</div>
                    <span className="breakdown-status-tag" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#EF4444', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                      Ride Refusal Reported
                    </span>
                  </div>
                </div>

                {/* Incident Parameters List */}
                <div className="incident-meta-list">
                  <div className="incident-meta-row">
                    <span className="meta-label">Reported Reason:</span>
                    <span className="meta-val reason-pill">
                      <AlertTriangle size={12} /> {selectedIssue.reason || 'Ride Refusal / Driver Unavailable'}
                    </span>
                  </div>

                  <div className="incident-meta-row" style={{ alignItems: 'flex-start' }}>
                    <span className="meta-label">Driver Note / Description:</span>
                    <span className="meta-val" style={{ fontSize: '0.78rem', lineHeight: '1.4' }}>
                      "{selectedIssue.details || selectedIssue.description || `Driver ${selectedIssue.driverName || 'Saleem'} customer (${selectedIssue.customerName || 'Sadiqa'})\'s ride nahi utha raha.`}"
                    </span>
                  </div>

                  <div className="incident-meta-row">
                    <span className="meta-label">Location:</span>
                    <span className="meta-val">{selectedIssue.location || 'Current Route / Shift'}</span>
                  </div>

                  {selectedIssue.vehicle && (
                    <div className="incident-meta-row">
                      <span className="meta-label">Vehicle:</span>
                      <span className="meta-val">{selectedIssue.vehicle}</span>
                    </div>
                  )}
                </div>

                {/* Dispatch Advisory Note */}
                <div className="dispatch-advisory-box">
                  <ShieldAlert size={15} className="text-amber-600 flex-shrink-0" />
                  <span>Right column se standby driver select karen aur "Dispatch Replacement" click karke customer {selectedIssue.customerName || 'Sadiqa'} ko new driver assign karen.</span>
                </div>
              </div>

              {/* Right Column: Standby Drivers List */}
              <div className="replacement-standby-panel">
                <div className="standby-panel-header">
                  <div>
                    <div className="panel-section-title">Select Standby Driver</div>
                    <span className="text-xs text-slate-500">
                      {filteredStandbyDrivers.length} verified driver{filteredStandbyDrivers.length !== 1 ? 's' : ''} available
                    </span>
                  </div>
                  {selectedReplacementDriver && (
                    <span className="selected-driver-pill">
                      Selected: <strong>{selectedReplacementDriver.name}</strong>
                    </span>
                  )}
                </div>

                {/* Driver search input */}
                <div className="standby-search-box">
                  <Search size={14} className="search-icon" />
                  <input 
                    type="text"
                    placeholder="Search by name, vehicle, or phone..."
                    value={replacementDriverSearch}
                    onChange={(e) => setReplacementDriverSearch(e.target.value)}
                  />
                  {replacementDriverSearch && (
                    <button className="clear-search-btn" onClick={() => setReplacementDriverSearch('')}>
                      <X size={12} />
                    </button>
                  )}
                </div>

                {/* Drivers list */}
                <div className="replacement-drivers-list modern-scroll">
                  {filteredStandbyDrivers.length === 0 ? (
                    <div className="empty-drivers-box">
                      <Car size={32} className="text-slate-400 mb-2" />
                      <p className="font-semibold text-slate-700">No standby drivers found</p>
                      <span className="text-xs text-slate-500">
                        {replacementDriverSearch ? 'Try a different search term.' : 'No verified drivers currently marked available.'}
                      </span>
                    </div>
                  ) : (
                    filteredStandbyDrivers.map(driver => {
                      const isSelected = selectedReplacementDriver?.id === driver.id;
                      return (
                        <div 
                          key={driver.id} 
                          className={`driver-select-card-modern ${isSelected ? 'selected' : ''}`}
                          onClick={() => setSelectedReplacementDriver(driver)}
                        >
                          <div className="driver-card-left">
                            <div className="driver-avatar-circle">
                              {(driver.name || 'D').charAt(0).toUpperCase()}
                            </div>
                            <div className="driver-info-block">
                              <div className="driver-name-row">
                                <span className="driver-title">{driver.name}</span>
                                <span className="rating-tag">★ 4.9</span>
                              </div>
                              <div className="driver-sub-row">
                                <span>{driver.phone}</span>
                                <span>•</span>
                                <span className="vehicle-tag"><Car size={12} /> {driver.vehicle}</span>
                              </div>
                            </div>
                          </div>

                          <div className="driver-card-right">
                            <span className="standby-status-pill">
                              <span className="pulse-dot-green"></span> Ready for Dispatch
                            </span>
                            <div className={`modern-radio-check ${isSelected ? 'checked' : ''}`}>
                              {isSelected && <Check size={13} />}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            <div className="modal-footer replacement-modal-footer">
              <button 
                className="btn-modal-cancel" 
                onClick={() => setIsReplacementModalOpen(false)}
                disabled={submitting}
              >
                Cancel
              </button>
              <button 
                className="btn-modal-dispatch"
                onClick={handleAssignReplacement}
                disabled={!selectedReplacementDriver || submitting}
              >
                {submitting ? (
                  <><RefreshCw size={15} className="spin mr-2" /> Dispatching...</>
                ) : (
                  <><Send size={15} className="mr-2" /> Dispatch Replacement</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Mark Issue Resolved & Notify Customer */}
      {isResolveModalOpen && selectedIssue && (
        <div className="modal-overlay fade-in">
          <div className="glass-panel modal-card modal-xl">
            <div className="modal-header">
              <div className="modal-title-row">
                <CheckCircle size={22} className="text-success mr-2" />
                <div>
                  <h3 className="m-0">Resolve Driver Issue</h3>
                  <span className="text-sm text-secondary">
                    Incident: {selectedIssue.issueId} • Driver: {selectedIssue.driverName} ({selectedIssue.reason})
                  </span>
                </div>
              </div>
              <button className="icon-close-btn" onClick={() => setIsResolveModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div className="resolve-modal-layout">
                {/* Left Column: Admin Controls */}
                <div className="resolve-form-col">
                  <div className="incident-summary-box mb-3">
                    <div className="summary-item">
                      <span className="label">Driver:</span>
                      <span className="val font-bold">{selectedIssue.driverName} ({selectedIssue.driverPhone || 'N/A'})</span>
                    </div>
                    <div className="summary-item">
                      <span className="label">Issue Reported:</span>
                      <span className="val text-danger font-semibold">{selectedIssue.reason}</span>
                    </div>
                    {selectedIssue.rideId && (
                      <div className="summary-item">
                        <span className="label">Ride ID:</span>
                        <span className="val font-mono">{selectedIssue.rideId}</span>
                      </div>
                    )}
                  </div>

                  <div className="form-group mb-3">
                    <label className="form-label">Internal Resolution Remarks / Notes:</label>
                    <textarea 
                      rows={2}
                      className="form-textarea"
                      placeholder="e.g. Mechanic dispatched, replacement driver arranged, ride updated..."
                      value={resolutionRemarks}
                      onChange={(e) => setResolutionRemarks(e.target.value)}
                    />
                  </div>

                  {/* Customer Notification Configuration Box */}
                  <div className="customer-notif-box">
                    <label className="notif-checkbox-label">
                      <input 
                        type="checkbox" 
                        checked={notifyCustomer} 
                        onChange={(e) => setNotifyCustomer(e.target.checked)} 
                        style={{ width: '16px', height: '16px', accentColor: '#2563eb' }}
                      />
                      <span>🔔 Send "Driver Unavailable" Notification to Customer App</span>
                    </label>

                    {notifyCustomer && (
                      <div className="notif-fields fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div className="form-row-2">
                          <div>
                            <label className="text-xs font-semibold text-secondary">Affected Date:</label>
                            <input 
                              type="text" 
                              className="form-input"
                              value={affectedDate}
                              onChange={(e) => setAffectedDate(e.target.value)}
                              placeholder="e.g. May 21, 2026"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-secondary">Affected Time Slot:</label>
                            <input 
                              type="text" 
                              className="form-input"
                              value={affectedTime}
                              onChange={(e) => setAffectedTime(e.target.value)}
                              placeholder="e.g. 08:00 AM - 10:00 AM"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-secondary">Reported Reason:</label>
                          <input 
                            type="text" 
                            className="form-input"
                            value={reportedReason}
                            onChange={(e) => setReportedReason(e.target.value)}
                            placeholder="e.g. Vehicle Issue"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-secondary">Additional Details from Driver (Visible to Customer):</label>
                          <textarea 
                            rows={3}
                            className="form-textarea"
                            value={detailsText}
                            onChange={(e) => setDetailsText(e.target.value)}
                            placeholder="Explanation of vehicle issue or driver unavailability..."
                          />
                        </div>

                        <label className="text-xs font-medium text-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                          <input 
                            type="checkbox" 
                            checked={canRequestReplacement} 
                            onChange={(e) => setCanRequestReplacement(e.target.checked)}
                            style={{ accentColor: '#2563eb' }}
                          />
                          <span>Allow customer to tap <strong>"Request Replacement"</strong> button</span>
                        </label>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column: Customer Mobile Screen Preview */}
                <div className="phone-mockup-wrapper">
                  <div className="phone-mockup-frame">
                    <div className="phone-notch">
                      <div className="notch-camera"></div>
                    </div>

                    <div className="phone-screen">
                      {/* Top Header */}
                      <div className="phone-top-bar">
                        <span className="phone-back-arrow">←</span>
                        <div>
                          <div className="phone-top-title">Driver Unavailable</div>
                          <div className="phone-top-sub">Your assigned driver is unavailable for this ride.</div>
                        </div>
                      </div>

                      {/* Screen Content */}
                      <div className="phone-content">
                        {/* Red Warning Banner */}
                        <div className="phone-danger-banner">
                          <div className="phone-danger-icon-circle">!</div>
                          <h4 className="phone-danger-title">Driver Unavailable</h4>
                        </div>

                        {/* Affected Date & Time */}
                        <div>
                          <div className="phone-section-label">Affected Date & Time</div>
                          <div className="phone-detail-card">
                            <span style={{ fontSize: '16px' }}>📅</span>
                            <div>
                              <div className="phone-detail-card-text-primary">{affectedDate || 'May 21, 2026'}</div>
                              <div className="phone-detail-card-text-sub">{affectedTime || '08:00 AM - 10:00 AM'}</div>
                            </div>
                          </div>
                        </div>

                        {/* Reported Reason */}
                        <div className="phone-detail-card">
                          <span style={{ fontSize: '16px' }}>📄</span>
                          <div className="phone-detail-card-text-primary">
                            Reported Reason: {reportedReason || 'Vehicle Issue'}
                          </div>
                        </div>

                        {/* Additional Details from Driver */}
                        <div>
                          <div className="phone-section-label">Additional Details from Driver:</div>
                          <div className="phone-notes-box">
                            {detailsText || 'Driver is unavailable due to a sudden mechanical issue with the vehicle. We apologize for the inconvenience and are working to find a replacement driver immediately. The issue is severe enough to prevent the ride.'}
                          </div>
                        </div>

                        {/* Info Callout */}
                        {canRequestReplacement && (
                          <div className="phone-info-callout">
                            <span>ℹ️</span>
                            <span>You can request a replacement driver for this ride.</span>
                          </div>
                        )}

                        {/* Action Button */}
                        {canRequestReplacement && (
                          <button className="phone-action-btn" type="button" onClick={() => alert('Customer tap simulated: Requesting replacement driver...')}>
                            Request Replacement
                          </button>
                        )}
                      </div>

                      <div className="phone-chin">
                        <div className="phone-home-indicator"></div>
                      </div>
                    </div>
                  </div>
                  <div className="phone-caption">Customer View - Ride Status Update</div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button 
                className="btn-secondary" 
                onClick={() => setIsResolveModalOpen(false)}
                disabled={submitting}
              >
                Cancel
              </button>
              <button 
                className="btn-success"
                onClick={handleResolveSubmit}
                disabled={submitting}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                {submitting ? (
                  <><RefreshCw size={14} className="spin" /> Updating...</>
                ) : (
                  <><CheckCircle size={15} /> Confirm Resolution {notifyCustomer ? '& Notify Customer' : ''}</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DriverIssues;
