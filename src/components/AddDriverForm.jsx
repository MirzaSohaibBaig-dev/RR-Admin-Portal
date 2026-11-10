import React, { useState } from 'react';
import { 
  X, User, CreditCard, Phone, Mail, Lock, FileText, Calendar, 
  Camera, UploadCloud, ChevronRight, ChevronLeft, CheckCircle, Eye, EyeOff, AlertCircle
} from 'lucide-react';
import './AddDriverForm.css';

const AddDriverForm = ({ onClose, onSuccess }) => {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  const [formData, setFormData] = useState({});
  const [images, setImages] = useState({});

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    if (errorMessage) setErrorMessage('');
  };

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
    setErrorMessage('');
    if (step === 1) {
      if (formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword) {
        setErrorMessage('Passwords do not match. Please verify both password fields.');
        return;
      }
      setStep(2);
    } else {
      setIsSubmitting(true);
      setTimeout(() => {
        setIsSubmitting(false);
        onSuccess({ ...formData, images });
      }, 500);
    }
  };

  const renderInputBox = (icon, label, name, placeholder, type = "text", showEye = false) => {
    const isPass = name === 'password';
    const isConfirmPass = name === 'confirmPassword';
    let resolvedType = type;
    if (isPass) resolvedType = showPassword ? 'text' : 'password';
    if (isConfirmPass) resolvedType = showConfirmPassword ? 'text' : 'password';

    const toggleEye = () => {
      if (isPass) setShowPassword(prev => !prev);
      if (isConfirmPass) setShowConfirmPassword(prev => !prev);
    };

    const isVisible = isPass ? showPassword : showConfirmPassword;

    return (
      <div className="custom-input-box">
        <div className="custom-input-icon">{icon}</div>
        <div className="custom-input-content">
          <label>{label}</label>
          <input 
            type={resolvedType} 
            name={name} 
            placeholder={placeholder} 
            required 
            value={formData[name] || ''}
            onChange={handleChange} 
          />
        </div>
        {showEye && (
          <button 
            type="button" 
            className="input-eye-toggle-btn" 
            onClick={toggleEye} 
            tabIndex="-1"
            title={isVisible ? "Hide password" : "Show password"}
          >
            {isVisible ? <EyeOff size={18} className="custom-input-eye" /> : <Eye size={18} className="custom-input-eye" />}
          </button>
        )}
      </div>
    );
  };

  const renderStep1 = () => (
    <div className="form-step fade-in">
      <div className="form-header text-center mb-4">
        <h2>Become a Driver</h2>
        <p className="text-secondary">Let's verify your identity.</p>
      </div>

      <div className="avatar-upload-container">
        <label 
          className={`avatar-upload clickable ${images.profilePhoto ? 'has-image' : ''}`} 
          title="Click to upload profile photo"
        >
          <input 
            type="file" 
            className="d-none" 
            accept="image/*" 
            onChange={(e) => handleImageUpload(e, 'profilePhoto')} 
          />
          {images.profilePhoto ? (
            <img src={images.profilePhoto} alt="Profile Preview" className="avatar-preview-img" />
          ) : (
            <User size={36} color="var(--text-secondary)" />
          )}
          <div className="avatar-edit-icon" title="Upload profile photo">
            <Camera size={14} color="var(--accent-primary)" />
          </div>
        </label>
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

      {errorMessage && (
        <div className="form-error-banner mt-3">
          <AlertCircle size={16} />
          <span>{errorMessage}</span>
        </div>
      )}

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
          <select 
            name="make" 
            required 
            value={formData.make || ''} 
            onChange={handleChange} 
            className="form-input rounded-select"
          >
            <option value="">Select make...</option>
            <option value="Toyota">Toyota</option>
            <option value="Honda">Honda</option>
            <option value="Suzuki">Suzuki</option>
          </select>
        </div>

        <div className="form-group mb-3">
          <label>VEHICLE MODEL</label>
          <select 
            name="model" 
            required 
            value={formData.model || ''} 
            onChange={handleChange} 
            className="form-input rounded-select"
          >
            <option value="">Select model...</option>
            <option value="Corolla">Corolla</option>
            <option value="Civic">Civic</option>
            <option value="Mehran">Mehran</option>
          </select>
        </div>

        <div className="form-group mb-3">
          <label>VARIANT</label>
          <select 
            name="variant" 
            required 
            value={formData.variant || ''} 
            onChange={handleChange} 
            className="form-input rounded-select"
          >
            <option value="">Select variant...</option>
            <option value="GLI">GLI</option>
            <option value="XLI">XLI</option>
            <option value="VXL">VXL</option>
          </select>
        </div>

        <div className="form-group mb-3">
          <label>SEATING CAPACITY</label>
          <input 
            type="number" 
            name="capacity" 
            placeholder="e.g. 5" 
            required 
            value={formData.capacity || ''} 
            onChange={handleChange} 
            className="form-input rounded-select" 
          />
        </div>

        <div className="form-group mb-3">
          <label>REGISTRATION / NUMBER PLATE</label>
          <input 
            type="text" 
            name="plate" 
            placeholder="E.G. ISB-1234" 
            required 
            value={formData.plate || ''} 
            onChange={handleChange} 
            className="form-input rounded-select" 
          />
        </div>

        <div className="form-group mb-4">
          <label>VEHICLE COLOR</label>
          <select 
            name="color" 
            required 
            value={formData.color || ''} 
            onChange={handleChange} 
            className="form-input rounded-select"
          >
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

      <div className="d-flex gap-2 mt-4">
        <button 
          type="button" 
          className="btn-secondary w-50 justify-content-center" 
          onClick={() => setStep(1)}
          disabled={isSubmitting}
        >
          <ChevronLeft size={18} /> Back to Personal Info
        </button>
        <button 
          type="submit" 
          className="btn-primary w-50 justify-content-center" 
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Saving...' : 'SAVE & CONTINUE'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="add-driver-overlay fade-in">
      <div className="add-driver-modal">
        <div className="modal-top">
          <button 
            type="button"
            className="icon-btn back-arrow-btn" 
            onClick={() => {
              if (step === 2) {
                setStep(1);
              } else {
                onClose();
              }
            }}
            title={step === 2 ? "Back to Step 1" : "Close"}
          >
            <ChevronLeft size={24} />
          </button>
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
