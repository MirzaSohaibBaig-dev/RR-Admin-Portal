import React, { useState } from 'react';
import { 
  Users, CheckCircle, XCircle, Activity, Plus, Eye, ChevronLeft
} from 'lucide-react';
import { initialDrivers } from '../utils/mockData';
import AddDriverForm from '../components/AddDriverForm';
import './DriverApproval.css';

const DriverApproval = () => {
  const [drivers, setDrivers] = useState(initialDrivers);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [isAddDriverOpen, setIsAddDriverOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  
  const [activeTab, setActiveTab] = useState('Pending'); // Pending, Approved, Rejected

  // Stats calculation
  const pendingCount = drivers.filter(d => d.status === 'Pending').length;
  const approvedCount = drivers.filter(d => d.status === 'Approved').length;
  const rejectedCount = drivers.filter(d => d.status === 'Rejected').length;
  const totalProcessed = approvedCount + rejectedCount;
  const approvalRate = totalProcessed === 0 ? 0 : Math.round((approvedCount / totalProcessed) * 100);

  // Filtering for tabs
  const filteredDrivers = drivers.filter(d => d.status === activeTab);

  // Handle Approve / Reject
  const handleAction = (id, action) => {
    setDrivers(drivers.map(d => {
      if (d.id === id) {
        return { ...d, status: action === 'approve' ? 'Approved' : 'Rejected' };
      }
      return d;
    }));
    
    setToastMessage(`Driver ${action === 'approve' ? 'approved' : 'rejected'}. Notification sent.`);
    setTimeout(() => setToastMessage(''), 3000);
    setSelectedDriver(null);
  };

  const renderKPIs = () => (
    <div className="driver-kpi-grid">
      <div className={`driver-kpi-card ${activeTab === 'Pending' ? 'active' : ''}`} onClick={() => setActiveTab('Pending')}>
        <div className="kpi-content">
          <div className="kpi-label">Pending Applications</div>
          <div className="kpi-value text-warning">{pendingCount}</div>
        </div>
        <div className="kpi-icon-soft bg-warning-light text-warning">
          <Users size={20} />
        </div>
      </div>
      
      <div className={`driver-kpi-card ${activeTab === 'Approved' ? 'active' : ''}`} onClick={() => setActiveTab('Approved')}>
        <div className="kpi-content">
          <div className="kpi-label">Approved Drivers</div>
          <div className="kpi-value text-success">{approvedCount}</div>
        </div>
        <div className="kpi-icon-soft bg-success-light text-success">
          <CheckCircle size={20} />
        </div>
      </div>
      
      <div className={`driver-kpi-card ${activeTab === 'Rejected' ? 'active' : ''}`} onClick={() => setActiveTab('Rejected')}>
        <div className="kpi-content">
          <div className="kpi-label">Rejected Drivers</div>
          <div className="kpi-value text-danger">{rejectedCount}</div>
        </div>
        <div className="kpi-icon-soft bg-danger-light text-danger">
          <XCircle size={20} />
        </div>
      </div>

      <div className="driver-kpi-card">
        <div className="kpi-content">
          <div className="kpi-label">Approval Rate</div>
          <div className="kpi-value text-primary">{approvalRate}%</div>
        </div>
        <div className="kpi-icon-soft bg-primary-light text-primary">
          <Activity size={20} />
        </div>
      </div>
    </div>
  );

  const renderList = () => (
    <div className="driver-list-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Driver Approval</h1>
          <p className="page-subtitle">Review, verify, approve, or reject driver applications.</p>
        </div>
        <button className="primary-btn" onClick={() => setIsAddDriverOpen(true)}>
          <Plus size={16} />
          <span>Register Driver</span>
        </button>
      </div>

      {renderKPIs()}

      <div className="table-container-card">
        <div className="table-tabs">
          <button 
            className={`tab-btn ${activeTab === 'Pending' ? 'active' : ''}`}
            onClick={() => setActiveTab('Pending')}
          >
            Pending <span className="badge">{pendingCount}</span>
          </button>
          <button 
            className={`tab-btn ${activeTab === 'Approved' ? 'active' : ''}`}
            onClick={() => setActiveTab('Approved')}
          >
            Approved
          </button>
          <button 
            className={`tab-btn ${activeTab === 'Rejected' ? 'active' : ''}`}
            onClick={() => setActiveTab('Rejected')}
          >
            Rejected
          </button>
        </div>

        <div className="table-content">
          {filteredDrivers.length === 0 ? (
            <div className="empty-state">
              <p>No {activeTab.toLowerCase()} drivers found.</p>
            </div>
          ) : (
            <table className="clean-table">
              <colgroup>
                <col style={{width: '110px'}} />
                <col style={{width: '220px'}} />
                <col style={{width: '110px'}} />
                <col style={{width: '150px'}} />
                <col style={{width: '120px'}} />
                <col style={{width: '110px'}} />
              </colgroup>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Driver Name</th>
                  <th>City</th>
                  <th>Registration Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDrivers.map(driver => (
                  <tr key={driver.id}>
                    <td className="fw-500">{driver.id}</td>
                    <td>
                      <div className="driver-name-cell">
                        <div className="avatar-sm">{driver.personalInfo.name.charAt(0)}</div>
                        <div>
                          <div className="name">{driver.personalInfo.name}</div>
                          <div className="subtext">{driver.personalInfo.phone}</div>
                        </div>
                      </div>
                    </td>
                    <td>{driver.personalInfo.city}</td>
                    <td>{driver.personalInfo.joinDate}</td>
                    <td>
                      <span className={`status-badge ${driver.status.toLowerCase()}`}>
                        {driver.status}
                      </span>
                    </td>
                    <td>
                      <button 
                        className="action-btn text-primary" 
                        onClick={() => setSelectedDriver(driver)}
                        title="View Details"
                      >
                        <Eye size={16} />
                        <span>View Details</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );

  const renderDetails = () => (
    <div className="driver-details-container">
      <button className="back-btn" onClick={() => setSelectedDriver(null)}>
        <ChevronLeft size={18} />
        Back to Approvals
      </button>

      <div className="details-card">
        {/* ── Profile Header ── */}
        <div className="details-header">
          <div className="driver-profile-main">
            <div className="avatar-lg">{selectedDriver.personalInfo.name.charAt(0)}</div>
            <div>
              <h2>{selectedDriver.personalInfo.name}</h2>
              <p>{selectedDriver.id} &bull; {selectedDriver.personalInfo.city}</p>
            </div>
          </div>
          <span className={`status-badge lg ${selectedDriver.status.toLowerCase()}`}>
            {selectedDriver.status}
          </span>
        </div>

        {/* ── Performance Stats Row ── */}
        <div className="driver-stats-row">
          <div className="driver-stat-item">
            <span className="stat-label">Rating</span>
            <span className="stat-value text-warning">⭐ {selectedDriver.performance.rating}</span>
          </div>
          <div className="driver-stat-item">
            <span className="stat-label">Total Rides</span>
            <span className="stat-value text-primary">{selectedDriver.performance.totalRides}</span>
          </div>
          <div className="driver-stat-item">
            <span className="stat-label">Cancellation Rate</span>
            <span className="stat-value text-danger">{selectedDriver.performance.cancellationRate}</span>
          </div>
          <div className="driver-stat-item">
            <span className="stat-label">Availability</span>
            <span className={`stat-value ${selectedDriver.availability === 'Available' ? 'text-success' : 'text-warning'}`}>
              {selectedDriver.availability}
            </span>
          </div>
        </div>

        {/* ── Info Sections Grid ── */}
        <div className="details-grid">
          <div className="details-section">
            <h3>Personal Information</h3>
            <div className="info-list">
              <div className="info-item">
                <span className="label">Phone</span>
                <span className="value">{selectedDriver.personalInfo.phone}</span>
              </div>
              <div className="info-item">
                <span className="label">Email</span>
                <span className="value">{selectedDriver.personalInfo.email}</span>
              </div>
              <div className="info-item">
                <span className="label">City</span>
                <span className="value">{selectedDriver.personalInfo.city}</span>
              </div>
              <div className="info-item">
                <span className="label">Join Date</span>
                <span className="value">{selectedDriver.personalInfo.joinDate}</span>
              </div>
            </div>
          </div>

          <div className="details-section">
            <h3>Vehicle Information</h3>
            <div className="info-list">
              <div className="info-item">
                <span className="label">Make & Model</span>
                <span className="value">{selectedDriver.vehicleInfo.make} {selectedDriver.vehicleInfo.model}</span>
              </div>
              <div className="info-item">
                <span className="label">Year</span>
                <span className="value">{selectedDriver.vehicleInfo.year}</span>
              </div>
              <div className="info-item">
                <span className="label">Color</span>
                <span className="value">{selectedDriver.vehicleInfo.color}</span>
              </div>
              <div className="info-item">
                <span className="label">Category</span>
                <span className="value">{selectedDriver.vehicleInfo.category} {selectedDriver.vehicleInfo.ac ? '(AC)' : '(Non-AC)'}</span>
              </div>
              <div className="info-item">
                <span className="label">Plate No.</span>
                <span className="value">{selectedDriver.vehicleInfo.plateNumber}</span>
              </div>
            </div>
          </div>

          <div className="details-section">
            <h3>Documents Status</h3>
            <div className="info-list">
              <div className="info-item">
                <span className="label">License</span>
                <span className="value text-success">{selectedDriver.documents.license}</span>
              </div>
              <div className="info-item">
                <span className="label">ID Card</span>
                <span className="value text-success">{selectedDriver.documents.idCard}</span>
              </div>
              <div className="info-item">
                <span className="label">Background</span>
                <span className="value text-success">{selectedDriver.documents.backgroundCheck}</span>
              </div>
            </div>

            <h3 style={{marginTop: '1.5rem'}}>Preferred Routes</h3>
            <div className="info-list">
              {selectedDriver.preferences.routes.map((r, i) => (
                <div key={i} className="info-item">
                  <span className="label">Route {i + 1}</span>
                  <span className="value">{r}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Uploaded Documents / Images ── */}
        <div className="details-section" style={{padding: '1.5rem 2rem', borderTop: '1px solid var(--border-color)'}}>
          <h3>Uploaded Documents & Photos</h3>
          <div className="driver-docs-grid">
            <div className="driver-doc-card">
              <div className="doc-img-placeholder">
                <span>👤</span>
              </div>
              <span className="doc-card-label">Profile Photo</span>
            </div>
            <div className="driver-doc-card">
              <div className="doc-img-placeholder">
                <span>🚗</span>
              </div>
              <span className="doc-card-label">Vehicle Photo</span>
            </div>
            <div className="driver-doc-card">
              <div className="doc-img-placeholder">
                <span>🪪</span>
              </div>
              <span className="doc-card-label">Driver License</span>
            </div>
            <div className="driver-doc-card">
              <div className="doc-img-placeholder">
                <span>📋</span>
              </div>
              <span className="doc-card-label">CNIC / ID Card</span>
            </div>
          </div>
        </div>

        {/* ── Action Buttons ── */}
        {selectedDriver.status === 'Pending' && (
          <div className="details-actions">
            <button className="reject-btn" onClick={() => handleAction(selectedDriver.id, 'reject')}>
              <XCircle size={16} /> Reject Application
            </button>
            <button className="approve-btn" onClick={() => handleAction(selectedDriver.id, 'approve')}>
              <CheckCircle size={16} /> Approve Driver
            </button>
          </div>
        )}
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
      
      {!selectedDriver && !isAddDriverOpen && renderList()}
      {selectedDriver && !isAddDriverOpen && renderDetails()}
      
      {isAddDriverOpen && (
        <AddDriverForm 
          onClose={() => setIsAddDriverOpen(false)}
          onSuccess={(data) => {
            setIsAddDriverOpen(false);
            setToastMessage('New driver successfully registered!');
            // In a real app, we'd add to state here
            setTimeout(() => setToastMessage(''), 3000);
          }}
        />
      )}
    </div>
  );
};

export default DriverApproval;
