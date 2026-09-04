import React from 'react';
import { Clock, Calendar, Zap, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import './DriverAvailability.css';

const ALL_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const DriverAvailability = ({ availability }) => {
  if (!availability || !availability.slots || availability.slots.length === 0) {
    return (
      <div className="availability-card-wrap empty-availability-state">
        <div className="availability-card-header">
          <div className="header-title-flex">
            <Clock size={18} className="text-secondary" />
            <h4 className="availability-main-title">Driver Working Schedule & Availability</h4>
          </div>
          <span className="not-configured-tag">Not Configured</span>
        </div>
        <p className="no-availability-text">
          No custom availability slots set by this driver yet. Driver operates on standard on-demand transit.
        </p>
      </div>
    );
  }

  const { scheduleType = 'same', specificDays = [], slots = [] } = availability;
  const isSameEveryDay = scheduleType === 'same';

  return (
    <div className="availability-card-wrap">
      {/* Header */}
      <div className="availability-card-header">
        <div className="header-title-flex">
          <Clock size={18} className="text-primary" />
          <h4 className="availability-main-title">Driver Working Schedule & Availability</h4>
        </div>
        <span className="schedule-type-badge">
          {isSameEveryDay ? '🔄 Same Slots Every Day' : '📅 Different Slots Per Day'}
        </span>
      </div>

      {/* Specific Days Matrix */}
      <div className="availability-days-section">
        <span className="section-mini-label">ACTIVE WORKING DAYS:</span>
        <div className="days-pills-row">
          {ALL_DAYS.map(day => {
            const isDayActive = isSameEveryDay || (specificDays && specificDays.includes(day));
            return (
              <div 
                key={day} 
                className={`day-status-pill ${isDayActive ? 'day-active' : 'day-inactive'}`}
                title={isDayActive ? `${day}: Active on schedule` : `${day}: Off-duty`}
              >
                <span>{day}</span>
                {isDayActive ? <CheckCircle2 size={11} className="day-check-icon" /> : <span className="day-off-dot">•</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Time Slots List */}
      <div className="availability-slots-section">
        <div className="slots-header-row">
          <span className="section-mini-label">CONFIGURED TIME WINDOWS:</span>
          <span className="slots-count-pill">{slots.length} Slot{slots.length > 1 ? 's' : ''} Added</span>
        </div>

        <div className="slots-grid-list">
          {slots.map((slot, idx) => {
            const isFlex = slot.isFlexible || slot.timeText?.toLowerCase().includes('flexible') || slot.timeText?.toLowerCase().includes('drop-off');
            const isActive = slot.isActive !== false;

            return (
              <div key={slot._id || slot.id || idx} className={`time-slot-card ${isFlex ? 'flexible-slot-card' : ''} ${!isActive ? 'inactive-slot-card' : ''}`}>
                <div className="slot-card-left">
                  <div className={`slot-icon-box ${isFlex ? 'icon-flex' : 'icon-standard'}`}>
                    {isFlex ? <Zap size={16} /> : <Clock size={16} />}
                  </div>
                  <div className="slot-meta-text">
                    <span className="slot-time-string">{slot.timeText || 'Standard Shift'}</span>
                    <span className="slot-index-label">Slot {idx + 1}</span>
                  </div>
                </div>

                <div className="slot-badges-right">
                  {isFlex && (
                    <span className="slot-badge badge-flexible">
                      <Zap size={11} />
                      <span>Flexible</span>
                    </span>
                  )}
                  {isActive ? (
                    <span className="slot-badge badge-active">
                      <CheckCircle2 size={11} />
                      <span>Active</span>
                    </span>
                  ) : (
                    <span className="slot-badge badge-inactive">
                      <XCircle size={11} />
                      <span>Inactive</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DriverAvailability;
