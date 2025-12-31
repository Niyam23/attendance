'use client'

import React, { useState, useEffect, useRef } from 'react';
import { X, Clock } from 'lucide-react';
import axiosInstance from '../utils/axios';
import toast from 'react-hot-toast';

interface OTPVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  mobileNumber: string;
  onVerifySuccess: () => void;
  onResendOtp: () => Promise<void>;
  onAutoLogin?: () => Promise<any>;
}

const OTPVerificationModal: React.FC<OTPVerificationModalProps> = ({
  isOpen,
  onClose,
  mobileNumber,
  onVerifySuccess,
  onResendOtp,
  onAutoLogin
}) => {
  const [otp, setOtp] = useState(['', '', '', '']);
  const [timeLeft, setTimeLeft] = useState(60); // 1 minute timer
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (isOpen) {
      setOtp(['', '', '', '']);
      setTimeLeft(60);
      // Focus first input
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
    }
  }, [isOpen]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isOpen && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isOpen, timeLeft]);

  const handleOtpChange = (index: number, value: string) => {
    // Only allow numbers
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // Handle backspace
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    // Handle paste
    if (e.key === 'v' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      navigator.clipboard.readText().then((text) => {
        const pastedOtp = text.replace(/\D/g, '').slice(0, 4).split('');
        const newOtp = [...otp];
        pastedOtp.forEach((digit, i) => {
          if (index + i < 4) {
            newOtp[index + i] = digit;
          }
        });
        setOtp(newOtp);
        // Focus the next empty input or the last one
        const nextEmptyIndex = newOtp.findIndex((val, i) => i >= index && !val);
        const focusIndex = nextEmptyIndex === -1 ? 3 : nextEmptyIndex;
        inputRefs.current[focusIndex]?.focus();
      });
    }
  };

  const handleVerify = async () => {
    const otpString = otp.join('');
    if (otpString.length !== 4) {
      toast.error('Please enter complete OTP');
      return;
    }

    // Validate OTP format
    if (!/^[0-9]{4}$/.test(otpString)) {
      toast.error('OTP must be 4 digits');
      return;
    }

    setIsVerifying(true);
    try {
      const response = await axiosInstance.post('/otp/verify', {
        mobileNumber,
        otp: otpString
      });

      // Check response structure - backend returns { success: true, message: '...', data: {...} }
      if (response.data && response.data.success === true) {
        toast.success(response.data.message || 'OTP verified successfully!');
        onVerifySuccess();
        
        // Automatically trigger login after successful OTP verification
        if (onAutoLogin) {
          try {
            // Delay to ensure OTP verification is saved in database
            await new Promise(resolve => setTimeout(resolve, 1500));
            console.log('Calling auto login after OTP verification...');
            const loginResult = await onAutoLogin();
            console.log('Login result:', loginResult);
            
            // If login was successful, close modal (redirect will happen in handleLogin)
            if (loginResult?.success) {
              console.log('Login successful, closing modal...');
              onClose();
            } else {
              // Login failed, keep modal open
              console.error('Auto login failed:', loginResult?.error);
              toast.error(loginResult?.error || 'Login failed. Please try again.');
              // Don't close modal if login fails, let user try again
              return;
            }
          } catch (error: any) {
            // Login error will be handled by the login function
            console.error('Auto login error:', error);
            toast.error(error?.message || 'Login failed. Please try again.');
            // Don't close modal if login fails, let user try again
            return;
          }
        } else {
          onClose();
        }
      } else {
        toast.error('OTP verification failed. Please try again.');
        setOtp(['', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch (error: any) {
      // Handle different error response formats
      let errorMessage = 'Failed to verify OTP';
      
      if (error.response) {
        // Check for validation errors from express-validator
        if (error.response.data?.errors && Array.isArray(error.response.data.errors)) {
          errorMessage = error.response.data.errors[0]?.msg || errorMessage;
        } else if (error.response.data?.message) {
          errorMessage = error.response.data.message;
        } else if (error.response.data?.error) {
          errorMessage = error.response.data.error;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
      // Clear OTP on error
      setOtp(['', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    try {
      await onResendOtp();
      setTimeLeft(60);
      setOtp(['', '', '', '']);
      toast.success('OTP resent successfully!');
      inputRefs.current[0]?.focus();
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to resend OTP';
      toast.error(message);
    } finally {
      setIsResending(false);
    }
  };

  if (!isOpen) return null;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Verify OTP</h2>
          <p className="text-sm text-gray-600">
            Enter the 4-digit code sent to
          </p>
          <p className="text-sm font-semibold text-gray-800 mt-1">
            +{mobileNumber}
          </p>
        </div>

        {/* OTP Input Boxes */}
        <div className="flex justify-center gap-3 mb-6">
          {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => { inputRefs.current[index] = el; }}
                type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleOtpChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              className="w-14 h-14 text-center text-2xl font-bold border-2 border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200 transition-all"
            />
          ))}
        </div>

        {/* Timer */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <Clock className="w-4 h-4 text-gray-500" />
          <span className={`text-sm font-medium ${timeLeft <= 10 ? 'text-red-600' : 'text-gray-600'}`}>
            {timeLeft > 0 ? `Code expires in ${formatTime(timeLeft)}` : 'Code expired'}
          </span>
        </div>

        {/* Verify Button */}
        <button
          onClick={handleVerify}
          disabled={isVerifying || otp.join('').length !== 4}
          className="w-full bg-teal-500 text-white py-3 rounded-lg font-semibold hover:bg-teal-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-3"
        >
          {isVerifying ? 'Verifying...' : 'Verify OTP'}
        </button>

        {/* Resend OTP */}
        <div className="text-center">
          <p className="text-sm text-gray-600 mb-2">
            Didn't receive the code?
          </p>
          <button
            onClick={handleResend}
            disabled={isResending || timeLeft > 0}
            className="text-sm text-teal-600 font-semibold hover:text-teal-700 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isResending ? 'Resending...' : 'Resend OTP'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OTPVerificationModal;

