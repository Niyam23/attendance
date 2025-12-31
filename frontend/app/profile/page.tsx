'use client'

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../utils/axios';
import axios from 'axios';
import toast from 'react-hot-toast';
import Navbar from '../components/Navbar';
import PrivateRoute from '../components/PrivateRoute';
import { 
  User, Mail, Phone, Camera, Calendar, Users, Edit2, Save, X, CheckCircle, 
  MapPin, Briefcase, Clock, CheckCircle2, TrendingUp, Award, Calendar as CalendarIcon,
  BarChart3, RefreshCw, ChevronDown, Image as ImageIcon
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

interface ProfileData {
  name: string;
  fullName: string;
  email: string;
  phone: string;
  username: string;
  profilePhoto: File | null;
  gender: string;
  dateOfBirth: string;
  maritalStatus: string;
  otp: string;
  employeeId?: string;
  department?: string;
  title?: string;
  location?: string;
  joiningDate?: string;
}

interface AttendanceRecord {
  id: number;
  checkIn: string;
  checkOut: string | null;
  status: string;
  createdAt: string;
}

interface WeeklyData {
  week: string;
  hours: number;
}

interface Statistics {
  attendancePercentage: number;
  averageHours: string;
  leaveBalance: number;
  streak: number;
}

const ProfilePage: React.FC = () => {
  const router = useRouter();
  const { user, loading: authLoading, refreshUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [profileData, setProfileData] = useState<ProfileData>({
    name: '',
    fullName: '',
    email: '',
    phone: '',
    username: '',
    profilePhoto: null,
    gender: '',
    dateOfBirth: '',
    maritalStatus: '',
    otp: ''
  });
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([]);
  const [statistics, setStatistics] = useState<Statistics>({
    attendancePercentage: 0,
    averageHours: '0h 0m',
    leaveBalance: 0,
    streak: 0
  });

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchAttendanceData();
    }
  }, [user, selectedMonth, selectedYear]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get('/profile/me');
      const userData = response.data;
      setProfileData({
        name: userData.name || '',
        fullName: userData.fullName || '',
        email: userData.email || '',
        phone: userData.phone || userData.mobileNumber || '',
        username: userData.username || '',
        profilePhoto: null,
        gender: userData.gender || '',
        dateOfBirth: userData.dateOfBirth ? userData.dateOfBirth.split('T')[0] : '',
        maritalStatus: userData.maritalStatus || '',
        otp: '',
        employeeId: userData.employeeId || '',
        department: userData.department || '',
        title: userData.title || '',
        location: userData.location || '',
        joiningDate: userData.createdAt || userData.joiningDate || ''
      });
      if (userData.profilePhoto) {
        setPreviewPhoto(`http://localhost:5000${userData.profilePhoto}`);
      }
      setPhoneVerified(userData.isMobileVerified || false);
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Failed to fetch profile');
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendanceData = async () => {
    try {
      // Get all attendance records for calculations
      const startDate = new Date(selectedYear, selectedMonth, 1).toISOString().split('T')[0];
      const endDate = new Date(selectedYear, selectedMonth + 1, 0).toISOString().split('T')[0];
      
      const response = await axiosInstance.get(`/attendance/my-attendance?startDate=${startDate}&endDate=${endDate}&limit=100`);
      const records: AttendanceRecord[] = response.data.attendances || [];
      setAttendanceRecords(records);

      // Calculate statistics
      calculateStatistics(records);
      
      // Calculate weekly data for chart
      calculateWeeklyData(records);
    } catch (error) {
      console.error('Error fetching attendance:', error);
    }
  };

  const calculateStatistics = (records: AttendanceRecord[]) => {
    if (records.length === 0) {
      setStatistics({
        attendancePercentage: 0,
        averageHours: '0h 0m',
        leaveBalance: 12, // Default leave balance
        streak: 0
      });
      return;
    }

    // Calculate attendance percentage (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentRecords = records.filter(r => new Date(r.checkIn) >= thirtyDaysAgo);
    const presentDays = recentRecords.filter(r => r.status === 'present' || r.status === 'half-day').length;
    const attendancePercentage = (presentDays / 30) * 100;

    // Calculate average hours
    const recordsWithCheckout = records.filter(r => r.checkOut);
    let totalMinutes = 0;
    recordsWithCheckout.forEach(record => {
      const checkIn = new Date(record.checkIn);
      const checkOut = new Date(record.checkOut!);
      const diffMs = checkOut.getTime() - checkIn.getTime();
      const diffMinutes = diffMs / (1000 * 60);
      totalMinutes += diffMinutes;
    });
    const avgMinutes = recordsWithCheckout.length > 0 ? totalMinutes / recordsWithCheckout.length : 0;
    const avgHours = Math.floor(avgMinutes / 60);
    const avgMins = Math.floor(avgMinutes % 60);
    const averageHours = `${avgHours}h ${avgMins}m`;

    // Calculate streak (consecutive present days)
    let streak = 0;
    const sortedRecords = [...records].sort((a, b) => 
      new Date(b.checkIn).getTime() - new Date(a.checkIn).getTime()
    );
    
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < sortedRecords.length; i++) {
      const recordDate = new Date(sortedRecords[i].checkIn);
      recordDate.setHours(0, 0, 0, 0);
      
      const daysDiff = Math.floor((currentDate.getTime() - recordDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff === streak && (sortedRecords[i].status === 'present' || sortedRecords[i].status === 'half-day')) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else if (daysDiff > streak) {
        break;
      }
    }

    setStatistics({
      attendancePercentage: Math.round(attendancePercentage * 10) / 10,
      averageHours,
      leaveBalance: 12, // This would come from a leave management system
      streak
    });
  };

  const calculateWeeklyData = (records: AttendanceRecord[]) => {
    const weeks: WeeklyData[] = [];
    const firstDay = new Date(selectedYear, selectedMonth, 1);
    const lastDay = new Date(selectedYear, selectedMonth + 1, 0);
    
    // Get all days in the month
    const weeksInMonth: { [key: string]: number[] } = {};
    
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(selectedYear, selectedMonth, day);
      const weekNum = Math.ceil(day / 7);
      const weekKey = `W${weekNum}`;
      
      if (!weeksInMonth[weekKey]) {
        weeksInMonth[weekKey] = [];
      }
      
      // Find attendance for this day
      const dayRecords = records.filter(r => {
        const checkInDate = new Date(r.checkIn);
        return checkInDate.getDate() === day && 
               checkInDate.getMonth() === selectedMonth &&
               checkInDate.getFullYear() === selectedYear &&
               r.checkOut;
      });
      
      dayRecords.forEach(record => {
        const checkIn = new Date(record.checkIn);
        const checkOut = new Date(record.checkOut!);
        const hours = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
        weeksInMonth[weekKey].push(hours);
      });
    }
    
    // Calculate total hours per week
    Object.keys(weeksInMonth).forEach(weekKey => {
      const totalHours = weeksInMonth[weekKey].reduce((sum, hours) => sum + hours, 0);
      weeks.push({ week: weekKey, hours: Math.round(totalHours * 10) / 10 });
    });
    
    // Ensure we have 4 weeks
    while (weeks.length < 4) {
      weeks.push({ week: `W${weeks.length + 1}`, hours: 0 });
    }
    
    setWeeklyData(weeks.slice(0, 4));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setProfileData({ ...profileData, [name]: value });
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
      setProfileData({ ...profileData, profilePhoto: file });
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSendOtp = async () => {
    if (!profileData.phone || !/^[0-9]{10}$/.test(profileData.phone)) {
      toast.error('Please enter a valid 10-digit phone number');
      return;
    }

    setSendingOtp(true);
    try {
      const response = await axios.post('http://localhost:5000/api/otp/send', {
        mobileNumber: profileData.phone
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
    if (!profileData.otp || !/^[0-9]{4}$/.test(profileData.otp)) {
      toast.error('Please enter a valid 4-digit OTP');
      return;
    }

    try {
      const response = await axios.post('http://localhost:5000/api/otp/verify', {
        mobileNumber: profileData.phone,
        otp: profileData.otp
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const formData = new FormData();
      if (profileData.fullName) formData.append('fullName', profileData.fullName);
      if (profileData.email) formData.append('email', profileData.email);
      if (profileData.phone) {
        formData.append('phone', profileData.phone);
        if (!phoneVerified && profileData.otp) {
          formData.append('otp', profileData.otp);
        }
      }
      if (profileData.username) formData.append('username', profileData.username);
      if (profileData.gender) formData.append('gender', profileData.gender);
      if (profileData.dateOfBirth) formData.append('dateOfBirth', profileData.dateOfBirth);
      if (profileData.maritalStatus) formData.append('maritalStatus', profileData.maritalStatus);
      if (profileData.profilePhoto) {
        formData.append('profilePhoto', profileData.profilePhoto);
      }

      const response = await axiosInstance.put('/profile/update', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      toast.success('Profile updated successfully!');
      await refreshUser();
      setIsEditing(false);
      fetchProfile();
    } catch (error: any) {
      const message = error.response?.data?.message || error.response?.data?.errors?.[0]?.msg || 'Failed to update profile';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    }
  };

  const calculateHours = (checkIn: string, checkOut: string | null) => {
    if (!checkOut) return 'Active';
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const diffMs = checkOutDate.getTime() - checkInDate.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present':
        return 'bg-green-100 text-green-700';
      case 'late':
        return 'bg-yellow-100 text-yellow-700';
      case 'absent':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusLabel = (record: AttendanceRecord) => {
    if (!record.checkOut) return 'Present';
    const checkIn = new Date(record.checkIn);
    const expectedCheckIn = new Date(checkIn);
    expectedCheckIn.setHours(9, 0, 0, 0);
    
    if (checkIn > expectedCheckIn) {
      return 'Late';
    }
    return record.status === 'present' ? 'Present' : record.status;
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
    'July', 'August', 'September', 'October', 'November', 'December'];

  // Default work schedule (can be customized)
  const workSchedule = [
    { day: 'Mon', time: '09:00 AM - 05:00 PM', status: 'active' },
    { day: 'Tue', time: '09:00 AM - 05:00 PM', status: 'active' },
    { day: 'Wed', time: '09:00 AM - 05:00 PM', status: 'active' },
    { day: 'Thu', time: 'Remote Work', status: 'remote' },
    { day: 'Fri', time: '09:00 AM - 05:00 PM', status: 'active' },
    { day: 'Sat', time: 'Weekend', status: 'weekend' },
    { day: 'Sun', time: 'Weekend', status: 'weekend' }
  ];

  if (authLoading || loading) {
    return (
      <PrivateRoute>
        <Navbar />
        <div className="flex justify-center items-center h-screen">
          <div className="text-lg">Loading...</div>
        </div>
      </PrivateRoute>
    );
  }

  const displayName = profileData.fullName || profileData.name || 'User';
  const displayTitle = profileData.title || 'Employee';
  const displayLocation = profileData.location || 'Not set';
  const displayDepartment = profileData.department || 'Not set';
  const joiningDate = profileData.joiningDate 
    ? new Date(profileData.joiningDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'Not set';

  return (
    <PrivateRoute>
      <Navbar />
      <div className="min-h-screen bg-gray-50 py-6 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header Section */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-6">
            <div className="relative bg-gradient-to-r from-blue-600 to-indigo-700 px-8 py-8">
              <button className="absolute top-4 right-4 text-white hover:bg-white/20 px-4 py-2 rounded-lg transition-colors flex items-center gap-2">
                <ImageIcon size={16} />
                Edit Cover
              </button>
              
              <div className="flex items-center justify-between mt-8">
                <div className="flex items-center gap-6">
                  <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center overflow-hidden shadow-lg">
                    {previewPhoto ? (
                      <img src={previewPhoto} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-12 h-12 text-blue-600" />
                    )}
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-white mb-1">{displayName}</h1>
                    <p className="text-blue-100 text-lg mb-1">{displayTitle}</p>
                    <div className="flex items-center gap-1 text-blue-200">
                      <MapPin size={16} />
                      <span>{displayLocation}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  {!isEditing ? (
                    <>
                      <button
                        onClick={() => router.push('/dashboard')}
                        className="flex items-center gap-2 px-6 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
                      >
                        <CalendarIcon size={18} />
                        Request Leave
                      </button>
                      <button
                        onClick={() => setIsEditing(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
                      >
                        <Edit2 size={18} />
                        Edit Profile
                      </button>
                    </>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setIsEditing(false);
                          fetchProfile();
                        }}
                        className="flex items-center gap-2 px-6 py-3 bg-white text-gray-600 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                      >
                        <X size={18} />
                        Cancel
                      </button>
                      <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="flex items-center gap-2 px-6 py-3 bg-white text-green-600 rounded-lg font-semibold hover:bg-green-50 transition-colors disabled:opacity-50"
                      >
                        <Save size={18} />
                        {submitting ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-6 bg-white">
              <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                    <CheckCircle2 className="text-white" size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-green-600 uppercase">Attendance</p>
                    <p className="text-2xl font-bold text-gray-900">{statistics.attendancePercentage}%</p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                    <Clock className="text-white" size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-blue-600 uppercase">Ave. Hours</p>
                    <p className="text-2xl font-bold text-gray-900">{statistics.averageHours}</p>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-yellow-500 rounded-lg flex items-center justify-center">
                    <Briefcase className="text-white" size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-yellow-600 uppercase">Leave Balance</p>
                    <p className="text-2xl font-bold text-gray-900">{statistics.leaveBalance} Days</p>
                  </div>
                </div>
              </div>

              <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                    <Award className="text-white" size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-purple-600 uppercase">Streak</p>
                    <p className="text-2xl font-bold text-gray-900">{statistics.streak} Days</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-6">
              {/* Personal Information */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                  <User className="text-blue-600" size={20} />
                  <h2 className="text-xl font-bold text-gray-900">Personal Information</h2>
                </div>
                {isEditing ? (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name</label>
                      <input
                        type="text"
                        name="fullName"
                        value={profileData.fullName}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                      <input
                        type="email"
                        name="email"
                        value={profileData.email}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Phone</label>
                      <div className="flex gap-2">
                        <input
                          type="tel"
                          name="phone"
                          value={profileData.phone}
                          onChange={handleChange}
                          maxLength={10}
                          disabled={phoneVerified}
                          className={`flex-1 px-4 py-2 border-2 rounded-lg focus:outline-none ${
                            phoneVerified ? 'border-green-500 bg-green-50' : 'border-gray-200 focus:border-blue-500'
                          }`}
                        />
                        {!phoneVerified && (
                          <button
                            type="button"
                            onClick={handleSendOtp}
                            disabled={sendingOtp || !profileData.phone || !/^[0-9]{10}$/.test(profileData.phone)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
                          >
                            {sendingOtp ? 'Sending...' : 'Send OTP'}
                          </button>
                        )}
                      </div>
                      {!phoneVerified && profileData.phone && (
                        <div className="mt-2 flex gap-2">
                          <input
                            type="text"
                            name="otp"
                            value={profileData.otp}
                            onChange={handleChange}
                            placeholder="Enter OTP"
                            maxLength={4}
                            className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={handleVerifyOtp}
                            className="px-4 py-2 bg-gray-700 text-white rounded-lg font-semibold hover:bg-gray-800"
                          >
                            Verify
                          </button>
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Profile Photo</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg"
                      />
                    </div>
                  </form>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Employee ID</p>
                      <p className="text-gray-900 font-medium">{profileData.employeeId || 'Not set'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Email Address</p>
                      <a href={`mailto:${profileData.email}`} className="text-blue-600 hover:underline font-medium">
                        {profileData.email || 'Not set'}
                      </a>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Phone</p>
                      <div className="flex items-center gap-2">
                        <a href={`tel:${profileData.phone}`} className="text-blue-600 hover:underline font-medium">
                          {profileData.phone ? `+1 (${profileData.phone.slice(0, 3)}) ${profileData.phone.slice(3, 6)}-${profileData.phone.slice(6)}` : 'Not set'}
                        </a>
                        {phoneVerified && <CheckCircle size={16} className="text-green-500" />}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Department</p>
                      <p className="text-gray-900 font-medium">{displayDepartment}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Joining Date</p>
                      <p className="text-gray-900 font-medium">{joiningDate}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Work Schedule */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Calendar className="text-blue-600" size={20} />
                  <h2 className="text-xl font-bold text-gray-900">Work Schedule</h2>
                </div>
                <div className="space-y-2">
                  {workSchedule.map((schedule, index) => (
                    <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                      <span className="font-medium text-gray-700">{schedule.day}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-gray-600">{schedule.time}</span>
                        <div className={`w-2 h-2 rounded-full ${
                          schedule.status === 'active' ? 'bg-green-500' :
                          schedule.status === 'remote' ? 'bg-blue-500' :
                          'bg-gray-300'
                        }`} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Monthly Attendance Chart */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="text-blue-600" size={20} />
                    <h2 className="text-xl font-bold text-gray-900">Monthly Attendance</h2>
                  </div>
                  <select
                    value={`${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`}
                    onChange={(e) => {
                      const [year, month] = e.target.value.split('-');
                      setSelectedYear(parseInt(year));
                      setSelectedMonth(parseInt(month) - 1);
                    }}
                    className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                  >
                    {Array.from({ length: 12 }, (_, i) => {
                      const date = new Date();
                      date.setMonth(date.getMonth() - i);
                      return (
                        <option key={i} value={`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`}>
                          {monthNames[date.getMonth()]} {date.getFullYear()}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weeklyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="week" stroke="#6b7280" />
                      <YAxis stroke="#6b7280" domain={[0, 50]} />
                      <Tooltip 
                        formatter={(value: number) => [`${value} hours`, 'Hours Worked']}
                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                      />
                      <ReferenceLine y={40} stroke="#ef4444" strokeDasharray="5 5" label={{ value: 'Target Hours', position: 'top' }} />
                      <Bar dataKey="hours" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex items-center gap-4 mt-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-blue-500 rounded"></div>
                    <span className="text-gray-600">Hours Worked</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-1 border-t-2 border-dashed border-red-500"></div>
                    <span className="text-gray-600">Target Hours</span>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="text-blue-600" size={20} />
                    <h2 className="text-xl font-bold text-gray-900">Recent Activity</h2>
                  </div>
                  <button className="text-blue-600 hover:underline text-sm font-semibold">
                    View All
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 px-2 text-xs font-semibold text-gray-600 uppercase">Date</th>
                        <th className="text-left py-2 px-2 text-xs font-semibold text-gray-600 uppercase">Check In</th>
                        <th className="text-left py-2 px-2 text-xs font-semibold text-gray-600 uppercase">Check Out</th>
                        <th className="text-left py-2 px-2 text-xs font-semibold text-gray-600 uppercase">Total Hrs</th>
                        <th className="text-left py-2 px-2 text-xs font-semibold text-gray-600 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendanceRecords.slice(0, 5).map((record) => (
                        <tr key={record.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-2 text-sm text-gray-700">{formatDate(record.checkIn)}</td>
                          <td className="py-3 px-2 text-sm text-gray-700">{formatTime(record.checkIn)}</td>
                          <td className="py-3 px-2 text-sm text-gray-700">{record.checkOut ? formatTime(record.checkOut) : '---'}</td>
                          <td className="py-3 px-2 text-sm text-gray-700">{calculateHours(record.checkIn, record.checkOut)}</td>
                          <td className="py-3 px-2">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(getStatusLabel(record))}`}>
                              {getStatusLabel(record)}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {attendanceRecords.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-gray-500">
                            No attendance records found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PrivateRoute>
  );
};

export default ProfilePage;
