'use client'

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import axiosInstance from '../utils/axios';
import toast from 'react-hot-toast';
import { User, Phone, Camera, Calendar, Users, CheckCircle } from 'lucide-react';

interface OnboardingData {
  phone: string;
  username: string;
  profilePhoto: File | null;
  gender: string;
  dateOfBirth: string;
  maritalStatus: string;
  otp: string;
}

interface Errors {
  phone?: string;
  username?: string;
  profilePhoto?: string;
  otp?: string;
}

const OnboardingPage: React.FC = () => {
  const router = useRouter();
  const { user, loading, refreshUser } = useAuth();
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({
    phone: user?.mobileNumber || '',
    username: '',
    profilePhoto: null,
    gender: '',
    dateOfBirth: '',
    maritalStatus: '',
    otp: ''
  });
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setOnboardingData({ ...onboardingData, [name]: value });
    setErrors({ ...errors, [name]: '' });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return;
      }
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      setOnboardingData({ ...onboardingData, profilePhoto: file });
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSendOtp = async () => {
    if (!onboardingData.phone || !/^[0-9]{10}$/.test(onboardingData.phone)) {
      toast.error('Please enter a valid 10-digit phone number');
      return;
    }

    setSendingOtp(true);
    try {
      const response = await axios.post('http://localhost:5000/api/otp/send', {
        mobileNumber: onboardingData.phone
      });
      if (response.data.success) {
        toast.success('OTP sent to your phone number!');
        setPhoneVerified(false);
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to send OTP';
      toast.error(message);
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!onboardingData.otp || !/^[0-9]{4}$/.test(onboardingData.otp)) {
      toast.error('Please enter a valid 4-digit OTP');
      return;
    }

    try {
      const response = await axios.post('http://localhost:5000/api/otp/verify', {
        mobileNumber: onboardingData.phone,
        otp: onboardingData.otp
      });
      if (response.data.success) {
        toast.success('Phone number verified!');
        setPhoneVerified(true);
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'Invalid OTP';
      toast.error(message);
    }
  };

  const validate = (): Errors => {
    const newErrors: Errors = {};
    if (!onboardingData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^[0-9]{10}$/.test(onboardingData.phone)) {
      newErrors.phone = 'Phone number must be 10 digits';
    }
    if (!phoneVerified) {
      newErrors.phone = 'Please verify your phone number';
    }
    if (!onboardingData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (onboardingData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
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

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('phone', onboardingData.phone);
      formData.append('username', onboardingData.username);
      // Only send OTP if phone is not yet verified
      if (!phoneVerified && onboardingData.otp) {
        formData.append('otp', onboardingData.otp);
      }
      if (onboardingData.gender) formData.append('gender', onboardingData.gender);
      if (onboardingData.dateOfBirth) formData.append('dateOfBirth', onboardingData.dateOfBirth);
      if (onboardingData.maritalStatus) formData.append('maritalStatus', onboardingData.maritalStatus);
      if (onboardingData.profilePhoto) {
        formData.append('profilePhoto', onboardingData.profilePhoto);
      }

      const response = await axiosInstance.put('/profile/update', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      toast.success('Profile updated successfully!');
      
      // Refresh user data to get updated onboarding status
      const updatedUser = await refreshUser();
      
      // Check if onboarding is completed and redirect accordingly
      if (updatedUser && updatedUser.onboardingCompleted) {
        setTimeout(() => {
          router.push('/dashboard');
        }, 1000);
      } else {
        // If still not completed, stay on page
        toast.error('Please complete all required fields');
      }
    } catch (error: any) {
      const message = error.response?.data?.message || error.response?.data?.errors?.[0]?.msg || 'Failed to update profile';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth');
    } else if (!loading && user && user.onboardingCompleted) {
      // If onboarding is already completed, redirect to dashboard
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-teal-600 rounded-full mb-4">
              <User className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Complete Your Profile</h1>
            <p className="text-gray-600">Please fill in your details to complete the onboarding process</p>
            {user.employeeId && (
              <div className="mt-4 inline-block px-4 py-2 bg-teal-100 text-teal-800 rounded-lg">
                <strong>Employee ID:</strong> {user.employeeId}
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Required Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                  <Phone size={16} className="text-teal-600" />
                  Phone Number *
                </label>
                <div className="flex gap-2">
                  <input
                    type="tel"
                    name="phone"
                    value={onboardingData.phone}
                    onChange={handleChange}
                    placeholder="1234567890"
                    maxLength={10}
                    disabled={phoneVerified}
                    className={`flex-1 px-4 py-3 border-2 rounded-lg focus:outline-none transition-all ${
                      phoneVerified 
                        ? 'border-green-500 bg-green-50' 
                        : 'border-gray-200 focus:border-teal-500'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={sendingOtp || !onboardingData.phone || !/^[0-9]{10}$/.test(onboardingData.phone) || phoneVerified}
                    className="px-6 py-3 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    {sendingOtp ? 'Sending...' : phoneVerified ? <CheckCircle size={20} /> : 'Send OTP'}
                  </button>
                </div>
                {!phoneVerified && (
                  <div className="mt-2 flex gap-2">
                    <input
                      type="text"
                      name="otp"
                      value={onboardingData.otp}
                      onChange={handleChange}
                      placeholder="Enter 4-digit OTP"
                      maxLength={4}
                      className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-teal-500"
                    />
                    <button
                      type="button"
                      onClick={handleVerifyOtp}
                      disabled={!onboardingData.otp || !/^[0-9]{4}$/.test(onboardingData.otp)}
                      className="px-4 py-2 bg-gray-700 text-white rounded-lg font-semibold hover:bg-gray-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Verify
                    </button>
                  </div>
                )}
                {errors.phone && <span className="text-red-500 text-xs mt-1 block">{errors.phone}</span>}
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                  <User size={16} className="text-teal-600" />
                  Username *
                </label>
                <input
                  type="text"
                  name="username"
                  value={onboardingData.username}
                  onChange={handleChange}
                  placeholder="johndoe"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-teal-500 transition-all"
                />
                {errors.username && <span className="text-red-500 text-xs mt-1 block">{errors.username}</span>}
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                  <Camera size={16} className="text-teal-600" />
                  Profile Photo
                </label>
                <div className="space-y-2">
                  <input
                    type="file"
                    name="profilePhoto"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-teal-500 transition-all file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"
                  />
                  {previewPhoto && (
                    <div className="mt-2">
                      <img src={previewPhoto} alt="Preview" className="w-24 h-24 object-cover rounded-lg border-2 border-gray-200" />
                    </div>
                  )}
                </div>
                {errors.profilePhoto && <span className="text-red-500 text-xs mt-1 block">{errors.profilePhoto}</span>}
              </div>
            </div>

            {/* Optional Fields */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Additional Information (Optional)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                    <Users size={16} className="text-teal-600" />
                    Gender
                  </label>
                  <select
                    name="gender"
                    value={onboardingData.gender}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-teal-500 transition-all"
                  >
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                    <Calendar size={16} className="text-teal-600" />
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    name="dateOfBirth"
                    value={onboardingData.dateOfBirth}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-teal-500 transition-all"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                    <Users size={16} className="text-teal-600" />
                    Marital Status
                  </label>
                  <select
                    name="maritalStatus"
                    value={onboardingData.maritalStatus}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-teal-500 transition-all"
                  >
                    <option value="">Select Status</option>
                    <option value="single">Single</option>
                    <option value="married">Married</option>
                    <option value="divorced">Divorced</option>
                    <option value="widowed">Widowed</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 py-3 px-6 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Saving...' : 'Complete Onboarding'}
              </button>
              <button
                type="button"
                onClick={() => router.push('/dashboard')}
                className="px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-all"
              >
                Skip for Now
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default OnboardingPage;
