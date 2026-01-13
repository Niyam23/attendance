import React, { useState } from 'react';
import { Mail, Lock, Phone } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

interface SignInProps {
  onSwitchToRegister: () => void;
  onLogin: (email: string | null, mobileNumber: string | null, password: string | null, otp: string | null) => Promise<{ success: boolean }>;
}

interface LoginData {
  email: string;
  password: string;
  mobileNumber: string;
  otp: string;
  loginType: 'email' | 'mobile';
}

interface Errors {
  email?: string;
  password?: string;
  mobileNumber?: string;
  otp?: string;
}

const SignIn: React.FC<SignInProps> = ({ onSwitchToRegister, onLogin }) => {
  const [loginData, setLoginData] = useState<LoginData>({
    email: '',
    password: '',
    mobileNumber: '',
    otp: '',
    loginType: 'email'
  });
  const [errors, setErrors] = useState<Errors>({});
  const [sendingOtp, setSendingOtp] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setLoginData({ ...loginData, [name]: value });
    setErrors({ ...errors, [name]: '' });
  };

  const handleSendOtp = async () => {
    if (!loginData.mobileNumber || !/^[0-9]{10}$/.test(loginData.mobileNumber)) {
      toast.error('Please enter a valid 10-digit mobile number');
      return;
    }

    setSendingOtp(true);
    try {
      const response = await axios.post('http://192.168.1.29:5000/api/otp/send', {
        mobileNumber: loginData.mobileNumber
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
    if (loginData.loginType === 'email') {
      if (!loginData.email) {
        newErrors.email = 'Email is required';
      } else if (!/\S+@\S+\.\S+/.test(loginData.email)) {
        newErrors.email = 'Email is invalid';
      }
      if (!loginData.password) {
        newErrors.password = 'Password is required';
      }
    } else {
      if (!loginData.mobileNumber) {
        newErrors.mobileNumber = 'Mobile number is required';
      } else if (!/^[0-9]{10}$/.test(loginData.mobileNumber)) {
        newErrors.mobileNumber = 'Mobile number must be 10 digits';
      }
      if (!loginData.otp) {
        newErrors.otp = 'OTP is required';
      } else if (!/^[0-9]{4}$/.test(loginData.otp)) {
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

    await onLogin(
      loginData.email || null,
      loginData.mobileNumber || null,
      loginData.password || null,
      loginData.otp || null
    );
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Sign in to Attendance</h2>
      </div>
      
      <form onSubmit={handleSubmit} className="w-full">
        <div className="mb-5">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Login Type</label>
          <select
            name="loginType"
            value={loginData.loginType}
            onChange={handleChange}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-200 transition-all"
          >
            <option value="email">Login with Email</option>
            <option value="mobile">Login with Mobile Number</option>
          </select>
        </div>

        {loginData.loginType === 'email' ? (
          <>
            <div className="mb-5">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <Mail size={18} />
                Email
              </label>
              <input
                type="email"
                name="email"
                value={loginData.email}
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
                value={loginData.password}
                onChange={handleChange}
                placeholder="Password"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-200 transition-all"
              />
              {errors.password && <span className="text-red-500 text-xs mt-1 block">{errors.password}</span>}
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
                  value={loginData.mobileNumber}
                  onChange={handleChange}
                  placeholder="10-digit mobile number"
                  maxLength={10}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-200 transition-all"
                />
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={sendingOtp || !loginData.mobileNumber || !/^[0-9]{10}$/.test(loginData.mobileNumber)}
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
                value={loginData.otp}
                onChange={handleChange}
                placeholder="Enter 4-digit OTP"
                maxLength={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-200 transition-all"
              />
              {errors.otp && <span className="text-red-500 text-xs mt-1 block">{errors.otp}</span>}
            </div>
          </>
        )}

        <button
          type="submit"
          className="w-full py-3.5 px-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold rounded-lg tracking-wide mt-2 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
        >
          SIGN IN
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">
          Don't have an account?{' '}
          <button
            onClick={onSwitchToRegister}
            className="text-indigo-600 font-semibold hover:text-indigo-700 hover:underline transition-colors"
          >
            Sign up here
          </button>
        </p>
      </div>
    </div>
  );
};

export default SignIn;

