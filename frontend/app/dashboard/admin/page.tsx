'use client'

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import axiosInstance from '../../utils/axios';
import toast from 'react-hot-toast';
import PrivateRoute from '../../components/PrivateRoute';
import { useAuth } from '../../context/AuthContext';
import { 
  Users, Calendar, FileText, BarChart3, Building2, Settings, Bell, Search,
  Home, ChevronRight, ArrowUp, ArrowDown, Minus, TrendingUp, Percent, CheckCircle, XCircle, LogOut, ChevronDown
} from 'lucide-react';
import { 
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

interface DashboardStats {
  totalEmployees: number;
  pendingRequests: number;
  onLeaveToday: number;
  avgLeaveDays: number;
  approvedThisMonth: number;
  rejectedThisMonth: number;
  leaveUtilizationRate: number;
  leaveTrends: Array<{ month: string; approved: number; pending: number }>;
  leaveDistribution: Array<{ name: string; value: number; color: string }>;
  recentLeaveRequests: Array<{
    id: number;
    employee: { name: string; profilePhoto?: string };
    leaveType: string;
    days: number;
    status: string;
    startDate: string;
    endDate: string;
  }>;
  departmentOverview: Array<{
    name: string;
    totalEmployees: number;
    onLeave: number;
    icon: string;
  }>;
  monthlyComparison: Array<{ month: string; approved: number; rejected: number }>;
  leaveByStatus: Array<{ status: string; count: number; color: string }>;
}

const COLORS = {
  annual: '#8b5cf6',
  sick: '#ef4444',
  personal: '#ec4899',
  maternity: '#a855f7',
  other: '#3b82f6'
};

const AdminDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showLeaveDropdown, setShowLeaveDropdown] = useState(false);
  const leaveDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (leaveDropdownRef.current && !leaveDropdownRef.current.contains(event.target as Node)) {
        setShowLeaveDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (user && user.role !== 'admin') {
      router.push('/dashboard');
      return;
    }
    fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch all employees
      const usersRes = await axiosInstance.get('/auth/users', { params: { limit: 1000 } });
      const allUsers = usersRes.data.users || [];
      const totalEmployees = allUsers.filter((u: any) => u.role === 'employee').length;

      // Fetch all leave requests for stats
      const allLeavesRes = await axiosInstance.get('/leave/all').catch(() => ({ data: { leaveRequests: [] } }));
      const allLeaves = allLeavesRes.data.leaveRequests || [];
      
      // Calculate pending requests
      const pendingRequests = allLeaves.filter((l: any) => l.status === 'pending').length;

      // Calculate today's leave
      const today = new Date().toISOString().split('T')[0];
      const onLeaveToday = allLeaves.filter((l: any) => 
        l.status === 'approved' && 
        l.startDate <= today && 
        l.endDate >= today
      ).length;

      // Calculate this month stats
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      const thisMonthLeaves = allLeaves.filter((l: any) => {
        const startDate = new Date(l.startDate);
        return startDate >= monthStart && startDate <= monthEnd;
      });

      const approvedThisMonth = thisMonthLeaves.filter((l: any) => l.status === 'approved').length;
      const rejectedThisMonth = thisMonthLeaves.filter((l: any) => l.status === 'rejected').length;

      // Calculate average leave days
      const approvedLeaves = allLeaves.filter((l: any) => l.status === 'approved');
      const avgLeaveDays = approvedLeaves.length > 0
        ? approvedLeaves.reduce((sum: number, l: any) => sum + parseFloat(l.totalDays), 0) / approvedLeaves.length
        : 0;

      // Calculate utilization rate
      const totalLeaveDays = approvedLeaves.reduce((sum: number, l: any) => sum + parseFloat(l.totalDays), 0);
      const totalAllocatedDays = totalEmployees * 30; // Assuming 30 days per employee average
      const leaveUtilizationRate = totalAllocatedDays > 0 ? (totalLeaveDays / totalAllocatedDays) * 100 : 0;

      // Generate leave trends (last 6 months)
      const leaveTrends = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthName = date.toLocaleDateString('en-US', { month: 'short' });
        const monthLeaves = allLeaves.filter((l: any) => {
          const leaveDate = new Date(l.startDate);
          return leaveDate.getMonth() === date.getMonth() && leaveDate.getFullYear() === date.getFullYear();
        });
        leaveTrends.push({
          month: monthName,
          approved: monthLeaves.filter((l: any) => l.status === 'approved').length,
          pending: monthLeaves.filter((l: any) => l.status === 'pending').length
        });
      }

      // Calculate leave distribution
      const distributionMap: { [key: string]: number } = {};
      approvedLeaves.forEach((l: any) => {
        distributionMap[l.leaveType] = (distributionMap[l.leaveType] || 0) + parseFloat(l.totalDays);
      });
      const totalDistributed = Object.values(distributionMap).reduce((a: number, b: number) => a + b, 0);
      const leaveDistribution = Object.entries(distributionMap).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value: totalDistributed > 0 ? Math.round((value / totalDistributed) * 100) : 0,
        color: COLORS[name as keyof typeof COLORS] || COLORS.other
      }));

      // Recent leave requests
      const recentRequests = allLeaves
        .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5)
        .map((l: any) => ({
          id: l.id,
          employee: {
            name: l.employee?.name || 'Unknown',
            profilePhoto: l.employee?.profilePhoto
          },
          leaveType: l.leaveType,
          days: parseFloat(l.totalDays),
          status: l.status,
          startDate: l.startDate,
          endDate: l.endDate
        }));

      // Department overview (mock data - you can enhance this with actual department data)
      const departmentOverview = [
        { name: 'Engineering', totalEmployees: 68, onLeave: 12, icon: '</>' },
        { name: 'Marketing', totalEmployees: 45, onLeave: 8, icon: '📢' },
        { name: 'Sales', totalEmployees: 52, onLeave: 6, icon: '💼' },
        { name: 'HR', totalEmployees: 23, onLeave: 3, icon: '👥' },
        { name: 'Finance', totalEmployees: 18, onLeave: 2, icon: '💰' }
      ];

      // Monthly comparison (last 6 months)
      const monthlyComparison = leaveTrends.map(month => ({
        month: month.month,
        approved: month.approved,
        rejected: allLeaves.filter((l: any) => {
          const leaveDate = new Date(l.startDate);
          const monthDate = new Date(now.getFullYear(), leaveTrends.indexOf(month) - 5 + now.getMonth(), 1);
          return leaveDate.getMonth() === monthDate.getMonth() && 
                 leaveDate.getFullYear() === monthDate.getFullYear() && 
                 l.status === 'rejected';
        }).length
      }));

      // Leave by status
      const leaveByStatus = [
        { status: 'Approved', count: allLeaves.filter((l: any) => l.status === 'approved').length, color: '#10b981' },
        { status: 'Pending', count: allLeaves.filter((l: any) => l.status === 'pending').length, color: '#f59e0b' },
        { status: 'Rejected', count: allLeaves.filter((l: any) => l.status === 'rejected').length, color: '#ef4444' },
        { status: 'Cancelled', count: allLeaves.filter((l: any) => l.status === 'cancelled').length, color: '#6b7280' }
      ];

      setStats({
        totalEmployees,
        pendingRequests,
        onLeaveToday,
        avgLeaveDays: parseFloat(avgLeaveDays.toFixed(1)),
        approvedThisMonth,
        rejectedThisMonth,
        leaveUtilizationRate: parseFloat(leaveUtilizationRate.toFixed(1)),
        leaveTrends,
        leaveDistribution,
        recentLeaveRequests: recentRequests,
        departmentOverview,
        monthlyComparison,
        leaveByStatus
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const getLeaveTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      sick: 'Sick',
      casual: 'Casual',
      annual: 'Annual',
      maternity: 'Maternity',
      paternity: 'Paternity',
      compensatory: 'Compensatory',
      unpaid: 'Unpaid'
    };
    return labels[type] || type;
  };

  const formatDateRange = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    return `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  };

  if (loading) {
    return (
      <PrivateRoute>
        <div className="flex h-screen bg-gray-50">
          <div className="flex items-center justify-center w-full">
            <div className="text-lg">Loading...</div>
          </div>
        </div>
      </PrivateRoute>
    );
  }

  return (
    <PrivateRoute>
      <div className="flex h-screen bg-gray-50 overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 bg-purple-900 flex flex-col">
          {/* Logo */}
          <div className="p-6 border-b border-purple-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-purple-900" />
                <CheckCircle className="w-3 h-3 text-green-500 -ml-4 mt-3" />
              </div>
              <div>
                <div className="text-white font-bold text-lg">LeaveFlow</div>
                <div className="text-purple-300 text-xs">Admin Portal</div>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            <Link
              href="/dashboard/admin"
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                pathname === '/dashboard/admin'
                  ? 'bg-purple-800 text-white'
                  : 'text-purple-200 hover:bg-purple-800 hover:text-white'
              }`}
            >
              <Home className="w-5 h-5" />
              <span>Dashboard</span>
            </Link>
            <Link
              href="/users"
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-purple-200 hover:bg-purple-800 hover:text-white transition-colors"
            >
              <Users className="w-5 h-5" />
              <span>Employees</span>
            </Link>
            {/* Leave Management Dropdown */}
            <div className="relative" ref={leaveDropdownRef}>
              <button
                onClick={() => setShowLeaveDropdown(!showLeaveDropdown)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  pathname?.includes('/admin/leave') || pathname?.includes('/leave-balance')
                    ? 'bg-purple-800 text-white'
                    : 'text-purple-200 hover:bg-purple-800 hover:text-white'
                }`}
              >
                <Calendar className="w-5 h-5 flex-shrink-0" />
                <span className="flex-1 whitespace-nowrap">Leave Management</span>
                {stats && stats.pendingRequests > 0 && (
                  <span className="bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0">
                    {stats.pendingRequests}
                  </span>
                )}
                <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform ${showLeaveDropdown ? 'rotate-180' : ''}`} />
              </button>
              
              {showLeaveDropdown && (
                <div className="mt-2 ml-2 pl-2 border-l-2 border-purple-700 space-y-1">
                  <Link
                    href="/admin/leave"
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                      pathname === '/admin/leave'
                        ? 'bg-purple-800 text-white'
                        : 'text-purple-200 hover:bg-purple-800 hover:text-white'
                    }`}
                    onClick={() => setShowLeaveDropdown(false)}
                  >
                    <FileText className="w-4 h-4" />
                    <span className="text-sm">Employees on Leave</span>
                  </Link>
                  <Link
                    href="/admin/leave-balance"
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                      pathname === '/admin/leave-balance'
                        ? 'bg-purple-800 text-white'
                        : 'text-purple-200 hover:bg-purple-800 hover:text-white'
                    }`}
                    onClick={() => setShowLeaveDropdown(false)}
                  >
                    <TrendingUp className="w-4 h-4" />
                    <span className="text-sm">Leave Balances</span>
                  </Link>
                </div>
              )}
            </div>
            <Link
              href="/dashboard/admin"
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-purple-200 hover:bg-purple-800 hover:text-white transition-colors"
            >
              <BarChart3 className="w-5 h-5" />
              <span>Reports</span>
            </Link>
            <Link
              href="/dashboard/admin"
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-purple-200 hover:bg-purple-800 hover:text-white transition-colors"
            >
              <Building2 className="w-5 h-5" />
              <span>Departments</span>
            </Link>
          </nav>

          {/* Settings Section */}
          <div className="p-4 border-t border-purple-800 space-y-1">
            <Link
              href="/dashboard/admin"
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-purple-200 hover:bg-purple-800 hover:text-white transition-colors"
            >
              <Settings className="w-5 h-5" />
              <span>Preferences</span>
            </Link>
            <Link
              href="/dashboard/admin"
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-purple-200 hover:bg-purple-800 hover:text-white transition-colors relative"
            >
              <Bell className="w-5 h-5" />
              <span>Notifications</span>
              <span className="ml-auto bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                3
              </span>
            </Link>
          </div>

          {/* User Profile */}
          <div className="p-4 border-t border-purple-800 relative">
            <button
              onClick={() => setShowProfileDropdown(!showProfileDropdown)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-purple-800 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-purple-800 flex items-center justify-center">
                <Users className="w-5 h-5 text-purple-200" />
              </div>
              <div className="flex-1 text-left">
                <div className="text-white font-medium text-sm">{user?.name || 'Admin'}</div>
                <div className="text-purple-300 text-xs">Administrator</div>
              </div>
              <ChevronRight className={`w-4 h-4 text-purple-300 transition-transform ${showProfileDropdown ? 'rotate-90' : ''}`} />
            </button>
            
            {/* Profile Dropdown */}
            {showProfileDropdown && (
              <div className="absolute bottom-full left-4 right-4 mb-2 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50">
                <Link
                  href="/profile"
                  className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                  onClick={() => setShowProfileDropdown(false)}
                >
                  <Users className="w-4 h-4" />
                  View Profile
                </Link>
                <Link
                  href="/profile"
                  className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                  onClick={() => setShowProfileDropdown(false)}
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </Link>
                <div className="border-t border-gray-200 my-1"></div>
                <button
                  onClick={() => {
                    logout();
                    router.push('/auth');
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Header */}
          <div className="bg-white border-b border-gray-200 px-8 py-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Dashboard Overview</h1>
                <p className="text-gray-600 mt-1">Welcome back, {user?.name?.split(' ')[0] || 'Admin'}! Here's what's happening today.</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search employees..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div className="relative">
                  <Bell className="w-6 h-6 text-gray-600 cursor-pointer" />
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    3
              </span>
                </div>
                <Settings className="w-6 h-6 text-gray-600 cursor-pointer" />
              </div>
            </div>
          </div>

          {/* Content */}
          {stats && (
            <div className="p-8 space-y-6">
              {/* Metric Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-2">
                    <Users className="w-8 h-8 text-blue-600" />
                    <div className="flex items-center gap-1 text-green-600 text-sm">
                      <ArrowUp className="w-4 h-4" />
                      <span>12%</span>
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-gray-900">{stats.totalEmployees}</div>
                  <div className="text-sm text-gray-600">Total Employees</div>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-2">
                    <Calendar className="w-8 h-8 text-orange-600" />
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                      <span className="text-xs text-orange-600">Pending</span>
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-gray-900">{stats.pendingRequests}</div>
                  <div className="text-sm text-gray-600">Pending Requests</div>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-2">
                    <Calendar className="w-8 h-8 text-green-600" />
                    <div className="flex items-center gap-1 text-red-600 text-sm">
                      <ArrowDown className="w-4 h-4" />
                      <span>8%</span>
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-gray-900">{stats.onLeaveToday}</div>
                  <div className="text-sm text-gray-600">On Leave Today</div>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-2">
                    <TrendingUp className="w-8 h-8 text-purple-600" />
                    <div className="flex items-center gap-1 text-green-600 text-sm">
                      <ArrowUp className="w-4 h-4" />
                      <span>5%</span>
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-gray-900">{stats.avgLeaveDays}</div>
                  <div className="text-sm text-gray-600">Avg. Leave Days</div>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-2">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                    <div className="flex items-center gap-1 text-green-600 text-sm">
                      <ArrowUp className="w-4 h-4" />
                      <span>18%</span>
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-gray-900">{stats.approvedThisMonth}</div>
                  <div className="text-sm text-gray-600">Approved This Month</div>
                  <div className="text-xs text-gray-500 mt-1">+15 from last month</div>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-2">
                    <XCircle className="w-8 h-8 text-red-600" />
                    <div className="flex items-center gap-1 text-gray-600 text-sm">
                      <Minus className="w-4 h-4" />
                      <span>0%</span>
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-gray-900">{stats.rejectedThisMonth}</div>
                  <div className="text-sm text-gray-600">Rejected This Month</div>
                  <div className="text-xs text-gray-500 mt-1">Same as last month</div>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-2">
                    <Percent className="w-8 h-8 text-indigo-600" />
                    <div className="flex items-center gap-1 text-green-600 text-sm">
                      <ArrowUp className="w-4 h-4" />
                      <span>3%</span>
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-gray-900">{stats.leaveUtilizationRate}%</div>
                  <div className="text-sm text-gray-600">Leave Utilization Rate</div>
                  <div className="text-xs text-green-600 mt-1">Healthy utilization</div>
                </div>
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Leave Trends */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-gray-900">Leave Trends</h2>
                    <select className="px-3 py-1 border border-gray-300 rounded-lg text-sm">
                      <option>Last 6 Months</option>
                      <option>Last 3 Months</option>
                      <option>Last Year</option>
                    </select>
                  </div>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={stats.leaveTrends}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="month" stroke="#6b7280" />
                      <YAxis stroke="#6b7280" />
                      <Tooltip />
                      <Legend />
                      <Area type="monotone" dataKey="approved" stackId="1" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.6} name="Approved" />
                      <Area type="monotone" dataKey="pending" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.6} name="Pending" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Leave Distribution */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Leave Distribution</h2>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={stats.leaveDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {stats.leaveDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  </div>

                {/* Monthly Comparison */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Monthly Comparison</h2>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={stats.monthlyComparison}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="month" stroke="#6b7280" />
                      <YAxis stroke="#6b7280" />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="approved" fill="#10b981" name="Approved" radius={[8, 8, 0, 0]} />
                      <Bar dataKey="rejected" fill="#ef4444" name="Rejected" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Leave by Status */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Leave by Status</h2>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={stats.leaveByStatus} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis type="number" stroke="#6b7280" />
                      <YAxis dataKey="status" type="category" stroke="#6b7280" />
                      <Tooltip />
                      <Bar dataKey="count" fill="#8884d8" radius={[0, 8, 8, 0]}>
                        {stats.leaveByStatus.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Bottom Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Leave Requests */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-gray-900">Recent Leave Requests</h2>
                    <Link href="/leave" className="text-purple-600 hover:text-purple-700 text-sm font-medium">
                      View All
                    </Link>
                  </div>
                  <div className="space-y-4">
                    {stats.recentLeaveRequests.map((request) => (
                      <div key={request.id} className="flex items-center gap-4 pb-4 border-b border-gray-100 last:border-0">
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                          {request.employee.profilePhoto ? (
                            <img 
                              src={`http://localhost:5000${request.employee.profilePhoto}`} 
                              alt={request.employee.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Users className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{request.employee.name}</div>
                          <div className="text-sm text-gray-600">
                            {getLeaveTypeLabel(request.leaveType)} - {request.days} days
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            request.status === 'approved' ? 'bg-green-100 text-green-700' :
                            request.status === 'pending' ? 'bg-orange-100 text-orange-700' :
                            request.status === 'rejected' ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                            </span>
                          <div className="text-xs text-gray-500 mt-1">
                            {formatDateRange(request.startDate, request.endDate)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Department Overview */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-gray-900">Department Overview</h2>
                    <button className="text-purple-600 hover:text-purple-700 text-sm font-medium">Filter</button>
                  </div>
                  <div className="space-y-4">
                    {stats.departmentOverview.map((dept, index) => (
                      <div key={index} className="flex items-center gap-4 pb-4 border-b border-gray-100 last:border-0">
                        <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center text-lg">
                          {dept.icon}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{dept.name}</div>
                          <div className="text-sm text-gray-600">{dept.totalEmployees} employees</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold text-gray-900">{dept.onLeave} on leave</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </PrivateRoute>
  );
};

export default AdminDashboard;
