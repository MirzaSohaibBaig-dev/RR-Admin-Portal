import React, { useState } from 'react';
import { 
  X, User, CreditCard, Phone, Mail, Lock, FileText, Calendar, 
  Camera, UploadCloud, ChevronRight, ChevronLeft, CheckCircle, Eye, AlertCircle
} from 'lucide-react';
import './AddDriverForm.css';

const AddDriverForm = ({ onClose, onSuccess }) => {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({});
  const [images, setImages] = useState({});

  const handleChange = (e) => setFormData({...formData, [e.target.name]: e.target.value});

  const handleImageUpload = (e, key) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImages(prev => ({...prev, [key]: reader.result}));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (step === 1) {
      setStep(2);
    } else {
      setIsSubmitting(true);
      setTimeout(() => {
        setIsSubmitting(false);
        onSuccess(formData);
      }, 1000);
    }
  };

  const renderInputBox = (icon, label, name, placeholder, type = "text", showEye = false) => (
    <div className="custom-input-box">
      <div className="custom-input-icon">{icon}</div>
      <div className="custom-input-content">
        <label>{label}</label>
        <input 
          type={type} 
          name={name} 
          placeholder={placeholder} 
          required 
          onChange={handleChange} 
        />
      </div>
      {showEye && <Eye size={18} className="custom-input-eye" />}
    </div>
  );

  const renderStep1 = () => (
    <div className="form-step fade-in">
      <div className="form-header text-center mb-4">
        <h2>Become a Driver</h2>
        <p className="text-secondary">Let's verify your identity.</p>
      </div>

      <div className="avatar-upload-container">
        <div className="avatar-upload">
          <User size={32} color="var(--text-secondary)" />
          <div className="avatar-edit-icon"><Camera size={14} /></div>
        </div>
      </div>

      <div className="form-grid">
        {renderInputBox(<User size={20} />, "FULL NAME", "fullName", "Ali Hassan")}
        {renderInputBox(<CreditCard size={20} />, "CNIC NUMBER", "cnic", "42101-XXXXXXX-X")}
        {renderInputBox(<Phone size={20} />, "PHONE NUMBER", "phone", "+92 3XX XXXXXXX")}
        {renderInputBox(<Mail size={20} />, "EMAIL", "email", "john@example.com", "email")}
        {renderInputBox(<Lock size={20} />, "PASSWORD", "password", "••••••••", "password", true)}
        {renderInputBox(<Lock size={20} />, "CONFIRM PASSWORD", "confirmPassword", "••••••••", "password", true)}
        {renderInputBox(<FileText size={20} />, "DRIVING LICENSE NUMBER", "license", "Enter license number")}
        {renderInputBox(<Calendar size={20} />, "LICENSE EXPIRY DATE", "expiry", "DD/MM/YYYY")}
      </div>

      <div className="document-upload-grid mt-4">
        {[
          { key: 'cnic_front', label: 'CNIC FRONT' },
          { key: 'cnic_back', label: 'CNIC BACK' },
          { key: 'license_front', label: 'LICENSE FRONT' },
          { key: 'license_back', label: 'LICENSE BACK' }
        ].map((doc) => (
          <label key={doc.key} className="upload-box-dashed clickable">
            <input type="file" className="d-none" accept="image/*" onChange={(e) => handleImageUpload(e, doc.key)} />
            {images[doc.key] ? (
              <img src={images[doc.key]} alt={doc.label} className="upload-preview" />
            ) : (
              <>
                <span>UPLOAD PHOTO</span>
                <small>Click to upload or capture</small>
                <FileText size={16} className="doc-icon" />
              </>
            )}
            <div className="doc-label">{doc.label}</div>
          </label>
        ))}
      </div>

      <div className="info-box mt-4">
        <AlertCircle size={16} className="flex-shrink-0" />
        <span>Ensure all photos are clear and taken in good lighting for faster verification.</span>
      </div>

      <button type="submit" className="btn-primary w-100 mt-4 justify-content-center">
        Verify & Continue <ChevronRight size={18} />
      </button>
    </div>
  );

  const renderStep2 = () => (
    <div className="form-step fade-in">
      <div className="form-grid">
        <div className="form-group mb-3">
          <label>VEHICLE MAKE</label>
          <select name="make" required onChange={handleChange} className="form-input rounded-select">
            <option value="">Select make...</option>
            <option value="Toyota">Toyota</option>
            <option value="Honda">Honda</option>
            <option value="Suzuki">Suzuki</option>
          </select>
        </div>

        <div className="form-group mb-3">
          <label>VEHICLE MODEL</label>
          <select name="model" required onChange={handleChange} className="form-input rounded-select">
            <option value="">Select model...</option>
            <option value="Corolla">Corolla</option>
            <option value="Civic">Civic</option>
            <option value="Mehran">Mehran</option>
          </select>
        </div>

        <div className="form-group mb-3">
          <label>VARIANT</label>
          <select name="variant" required onChange={handleChange} className="form-input rounded-select">
            <option value="">Select variant...</option>
            <option value="GLI">GLI</option>
            <option value="XLI">XLI</option>
            <option value="VXL">VXL</option>
          </select>
        </div>

        <div className="form-group mb-3">
          <label>SEATING CAPACITY</label>
          <input type="number" name="capacity" placeholder="e.g. 5" required onChange={handleChange} className="form-input rounded-select" />
        </div>

        <div className="form-group mb-3">
          <label>REGISTRATION / NUMBER PLATE</label>
          <input type="text" name="plate" placeholder="E.G. ISB-1234" required onChange={handleChange} className="form-input rounded-select" />
        </div>

        <div className="form-group mb-4">
          <label>VEHICLE COLOR</label>
          <select name="color" required onChange={handleChange} className="form-input rounded-select">
            <option value="">Select color...</option>
            <option value="White">White</option>
            <option value="Black">Black</option>
            <option value="Silver">Silver</option>
          </select>
        </div>
      </div>

      <div className="form-group mb-4">
        <label>VEHICLE IDENTIFICATION CARD</label>
        <label className="upload-box-light lg text-center clickable">
          <input type="file" className="d-none" accept="image/*" onChange={(e) => handleImageUpload(e, 'vehicle_id')} />
          {images.vehicle_id ? (
            <img src={images.vehicle_id} alt="Vehicle ID" className="upload-preview-lg" />
          ) : (
            <>
              <FileText size={32} className="mb-2 text-primary mx-auto" />
              <strong className="d-block text-primary">Upload File</strong>
              <small className="text-secondary">(PNG supported)</small>
            </>
          )}
        </label>
      </div>

      <div className="form-group mb-4">
        <label>Upload Vehicle Images</label>
        <p className="text-secondary sm-text mb-2">Please upload clear photos of your vehicle from the following perspective.</p>
        <label className="upload-box-light text-center front-view-box clickable">
          <input type="file" className="d-none" accept="image/*" onChange={(e) => handleImageUpload(e, 'vehicle_front')} />
          {images.vehicle_front ? (
            <img src={images.vehicle_front} alt="Front View" className="upload-preview-lg" />
          ) : (
            <>
              <UploadCloud size={24} className="mb-2 text-primary mx-auto" />
              <strong className="d-block text-primary">Front View</strong>
              <Camera size={16} className="camera-icon-corner" />
            </>
          )}
        </label>
      </div>

      <div className="d-flex gap-2">
        <button type="submit" className="btn-primary w-100 justify-content-center" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : 'SAVE & CONTINUE'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="add-driver-overlay fade-in">
      <div className="add-driver-modal">
        <div className="modal-top">
          <button className="icon-btn back-arrow-btn" onClick={onClose}><ChevronLeft size={24} /></button>
          <h3>Driver Registration</h3>
          <div style={{ width: 24 }}></div> {/* Spacer for centering */}
        </div>
        
        <div className="stepper-container">
          <div className={`step ${step >= 1 ? 'active' : ''}`}>
            <div className="step-circle">{step > 1 ? <CheckCircle size={16}/> : '1'}</div>
            <span>PERSONAL INFO</span>
          </div>
          <div className={`step-line ${step === 2 ? 'active' : ''}`}></div>
          <div className={`step ${step >= 2 ? 'active' : ''}`}>
            <div className="step-circle">2</div>
            <span>VEHICLE INFO</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="form-scroll-area">
          {step === 1 ? renderStep1() : renderStep2()}
        </form>
      </div>
    </div>
  );
};

export default AddDriverForm;
