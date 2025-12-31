'use client'

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Lock, Phone, Eye, EyeOff } from 'lucide-react';
import OTPVerificationModal from '../components/OTPVerificationModal';
import ForgotPasswordModal from '../components/ForgotPasswordModal';
import axiosInstance from '../utils/axios';
import toast from 'react-hot-toast';

const AuthPage = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(() => {
    const tab = searchParams?.get('tab');
    if (tab === 'register') return 'register';
    return 'signin';
  });
  const [isTransitioning, setIsTransitioning] = useState(false);
  const { login, register } = useAuth();

  // Sign In Form State
  const [signInData, setSignInData] = useState({
    email: '',
    mobileNumber: '',
    password: '',
    otp: '',
    showPassword: false,
    useOTP: false
  });
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  
  // Registration OTP state
  const [showRegisterOTPModal, setShowRegisterOTPModal] = useState(false);
  const [registerOtpVerified, setRegisterOtpVerified] = useState(false);
  const [sendingRegisterOtp, setSendingRegisterOtp] = useState(false);
  
  // Forgot Password state
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);

  // Register Form State
  const [registerData, setRegisterData] = useState({
    name: '',
    email: '',
    mobileNumber: '',
    password: '',
    otp: '',
    role: '',
    showPassword: false,
    useOTP: false
  });

  useEffect(() => {
    if (!searchParams) return;
    const tab = searchParams.get('tab');
    const resetToken = searchParams.get('token');
    
    // Check if reset password token is in URL
    if (resetToken) {
      setShowForgotPasswordModal(true);
      return;
    }
    
    if (tab === 'register') {
      handleTabChange('register');
    } else {
      handleTabChange('signin');
    }
  }, [searchParams]);

  const handleTabChange = (newTab: React.SetStateAction<string>) => {
    if (newTab === activeTab || isTransitioning) return;
    
    setIsTransitioning(true);
    setActiveTab(newTab);
    router.push(`/auth?tab=${newTab}`, { scroll: false });
    
    setTimeout(() => {
      setIsTransitioning(false);
    }, 600);
  };

  const handleSendOTP = async () => {
    if (!signInData.mobileNumber || !/^[0-9]{10}$/.test(signInData.mobileNumber)) {
      toast.error('Please enter a valid 10-digit mobile number');
      return;
    }

    setSendingOtp(true);
    try {
      const response = await axiosInstance.post('/otp/send', {
        mobileNumber: signInData.mobileNumber
      });
      if (response.data.success) {
        setShowOTPModal(true);
        setOtpVerified(false);
        toast.success('OTP sent to your mobile number!');
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to send OTP';
      toast.error(message);
    } finally {
      setSendingOtp(false);
    }
  };

  const handleOTPVerifySuccess = () => {
    setOtpVerified(true);
    // After OTP is verified, user can now login
  };

  const handleLoginAfterOTP = async () => {
    // Set OTP verified state before calling login
    setOtpVerified(true);
    console.log('handleLoginAfterOTP: Mobile number:', signInData.mobileNumber);
    // Call login function with skipOtpCheck=true since we just verified OTP
    // This bypasses the state check since React state updates are async
    const result = await handleLogin(true);
    console.log('handleLoginAfterOTP: Login result:', result);
    return result;
  };

  const handleResendOTP = async () => {
    return handleSendOTP();
  };

  const handleLogin = async (skipOtpCheck: boolean = false) => {
    // If using OTP, ensure it's verified first (unless called from auto-login after verification)
    if (signInData.useOTP && !skipOtpCheck && !otpVerified) {
      toast.error('Please verify OTP first');
      return { success: false, error: 'OTP not verified' };
    }

    // For OTP login, backend checks for recently verified OTP, so we don't need to pass OTP
    const result = await login(
      signInData.email || null,
      signInData.mobileNumber || null,
      signInData.password || null,
      null // OTP is already verified separately, backend will check for verified OTP record
    );
    if (result.success && result.user) {
      // Reset OTP verification state
      setOtpVerified(false);
      setShowOTPModal(false);
      
      // Check onboarding status and redirect accordingly
      // Use the user data from the login response directly
      if (result.user.onboardingCompleted === true) {
        router.push('/dashboard');
      } else {
        router.push('/onboarding');
      }
    } else {
      // Login failed
      console.error('Login failed:', result.error);
    }
    
    return result;
  };

  const handleSendRegisterOTP = async () => {
    if (!registerData.mobileNumber || !/^[0-9]{10}$/.test(registerData.mobileNumber)) {
      toast.error('Please enter a valid 10-digit mobile number');
      return;
    }

    setSendingRegisterOtp(true);
    try {
      const response = await axiosInstance.post('/otp/send', {
        mobileNumber: registerData.mobileNumber
      });
      if (response.data.success) {
        setShowRegisterOTPModal(true);
        setRegisterOtpVerified(false);
        toast.success('OTP sent to your mobile number!');
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to send OTP';
      toast.error(message);
    } finally {
      setSendingRegisterOtp(false);
    }
  };

  const handleRegisterOTPVerifySuccess = () => {
    setRegisterOtpVerified(true);
  };

  const handleResendRegisterOTP = async () => {
    return handleSendRegisterOTP();
  };

  const handleRegisterAfterOTP = async () => {
    // Set OTP verified state before calling register
    setRegisterOtpVerified(true);
    console.log('handleRegisterAfterOTP: Mobile number:', registerData.mobileNumber);
    // Call register function
    const result = await handleRegister(true);
    console.log('handleRegisterAfterOTP: Register result:', result);
    return result;
  };

  const handleRegister = async (skipOtpCheck: boolean = false) => {
    // If using OTP, ensure it's verified first (unless called from auto-register after verification)
    if (registerData.useOTP && !skipOtpCheck && !registerOtpVerified) {
      toast.error('Please verify OTP first');
      return { success: false, error: 'OTP not verified' };
    }

    // For OTP registration, backend will verify OTP during registration
    const result = await register(
      registerData.name,
      registerData.email || null,
      registerData.mobileNumber || null,
      registerData.password || null,
      registerOtpVerified ? 'verified' : null, // Pass flag that OTP is verified
      registerData.role
    );
    
    if (result.success) {
      // Reset OTP verification state
      setRegisterOtpVerified(false);
      setShowRegisterOTPModal(false);
      router.push('/onboarding');
    } else {
      // Registration failed
      console.error('Registration failed:', result.error);
    }
    
    return result;
  };

  return (
    <div className="max-h-screen flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 p-4">
      <div className="w-full max-w-5xl h-[650px] bg-white rounded-3xl shadow-2xl overflow-hidden relative">
        
        {/* Overlay Panel Container - This slides */}
        <div
          className={`absolute top-0 w-1/2 h-full transition-transform duration-700 ease-in-out z-30 ${
            activeTab === 'signin' ? 'translate-x-full' : 'translate-x-0'
          }`}
        >
          {/* Sliding Colored Panel */}
          <div className="w-full h-full bg-gradient-to-br from-teal-400 via-teal-500 to-emerald-500 flex items-center justify-center p-12 relative overflow-hidden">
            {/* Decorative shapes */}
            <div className="absolute inset-0 overflow-hidden opacity-20">
              <div className="absolute top-10 right-10 w-20 h-20 bg-white rounded-lg rotate-45"></div>
              <div className="absolute bottom-20 left-10 w-16 h-16 bg-white rounded-full"></div>
              <div className="absolute top-1/2 left-1/4 w-12 h-12 bg-white rounded-lg rotate-12"></div>
              <div className="absolute bottom-0 right-0 w-64 h-64 bg-yellow-300 rounded-full translate-x-1/3 translate-y-1/3 blur-3xl"></div>
            </div>

            {/* Content that switches based on active tab */}
            <div className="text-center text-white relative z-10">
              {activeTab === 'signin' ? (
                // Show "Hello, Friend!" when Sign In is active (panel is on right)
                <>
                  <h2 className="text-5xl font-bold mb-6">Hello, Friend!</h2>
                  <p className="text-lg mb-10 opacity-95 leading-relaxed px-4">
                    Enter your personal details and start journey with us
                  </p>
                  <button
                    onClick={() => handleTabChange('register')}
                    disabled={isTransitioning}
                    className="px-12 py-3 border-2 border-white rounded-full font-semibold tracking-wider hover:bg-white hover:text-teal-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    SIGN UP
                  </button>
                </>
              ) : (
                // Show "Welcome Back!" when Register is active (panel is on left)
                <>
                  <h2 className="text-5xl font-bold mb-6">Welcome Back!</h2>
                  <p className="text-lg mb-10 opacity-95 leading-relaxed px-4">
                    To keep connected with us please login with your personal info
                  </p>
                  <button
                    onClick={() => handleTabChange('signin')}
                    disabled={isTransitioning}
                    className="px-12 py-3 border-2 border-white rounded-full font-semibold tracking-wider hover:bg-white hover:text-teal-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    SIGN IN
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Sign In Form - Left Side */}
        <div className="absolute left-0 top-0 w-1/2 h-full flex items-center justify-center p-8 bg-white z-10">
          <div className="w-full max-w-md">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center">
                <div className="w-4 h-4 border-2 border-white rounded"></div>
              </div>
              <span className="text-xl font-semibold text-gray-700">Diprella</span>
            </div>

            <h1 className="text-2xl font-bold text-teal-600 mb-6">Sign in to Diprella</h1>

            {/* Social Login Buttons */}
            {/* <div className="flex gap-4 justify-center mb-4">
              <button className="w-10 h-10 border border-gray-300 rounded-full flex items-center justify-center hover:bg-gray-50 transition-colors">
                <span className="text-gray-600">f</span>
              </button>
              <button className="w-10 h-10 border border-gray-300 rounded-full flex items-center justify-center hover:bg-gray-50 transition-colors">
                <span className="text-red-500 font-bold">G+</span>
              </button>
              <button className="w-10 h-10 border border-gray-300 rounded-full flex items-center justify-center hover:bg-gray-50 transition-colors">
                <span className="text-blue-600">in</span>
              </button>
            </div> */}

            {/* <p className="text-center text-gray-500 text-sm mb-4">or use your email account:</p> */}

            <div className="space-y-3">
              {!signInData.useOTP ? (
                <>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="email"
                      placeholder="Email"
                      value={signInData.email}
                      onChange={(e) => setSignInData({...signInData, email: e.target.value})}
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-100 border-none rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                    />
                  </div>

                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type={signInData.showPassword ? "text" : "password"}
                      placeholder="Password"
                      value={signInData.password}
                      onChange={(e) => setSignInData({...signInData, password: e.target.value})}
                      className="w-full pl-10 pr-12 py-2.5 bg-gray-100 border-none rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setSignInData({...signInData, showPassword: !signInData.showPassword})}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {signInData.showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="tel"
                      placeholder="Mobile Number"
                      value={signInData.mobileNumber}
                      onChange={(e) => {
                        setSignInData({...signInData, mobileNumber: e.target.value});
                        setOtpVerified(false); // Reset verification when mobile number changes
                      }}
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-100 border-none rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                    />
                  </div>

                  {otpVerified && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm text-green-700 font-medium">OTP Verified</span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleSendOTP}
                    disabled={sendingOtp || !signInData.mobileNumber || !/^[0-9]{10}$/.test(signInData.mobileNumber) || otpVerified}
                    className="w-full bg-gray-600 text-white py-2.5 rounded-lg font-semibold hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    {sendingOtp ? 'Sending OTP...' : otpVerified ? 'OTP Verified ✓' : 'Send OTP'}
                  </button>
                </>
              )}

              <div className="flex items-center justify-between">
                <button
                  onClick={() => setSignInData({...signInData, useOTP: !signInData.useOTP})}
                  className="text-xs text-teal-600 hover:text-teal-700"
                >
                  {signInData.useOTP ? 'Use Password' : 'Use OTP'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForgotPasswordModal(true)}
                  className="text-xs text-gray-600 hover:text-teal-600"
                >
                  Forgot password?
                </button>
              </div>

              <button
                onClick={() => handleLogin()}
                disabled={signInData.useOTP && !otpVerified}
                className="w-full bg-teal-500 text-white py-2.5 rounded-full font-semibold tracking-wider hover:bg-teal-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                SIGN IN
              </button>
            </div>
          </div>
        </div>

        {/* OTP Verification Modal */}
        <OTPVerificationModal
          isOpen={showOTPModal}
          onClose={() => {
            setShowOTPModal(false);
            setOtpVerified(false);
          }}
          mobileNumber={signInData.mobileNumber}
          onVerifySuccess={handleOTPVerifySuccess}
          onResendOtp={handleResendOTP}
          onAutoLogin={handleLoginAfterOTP}
        />

        {/* Register Form - Right Side */}
        <div className="absolute right-0 top-0 w-1/2 h-full flex items-center justify-center p-8 bg-white z-10">
          <div className="w-full max-w-md">
            <h1 className="text-2xl font-bold text-teal-600 mb-6">Create Account</h1>

            {/* Social Login Buttons */}
            <div className="flex gap-4 justify-center mb-4">
              <button className="w-10 h-10 border border-gray-300 rounded-full flex items-center justify-center hover:bg-gray-50 transition-colors">
                <span className="text-gray-600">f</span>
              </button>
              <button className="w-10 h-10 border border-gray-300 rounded-full flex items-center justify-center hover:bg-gray-50 transition-colors">
                <span className="text-red-500 font-bold">G+</span>
              </button>
              <button className="w-10 h-10 border border-gray-300 rounded-full flex items-center justify-center hover:bg-gray-50 transition-colors">
                <span className="text-blue-600">in</span>
              </button>
            </div>

            <p className="text-center text-gray-500 text-sm mb-4">or use your email for registration:</p>

            <div className="space-y-3">
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Name"
                  value={registerData.name}
                  onChange={(e) => setRegisterData({...registerData, name: e.target.value})}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-100 border-none rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                />
              </div>

              {!registerData.useOTP ? (
                <>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="email"
                      placeholder="Email"
                      value={registerData.email}
                      onChange={(e) => setRegisterData({...registerData, email: e.target.value})}
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-100 border-none rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                    />
                  </div>

                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type={registerData.showPassword ? "text" : "password"}
                      placeholder="Password"
                      value={registerData.password}
                      onChange={(e) => setRegisterData({...registerData, password: e.target.value})}
                      className="w-full pl-10 pr-12 py-2.5 bg-gray-100 border-none rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setRegisterData({...registerData, showPassword: !registerData.showPassword})}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {registerData.showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="tel"
                      placeholder="Mobile Number"
                      value={registerData.mobileNumber}
                      onChange={(e) => {
                        setRegisterData({...registerData, mobileNumber: e.target.value});
                        setRegisterOtpVerified(false); // Reset verification when mobile number changes
                      }}
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-100 border-none rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                    />
                  </div>

                  {registerOtpVerified && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm text-green-700 font-medium">OTP Verified</span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleSendRegisterOTP}
                    disabled={sendingRegisterOtp || !registerData.mobileNumber || !/^[0-9]{10}$/.test(registerData.mobileNumber) || registerOtpVerified}
                    className="w-full bg-gray-600 text-white py-2.5 rounded-lg font-semibold hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    {sendingRegisterOtp ? 'Sending OTP...' : registerOtpVerified ? 'OTP Verified ✓' : 'Send OTP'}
                  </button>
                </>
              )}

              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <select
                  value={registerData.role}
                  onChange={(e) => setRegisterData({...registerData, role: e.target.value})}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-100 border-none rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 appearance-none text-sm"
                >
                  <option value="employee">Employee</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <button
                onClick={() => setRegisterData({...registerData, useOTP: !registerData.useOTP})}
                className="text-xs text-teal-600 hover:text-teal-700"
              >
                {registerData.useOTP ? 'Use Email & Password' : 'Use Mobile & OTP'}
              </button>

              <button
                onClick={() => handleRegister()}
                disabled={registerData.useOTP && !registerOtpVerified}
                className="w-full bg-teal-500 text-white py-2.5 rounded-full font-semibold tracking-wider hover:bg-teal-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                SIGN UP
              </button>
            </div>
          </div>
        </div>

        {/* Registration OTP Verification Modal */}
        <OTPVerificationModal
          isOpen={showRegisterOTPModal}
          onClose={() => {
            setShowRegisterOTPModal(false);
            setRegisterOtpVerified(false);
          }}
          mobileNumber={registerData.mobileNumber}
          onVerifySuccess={handleRegisterOTPVerifySuccess}
          onResendOtp={handleResendRegisterOTP}
          onAutoLogin={handleRegisterAfterOTP}
        />

        {/* Forgot Password Modal */}
        <ForgotPasswordModal
          isOpen={showForgotPasswordModal}
          onClose={() => setShowForgotPasswordModal(false)}
        />

      </div>
    </div>
  );
};

export default AuthPage;