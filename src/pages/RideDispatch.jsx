import React, { useState, useMemo } from 'react';
import { 
  MapPin, Clock, Car, Filter, Star, CheckCircle, Search, ChevronLeft, Map, Wind
} from 'lucide-react';
import { initialDrivers, initialRideRequests } from '../utils/mockData';
import './RideDispatch.css';

const RideDispatch = () => {
  const [rideRequests, setRideRequests] = useState(initialRideRequests);
  const [selectedRide, setSelectedRide] = useState(null);
  
  // Filtering state for Driver Selection
  const [filterAC, setFilterAC] = useState('all'); // all, ac, non-ac
  const [filterCategory, setFilterCategory] = useState('all'); // all, Executive, Sedan, Mini
  const [searchRoute, setSearchRoute] = useState('');
  
  const [toastMessage, setToastMessage] = useState('');

  // 1. Handle Selection of a Ride Request
  const handleSelectRide = (ride) => {
    setSelectedRide(ride);
    // Pre-fill the route search to auto-match drivers for this ride
    setSearchRoute(ride.route);
    
    // Auto-set AC preference if required by passenger
    if (ride.preferences.acRequired) {
      setFilterAC('ac');
    } else {
      setFilterAC('all');
    }

    // Auto-set category preference
    if (ride.preferences.vehicleCategory !== 'Any') {
      setFilterCategory(ride.preferences.vehicleCategory);
    } else {
      setFilterCategory('all');
    }
  };

  // 2. Handle Dispatch
  const handleDispatch = (driver) => {
    setRideRequests(rideRequests.map(r => 
      r.id === selectedRide.id ? { ...r, status: 'Dispatched to ' + driver.personalInfo.name } : r
    ));
    
    setToastMessage(`Ride successfully dispatched to ${driver.personalInfo.name}`);
    setTimeout(() => setToastMessage(''), 3000);
    setSelectedRide(null); // Go back to list
  };

  // Filter Drivers based on selected criteria
  const availableDrivers = useMemo(() => {
    // Start with ONLY Approved & Available drivers
    let filtered = initialDrivers.filter(
      d => d.status === 'Approved' && d.availability === 'Available'
    );

    // Apply Route Filter
    if (searchRoute) {
      filtered = filtered.filter(d => 
        d.preferences.routes.some(route => route.toLowerCase().includes(searchRoute.toLowerCase()))
      );
    }

    // Apply AC Filter
    if (filterAC === 'ac') {
      filtered = filtered.filter(d => d.vehicleInfo.ac === true);
    } else if (filterAC === 'non-ac') {
      filtered = filtered.filter(d => d.vehicleInfo.ac === false);
    }

    // Apply Category Filter
    if (filterCategory !== 'all') {
      filtered = filtered.filter(d => d.vehicleInfo.category === filterCategory);
    }

    // Sort by rating highest to lowest
    return filtered.sort((a, b) => b.performance.rating - a.performance.rating);
  }, [searchRoute, filterAC, filterCategory]);


  // View 1: List of Pending Rides
  const renderRideRequests = () => (
    <div className="ride-list-container fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Ride Dispatch</h1>
          <p className="page-subtitle">Select pending ride requests and dispatch them to the most suitable drivers.</p>
        </div>
      </div>

      <div className="requests-grid">
        {rideRequests.map(ride => (
          <div key={ride.id} className="glass-panel ride-card">
            <div className="ride-card-header">
              <span className="ride-id">{ride.id}</span>
              <span className={`status-badge ${ride.status === 'Pending Dispatch' ? 'pending' : 'approved'}`}>
                {ride.status}
              </span>
            </div>
            
            <div className="ride-card-body">
              <div className="ride-info">
                <MapPin size={16} className="text-secondary" />
                <span className="route-text">{ride.route}</span>
              </div>
              <div className="ride-info">
                <Clock size={16} className="text-secondary" />
                <span>{ride.date}</span>
              </div>
              <div className="ride-info">
                <Car size={16} className="text-secondary" />
                <span>Prefs: {ride.preferences.vehicleCategory} | {ride.preferences.acRequired ? 'AC' : 'Any'}</span>
              </div>
            </div>

            <div className="ride-card-footer">
              <span className="fare-text">{ride.fare}</span>
              {ride.status === 'Pending Dispatch' && (
                <button className="primary-btn sm-btn" onClick={() => handleSelectRide(ride)}>
                  Find Driver
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // View 2: Driver Selection Screen
  const renderDriverSelection = () => (
    <div className="driver-selection-container fade-in">
      <div className="page-header">
        <button className="back-btn" onClick={() => setSelectedRide(null)}>
          <ChevronLeft size={20} />
          <span>Back to Requests</span>
        </button>
        <h1 className="page-title">Dispatching {selectedRide.id}</h1>
      </div>

      <div className="selection-layout">
        {/* Left Sidebar: Filters & Ride Details */}
        <div className="selection-sidebar">
          <div className="glass-panel summary-panel">
            <h3>Passenger Request</h3>
            <div className="summary-route">
              <MapPin size={18} className="text-accent" />
              <span>{selectedRide.route}</span>
            </div>
            <p className="summary-date">{selectedRide.date}</p>
            
            <div className="summary-prefs">
              <span className="pref-tag">{selectedRide.preferences.vehicleCategory}</span>
              {selectedRide.preferences.acRequired && <span className="pref-tag">AC Required</span>}
            </div>
          </div>

          <div className="glass-panel filter-panel">
            <div className="filter-header">
              <Filter size={18} />
              <h3>Smart Filters</h3>
            </div>
            
            <div className="filter-group">
              <label>Search Route</label>
              <div className="search-input-wrapper">
                <Search size={16} className="search-icon" />
                <input 
                  type="text" 
                  value={searchRoute}
                  onChange={(e) => setSearchRoute(e.target.value)}
                  placeholder="e.g. Lahore -> Multan"
                />
              </div>
            </div>

            <div className="filter-group">
              <label>Vehicle Category</label>
              <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
                <option value="all">Any Category</option>
                <option value="Executive">Executive</option>
                <option value="Sedan">Sedan</option>
                <option value="Mini">Mini</option>
              </select>
            </div>

            <div className="filter-group">
              <label>AC Preference</label>
              <div className="radio-group">
                <button 
                  className={`radio-btn ${filterAC === 'all' ? 'active' : ''}`}
                  onClick={() => setFilterAC('all')}
                >All</button>
                <button 
                  className={`radio-btn ${filterAC === 'ac' ? 'active' : ''}`}
                  onClick={() => setFilterAC('ac')}
                >AC Only</button>
                <button 
                  className={`radio-btn ${filterAC === 'non-ac' ? 'active' : ''}`}
                  onClick={() => setFilterAC('non-ac')}
                >Non-AC</button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Area: Driver Results */}
        <div className="driver-results-area">
          <div className="results-header">
            <h2>Suggested Drivers</h2>
            <span className="results-count">{availableDrivers.length} Available</span>
          </div>

          {availableDrivers.length === 0 ? (
            <div className="empty-state glass-panel">
              <Car size={48} className="text-secondary mb-3" />
              <h3>No Drivers Found</h3>
              <p>No available drivers match your current filter criteria.</p>
              <button className="outline-btn mt-3" onClick={() => {
                setSearchRoute('');
                setFilterAC('all');
                setFilterCategory('all');
              }}>Clear Filters</button>
            </div>
          ) : (
            <div className="drivers-list">
              {availableDrivers.map(driver => (
                <div key={driver.id} className="glass-panel driver-match-card">
                  
                  <div className="driver-match-main">
                    <div className="driver-avatar-lg">
                      {driver.personalInfo.name.charAt(0)}
                    </div>
                    <div className="driver-match-info">
                      <h4>{driver.personalInfo.name}</h4>
                      <p className="driver-car">{driver.vehicleInfo.make} {driver.vehicleInfo.model} • {driver.vehicleInfo.color}</p>
                      <div className="driver-tags">
                        <span className="tag category-tag">{driver.vehicleInfo.category}</span>
                        {driver.vehicleInfo.ac ? (
                          <span className="tag ac-tag"><Wind size={12} /> AC</span>
                        ) : (
                          <span className="tag non-ac-tag">Non-AC</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="driver-match-stats">
                    <div className="stat-block">
                      <div className="stat-value rating-val">
                        {driver.performance.rating} <Star size={14} fill="#F59E0B" color="#F59E0B" />
                      </div>
                      <div className="stat-label">Rating</div>
                    </div>
                    <div className="stat-block">
                      <div className="stat-value">{driver.performance.totalRides}</div>
                      <div className="stat-label">Total Rides</div>
                    </div>
                    <div className="stat-block">
                      <div className="stat-value">{driver.performance.cancellationRate}</div>
                      <div className="stat-label">Cancel %</div>
                    </div>
                  </div>

                  <div className="driver-match-action">
                    <button className="dispatch-btn" onClick={() => handleDispatch(driver)}>
                      Dispatch Ride
                    </button>
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
    <div className="module-container">
      {toastMessage && (
        <div className="toast-notification fade-in">
          <CheckCircle size={20} />
          {toastMessage}
        </div>
      )}
      
      {!selectedRide ? renderRideRequests() : renderDriverSelection()}
    </div>
  );
};

export default RideDispatch;
