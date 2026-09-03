import React, { useState } from 'react';
import { 
  Plus, Edit2, Trash2, Eye, EyeOff, Users, CheckCircle, XCircle, X, Search, Filter, Car, User, MapPin, Clock, Calendar, ChevronLeft
} from 'lucide-react';
import { initialRidePool } from '../utils/mockData';
import './RidePool.css';

const RidePool = () => {
  const [rides, setRides] = useState(() => {
    try {
      const saved = localStorage.getItem('rr_ride_pool');
      return saved ? JSON.parse(saved) : initialRidePool;
    } catch (e) {
      return initialRidePool;
    }
  });

  const [activeTab, setActiveTab] = useState('Visible'); // Matches 'AVAILABLE' in screenshot terminology
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  
  // Modals & Inline Page state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [editingRide, setEditingRide] = useState(null);
  const [viewRequestsRide, setViewRequestsRide] = useState(null);

  // Watch / Clock Picker Popover state
  const [clockPickerTarget, setClockPickerTarget] = useState(null); // 'leave' | 'reach' | null
  const [selectedClockHour, setSelectedClockHour] = useState('08');
  const [selectedClockMinute, setSelectedClockMinute] = useState('00');
  const [selectedClockPeriod, setSelectedClockPeriod] = useState('AM');

  const defaultManualRideForm = {
    passengerName: '',
    gender: 'Male',
    pickupLocation: 'Islamabad',
    dropoffLocation: 'Lahore',
    rideDate: '30/08/2026',
    leaveTimeValue: '08:00',
    leavePeriod: 'AM',
    reachTimeValue: '09:00',
    reachPeriod: 'AM',
    seatsNeeded: 1,
    vehiclePreference: 'Sedan',
    acRequired: true,
    oneWay: true,
    publishToPool: true
  };

  const [manualFormData, setManualFormData] = useState(defaultManualRideForm);

  const updateAndPersistRides = (newRidesList) => {
    setRides(newRidesList);
    try {
      localStorage.setItem('rr_ride_pool', JSON.stringify(newRidesList));
    } catch (e) {
      console.error(e);
    }
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const handleToggleVisibility = (id, currentStatus) => {
    const newStatus = currentStatus === 'Visible' ? 'Draft' : 'Visible';
    const updated = rides.map(r => r.id === id ? { ...r, status: newStatus } : r);
    updateAndPersistRides(updated);
    showToast(`Ride moved to ${newStatus === 'Visible' ? 'Active Pool' : 'Drafts'}`);
  };

  const handleDelete = (id) => {
    const updated = rides.filter(r => r.id !== id);
    updateAndPersistRides(updated);
    showToast('Ride deleted from pool');
  };

  const openForm = (ride = null) => {
    if (ride) {
      setEditingRide(ride);
      const parts = (ride.route || '').split(' -> ');
      let timeVal = '08:00';
      let period = 'AM';
      if (ride.date && ride.date.includes(' ')) {
        const timePart = ride.date.substring(ride.date.indexOf(' ') + 1);
        const sub = timePart.split(' ');
        if (sub[0]) timeVal = sub[0];
        if (sub[1]) period = sub[1];
      }
      setManualFormData({
        passengerName: ride.passenger || 'Guest Passenger',
        gender: 'Male',
        pickupLocation: parts[0] || 'Islamabad',
        dropoffLocation: parts[1] || 'Lahore',
        rideDate: ride.date ? ride.date.split(' ')[0] : '30/08/2026',
        leaveTimeValue: timeVal,
        leavePeriod: period,
        reachTimeValue: '09:00',
        reachPeriod: 'AM',
        seatsNeeded: 1,
        vehiclePreference: ride.vehicleCategory || 'Sedan',
        acRequired: true,
        oneWay: true,
        publishToPool: ride.status === 'Visible'
      });
    } else {
      setEditingRide(null);
      setManualFormData(defaultManualRideForm);
    }
    setIsFormOpen(true);
  };

  const saveRide = (e) => {
    e.preventDefault();
    const routeStr = `${manualFormData.pickupLocation} -> ${manualFormData.dropoffLocation}`;
    const leaveTimeStr = `${manualFormData.leaveTimeValue || '08:00'} ${manualFormData.leavePeriod || 'AM'}`;
    const dateStr = `${manualFormData.rideDate || '30/08/2026'} ${leaveTimeStr}`;
    const initialStatus = manualFormData.publishToPool ? 'Visible' : 'Draft';

    let updatedList;
    if (editingRide) {
      updatedList = rides.map(r => r.id === editingRide.id ? {
        ...r,
        passenger: manualFormData.passengerName || r.passenger || 'Jane Doe',
        route: routeStr,
        date: dateStr,
        vehicleCategory: manualFormData.vehiclePreference,
        status: initialStatus
      } : r);
      updateAndPersistRides(updatedList);
      showToast(`Ride ${editingRide.id} updated successfully`);
    } else {
      const nextNum = 9000 + rides.length + 1;
      const newRideId = `POOL-${nextNum}`;
      const newRide = {
        id: newRideId,
        passenger: manualFormData.passengerName || 'Jane Doe',
        route: routeStr,
        date: dateStr,
        fare: 'Rs. 9,500',
        vehicleCategory: manualFormData.vehiclePreference,
        status: initialStatus,
        assignedTo: null,
        driverRequests: []
      };
      updatedList = [newRide, ...rides];
      updateAndPersistRides(updatedList);
      showToast(`✓ New ride ${newRideId} (${routeStr}) successfully added to Ride Pool!`);
    }

    // Auto-switch to Visible or All tab so user immediately sees the new ride in the table
    setActiveTab(initialStatus === 'Visible' ? 'Visible' : 'All');
    setIsFormOpen(false);
  };

  const acceptDriver = (driverReq) => {
    const updated = rides.map(r => 
      r.id === viewRequestsRide.id ? 
      { ...r, status: 'Assigned', assignedTo: `${driverReq.driverName} (${driverReq.driverId})` } 
      : r
    );
    updateAndPersistRides(updated);
    showToast(`${driverReq.driverName} has been assigned to the ride`);
    setViewRequestsRide(null);
  };

  const filteredRides = (() => {
    let result = rides;
    if (activeTab === 'DriverRequests') {
      result = result.filter(r => r.driverRequests && r.driverRequests.length > 0);
    } else if (activeTab !== 'All') {
      result = result.filter(r => r.status === activeTab);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(r => 
        (r.id && r.id.toLowerCase().includes(q)) ||
        (r.route && r.route.toLowerCase().includes(q)) ||
        (r.passenger && r.passenger.toLowerCase().includes(q))
      );
    }

    return result;
  })();


  // KPI Data
  const totalRides = rides.length;
  const availableRides = rides.filter(r => r.status === 'Visible').length;
  const driverRequestsCount = rides.reduce((acc, ride) => acc + ride.driverRequests.length, 0);
  const assignedRides = rides.filter(r => r.status === 'Assigned').length;
  const cancelledRides = 0; // Mock

  const renderDashboard = () => (
    <div className="ride-pool-container fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Ride Pool</h1>
          <p className="page-subtitle">Manage unassigned rides, toggle visibility, and monitor driver bids.</p>
        </div>
        <div className="header-actions-group">
          <div className="search-input-wrap">
            <Search size={16} />
            <input 
              type="text" 
              placeholder="Search rides..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="position-relative">
            <button className="secondary-btn" onClick={() => setIsFilterOpen(!isFilterOpen)}>
              <Filter size={16} />
              <span>Filter</span>
            </button>
            {isFilterOpen && (
              <div className="filter-dropdown">
                <div className="filter-dropdown-header">Filter by Status</div>
                <div className="filter-option" onClick={() => { setActiveTab('Visible'); setIsFilterOpen(false); }}>Available (Visible)</div>
                <div className="filter-option" onClick={() => { setActiveTab('Draft'); setIsFilterOpen(false); }}>Draft (Hidden)</div>
                <div className="filter-option" onClick={() => { setActiveTab('Assigned'); setIsFilterOpen(false); }}>Assigned</div>
                <div className="filter-dropdown-header mt-2">Filter by Category</div>
                <div className="filter-option" onClick={() => setIsFilterOpen(false)}>Executive</div>
                <div className="filter-option" onClick={() => setIsFilterOpen(false)}>Sedan</div>
              </div>
            )}
          </div>
          <button className="primary-btn" onClick={() => openForm()}>
            <Plus size={16} />
            <span>New Ride</span>
          </button>
        </div>
      </div>

      <div className="driver-kpi-grid">
        <div className="driver-kpi-card" onClick={() => setActiveTab('All')}>
          <div className="kpi-content">
            <div className="kpi-label">Total Rides</div>
            <div className="kpi-value text-primary">{totalRides}</div>
          </div>
          <div className="kpi-icon-soft bg-primary-light text-primary">
            <Car size={20} />
          </div>
        </div>

        <div className={`driver-kpi-card ${activeTab === 'Visible' ? 'active' : ''}`} onClick={() => setActiveTab('Visible')}>
          <div className="kpi-content">
            <div className="kpi-label">Available</div>
            <div className="kpi-value text-success">{availableRides}</div>
          </div>
          <div className="kpi-icon-soft bg-success-light text-success">
            <Eye size={20} />
          </div>
        </div>

        <div className={`driver-kpi-card ${activeTab === 'DriverRequests' ? 'active' : ''}`} onClick={() => setActiveTab('DriverRequests')}>
          <div className="kpi-content">
            <div className="kpi-label">Driver Requests</div>
            <div className="kpi-value text-warning">{driverRequestsCount}</div>
          </div>
          <div className="kpi-icon-soft bg-warning-light text-warning">
            <Users size={20} />
          </div>
        </div>

        <div className={`driver-kpi-card ${activeTab === 'Assigned' ? 'active' : ''}`} onClick={() => setActiveTab('Assigned')}>
          <div className="kpi-content">
            <div className="kpi-label">Assigned</div>
            <div className="kpi-value text-primary">{assignedRides}</div>
          </div>
          <div className="kpi-icon-soft bg-primary-light text-primary">
            <CheckCircle size={20} />
          </div>
        </div>

        <div className="driver-kpi-card">
          <div className="kpi-content">
            <div className="kpi-label">Cancelled</div>
            <div className="kpi-value text-danger">{cancelledRides}</div>
          </div>
          <div className="kpi-icon-soft bg-danger-light text-danger">
            <XCircle size={20} />
          </div>
        </div>
      </div>

      <div className="table-container-card mt-4">
        <div className="table-header-title">
          <h4>
            {activeTab === 'All' ? 'All Rides' :
             activeTab === 'Visible' ? 'Available Rides Queue' :
             activeTab === 'DriverRequests' ? 'Rides with Driver Requests' :
             `${activeTab} Rides Queue`}
          </h4>
        </div>
        
        <div className="table-content">
          <table className="clean-table">
            <colgroup>
              <col style={{width: '130px'}} />
              <col style={{width: '220px'}} />
              <col style={{width: '180px'}} />
              <col style={{width: '130px'}} />
              <col style={{width: '70px'}} />
              <col style={{width: '100px'}} />
            </colgroup>
            <thead>
              <tr>
                <th>Ride ID</th>
                <th>Route</th>
                <th>Date</th>
                <th>Visibility</th>
                <th>Req</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRides.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-4 text-secondary">
                    No rides in the {activeTab.toLowerCase()} pool.
                  </td>
                </tr>
              ) : (
                filteredRides.map(ride => (
                  <tr key={ride.id}>
                    <td className="fw-500">{ride.id}</td>
                    <td>{ride.route}</td>
                    <td>{ride.date}</td>
                    <td>
                      {ride.status === 'Assigned' ? (
                        <span className="badge bg-success-light text-success">Assigned</span>
                      ) : (
                        <button 
                          className={`visibility-toggle-btn ${ride.status === 'Visible' ? 'active' : ''}`}
                          onClick={() => handleToggleVisibility(ride.id, ride.status)}
                          title="Toggle Visibility"
                        >
                          {ride.status === 'Visible' ? (
                            <><Eye size={14}/> <span>Visible</span></>
                          ) : (
                            <><EyeOff size={14}/> <span>Hidden</span></>
                          )}
                        </button>
                      )}
                    </td>
                    <td>
                      {ride.status === 'Visible' ? (
                        <button className="badge-btn" onClick={() => setViewRequestsRide(ride)}>
                          {ride.driverRequests.length}
                        </button>
                      ) : (
                        <span>-</span>
                      )}
                    </td>
                    <td>
                      <div className="table-actions">
                        {ride.status !== 'Assigned' && (
                          <button className="icon-btn-sm" onClick={() => openForm(ride)}>
                            <Edit2 size={16} />
                          </button>
                        )}
                        <button className="icon-btn-sm text-danger" onClick={() => handleDelete(ride.id)}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const openClockPicker = (target) => {
    setClockPickerTarget(target);
    const currentTime = target === 'leave' ? manualFormData.leaveTimeValue : manualFormData.reachTimeValue;
    const currentPeriod = target === 'leave' ? manualFormData.leavePeriod : manualFormData.reachPeriod;
    if (currentTime && currentTime.includes(':')) {
      const [h, m] = currentTime.split(':');
      setSelectedClockHour(h.padStart(2, '0'));
      setSelectedClockMinute(m.padStart(2, '0'));
    }
    setSelectedClockPeriod(currentPeriod || 'AM');
  };

  const applyClockPicker = () => {
    const formattedTime = `${selectedClockHour}:${selectedClockMinute}`;
    if (clockPickerTarget === 'leave') {
      setManualFormData(prev => ({
        ...prev,
        leaveTimeValue: formattedTime,
        leavePeriod: selectedClockPeriod
      }));
    } else if (clockPickerTarget === 'reach') {
      setManualFormData(prev => ({
        ...prev,
        reachTimeValue: formattedTime,
        reachPeriod: selectedClockPeriod
      }));
    }
    setClockPickerTarget(null);
  };

  // Full-Width Dashboard View for Create Manual Ride
  const renderCreateManualRideView = () => (
    <div className="manual-ride-fullpage-view fade-in">
      {/* Top Header with Back Navigation */}
      <div className="manual-view-header">
        <button type="button" className="back-btn" onClick={() => setIsFormOpen(false)}>
          <ChevronLeft size={18} />
          Back to Ride Pool
        </button>
        <div className="mt-3">
          <h1 className="page-title">{editingRide ? 'Edit Manual Ride' : 'Create Manual Ride'}</h1>
          <p className="page-subtitle">Configure customer requirements, route schedule, and pool visibility parameters.</p>
        </div>
      </div>

      <form onSubmit={saveRide} className="manual-view-form-grid">
        {/* Left Column: Customer & Route */}
        <div className="manual-view-column">
          {/* Card 1: Customer Details */}
          <div className="manual-form-card">
            <div className="manual-card-header">
              <User size={18} className="manual-section-icon" />
              <span>Customer Details</span>
            </div>
            <div className="manual-card-content">
              <div className="form-group mb-3">
                <label>PASSENGER NAME <span className="text-danger">*</span></label>
                <input
                  type="text"
                  required
                  className="form-input"
                  placeholder="e.g. Jane Doe"
                  value={manualFormData.passengerName}
                  onChange={e => setManualFormData({ ...manualFormData, passengerName: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>GENDER</label>
                <select
                  className="form-input"
                  value={manualFormData.gender}
                  onChange={e => setManualFormData({ ...manualFormData, gender: e.target.value })}
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
          </div>

          {/* Card 2: Route Information */}
          <div className="manual-form-card mt-4">
            <div className="manual-card-header">
              <MapPin size={18} className="manual-section-icon" />
              <span>Route Information</span>
            </div>
            <div className="manual-card-content">
              <div className="form-group mb-3">
                <label>PICKUP LOCATION <span className="text-danger">*</span></label>
                <select
                  className="form-input"
                  value={manualFormData.pickupLocation}
                  onChange={e => setManualFormData({ ...manualFormData, pickupLocation: e.target.value })}
                  required
                >
                  <option value="Islamabad">Islamabad</option>
                  <option value="Lahore">Lahore</option>
                  <option value="Rawalpindi">Rawalpindi</option>
                  <option value="Karachi">Karachi</option>
                  <option value="Peshawar">Peshawar</option>
                  <option value="Multan">Multan</option>
                  <option value="Faisalabad">Faisalabad</option>
                  <option value="Gujranwala">Gujranwala</option>
                  <option value="Sukkur">Sukkur</option>
                </select>
              </div>
              <div className="form-group">
                <label>DROP-OFF LOCATION <span className="text-danger">*</span></label>
                <select
                  className="form-input"
                  value={manualFormData.dropoffLocation}
                  onChange={e => setManualFormData({ ...manualFormData, dropoffLocation: e.target.value })}
                  required
                >
                  <option value="Lahore">Lahore</option>
                  <option value="Islamabad">Islamabad</option>
                  <option value="Rawalpindi">Rawalpindi</option>
                  <option value="Karachi">Karachi</option>
                  <option value="Peshawar">Peshawar</option>
                  <option value="Multan">Multan</option>
                  <option value="Faisalabad">Faisalabad</option>
                  <option value="Gujranwala">Gujranwala</option>
                  <option value="Sukkur">Sukkur</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Schedule & Requirements & Publish */}
        <div className="manual-view-column">
          {/* Card 3: Schedule with Interactive Watch Trigger */}
          <div className="manual-form-card">
            <div className="manual-card-header">
              <Clock size={18} className="manual-section-icon" />
              <span>Schedule</span>
            </div>
            <div className="manual-card-content">
              <div className="form-group mb-3">
                <label>RIDE DATE <span className="text-secondary text-xs">(LEAVE BLANK FOR MONTHLY)</span></label>
                <div className="manual-date-input-wrap">
                  <input
                    type="text"
                    className="form-input manual-date-field"
                    placeholder="30/08/2026"
                    value={manualFormData.rideDate}
                    onChange={e => setManualFormData({ ...manualFormData, rideDate: e.target.value })}
                  />
                  <Calendar size={18} className="manual-date-icon" />
                </div>
              </div>

              <div className="form-grid-2col">
                {/* Time to Leave */}
                <div className="form-group">
                  <label>TIME TO LEAVE <span className="text-danger">*</span></label>
                  <div className="manual-time-picker-box">
                    <button 
                      type="button" 
                      className="watch-clock-btn" 
                      title="Open Watch Clock Picker"
                      onClick={() => openClockPicker('leave')}
                    >
                      <Clock size={16} />
                    </button>
                    <input
                      type="text"
                      required
                      className="time-value-input"
                      placeholder="08:00"
                      value={manualFormData.leaveTimeValue}
                      onChange={e => setManualFormData({ ...manualFormData, leaveTimeValue: e.target.value })}
                    />
                    <div className="am-pm-segmented-switch">
                      <button
                        type="button"
                        className={`period-btn ${manualFormData.leavePeriod === 'AM' ? 'active' : ''}`}
                        onClick={() => setManualFormData({ ...manualFormData, leavePeriod: 'AM' })}
                      >
                        AM
                      </button>
                      <button
                        type="button"
                        className={`period-btn ${manualFormData.leavePeriod === 'PM' ? 'active' : ''}`}
                        onClick={() => setManualFormData({ ...manualFormData, leavePeriod: 'PM' })}
                      >
                        PM
                      </button>
                    </div>
                  </div>
                </div>

                {/* Time to Reach */}
                <div className="form-group">
                  <label>TIME TO REACH <span className="text-danger">*</span></label>
                  <div className="manual-time-picker-box">
                    <button 
                      type="button" 
                      className="watch-clock-btn" 
                      title="Open Watch Clock Picker"
                      onClick={() => openClockPicker('reach')}
                    >
                      <Clock size={16} />
                    </button>
                    <input
                      type="text"
                      required
                      className="time-value-input"
                      placeholder="09:00"
                      value={manualFormData.reachTimeValue}
                      onChange={e => setManualFormData({ ...manualFormData, reachTimeValue: e.target.value })}
                    />
                    <div className="am-pm-segmented-switch">
                      <button
                        type="button"
                        className={`period-btn ${manualFormData.reachPeriod === 'AM' ? 'active' : ''}`}
                        onClick={() => setManualFormData({ ...manualFormData, reachPeriod: 'AM' })}
                      >
                        AM
                      </button>
                      <button
                        type="button"
                        className={`period-btn ${manualFormData.reachPeriod === 'PM' ? 'active' : ''}`}
                        onClick={() => setManualFormData({ ...manualFormData, reachPeriod: 'PM' })}
                      >
                        PM
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 4: Ride Requirements */}
          <div className="manual-form-card mt-4">
            <div className="manual-card-header">
              <Car size={18} className="manual-section-icon" />
              <span>Ride Requirements</span>
            </div>
            <div className="manual-card-content">
              <div className="form-grid-2col mb-3">
                <div className="form-group">
                  <label>SEATS NEEDED</label>
                  <input
                    type="number"
                    min="1"
                    max="6"
                    className="form-input"
                    value={manualFormData.seatsNeeded}
                    onChange={e => setManualFormData({ ...manualFormData, seatsNeeded: parseInt(e.target.value) || 1 })}
                  />
                </div>
                <div className="form-group">
                  <label>VEHICLE PREFERENCE</label>
                  <select
                    className="form-input"
                    value={manualFormData.vehiclePreference}
                    onChange={e => setManualFormData({ ...manualFormData, vehiclePreference: e.target.value })}
                  >
                    <option value="Sedan">Sedan</option>
                    <option value="Executive">Executive</option>
                    <option value="Mini">Mini</option>
                    <option value="Any">Any</option>
                  </select>
                </div>
              </div>

              {/* Toggles Row */}
              <div className="form-grid-2col">
                <div 
                  className={`manual-toggle-pill ${manualFormData.acRequired ? 'active' : ''}`}
                  onClick={() => setManualFormData({ ...manualFormData, acRequired: !manualFormData.acRequired })}
                >
                  <div className={`switch-knob ${manualFormData.acRequired ? 'on' : ''}`}></div>
                  <span>AC Required</span>
                </div>

                <div 
                  className={`manual-toggle-pill ${manualFormData.oneWay ? 'active' : ''}`}
                  onClick={() => setManualFormData({ ...manualFormData, oneWay: !manualFormData.oneWay })}
                >
                  <div className={`switch-knob ${manualFormData.oneWay ? 'on' : ''}`}></div>
                  <span>One Way</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 5: Publish to Driver Pool */}
          <div className="manual-form-card publish-card mt-4">
            <div className="publish-card-left">
              <h4>Publish to Driver Pool</h4>
              <p>Allow verified drivers to review and bid on this ride</p>
            </div>
            <div 
              className={`main-toggle-switch ${manualFormData.publishToPool ? 'on' : ''}`}
              onClick={() => setManualFormData({ ...manualFormData, publishToPool: !manualFormData.publishToPool })}
            >
              <div className="toggle-slider"></div>
            </div>
          </div>
        </div>

        {/* Full-Width Footer Actions Bar */}
        <div className="manual-view-footer-bar">
          <button 
            type="button" 
            className="manual-cancel-btn" 
            onClick={() => setIsFormOpen(false)}
          >
            Cancel
          </button>
          <button 
            type="submit" 
            className="manual-submit-btn"
          >
            Create Ride Request
          </button>
        </div>
      </form>

      {/* =========================================================================
          INTERACTIVE WATCH / CLOCK TIME PICKER MODAL
          ========================================================================= */}
      {clockPickerTarget && (
        <div className="modal-overlay fade-in" style={{ zIndex: 1200 }} onClick={() => setClockPickerTarget(null)}>
          <div className="glass-panel modal-content watch-clock-modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="watch-header-title">
                <Clock size={20} className="text-primary" />
                <h3>Select Time ({clockPickerTarget === 'leave' ? 'Departure' : 'Arrival'})</h3>
              </div>
              <button type="button" className="icon-btn" onClick={() => setClockPickerTarget(null)}>
                <X size={20} />
              </button>
            </div>

            <div className="watch-clock-body">
              {/* Watch Display */}
              <div className="watch-display-badge">
                <span className="watch-digits">{selectedClockHour}:{selectedClockMinute}</span>
                <span className="watch-period-tag">{selectedClockPeriod}</span>
              </div>

              {/* AM / PM Segment */}
              <div className="watch-period-toggle">
                <button
                  type="button"
                  className={`watch-toggle-btn ${selectedClockPeriod === 'AM' ? 'active' : ''}`}
                  onClick={() => setSelectedClockPeriod('AM')}
                >
                  AM
                </button>
                <button
                  type="button"
                  className={`watch-toggle-btn ${selectedClockPeriod === 'PM' ? 'active' : ''}`}
                  onClick={() => setSelectedClockPeriod('PM')}
                >
                  PM
                </button>
              </div>

              {/* Hours Grid */}
              <div className="watch-section-block">
                <span className="watch-section-label">SELECT HOUR</span>
                <div className="watch-numbers-grid">
                  {['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'].map(h => (
                    <button
                      key={h}
                      type="button"
                      className={`watch-num-btn ${selectedClockHour === h ? 'active' : ''}`}
                      onClick={() => setSelectedClockHour(h)}
                    >
                      {h}
                    </button>
                  ))}
                </div>
              </div>

              {/* Minutes Grid */}
              <div className="watch-section-block mt-3">
                <span className="watch-section-label">SELECT MINUTE</span>
                <div className="watch-numbers-grid minutes">
                  {['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'].map(m => (
                    <button
                      key={m}
                      type="button"
                      className={`watch-num-btn ${selectedClockMinute === m ? 'active' : ''}`}
                      onClick={() => setSelectedClockMinute(m)}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="modal-footer watch-footer">
              <button type="button" className="cancel-btn" onClick={() => setClockPickerTarget(null)}>
                Cancel
              </button>
              <button type="button" className="primary-btn" onClick={applyClockPicker}>
                Set Time
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // View Requests Modal
  const renderRequestsModal = () => (
    <div className="modal-overlay fade-in">
      <div className="glass-panel modal-content lg">
        <div className="modal-header">
          <div>
            <h2>Driver Requests</h2>
            <p className="text-secondary">{viewRequestsRide.route} • {viewRequestsRide.id}</p>
          </div>
          <button className="icon-btn" onClick={() => setViewRequestsRide(null)}><X size={20} /></button>
        </div>
        
        <div className="modal-body p-0">
          {viewRequestsRide.driverRequests.length === 0 ? (
            <div className="empty-state">
              <Users size={32} className="text-secondary mb-3 mx-auto" />
              <p>No drivers have requested this ride yet.</p>
            </div>
          ) : (
            <div className="requests-list">
              {viewRequestsRide.driverRequests.map(req => (
                <div key={req.driverId} className="request-card">
                  <div className="req-driver-info">
                    <div className="avatar-sm">{req.driverName.charAt(0)}</div>
                    <div>
                      <h4>{req.driverName} <span className="rating-badge">⭐ {req.rating}</span></h4>
                      <p className="text-secondary">{req.vehicle}</p>
                    </div>
                  </div>
                  <div className="req-bid">
                    <p className="text-secondary sm">{req.timeRequested}</p>
                    <p className="fw-600 text-primary">{req.proposedFare}</p>
                  </div>
                  <div className="req-action">
                    <button className="accept-btn" onClick={() => acceptDriver(req)}>Accept</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="module-container fade-in">
      {toastMessage && (
        <div className="toast-notification fade-in">
          <CheckCircle size={20} />
          {toastMessage}
        </div>
      )}
      
      {isFormOpen ? (
        renderCreateManualRideView()
      ) : (
        renderDashboard()
      )}

      {viewRequestsRide && renderRequestsModal()}
    </div>
  );
};

export default RidePool;

