import React, { useState } from 'react';
import { User, Mail, Lock, Phone } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

interface RegisterProps {
  onSwitchToSignIn: () => void;
  onRegister: (name: string, email: string | null, mobileNumber: string | null, password: string | null, otp: string | null, role: string) => Promise<{ success: boolean }>;
}

interface RegisterData {
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

const Register: React.FC<RegisterProps> = ({ onSwitchToSignIn, onRegister }) => {
  const [registerData, setRegisterData] = useState<RegisterData>({
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
  const [sendingOtp, setSendingOtp] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setRegisterData({ ...registerData, [name]: value });
    setErrors({ ...errors, [name]: '' });
  };

  const handleSendOtp = async () => {
    if (!registerData.mobileNumber || !/^[0-9]{10}$/.test(registerData.mobileNumber)) {
      toast.error('Please enter a valid 10-digit mobile number');
      return;
    }

    setSendingOtp(true);
    try {
      const response = await axios.post('http://localhost:5000/api/otp/send', {
        mobileNumber: registerData.mobileNumber
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
    if (!registerData.name) {
      newErrors.name = 'Name is required';
    }

    if (registerData.registrationType === 'email') {
      if (!registerData.email) {
        newErrors.email = 'Email is required';
      } else if (!/\S+@\S+\.\S+/.test(registerData.email)) {
        newErrors.email = 'Email is invalid';
      }
      if (!registerData.password) {
        newErrors.password = 'Password is required';
      } else if (registerData.password.length < 6) {
        newErrors.password = 'Password must be at least 6 characters';
      }
      if (registerData.password !== registerData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    } else {
      if (!registerData.mobileNumber) {
        newErrors.mobileNumber = 'Mobile number is required';
      } else if (!/^[0-9]{10}$/.test(registerData.mobileNumber)) {
        newErrors.mobileNumber = 'Mobile number must be 10 digits';
      }
      if (!registerData.otp) {
        newErrors.otp = 'OTP is required';
      } else if (!/^[0-9]{4}$/.test(registerData.otp)) {
        newErrors.otp = 'OTP must be 4 digits';
      }
    }

    return newErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    await onRegister(
      registerData.name,
      registerData.email || null,
      registerData.mobileNumber || null,
      registerData.password || null,
      registerData.otp || null,
      registerData.role
    );
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Create Account</h2>
      </div>
      
      <form onSubmit={handleSubmit} className="w-full">
        <div className="mb-5">
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
            <User size={18} />
            Name
          </label>
          <input
            type="text"
            name="name"
            value={registerData.name}
            onChange={handleChange}
            placeholder="Name"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-200 transition-all"
          />
          {errors.name && <span className="text-red-500 text-xs mt-1 block">{errors.name}</span>}
        </div>

        <div className="mb-5">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Registration Type</label>
          <select
            name="registrationType"
            value={registerData.registrationType}
            onChange={handleChange}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-200 transition-all"
          >
            <option value="email">Register with Email</option>
            <option value="mobile">Register with Mobile Number</option>
          </select>
        </div>

        {registerData.registrationType === 'email' ? (
          <>
            <div className="mb-5">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <Mail size={18} />
                Email
              </label>
              <input
                type="email"
                name="email"
                value={registerData.email}
                onChange={handleChange}
                placeholder="Email"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-200 transition-all"
              />
              {errors.email && <span className="text-red-500 text-xs mt-1 block">{errors.email}</span>}
            </div>
            <div className="mb-5">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <Lock size={18} />
                Password
              </label>
              <input
                type="password"
                name="password"
                value={registerData.password}
                onChange={handleChange}
                placeholder="Password"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-200 transition-all"
              />
              {errors.password && <span className="text-red-500 text-xs mt-1 block">{errors.password}</span>}
            </div>
            <div className="mb-5">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <Lock size={18} />
                Confirm Password
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={registerData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm Password"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-200 transition-all"
              />
              {errors.confirmPassword && <span className="text-red-500 text-xs mt-1 block">{errors.confirmPassword}</span>}
            </div>
          </>
        ) : (
          <>
            <div className="mb-5">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <Phone size={18} />
                Mobile Number
              </label>
              <div className="flex gap-2">
                <input
                  type="tel"
                  name="mobileNumber"
                  value={registerData.mobileNumber}
                  onChange={handleChange}
                  placeholder="10-digit mobile number"
                  maxLength={10}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-200 transition-all"
                />
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={sendingOtp || !registerData.mobileNumber || !/^[0-9]{10}$/.test(registerData.mobileNumber)}
                  className="px-4 py-3 bg-gray-600 text-white rounded-lg text-sm font-medium whitespace-nowrap hover:bg-gray-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                >
                  {sendingOtp ? 'Sending...' : 'Send OTP'}
                </button>
              </div>
              {errors.mobileNumber && <span className="text-red-500 text-xs mt-1 block">{errors.mobileNumber}</span>}
            </div>
            <div className="mb-5">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <Lock size={18} />
                OTP
              </label>
              <input
                type="text"
                name="otp"
                value={registerData.otp}
                onChange={handleChange}
                placeholder="Enter 4-digit OTP"
                maxLength={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-200 transition-all"
              />
              {errors.otp && <span className="text-red-500 text-xs mt-1 block">{errors.otp}</span>}
            </div>
          </>
        )}

        <div className="mb-5">
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
            <User size={18} />
            Role
          </label>
          <select
            name="role"
            value={registerData.role}
            onChange={handleChange}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-200 transition-all"
          >
            <option value="employee">Employee</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        <button
          type="submit"
          className="w-full py-3.5 px-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold rounded-lg tracking-wide mt-2 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
        >
          SIGN UP
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">
          Already have an account?{' '}
          <button
            onClick={onSwitchToSignIn}
            className="text-indigo-600 font-semibold hover:text-indigo-700 hover:underline transition-colors"
          >
            Sign in here
          </button>
        </p>
      </div>
    </div>
  );
};

export default Register;

