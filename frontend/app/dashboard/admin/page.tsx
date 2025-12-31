'use client'

import React, { useState, useEffect } from 'react';
import axiosInstance from '../../utils/axios';
import toast from 'react-hot-toast';
import Navbar from '../../components/Navbar';
import PrivateRoute from '../../components/PrivateRoute';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import { 
  Users, Calendar, TrendingUp, BarChart3, Clock, 
  CheckCircle, XCircle, AlertCircle, Filter
} from 'lucide-react';
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';

interface AdminStats {
  totalEmployees: number;
  totalAttendance: number;
  presentToday: number;
  absentToday: number;
  lateToday: number;
  averageAttendance: number;
  topEmployees: Array<{
    id: number;
    name: string;
    attendanceRate: number;
    totalHours: number;
  }>;
  attendanceByDay: Array<{
    date: string;
    present: number;
    absent: number;
    late: number;
  }>;
}

const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'daily' | 'monthly' | 'yearly'>('monthly');

  useEffect(() => {
    if (user && user.role !== 'admin') {
      router.push('/dashboard');
      return;
    }
    fetchAdminStats();
  }, [user, period]);

  const fetchAdminStats = async () => {
    try {
      setLoading(true);
      // Fetch all attendance data
      const attendanceResponse = await axiosInstance.get(`/attendance/all?limit=1000`);
      const allAttendance = attendanceResponse.data.attendances || [];

      // Fetch all users
      // Note: You might need to create an admin endpoint to get all users
      // For now, we'll calculate from attendance data
      const userIds = [...new Set(allAttendance.map((a: any) => a.userId))];
      const totalEmployees = userIds.length;

      // Calculate today's stats
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todayAttendance = allAttendance.filter((a: any) => {
        const checkIn = new Date(a.checkIn);
        return checkIn >= today && checkIn < tomorrow;
      });

      const presentToday = todayAttendance.filter((a: any) => a.status === 'present').length;
      const absentToday = totalEmployees - presentToday;
      
      // Calculate late (check-in after 9:15 AM)
      const lateToday = todayAttendance.filter((a: any) => {
        const checkIn = new Date(a.checkIn);
        return checkIn.getHours() > 9 || (checkIn.getHours() === 9 && checkIn.getMinutes() > 15);
      }).length;

      // Calculate average attendance
      const totalDays = allAttendance.length;
      const presentDays = allAttendance.filter((a: any) => a.status === 'present').length;
      const averageAttendance = totalDays > 0 ? (presentDays / totalDays) * 100 : 0;

      // Calculate top employees
      const employeeStats: { [key: number]: { name: string; present: number; total: number; hours: number } } = {};
      
      allAttendance.forEach((a: any) => {
        if (!employeeStats[a.userId]) {
          employeeStats[a.userId] = {
            name: a.user?.name || `User ${a.userId}`,
            present: 0,
            total: 0,
            hours: 0
          };
        }
        employeeStats[a.userId].total++;
        if (a.status === 'present') {
          employeeStats[a.userId].present++;
        }
        if (a.checkOut) {
          const checkIn = new Date(a.checkIn);
          const checkOut = new Date(a.checkOut);
          const hours = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
          employeeStats[a.userId].hours += hours;
        }
      });

      const topEmployees = Object.entries(employeeStats)
        .map(([id, stats]) => ({
          id: parseInt(id),
          name: stats.name,
          attendanceRate: stats.total > 0 ? (stats.present / stats.total) * 100 : 0,
          totalHours: parseFloat(stats.hours.toFixed(2))
        }))
        .sort((a, b) => b.attendanceRate - a.attendanceRate)
        .slice(0, 5);

      // Calculate attendance by day (last 7 days)
      const attendanceByDay = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);

        const dayAttendance = allAttendance.filter((a: any) => {
          const checkIn = new Date(a.checkIn);
          return checkIn >= date && checkIn < nextDate;
        });

        attendanceByDay.push({
          date: date.toISOString().split('T')[0],
          present: dayAttendance.filter((a: any) => a.status === 'present').length,
          absent: totalEmployees - dayAttendance.length,
          late: dayAttendance.filter((a: any) => {
            const checkIn = new Date(a.checkIn);
            return checkIn.getHours() > 9 || (checkIn.getHours() === 9 && checkIn.getMinutes() > 15);
          }).length
        });
      }

      setStats({
        totalEmployees,
        totalAttendance: allAttendance.length,
        presentToday,
        absentToday,
        lateToday,
        averageAttendance: parseFloat(averageAttendance.toFixed(2)),
        topEmployees,
        attendanceByDay
      });
    } catch (error) {
      console.error('Error fetching admin stats:', error);
      toast.error('Failed to fetch admin statistics');
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  if (loading) {
    return (
      <PrivateRoute>
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-10">Loading...</div>
        </div>
      </PrivateRoute>
    );
  }

  return (
    <PrivateRoute>
      <Navbar />
      <div className="min-h-screen bg-gray-50 py-6 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-800">Admin Dashboard</h1>
            <div className="flex items-center gap-3 px-6 py-3 bg-white rounded-xl shadow-md">
              <Calendar className="w-5 h-5 text-indigo-600" />
              <span className="text-gray-700">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
            </div>
          </div>

          {/* Statistics Cards */}
          {stats && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
                  <div className="flex items-center justify-between mb-2">
                    <Users className="w-8 h-8" />
                    <span className="text-2xl font-bold">{stats.totalEmployees}</span>
                  </div>
                  <p className="text-blue-100 text-sm font-semibold uppercase">Total Employees</p>
                </div>

                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
                  <div className="flex items-center justify-between mb-2">
                    <CheckCircle className="w-8 h-8" />
                    <span className="text-2xl font-bold">{stats.presentToday}</span>
                  </div>
                  <p className="text-green-100 text-sm font-semibold uppercase">Present Today</p>
                </div>

                <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-lg p-6 text-white">
                  <div className="flex items-center justify-between mb-2">
                    <XCircle className="w-8 h-8" />
                    <span className="text-2xl font-bold">{stats.absentToday}</span>
                  </div>
                  <p className="text-red-100 text-sm font-semibold uppercase">Absent Today</p>
                </div>

                <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl shadow-lg p-6 text-white">
                  <div className="flex items-center justify-between mb-2">
                    <AlertCircle className="w-8 h-8" />
                    <span className="text-2xl font-bold">{stats.lateToday}</span>
                  </div>
                  <p className="text-yellow-100 text-sm font-semibold uppercase">Late Today</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Attendance Trend */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="w-6 h-6 text-indigo-600" />
                    <h2 className="text-2xl font-bold text-gray-800">Attendance Trend (Last 7 Days)</h2>
                  </div>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={stats.attendanceByDay}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis 
                        dataKey="date" 
                        stroke="#6b7280"
                        tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      />
                      <YAxis stroke="#6b7280" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                        labelFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="present" stroke="#10b981" strokeWidth={2} name="Present" dot={{ r: 4 }} />
                      <Line type="monotone" dataKey="absent" stroke="#ef4444" strokeWidth={2} name="Absent" dot={{ r: 4 }} />
                      <Line type="monotone" dataKey="late" stroke="#f59e0b" strokeWidth={2} name="Late" dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Top Employees */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <BarChart3 className="w-6 h-6 text-indigo-600" />
                    <h2 className="text-2xl font-bold text-gray-800">Top Employees</h2>
                  </div>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={stats.topEmployees}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="name" stroke="#6b7280" />
                      <YAxis stroke="#6b7280" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                        formatter={(value: number) => [`${value.toFixed(1)}%`, 'Attendance Rate']}
                      />
                      <Bar dataKey="attendanceRate" fill="#3b82f6" radius={[8, 8, 0, 0]} name="Attendance Rate (%)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Top Employees Table */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Top Performing Employees</h2>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Rank</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Employee Name</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Attendance Rate</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Total Hours</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.topEmployees.map((employee, index) => (
                        <tr key={employee.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4 text-sm text-gray-700">#{index + 1}</td>
                          <td className="py-3 px-4 text-sm font-medium text-gray-900">{employee.name}</td>
                          <td className="py-3 px-4 text-sm text-gray-700">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              employee.attendanceRate >= 90 ? 'bg-green-100 text-green-700' :
                              employee.attendanceRate >= 75 ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {employee.attendanceRate.toFixed(1)}%
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-700">{employee.totalHours}h</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </PrivateRoute>
  );
};

export default AdminDashboard;

