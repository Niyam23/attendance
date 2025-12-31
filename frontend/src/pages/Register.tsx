import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserPlus, User, Mail, Lock, Phone } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import './Auth.css';

interface FormData {
  name: string;
  email: string;
  mobileNumber: string;
  password: string;
  confirmPassword: string;
  otp: string;
  role: 'employee' | 'admin';
  registrationType: 'email' | 'mobile';
}

interface Errors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  mobileNumber?: string;
  otp?: string;
}

const Register: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    mobileNumber: '',
    password: '',
    confirmPassword: '',
    otp: '',
    role: 'employee',
    registrationType: 'email'
  });
  const [errors, setErrors] = useState<Errors>({});
  const [sendingOtp, setSendingOtp] = useState<boolean>(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>): void => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: '' });
  };

  const handleSendOtp = async (): Promise<void> => {
    if (!formData.mobileNumber || !/^[0-9]{10}$/.test(formData.mobileNumber)) {
      toast.error('Please enter a valid 10-digit mobile number');
      return;
    }

    setSendingOtp(true);
    try {
      const response = await axios.post('http://localhost:5000/api/otp/send', {
        mobileNumber: formData.mobileNumber
      });
      if (response.data.success) {
        toast.success('OTP sent to your mobile number!');
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to send OTP';
      toast.error(message);
    } finally {
      setSendingOtp(false);
    }
  };

  const validate = (): Errors => {
    const newErrors: Errors = {};
    if (!formData.name) {
      newErrors.name = 'Name is required';
    }

    if (formData.registrationType === 'email') {
      if (!formData.email) {
        newErrors.email = 'Email is required';
      } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
        newErrors.email = 'Email is invalid';
      }
      if (!formData.password) {
        newErrors.password = 'Password is required';
      } else if (formData.password.length < 6) {
        newErrors.password = 'Password must be at least 6 characters';
      }
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    } else {
      if (!formData.mobileNumber) {
        newErrors.mobileNumber = 'Mobile number is required';
      } else if (!/^[0-9]{10}$/.test(formData.mobileNumber)) {
        newErrors.mobileNumber = 'Mobile number must be 10 digits';
      }
      if (!formData.otp) {
        newErrors.otp = 'OTP is required';
      } else if (!/^[0-9]{4}$/.test(formData.otp)) {
        newErrors.otp = 'OTP must be 4 digits';
      }
    }

    return newErrors;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    const result = await register(
      formData.name,
      formData.email || null,
      formData.mobileNumber || null,
      formData.password || null,
      formData.otp || null,
      formData.role
    );
    if (result.success) {
      navigate('/dashboard');
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <UserPlus className="auth-icon" />
          <h1>Register</h1>
          <p>Create a new account to get started.</p>
        </div>
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>
              <User size={18} />
              Name
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter your name"
            />
            {errors.name && <span className="error-message">{errors.name}</span>}
          </div>

          <div className="form-group">
            <label>Registration Type</label>
            <select
              name="registrationType"
              value={formData.registrationType}
              onChange={handleChange}
              style={{ width: '100%', padding: '12px', border: '2px solid #e0e0e0', borderRadius: '8px', fontSize: '16px' }}
            >
              <option value="email">Register with Email</option>
              <option value="mobile">Register with Mobile Number</option>
            </select>
          </div>

          {formData.registrationType === 'email' ? (
            <>
              <div className="form-group">
                <label>
                  <Mail size={18} />
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter your email"
                />
                {errors.email && <span className="error-message">{errors.email}</span>}
              </div>
              <div className="form-group">
                <label>
                  <Lock size={18} />
                  Password
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                />
                {errors.password && <span className="error-message">{errors.password}</span>}
              </div>
              <div className="form-group">
                <label>
                  <Lock size={18} />
                  Confirm Password
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirm your password"
                />
                {errors.confirmPassword && <span className="error-message">{errors.confirmPassword}</span>}
              </div>
            </>
          ) : (
            <>
              <div className="form-group">
                <label>
                  <Phone size={18} />
                  Mobile Number
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="tel"
                    name="mobileNumber"
                    value={formData.mobileNumber}
                    onChange={handleChange}
                    placeholder="10-digit mobile number"
                    maxLength={10}
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={sendingOtp || !formData.mobileNumber || !/^[0-9]{10}$/.test(formData.mobileNumber)}
                    className="btn btn-secondary"
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    {sendingOtp ? 'Sending...' : 'Send OTP'}
                  </button>
                </div>
                {errors.mobileNumber && <span className="error-message">{errors.mobileNumber}</span>}
              </div>
              <div className="form-group">
                <label>
                  <Lock size={18} />
                  OTP
                </label>
                <input
                  type="text"
                  name="otp"
                  value={formData.otp}
                  onChange={handleChange}
                  placeholder="Enter 4-digit OTP"
                  maxLength={4}
                />
                {errors.otp && <span className="error-message">{errors.otp}</span>}
              </div>
            </>
          )}
          <div className="form-group">
            <label>
              <User size={18} />
              Role
            </label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              style={{ width: '100%', padding: '12px', border: '2px solid #e0e0e0', borderRadius: '8px', fontSize: '16px' }}
            >
              <option value="employee">Employee</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
            Register
          </button>
        </form>
        <div className="auth-footer">
          <p>
            Already have an account? <Link to="/login">Login here</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;

