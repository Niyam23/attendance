import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import SignIn from '../components/SignIn';
import Register from '../components/Register';

const Auth: React.FC = () => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<'signin' | 'register'>(() => {
    if (location.pathname === '/register') return 'register';
    return 'signin';
  });
  const [isTransitioning, setIsTransitioning] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (location.pathname === '/register') {
      handleTabChange('register');
    } else {
      handleTabChange('signin');
    }
  }, [location.pathname]);

  const handleTabChange = (newTab: 'signin' | 'register') => {
    if (newTab === activeTab || isTransitioning) return;
    
    setIsTransitioning(true);
    setActiveTab(newTab);
    
    setTimeout(() => {
      setIsTransitioning(false);
    }, 600);
  };

  const handleLogin = async (
    email: string | null,
    mobileNumber: string | null,
    password: string | null,
    otp: string | null
  ) => {
    const result = await login(email, mobileNumber, password, otp);
    if (result.success) {
      navigate('/dashboard');
    }
    return result;
  };

  const handleRegister = async (
    name: string,
    email: string | null,
    mobileNumber: string | null,
    password: string | null,
    otp: string | null,
    role: string
  ) => {
    const result = await register(name, email, mobileNumber, password, otp, role);
    if (result.success) {
      navigate('/dashboard');
    }
    return result;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-5">
      <div className="w-full max-w-4xl h-[600px] bg-white rounded-3xl shadow-2xl overflow-hidden relative">
        {/* Sliding Panel Container - Window Panel Effect */}
        <div
          className={`absolute top-0 left-0 h-full flex transition-transform duration-700 ease-in-out ${
            activeTab === 'signin' ? 'translate-x-0' : '-translate-x-1/2'
          }`}
          style={{ width: '200%' }}
        >
          {/* Sign In Panel - Left */}
          <div className="w-1/2 h-full flex items-center justify-center p-12 bg-white">
            <SignIn
              onSwitchToRegister={() => handleTabChange('register')}
              onLogin={handleLogin}
            />
          </div>

          {/* Register Panel - Right */}
          <div className="w-1/2 h-full flex items-center justify-center p-12 bg-white">
            <Register
              onSwitchToSignIn={() => handleTabChange('signin')}
              onRegister={handleRegister}
            />
          </div>
        </div>

        {/* Welcome Panels - Behind the sliding forms */}
        {/* Left Welcome Panel - Shows when register is active */}
        <div
          className={`absolute top-0 left-0 w-1/2 h-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center p-12 transition-opacity duration-700 ${
            activeTab === 'register' ? 'opacity-100 z-0' : 'opacity-0 z-0 pointer-events-none'
          }`}
        >
          <div className="text-center text-white relative z-10">
            <h2 className="text-4xl font-bold mb-5 drop-shadow-lg">Welcome Back!</h2>
            <p className="text-lg mb-10 opacity-95 leading-relaxed">
              To keep connected with us please login with your personal info
            </p>
            <button
              onClick={() => handleTabChange('signin')}
              disabled={isTransitioning}
              className="px-10 py-3 border-2 border-white text-white rounded-full font-semibold tracking-wide hover:bg-white hover:text-indigo-600 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed relative overflow-hidden group"
            >
              <span className="relative z-10">SIGN IN</span>
            </button>
          </div>
          {/* Decorative circles */}
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-10 rounded-full -translate-x-1/4 translate-y-1/4"></div>
          <div className="absolute top-0 right-0 w-36 h-36 bg-white opacity-10 rounded-2xl rotate-45 -translate-y-1/4 translate-x-1/4"></div>
        </div>

        {/* Right Welcome Panel - Shows when signin is active */}
        <div
          className={`absolute top-0 right-0 w-1/2 h-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center p-12 transition-opacity duration-700 ${
            activeTab === 'signin' ? 'opacity-100 z-0' : 'opacity-0 z-0 pointer-events-none'
          }`}
        >
          <div className="text-center text-white relative z-10">
            <h2 className="text-4xl font-bold mb-5 drop-shadow-lg">Hello, Friend!</h2>
            <p className="text-lg mb-10 opacity-95 leading-relaxed">
              Enter your personal details and start journey with us
            </p>
            <button
              onClick={() => handleTabChange('register')}
              disabled={isTransitioning}
              className="px-10 py-3 border-2 border-white text-white rounded-full font-semibold tracking-wide hover:bg-white hover:text-indigo-600 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed relative overflow-hidden group"
            >
              <span className="relative z-10">SIGN UP</span>
            </button>
          </div>
          {/* Decorative circles */}
          <div className="absolute bottom-0 right-0 w-48 h-48 bg-white opacity-10 rounded-full translate-x-1/4 translate-y-1/4"></div>
          <div className="absolute top-0 left-0 w-36 h-36 bg-white opacity-10 rounded-2xl rotate-45 -translate-y-1/4 -translate-x-1/4"></div>
        </div>
      </div>
    </div>
  );
};

export default Auth;

