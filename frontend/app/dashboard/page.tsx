'use client'

import React, { useState, useEffect } from 'react';
import axiosInstance from '../utils/axios';
import toast from 'react-hot-toast';
import EmployeeLayout from '../components/EmployeeLayout';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ChangePasswordModal from '../components/ChangePasswordModal';
import FaceCapture from '../components/FaceCapture';
import { 
  Clock, Bell, Coffee, LogOut as LogOutIcon,
  MapPin, TrendingUp, Briefcase, ChevronDown, User, UtensilsCrossed, X
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';

interface TodayStatus {
  checkedIn: boolean;
  checkedOut: boolean;
  attendance?: {
    checkIn: string;
    checkOut?: string;
    break1Start?: string;
    break1End?: string;
    break2Start?: string;
    break2End?: string;
    lunchStart?: string;
    lunchEnd?: string;
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

interface LeaveBalance {
  leaveType: string;
  totalDays: number;
  usedDays: number;
  remainingDays: number;
}

interface AttendanceRecord {
  id: number;
  checkIn: string;
  checkOut: string | null;
  status: string;
  createdAt: string;
}

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const router = useRouter();
  const [todayStatus, setTodayStatus] = useState<TodayStatus | null>(null);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [recentAttendance, setRecentAttendance] = useState<AttendanceRecord[]>([]);
  const [weeklyData, setWeeklyData] = useState<Array<{day: string; hours: number}>>([]);
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [currentTime, setCurrentTime] = useState('');
  const [elapsedTime, setElapsedTime] = useState('0h 0m');
  const [userProfile, setUserProfile] = useState<any>(null);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [showFaceCapture, setShowFaceCapture] = useState(false);
  const [pendingAction, setPendingAction] = useState<'checkin' | 'checkout' | 'break-start' | 'break-end' | null>(null);
  const [selectedBreakType, setSelectedBreakType] = useState<'break1' | 'lunch' | 'break2' | null>(null);
  const [showBreakModal, setShowBreakModal] = useState(false);

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
        fetchWeeklyData(),
        fetchLeaveBalances()
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaveBalances = async () => {
    try {
      const response = await axiosInstance.get('/leave/balance');
      setLeaveBalances(response.data.balances || []);
    } catch (error) {
      console.error('Error fetching leave balances:', error);
      setLeaveBalances([]);
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


  const handleFaceCaptured = async (imageData: string) => {
    if (!pendingAction) return;

    setShowFaceCapture(false);
    setChecking(true);

    try {
      // First verify face identity
      const verifyResponse = await axiosInstance.post('/face/verify', {
        imageData
      });

      if (!verifyResponse.data.verified) {
        toast.error('Face verification failed. Please try again.');
        setChecking(false);
        return;
      }

      // Face verified, proceed with action
      if (pendingAction === 'checkin') {
        await axiosInstance.post('/attendance/checkin', {
          faceImage: imageData
        });
        toast.success('Checked in successfully!');
      } else if (pendingAction === 'checkout') {
        await axiosInstance.post('/attendance/checkout', {
          faceImage: imageData
        });
        toast.success('Checked out successfully!');
      } else if (pendingAction === 'break-start' && selectedBreakType) {
        await axiosInstance.post('/attendance/break/start', {
          breakType: selectedBreakType,
          faceImage: imageData
        });
        const breakNames: { [key: string]: string } = {
          break1: 'Break 1',
          lunch: 'Lunch',
          break2: 'Break 2'
        };
        toast.success(`${breakNames[selectedBreakType]} started successfully!`);
        setSelectedBreakType(null);
      } else if (pendingAction === 'break-end' && selectedBreakType) {
        await axiosInstance.post('/attendance/break/end', {
          breakType: selectedBreakType,
          faceImage: imageData
        });
        const breakNames: { [key: string]: string } = {
          break1: 'Break 1',
          lunch: 'Lunch',
          break2: 'Break 2'
        };
        toast.success(`${breakNames[selectedBreakType]} ended successfully!`);
        setSelectedBreakType(null);
      }
      setPendingAction(null);
      fetchAllData();
    } catch (error: any) {
      const message = error.response?.data?.message || `Failed to ${pendingAction}`;
      toast.error(message);
      setPendingAction(null);
      setSelectedBreakType(null);
    } finally {
      setChecking(false);
    }
  };

  const handleCheckIn = () => {
    setPendingAction('checkin');
    setShowFaceCapture(true);
  };

  const handleCheckOut = () => {
    setPendingAction('checkout');
    setShowFaceCapture(true);
  };

  const handleFaceCaptureClose = () => {
    setShowFaceCapture(false);
    setPendingAction(null);
    setSelectedBreakType(null);
  };

  const handleBreakClick = () => {
    setShowBreakModal(true);
  };

  const handleStartBreak = async (breakType: 'break1' | 'lunch' | 'break2') => {
    setShowBreakModal(false);
    setChecking(true);
    try {
      await axiosInstance.post('/attendance/break/start', {
        breakType
      });
      const breakNames: { [key: string]: string } = {
        break1: 'Break 1',
        lunch: 'Lunch',
        break2: 'Break 2'
      };
      toast.success(`${breakNames[breakType]} started successfully!`);
      fetchAllData();
    } catch (error: any) {
      const message = error.response?.data?.message || `Failed to start ${breakType}`;
      toast.error(message);
    } finally {
      setChecking(false);
    }
  };

  const handleEndBreak = async (breakType: 'break1' | 'lunch' | 'break2') => {
    setShowBreakModal(false);
    setChecking(true);
    try {
      await axiosInstance.post('/attendance/break/end', {
        breakType
      });
      const breakNames: { [key: string]: string } = {
        break1: 'Break 1',
        lunch: 'Lunch',
        break2: 'Break 2'
      };
      toast.success(`${breakNames[breakType]} ended successfully!`);
      fetchAllData();
    } catch (error: any) {
      const message = error.response?.data?.message || `Failed to end ${breakType}`;
      toast.error(message);
    } finally {
      setChecking(false);
    }
  };

  const getBreakStatus = (breakType: 'break1' | 'lunch' | 'break2') => {
    if (!todayStatus?.attendance) return null;
    const startField = `${breakType}Start`;
    const endField = `${breakType}End`;
    const start = todayStatus.attendance[startField as keyof typeof todayStatus.attendance] as string | undefined;
    const end = todayStatus.attendance[endField as keyof typeof todayStatus.attendance] as string | undefined;
    
    if (!start) return 'not-started';
    if (start && !end) return 'active';
    return 'completed';
  };

  const getBreakDuration = (breakType: 'break1' | 'lunch' | 'break2') => {
    if (!todayStatus?.attendance) return null;
    const startField = `${breakType}Start`;
    const endField = `${breakType}End`;
    const start = todayStatus.attendance[startField as keyof typeof todayStatus.attendance] as string | undefined;
    const end = todayStatus.attendance[endField as keyof typeof todayStatus.attendance] as string | undefined;
    
    if (!start) return null;
    if (!end) {
      // Calculate elapsed time if break is active
      const startTime = new Date(start);
      const now = new Date();
      const diffMs = now.getTime() - startTime.getTime();
      const minutes = Math.floor(diffMs / (1000 * 60));
      return `${minutes}m`;
    }
    
    // Calculate completed duration
    const startTime = new Date(start);
    const endTime = new Date(end);
    const diffMs = endTime.getTime() - startTime.getTime();
    const minutes = Math.floor(diffMs / (1000 * 60));
    return `${minutes}m`;
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
    const events: Array<{time: string; title: string; status?: string; location: string; color: string; completed: boolean}> = [];
    
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

    // Add break events
    const breakTypes = [
      { type: 'break1' as const, name: 'Break 1', icon: Coffee },
      { type: 'lunch' as const, name: 'Lunch Break', icon: UtensilsCrossed },
      { type: 'break2' as const, name: 'Break 2', icon: Coffee }
    ];

    breakTypes.forEach(({ type, name }) => {
      const startField = `${type}Start`;
      const endField = `${type}End`;
      const start = todayStatus?.attendance?.[startField as keyof typeof todayStatus.attendance] as string | undefined;
      const end = todayStatus?.attendance?.[endField as keyof typeof todayStatus.attendance] as string | undefined;

      if (start) {
        events.push({
          time: formatTime(start),
          title: `${name} Started`,
          location: 'Web Portal',
          color: 'blue',
          completed: true
        });
      }

      if (end) {
        events.push({
          time: formatTime(end),
          title: `${name} Ended`,
          location: 'Web Portal',
          color: 'gray',
          completed: true
        });
      }
    });
    
    if (todayStatus?.checkedOut && todayStatus?.attendance?.checkOut) {
      events.push({
        time: formatTime(todayStatus.attendance.checkOut),
        title: 'Check Out',
        location: 'Web Portal',
        color: 'green',
        completed: true
      });
    }
    
    // Sort events by time
    return events.sort((a, b) => {
      const timeA = new Date(`2000-01-01 ${a.time}`).getTime();
      const timeB = new Date(`2000-01-01 ${b.time}`).getTime();
      return timeA - timeB;
    });
  };

  if (loading) {
    return (
      <EmployeeLayout>
        <div className="flex justify-center items-center h-screen">
          <div className="text-lg">Loading...</div>
        </div>
      </EmployeeLayout>
    );
  }

  const displayName = userProfile?.fullName || user?.name || 'User';
  const displayTitle = userProfile?.title || 'Employee';
  const attendanceRate = dashboardStats?.statistics?.attendancePercentage || 0;
  const totalLeaveBalance = leaveBalances.reduce((sum, balance) => sum + balance.remainingDays, 0) || dashboardStats?.statistics?.leaveBalance || 0;
  const targetRate = 95;
  const difference = attendanceRate - targetRate;

  return (
    <EmployeeLayout>
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
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-800">{displayName}</p>
                <p className="text-xs text-gray-500">{displayTitle}</p>
              </div>
              <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-gray-200">
                {userProfile?.profilePhoto ? (
                  <img 
                    src={`http://192.168.1.29:5000${userProfile.profilePhoto}`} 
                    alt={displayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-indigo-100 flex items-center justify-center">
                    <User className="w-6 h-6 text-indigo-600" />
                  </div>
                )}
              </div>
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
                        <button 
                          onClick={handleBreakClick}
                          className="flex-1 py-2 px-4 bg-white/20 text-white rounded-lg font-semibold hover:bg-white/30 transition-colors flex items-center justify-center gap-2"
                        >
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
                    
                    {/* Break Status */}
                    {todayStatus?.checkedIn && !todayStatus?.checkedOut && todayStatus?.attendance && (
                      <div className="mt-4 pt-4 border-t border-purple-400/30">
                        <div className="text-xs font-semibold text-purple-100 mb-2">Today's Breaks</div>
                        <div className="space-y-2">
                          {(['break1', 'lunch', 'break2'] as const).map((breakType) => {
                            const status = getBreakStatus(breakType);
                            const duration = getBreakDuration(breakType);
                            const breakNames: { [key: string]: string } = {
                              break1: 'Break 1',
                              lunch: 'Lunch',
                              break2: 'Break 2'
                            };
                            const breakIcons: { [key: string]: any } = {
                              break1: Coffee,
                              lunch: UtensilsCrossed,
                              break2: Coffee
                            };
                            const Icon = breakIcons[breakType];
                            
                            if (status === 'not-started') {
                              return (
                                <div key={breakType} className="flex items-center justify-between text-xs">
                                  <div className="flex items-center gap-2 text-purple-200">
                                    <Icon className="w-3 h-3" />
                                    <span>{breakNames[breakType]}</span>
                                  </div>
                                  <span className="text-purple-300">Not started</span>
                                </div>
                              );
                            } else if (status === 'active') {
                              return (
                                <div key={breakType} className="flex items-center justify-between text-xs">
                                  <div className="flex items-center gap-2 text-white font-semibold">
                                    <Icon className="w-3 h-3" />
                                    <span>{breakNames[breakType]}</span>
                                  </div>
                                  <span className="text-yellow-300 font-semibold">Active ({duration})</span>
                                </div>
                              );
                            } else {
                              return (
                                <div key={breakType} className="flex items-center justify-between text-xs">
                                  <div className="flex items-center gap-2 text-purple-200">
                                    <Icon className="w-3 h-3" />
                                    <span>{breakNames[breakType]}</span>
                                  </div>
                                  <span className="text-green-300">Completed ({duration})</span>
                                </div>
                              );
                            }
                          })}
                        </div>
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
                      <span className="font-bold">{totalLeaveBalance}</span>
                      <span className="text-gray-400 font-normal text-lg"> Days</span>
                    </div>
                    {leaveBalances.length > 0 && (
                      <div className="space-y-2 text-sm">
                        {leaveBalances.slice(0, 3).map((balance, index) => (
                          <div key={index} className="flex justify-between">
                            <span className="text-gray-600 capitalize">{balance.leaveType}</span>
                            <span className="text-gray-800 font-medium">{balance.remainingDays}</span>
                          </div>
                        ))}
                      </div>
                    )}
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
                {getTodayTimeline().length > 0 && (
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
                )}
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
              </div>
            </div>
          </main>
      
      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={showChangePasswordModal}
        onClose={() => setShowChangePasswordModal(false)}
      />

      {/* Face Capture Modal */}
      {showFaceCapture && (
        <FaceCapture
          isOpen={showFaceCapture}
          onFaceCaptured={handleFaceCaptured}
          onClose={handleFaceCaptureClose}
        />
      )}

      {/* Break Modal */}
      {showBreakModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Break Management</h2>
              <button
                onClick={() => setShowBreakModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {(['break1', 'lunch', 'break2'] as const).map((breakType) => {
                const status = getBreakStatus(breakType);
                const duration = getBreakDuration(breakType);
                const breakNames: { [key: string]: string } = {
                  break1: 'Break 1',
                  lunch: 'Lunch Break',
                  break2: 'Break 2'
                };
                const breakIcons: { [key: string]: any } = {
                  break1: Coffee,
                  lunch: UtensilsCrossed,
                  break2: Coffee
                };
                const Icon = breakIcons[breakType];
                
                return (
                  <div key={breakType} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                          <Icon className="w-5 h-5 text-teal-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{breakNames[breakType]}</h3>
                          {duration && (
                            <p className="text-xs text-gray-500">Duration: {duration}</p>
                          )}
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        status === 'not-started' ? 'bg-gray-100 text-gray-600' :
                        status === 'active' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {status === 'not-started' ? 'Not Started' :
                         status === 'active' ? 'Active' :
                         'Completed'}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      {status === 'not-started' ? (
                        <button
                          onClick={() => handleStartBreak(breakType)}
                          className="flex-1 py-2 px-4 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 transition-colors"
                        >
                          Start {breakNames[breakType]}
                        </button>
                      ) : status === 'active' ? (
                        <button
                          onClick={() => handleEndBreak(breakType)}
                          className="flex-1 py-2 px-4 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors"
                        >
                          End {breakNames[breakType]}
                        </button>
                      ) : (
                        <div className="flex-1 py-2 px-4 bg-gray-100 text-gray-500 rounded-lg font-semibold text-center">
                          Completed
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </EmployeeLayout>
  );
};

export default Dashboard;
