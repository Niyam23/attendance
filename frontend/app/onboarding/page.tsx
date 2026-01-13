'use client'

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import axiosInstance from '../utils/axios';
import toast from 'react-hot-toast';
import { User, Phone, Camera, Calendar, Users, CheckCircle, FileText, ArrowRight, Info } from 'lucide-react';
import FaceCapture from '../components/FaceCapture';

interface OnboardingData {
  phone: string;
  username: string;
  profilePhoto: File | null;
  gender: string;
  dateOfBirth: string;
  maritalStatus: string;
  otp: string;
  policyAgreed: boolean;
}

interface Errors {
  phone?: string;
  username?: string;
  profilePhoto?: string;
  otp?: string;
  policyAgreed?: string;
}

const OnboardingPage: React.FC = () => {
  const router = useRouter();
  const { user, loading, refreshUser } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({
    phone: user?.mobileNumber || '',
    username: '',
    profilePhoto: null,
    gender: '',
    dateOfBirth: '',
    maritalStatus: '',
    otp: '',
    policyAgreed: false
  });
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const [showFaceCapture, setShowFaceCapture] = useState(false);
  const [faceImageData, setFaceImageData] = useState<string | null>(null);
  const [faceImages, setFaceImages] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isCapturingFaces, setIsCapturingFaces] = useState(false);
  const TOTAL_FACE_IMAGES = 5;

  const steps = [
    {
      number: 1,
      title: 'Personal Information',
      description: 'Add your contact details and profile information to set up your account.',
      icon: User
    },
    {
      number: 2,
      title: 'Additional Details',
      description: 'Provide additional information to complete your profile.',
      icon: Users
    },
    {
      number: 3,
      title: 'Company Policy',
      description: 'Review and agree to the company policies and terms of service.',
      icon: FileText
    }
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setOnboardingData({ 
      ...onboardingData, 
      [name]: type === 'checkbox' ? checked : value 
    });
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

  const handleFaceCaptured = async (imageData: string) => {
    // Add to array of captured images
    const newImages = [...faceImages, imageData];
    setFaceImages(newImages);
    setFaceImageData(imageData);
    
    // Use first image as profile photo
    if (newImages.length === 1) {
      const res = await fetch(imageData);
      const blob = await res.blob();
      const file = new File([blob], 'face-capture.jpg', { type: 'image/jpeg' });
      setOnboardingData({ ...onboardingData, profilePhoto: file });
      setPreviewPhoto(imageData);
    }
    
    // Check if we need more images
    if (newImages.length < TOTAL_FACE_IMAGES) {
      setCurrentImageIndex(newImages.length);
      // Continue capturing - don't close modal
      toast.success(`Image ${newImages.length} of ${TOTAL_FACE_IMAGES} captured!`);
    } else {
      // All images captured, close modal and register
      setShowFaceCapture(false);
      await registerAllFaces(newImages);
    }
  };

  const registerAllFaces = async (images: string[]) => {
    setIsCapturingFaces(true);
    try {
      // Register all faces with backend
      const response = await axiosInstance.post('/face/register', {
        imageDataArray: images
      });

      if (response.data.success) {
        toast.success(`Face registered successfully with ${response.data.embeddingCount} embeddings!`);
      } else {
        toast.error(response.data.message || 'Failed to register face');
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to register face';
      toast.error(message);
    } finally {
      setIsCapturingFaces(false);
    }
  };

  const handleSendOtp = async () => {
    if (!onboardingData.phone || !/^[0-9]{10}$/.test(onboardingData.phone)) {
      toast.error('Please enter a valid 10-digit phone number');
      return;
    }

    setSendingOtp(true);
    try {
      const response = await axios.post('http://192.168.1.29:5000/api/otp/send', {
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
      const response = await axios.post('http://192.168.1.29:5000/api/otp/verify', {
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

  const validateStep = (step: number): boolean => {
    const newErrors: Errors = {};
    let isValid = true;

    if (step === 1) {
    if (!onboardingData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
        isValid = false;
    } else if (!/^[0-9]{10}$/.test(onboardingData.phone)) {
      newErrors.phone = 'Phone number must be 10 digits';
        isValid = false;
    }
    if (!phoneVerified) {
      newErrors.phone = 'Please verify your phone number';
        isValid = false;
    }
    if (!onboardingData.username.trim()) {
      newErrors.username = 'Username is required';
        isValid = false;
    } else if (onboardingData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
        isValid = false;
      }
    } else if (step === 3) {
      if (!onboardingData.policyAgreed) {
        newErrors.policyAgreed = 'You must agree to the company policy';
        isValid = false;
      }
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < 3) {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(3)) {
      return;
    }

    // Ensure face is registered if faceImageData exists
    if (faceImageData && !onboardingData.profilePhoto) {
      toast.error('Please wait for face registration to complete');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('phone', onboardingData.phone);
      formData.append('username', onboardingData.username);
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
      
      // Refresh user data and redirect immediately
      await refreshUser();
      
      // Redirect immediately without delay
          router.push('/dashboard');
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
    <div 
      className="min-h-screen w-full flex items-center justify-center p-4"
      style={{
        background: 'linear-gradient(-45deg, #2dd4bf, #14b8a6, #0d9488, #10b981, #2dd4bf)',
        backgroundSize: '400% 400%',
        animation: 'gradient-shift 15s ease infinite'
      }}
    >
      <div className="max-w-6xl w-full bg-white rounded-2xl shadow-2xl overflow-hidden" style={{ height: '90vh', maxHeight: '800px' }}>
        <div className="flex h-full">
          {/* Left Sidebar - Steps Progress */}
          <div className="w-80 bg-gradient-to-br from-teal-50 to-emerald-50 p-8 flex flex-col border-r border-teal-100">
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-2">
                <Info className="w-5 h-5 text-teal-600" />
                <p className="text-sm text-teal-700 font-medium">
                  Get started by completing your profile setup
                </p>
              </div>
            </div>

            <div className="flex-1 relative">
              {steps.map((step, index) => {
                const Icon = step.icon;
                const isActive = currentStep === step.number;
                const isCompleted = currentStep > step.number;
                const isLast = index === steps.length - 1;

                return (
                  <div key={step.number} className="relative">
                    <div className="flex items-start gap-4 mb-8">
                      {/* Icon Circle */}
                      <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                        isActive 
                          ? 'bg-teal-500 text-white shadow-lg' 
                          : isCompleted 
                          ? 'bg-teal-400 text-white' 
                          : 'bg-white text-gray-400 border-2 border-gray-300'
                      }`}>
                        {isCompleted ? (
                          <CheckCircle className="w-6 h-6" />
                        ) : (
                          <Icon className="w-6 h-6" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 pt-1">
                        <h3 className={`font-semibold mb-1 ${
                          isActive ? 'text-teal-700' : isCompleted ? 'text-teal-600' : 'text-gray-500'
                        }`}>
                          {step.title}
                        </h3>
                        <p className={`text-sm ${
                          isActive ? 'text-teal-600' : 'text-gray-500'
                        }`}>
                          {step.description}
                        </p>
                      </div>
                    </div>

                    {/* Connector Line */}
                    {!isLast && (
                      <div className={`absolute left-6 top-12 w-0.5 h-16 ${
                        isCompleted || isActive ? 'bg-teal-400' : 'bg-gray-300'
                      }`} />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Employee ID Badge */}
            {user.employeeId && (
              <div className="mt-auto pt-4 border-t border-teal-200">
                <div className="bg-white rounded-lg p-3 border border-teal-200">
                  <p className="text-xs text-gray-500 mb-1">Employee ID</p>
                  <p className="text-sm font-semibold text-teal-700">{user.employeeId}</p>
                </div>
              </div>
            )}
          </div>

          {/* Right Panel - Main Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-12">
              <div className="max-w-2xl">
                {/* Step Header */}
                <div className="mb-8">
                  <div className="text-sm font-semibold text-teal-600 mb-2">
                    STEP {currentStep} OF {steps.length}
                  </div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-3">
                    {steps[currentStep - 1].title}
                  </h1>
                  <p className="text-gray-600">
                    {steps[currentStep - 1].description}
                  </p>
                </div>

                <form onSubmit={currentStep === 3 ? handleSubmit : (e) => { e.preventDefault(); handleNext(); }} className="space-y-5">
                  {/* Step 1: Personal Information */}
                  {currentStep === 1 && (
                    <div className="space-y-5">
                      {/* Phone Number and OTP - Side by Side */}
                      <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                  <Phone size={16} className="text-teal-600" />
                          Phone Number & OTP *
                </label>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                  <input
                    type="tel"
                    name="phone"
                    value={onboardingData.phone}
                    onChange={handleChange}
                    placeholder="1234567890"
                    maxLength={10}
                    disabled={phoneVerified}
                              className={`w-full px-3 py-2 text-sm border-2 rounded-lg focus:outline-none transition-all ${
                      phoneVerified 
                        ? 'border-green-500 bg-green-50' 
                                  : errors.phone
                                  ? 'border-red-300'
                        : 'border-gray-200 focus:border-teal-500'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={sendingOtp || !onboardingData.phone || !/^[0-9]{10}$/.test(onboardingData.phone) || phoneVerified}
                              className="mt-2 w-full px-3 py-2 text-sm bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                              {sendingOtp ? 'Sending...' : phoneVerified ? <CheckCircle size={16} className="mx-auto" /> : 'Send OTP'}
                  </button>
                </div>
                          <div>
                    <input
                      type="text"
                      name="otp"
                      value={onboardingData.otp}
                      onChange={handleChange}
                              placeholder="Enter OTP"
                      maxLength={4}
                              disabled={phoneVerified}
                              className={`w-full px-3 py-2 text-sm border-2 rounded-lg focus:outline-none transition-all ${
                                phoneVerified ? 'border-green-500 bg-green-50' : 'border-gray-200 focus:border-teal-500'
                              }`}
                    />
                    <button
                      type="button"
                      onClick={handleVerifyOtp}
                              disabled={!onboardingData.otp || !/^[0-9]{4}$/.test(onboardingData.otp) || phoneVerified}
                              className="mt-2 w-full px-3 py-2 text-sm bg-gray-700 text-white rounded-lg font-semibold hover:bg-gray-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Verify
                    </button>
                  </div>
                        </div>
                {errors.phone && <span className="text-red-500 text-xs mt-1 block">{errors.phone}</span>}
              </div>

                      {/* Username and Profile Photo - Side by Side */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
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
                            className={`w-full px-3 py-2 text-sm border-2 rounded-lg focus:outline-none transition-all ${
                              errors.username ? 'border-red-300' : 'border-gray-200 focus:border-teal-500'
                            }`}
                />
                {errors.username && <span className="text-red-500 text-xs mt-1 block">{errors.username}</span>}
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                  <Camera size={16} className="text-teal-600" />
                  Profile Photo
                </label>
                <div className="space-y-2">
                            <button
                              type="button"
                              onClick={() => setShowFaceCapture(true)}
                              className="w-full px-3 py-2 text-sm bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 transition-all flex items-center justify-center gap-2"
                            >
                              <Camera size={16} />
                              Capture Face
                            </button>
                  <input
                    type="file"
                    name="profilePhoto"
                    accept="image/*"
                    onChange={handleFileChange}
                              className="w-full px-3 py-2 text-sm border-2 border-gray-200 rounded-lg focus:outline-none focus:border-teal-500 transition-all file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"
                  />
                  {previewPhoto && (
                    <div className="mt-2">
                                <img src={previewPhoto} alt="Preview" className="w-20 h-20 object-cover rounded-lg border-2 border-gray-200" />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 2: Additional Details */}
                  {currentStep === 2 && (
                    <div className="space-y-5">
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                    <Users size={16} className="text-teal-600" />
                    Gender
                  </label>
                  <select
                    name="gender"
                    value={onboardingData.gender}
                    onChange={handleChange}
                          className="w-full px-3 py-2 text-sm border-2 border-gray-200 rounded-lg focus:outline-none focus:border-teal-500 transition-all"
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
                          className="w-full px-3 py-2 text-sm border-2 border-gray-200 rounded-lg focus:outline-none focus:border-teal-500 transition-all"
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
                          className="w-full px-3 py-2 text-sm border-2 border-gray-200 rounded-lg focus:outline-none focus:border-teal-500 transition-all"
                  >
                    <option value="">Select Status</option>
                    <option value="single">Single</option>
                    <option value="married">Married</option>
                    <option value="divorced">Divorced</option>
                    <option value="widowed">Widowed</option>
                  </select>
                      </div>
                    </div>
                  )}

                  {/* Step 3: Company Policy */}
                  {currentStep === 3 && (
                    <div className="space-y-6">
                      <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Company Policy Agreement</h3>
                        <div className="space-y-4 text-sm text-gray-700">
                          <div>
                            <h4 className="font-semibold mb-2">1. Attendance Policy</h4>
                            <p className="text-gray-600">
                              Employees are required to check in and check out daily. Late arrivals and early departures must be approved by your supervisor.
                            </p>
                          </div>
                          <div>
                            <h4 className="font-semibold mb-2">2. Leave Policy</h4>
                            <p className="text-gray-600">
                              Leave requests must be submitted in advance through the system. Approval is subject to supervisor discretion and team availability.
                            </p>
                          </div>
                          <div>
                            <h4 className="font-semibold mb-2">3. Data Privacy</h4>
                            <p className="text-gray-600">
                              Your personal information will be kept confidential and used only for administrative and HR purposes in accordance with company policies.
                            </p>
                          </div>
                          <div>
                            <h4 className="font-semibold mb-2">4. Code of Conduct</h4>
                            <p className="text-gray-600">
                              All employees must adhere to the company's code of conduct, maintaining professionalism and respect in all workplace interactions.
                            </p>
                </div>
              </div>
            </div>

                      <div>
                        <label className="flex items-start gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            name="policyAgreed"
                            checked={onboardingData.policyAgreed}
                            onChange={handleChange}
                            className="mt-1 w-5 h-5 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                          />
                          <span className="text-sm text-gray-700">
                            I have read and agree to the company policies and terms of service. *
                          </span>
                        </label>
                        {errors.policyAgreed && <span className="text-red-500 text-xs mt-1 block">{errors.policyAgreed}</span>}
                      </div>
                    </div>
                  )}

                  {/* Navigation Buttons */}
                  <div className="flex gap-4 pt-6 border-t border-gray-200">
                    {currentStep > 1 && (
                      <button
                        type="button"
                        onClick={handlePrevious}
                        className="px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-all"
                      >
                        Previous
                      </button>
                    )}
              <button
                type="submit"
                disabled={submitting}
                      className="flex-1 px-6 py-3 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                      {submitting ? (
                        'Saving...'
                      ) : currentStep === 3 ? (
                        'Complete Onboarding'
                      ) : (
                        <>
                          Next Step
                          <ArrowRight size={20} />
                        </>
                      )}
              </button>
            </div>
          </form>
        </div>
      </div>
          </div>
        </div>
      </div>
      
      {/* Face Capture Modal */}
      {showFaceCapture && (
        <FaceCapture
          key={`face-capture-${currentImageIndex}`}
          isOpen={showFaceCapture}
          onFaceCaptured={handleFaceCaptured}
          onClose={() => {
            setShowFaceCapture(false);
            if (faceImages.length > 0 && faceImages.length < TOTAL_FACE_IMAGES) {
              // If closing before capturing all images, register what we have
              registerAllFaces(faceImages);
            }
          }}
          currentImageIndex={currentImageIndex}
          totalImages={TOTAL_FACE_IMAGES}
        />
      )}
    </div>
  );
};

export default OnboardingPage;
