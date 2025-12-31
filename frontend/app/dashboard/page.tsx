'use client'

import React, { useState, useEffect, useRef } from 'react';
import axiosInstance from '../utils/axios';
import toast from 'react-hot-toast';
import PrivateRoute from '../components/PrivateRoute';
import { useAuth } from '../context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import ChangePasswordModal from '../components/ChangePasswordModal';
import { 
  LayoutDashboard, Calendar, Plane, RotateCcw, User, 
  LogOut, Clock, Bell, Coffee, LogIn, LogOut as LogOutIcon,
  MapPin, TrendingUp, Briefcase, ChevronDown, ArrowRight, History, Settings
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';

interface TodayStatus {
  checkedIn: boolean;
  checkedOut: boolean;
  attendance?: {
    checkIn: string;
    checkOut?: string;
  };
}

interface DashboardStats {
  period: string;
  statistics: {
    attendancePercentage: number;
    leaveBalance: number;
    streak: number;
  };
  chartData: Array<{
    label: string;
    hours?: number;
  }>;
}

interface AttendanceRecord {
  id: number;
  checkIn: string;
  checkOut: string | null;
  status: string;
  createdAt: string;
}

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [todayStatus, setTodayStatus] = useState<TodayStatus | null>(null);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [recentAttendance, setRecentAttendance] = useState<AttendanceRecord[]>([]);
  const [weeklyData, setWeeklyData] = useState<Array<{day: string; hours: number}>>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [currentTime, setCurrentTime] = useState('');
  const [elapsedTime, setElapsedTime] = useState('0h 0m');
  const [userProfile, setUserProfile] = useState<any>(null);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowUserDropdown(false);
      }
    };

    if (showUserDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserDropdown]);

  useEffect(() => {
    if (!user) return;
    
    if (user.role === 'admin') {
      router.push('/dashboard/admin');
      return;
    }
    
    fetchAllData();
  }, [user]);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      }));
      
      // Update elapsed time if checked in
      if (todayStatus?.attendance?.checkIn && !todayStatus?.checkedOut) {
        const checkInTime = new Date(todayStatus.attendance.checkIn);
        const diffMs = now.getTime() - checkInTime.getTime();
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        setElapsedTime(`${hours}h ${minutes}m`);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [todayStatus]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchTodayStatus(),
        fetchDashboardStats(),
        fetchRecentAttendance(),
        fetchUserProfile(),
        fetchWeeklyData()
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchWeeklyData = async () => {
    try {
      const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
      const today = new Date();
      const currentDay = today.getDay();
      const monday = new Date(today);
      monday.setDate(today.getDate() - (currentDay === 0 ? 6 : currentDay - 1));
      
      const weekStart = new Date(monday);
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(monday);
      weekEnd.setDate(weekEnd.getDate() + 4);
      weekEnd.setHours(23, 59, 59, 999);
      
      const attendanceResponse = await axiosInstance.get(
        `/attendance/my-attendance?startDate=${weekStart.toISOString().split('T')[0]}&endDate=${weekEnd.toISOString().split('T')[0]}&limit=100`
      );
      
      const weekAttendance = attendanceResponse.data.attendances || [];
      
      const data = weekDays.map((day, index) => {
        const dayDate = new Date(monday);
        dayDate.setDate(monday.getDate() + index);
        dayDate.setHours(0, 0, 0, 0);
        const nextDay = new Date(dayDate);
        nextDay.setDate(nextDay.getDate() + 1);
        
        const dayRecords = weekAttendance.filter((a: any) => {
          const checkIn = new Date(a.checkIn);
          return checkIn >= dayDate && checkIn < nextDay && a.checkOut;
        });
        
        let hours = 0;
        dayRecords.forEach((record: any) => {
          const checkIn = new Date(record.checkIn);
          const checkOut = new Date(record.checkOut);
          hours += (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
        });
        
        return {
          day,
          hours: parseFloat(hours.toFixed(1))
        };
      });
      
      setWeeklyData(data);
    } catch (error) {
      console.error('Error fetching weekly data:', error);
      setWeeklyData([
        { day: 'Mon', hours: 0 },
        { day: 'Tue', hours: 0 },
        { day: 'Wed', hours: 0 },
        { day: 'Thu', hours: 0 },
        { day: 'Fri', hours: 0 }
      ]);
    }
  };

  const fetchTodayStatus = async () => {
    try {
      const response = await axiosInstance.get('/attendance/today-status');
      setTodayStatus(response.data);
      if (response.data.attendance?.checkIn && !response.data.checkedOut) {
        const checkInTime = new Date(response.data.attendance.checkIn);
        const now = new Date();
        const diffMs = now.getTime() - checkInTime.getTime();
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        setElapsedTime(`${hours}h ${minutes}m`);
      } else {
        setElapsedTime('0h 0m');
      }
    } catch (error) {
      console.error('Error fetching today status:', error);
    }
  };

  const fetchDashboardStats = async () => {
    try {
      const response = await axiosInstance.get('/attendance/dashboard-stats?period=monthly');
      setDashboardStats(response.data);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    }
  };

  const fetchRecentAttendance = async () => {
    try {
      const response = await axiosInstance.get('/attendance/my-attendance?limit=3');
      setRecentAttendance(response.data.attendances || []);
    } catch (error) {
      console.error('Error fetching recent attendance:', error);
    }
  };

  const fetchUserProfile = async () => {
    try {
      const response = await axiosInstance.get('/profile/me');
      setUserProfile(response.data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };


  const handleCheckIn = async () => {
    setChecking(true);
    try {
      await axiosInstance.post('/attendance/checkin');
      toast.success('Checked in successfully!');
      fetchAllData();
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to check in';
      toast.error(message);
    } finally {
      setChecking(false);
    }
  };

  const handleCheckOut = async () => {
    setChecking(true);
    try {
      await axiosInstance.post('/attendance/checkout');
      toast.success('Checked out successfully!');
      fetchAllData();
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to check out';
      toast.error(message);
    } finally {
      setChecking(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const calculateHours = (checkIn: string, checkOut: string | null) => {
    if (!checkOut) return '0h 00m';
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const diffMs = checkOutDate.getTime() - checkInDate.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
  };

  const getStatusBadge = (status: string, checkIn: string, checkOut: string | null) => {
    if (!checkOut) {
      if (status === 'absent') {
        return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">Absent</span>;
      }
      return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">Present</span>;
    }
    
    const checkInTime = new Date(checkIn);
    const expectedCheckIn = new Date(checkInTime);
    expectedCheckIn.setHours(9, 15, 0, 0);
    
    if (checkInTime > expectedCheckIn) {
      return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700">Late</span>;
    }
    
    return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">Present</span>;
  };


  // Get today's timeline events
  const getTodayTimeline = () => {
    const events = [];
    
    if (todayStatus?.attendance?.checkIn) {
      const checkInTime = new Date(todayStatus.attendance.checkIn);
      const isLate = checkInTime.getHours() > 9 || (checkInTime.getHours() === 9 && checkInTime.getMinutes() > 15);
      
      events.push({
        time: formatTime(todayStatus.attendance.checkIn),
        title: 'Check In',
        status: isLate ? 'Late' : 'On Time',
        location: 'Web Portal',
        color: isLate ? 'yellow' : 'green',
        completed: true
      });
    }
    
    // Add scheduled events (these would come from a calendar/events API)
    events.push({
      time: '11:30 AM',
      title: 'Meeting with Product Team',
      location: 'Conference Room A',
      color: 'blue',
      completed: false
    });
    
    events.push({
      time: '01:00 PM',
      title: 'Lunch Break',
      location: 'Scheduled',
      color: 'gray',
      completed: false
    });
    
    if (todayStatus?.checkedOut && todayStatus?.attendance?.checkOut) {
      events.push({
        time: formatTime(todayStatus.attendance.checkOut),
        title: 'Check Out',
        location: 'Scheduled',
        color: 'gray',
        completed: true
      });
    } else {
      events.push({
        time: '06:00 PM',
        title: 'Check Out',
        location: 'Scheduled',
        color: 'gray',
        completed: false
      });
    }
    
    return events;
  };

  if (loading) {
    return (
      <PrivateRoute>
        <div className="flex justify-center items-center h-screen">
          <div className="text-lg">Loading...</div>
        </div>
      </PrivateRoute>
    );
  }

  const displayName = userProfile?.fullName || user?.name || 'User';
  const displayTitle = userProfile?.title || 'Employee';
  const attendanceRate = dashboardStats?.statistics?.attendancePercentage || 0;
  const leaveBalance = dashboardStats?.statistics?.leaveBalance || 12;
  const targetRate = 95;
  const difference = attendanceRate - targetRate;

  return (
    <PrivateRoute>
      <div className="min-h-screen bg-gray-50 flex">
        {/* Left Sidebar */}
        <div className="w-64 bg-white shadow-lg">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-800">Attendify</span>
            </div>
          </div>
          
          <nav className="p-4 space-y-2">
            <Link 
              href="/dashboard" 
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                pathname === '/dashboard' 
                  ? 'bg-purple-50 text-purple-600 font-semibold' 
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <LayoutDashboard className="w-5 h-5" />
              Dashboard
            </Link>
            <Link 
              href="/history" 
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Calendar className="w-5 h-5" />
              My Attendance
            </Link>
            <Link 
              href="/dashboard" 
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Plane className="w-5 h-5" />
              Leave Request
            </Link>
          </nav>

          {/* Shift Status */}
          <div className="p-4 mt-auto">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm font-semibold text-gray-700">Shift Status</span>
              </div>
              <p className="text-xs text-gray-600">9:00 AM - 6:00 PM</p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Top Header */}
          <header className="bg-white shadow-sm border-b border-gray-200 px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h2 className="text-lg font-semibold text-gray-800">
                  Welcome back, {displayName.split(' ')[0]}! 👋
                </h2>
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2 text-gray-600">
                  <Clock className="w-5 h-5" />
                  <span className="text-sm font-medium">{currentTime}</span>
                </div>
                <button className="text-gray-600 hover:text-gray-800">
                  <Bell className="w-5 h-5" />
                </button>
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setShowUserDropdown(!showUserDropdown)}
                    className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                  >
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-800">{displayName}</p>
                      <p className="text-xs text-gray-500">{displayTitle}</p>
                    </div>
                    <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-gray-200 cursor-pointer">
                      {userProfile?.profilePhoto ? (
                        <img 
                          src={`http://localhost:5000${userProfile.profilePhoto}`} 
                          alt={displayName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-indigo-100 flex items-center justify-center">
                          <User className="w-6 h-6 text-indigo-600" />
                        </div>
                      )}
                    </div>
                  </button>
                  
                  {/* User Dropdown Menu */}
                  {showUserDropdown && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50">
                      <div className="px-4 py-3 border-b border-gray-200">
                        <p className="text-sm font-semibold text-gray-900">{displayName}</p>
                        <p className="text-xs text-gray-500">{userProfile?.email || user?.email}</p>
                      </div>
                      <Link
                        href="/profile"
                        onClick={() => setShowUserDropdown(false)}
                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        <User size={18} className="text-indigo-600" />
                        Profile
                      </Link>
                      <Link
                        href="/history"
                        onClick={() => setShowUserDropdown(false)}
                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        <History size={18} className="text-indigo-600" />
                        History
                      </Link>
                      <button
                        onClick={() => {
                          setShowUserDropdown(false);
                          setShowChangePasswordModal(true);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        <Settings size={18} className="text-indigo-600" />
                        Change Password
                      </button>
                      <div className="border-t border-gray-200 my-1"></div>
                      <button
                        onClick={() => { 
                          setShowUserDropdown(false);
                          logout(); 
                          router.push('/auth'); 
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <LogOut size={18} />
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </header>

          {/* Main Content Area */}
          <main className="flex-1 p-6 overflow-y-auto">
            <div className="grid grid-cols-12 gap-6">
              {/* Left Column - Main Cards */}
              <div className="col-span-12 lg:col-span-8 space-y-6">
                {/* Top Row Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Current Session Card */}
                  <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl shadow-lg p-6 text-white">
                    <h3 className="text-sm font-semibold text-purple-100 mb-4">Current Session</h3>
                    <div className="text-4xl font-bold mb-4">{elapsedTime}</div>
                    {todayStatus?.checkedIn && !todayStatus?.checkedOut && todayStatus?.attendance?.checkIn && (
                      <div className="flex items-center gap-2 text-purple-100 text-sm mb-6">
                        <MapPin className="w-4 h-4" />
                        <span>Checked in at {formatTime(todayStatus.attendance.checkIn)} (Remote)</span>
                      </div>
                    )}
                    {!todayStatus?.checkedIn && (
                      <button
                        onClick={handleCheckIn}
                        disabled={checking}
                        className="w-full py-2 px-4 bg-white text-purple-600 rounded-lg font-semibold hover:bg-purple-50 transition-colors disabled:opacity-50"
                      >
                        Check In
                      </button>
                    )}
                    {todayStatus?.checkedIn && !todayStatus?.checkedOut && (
                      <div className="flex gap-2">
                        <button className="flex-1 py-2 px-4 bg-white/20 text-white rounded-lg font-semibold hover:bg-white/30 transition-colors flex items-center justify-center gap-2">
                          <Coffee className="w-4 h-4" />
                          Break
                        </button>
                        <button
                          onClick={handleCheckOut}
                          disabled={checking}
                          className="flex-1 py-2 px-4 bg-white text-purple-600 rounded-lg font-semibold hover:bg-purple-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          <LogOutIcon className="w-4 h-4" />
                          Check Out
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Attendance Rate Card */}
                  <div className="bg-white rounded-xl shadow-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold text-gray-700">Attendance Rate</h3>
                      <TrendingUp className="w-5 h-5 text-green-500" />
                    </div>
                    <div className="text-4xl font-bold text-gray-800 mb-2">{attendanceRate.toFixed(0)}%</div>
                    <div className="flex items-center justify-between text-sm mb-3">
                      <span className="text-gray-500">Target: {targetRate}%</span>
                      <span className={`font-semibold ${difference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {difference >= 0 ? '+' : ''}{difference.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${difference >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
                        style={{ width: `${Math.min(attendanceRate, 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Leave Balance Card */}
                  <div className="bg-white rounded-xl shadow-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold text-gray-700">Leave Balance</h3>
                      <Briefcase className="w-5 h-5 text-orange-500" />
                    </div>
                    <div className="text-3xl font-bold text-gray-800 mb-4">
                      <span className="font-bold">{leaveBalance}</span>
                      <span className="text-gray-400 font-normal"> / 24 Days</span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">8 Sick</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">4 Casual</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Weekly Activity Card */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-gray-800">Weekly Activity</h3>
                    <div className="flex items-center gap-2 px-3 py-1 border border-gray-300 rounded-lg cursor-pointer">
                      <span className="text-sm text-gray-700">This Week</span>
                      <ChevronDown className="w-4 h-4 text-gray-500" />
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={weeklyData}>
                      <XAxis dataKey="day" stroke="#6b7280" />
                      <YAxis stroke="#6b7280" domain={[0, 12]} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                        formatter={(value: number) => [`${value} hours`, 'Hours']}
                      />
                      <Bar dataKey="hours" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Today's Timeline Card */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-6">Today's Timeline</h3>
                  <div className="space-y-4">
                    {getTodayTimeline().map((event, index) => (
                      <div key={index} className="flex items-start gap-4">
                        <div className="flex flex-col items-center">
                          <div className={`w-3 h-3 rounded-full ${
                            event.color === 'green' ? 'bg-green-500' :
                            event.color === 'yellow' ? 'bg-yellow-500' :
                            event.color === 'blue' ? 'bg-blue-500' :
                            'bg-gray-300'
                          }`}></div>
                          {index < getTodayTimeline().length - 1 && (
                            <div className="w-0.5 h-12 bg-gray-200 mt-1"></div>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-semibold text-gray-800">{event.time}</span>
                            <span className={`text-xs px-2 py-1 rounded ${
                              event.color === 'green' ? 'bg-green-100 text-green-700' :
                              event.color === 'yellow' ? 'bg-yellow-100 text-yellow-700' :
                              event.color === 'blue' ? 'bg-blue-100 text-blue-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {event.status || event.location}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">{event.title}</p>
                          <p className="text-xs text-gray-500 mt-1">{event.location}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column - Sidebar */}
              <div className="col-span-12 lg:col-span-4 space-y-6">
                {/* Recent Attendance Logs */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-800">Recent Attendance Logs</h3>
                    <Link href="/history" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                      View All
                    </Link>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-2 text-xs font-semibold text-gray-600 uppercase">Date</th>
                          <th className="text-left py-2 text-xs font-semibold text-gray-600 uppercase">Check In</th>
                          <th className="text-left py-2 text-xs font-semibold text-gray-600 uppercase">Check Out</th>
                          <th className="text-left py-2 text-xs font-semibold text-gray-600 uppercase">Work Hrs</th>
                          <th className="text-left py-2 text-xs font-semibold text-gray-600 uppercase">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentAttendance.map((record) => (
                          <tr key={record.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 text-xs text-gray-700">{formatDate(record.checkIn)}</td>
                            <td className="py-3 text-xs text-gray-700">{formatTime(record.checkIn)}</td>
                            <td className="py-3 text-xs text-gray-700">
                              {record.checkOut ? formatTime(record.checkOut) : '---'}
                            </td>
                            <td className="py-3 text-xs text-gray-700">
                              {calculateHours(record.checkIn, record.checkOut)}
                            </td>
                            <td className="py-3">
                              {getStatusBadge(record.status, record.checkIn, record.checkOut)}
                            </td>
                          </tr>
                        ))}
                        {recentAttendance.length === 0 && (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-sm text-gray-500">
                              No attendance records found
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Upcoming Holidays */}
                <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-xl shadow-lg p-6 text-white">
                  <h3 className="text-lg font-bold mb-4">Upcoming Holidays</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="px-3 py-1 bg-orange-500 rounded text-xs font-semibold">OCT 31</div>
                      <div className="flex-1">
                        <p className="font-semibold">Halloween</p>
                        <p className="text-xs text-indigo-200">Optional Holiday</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="px-3 py-1 bg-blue-500 rounded text-xs font-semibold">NOV 24</div>
                      <div className="flex-1">
                        <p className="font-semibold">Thanksgiving</p>
                        <p className="text-xs text-indigo-200">Public Holiday</p>
                      </div>
                    </div>
                  </div>
                  <button className="mt-4 w-full py-2 px-4 bg-white text-indigo-600 rounded-lg font-semibold hover:bg-indigo-50 transition-colors">
                    View Calendar
                  </button>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
      
      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={showChangePasswordModal}
        onClose={() => setShowChangePasswordModal(false)}
      />
    </PrivateRoute>
  );
};

export default Dashboard;
