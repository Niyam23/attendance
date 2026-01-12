'use client'

import React, { useState, useEffect } from 'react';
import axiosInstance from '../utils/axios';
import toast from 'react-hot-toast';
import Navbar from '../components/Navbar';
import PrivateRoute from '../components/PrivateRoute';
import { Plane, Calendar, Clock, CheckCircle, XCircle, AlertCircle, X, Filter, Users, Eye } from 'lucide-react';

interface LeaveRequest {
  id: number;
  leaveType: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  createdAt: string;
  approvedAt?: string;
  approvedBy?: any;
  rejectionReason?: string;
}

interface LeaveBalance {
  leaveType: string;
  totalDays: number;
  usedDays: number;
  remainingDays: number;
}

interface TeamMember {
  id: number;
  name: string;
  email: string;
  employeeId: string;
  profilePhoto: string | null;
  status: 'available' | 'on_leave';
  leaveType: string | null;
  leaveStartDate: string | null;
  leaveEndDate: string | null;
}

const LeavePage: React.FC = () => {
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [calendarView, setCalendarView] = useState<'week' | 'month' | 'year'>('week');
  const [selectedDate, setSelectedDate] = useState(new Date());

  const [requestForm, setRequestForm] = useState({
    leaveType: '',
    startDate: '',
    endDate: '',
    reason: ''
  });

  const [calculatedDays, setCalculatedDays] = useState(0);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (requestForm.startDate && requestForm.endDate) {
      calculateDays();
    }
  }, [requestForm.startDate, requestForm.endDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [requestsRes, balanceRes, teamRes, calendarRes] = await Promise.all([
        axiosInstance.get('/leave/my-requests'),
        axiosInstance.get('/leave/balance'),
        axiosInstance.get('/leave/team-availability').catch(() => ({ data: { team: [] } })),
        axiosInstance.get('/leave/calendar', {
          params: {
            startDate: getStartDate(),
            endDate: getEndDate()
          }
        }).catch(() => ({ data: { calendar: {} } }))
      ]);

      setLeaveRequests(requestsRes.data.leaveRequests || []);
      setLeaveBalances(balanceRes.data.balances || []);
      setTeamMembers(teamRes.data.team || []);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch leave data');
    } finally {
      setLoading(false);
    }
  };

  const getStartDate = () => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() - date.getDay()); // Start of week
    return date.toISOString().split('T')[0];
  };

  const getEndDate = () => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + (6 - date.getDay())); // End of week
    return date.toISOString().split('T')[0];
  };

  const calculateDays = () => {
    if (!requestForm.startDate || !requestForm.endDate) {
      setCalculatedDays(0);
      return;
    }

    const start = new Date(requestForm.startDate);
    const end = new Date(requestForm.endDate);
    
    if (end < start) {
      setCalculatedDays(0);
      return;
    }

    let days = 0;
    const current = new Date(start);
    while (current <= end) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        days++;
      }
      current.setDate(current.getDate() + 1);
    }
    setCalculatedDays(days);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await axiosInstance.post('/leave/request', requestForm);
      toast.success('Leave request submitted successfully!');
      setShowRequestModal(false);
      setRequestForm({ leaveType: '', startDate: '', endDate: '', reason: '' });
      setCalculatedDays(0);
      fetchData();
    } catch (error: any) {
      console.error('Error submitting leave request:', error);
      toast.error(error.response?.data?.message || 'Failed to submit leave request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (id: number) => {
    if (!confirm('Are you sure you want to cancel this leave request?')) return;

    try {
      await axiosInstance.put(`/leave/my-requests/${id}/cancel`);
      toast.success('Leave request cancelled successfully!');
      fetchData();
    } catch (error: any) {
      console.error('Error cancelling leave request:', error);
      toast.error(error.response?.data?.message || 'Failed to cancel leave request');
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      approved: 'bg-green-500/20 text-green-400 border-green-500/30',
      rejected: 'bg-red-500/20 text-red-400 border-red-500/30',
      cancelled: 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${styles[status as keyof typeof styles]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getLeaveTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      sick: 'Sick Leave',
      casual: 'Casual Leave',
      annual: 'Annual Leave',
      maternity: 'Maternity Leave',
      paternity: 'Paternity Leave',
      compensatory: 'Compensatory Leave',
      unpaid: 'Unpaid Leave'
    };
    return labels[type] || type;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const getAvailableBalance = (leaveType: string) => {
    const balance = leaveBalances.find(b => b.leaveType === leaveType);
    return balance ? balance.remainingDays : 0;
  };

  // Get main leave balances for circular indicators
  const annualLeave = leaveBalances.find(b => b.leaveType === 'annual') || { remainingDays: 0, usedDays: 0, totalDays: 0 };
  const sickLeave = leaveBalances.find(b => b.leaveType === 'sick') || { remainingDays: 0, usedDays: 0, totalDays: 0 };
  const otherLeaves = leaveBalances.filter(b => !['annual', 'sick'].includes(b.leaveType));
  const otherLeavesUsed = otherLeaves.reduce((sum, b) => sum + b.usedDays, 0);

  // Generate calendar days
  const getCalendarDays = () => {
    const start = new Date(selectedDate);
    start.setDate(start.getDate() - start.getDay());
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      days.push(date);
    }
    return days;
  };

  // Check if date has leave
  const hasLeaveOnDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return leaveRequests.some(r => 
      r.status === 'approved' && 
      r.startDate <= dateStr && 
      r.endDate >= dateStr
    );
  };

  // Get leave type for date
  const getLeaveTypeForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    const request = leaveRequests.find(r => 
      r.status === 'approved' && 
      r.startDate <= dateStr && 
      r.endDate >= dateStr
    );
    return request ? request.leaveType : null;
  };

  const calendarDays = getCalendarDays();

  return (
    <PrivateRoute>
      <div className="min-h-screen bg-[#0f0f1e] text-white">
        <Navbar />
        <div className="container mx-auto px-6 py-6">
          {/* Top Row - Three Panels */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Leave Management Panel */}
            <div className="bg-[#1a1a2e] rounded-xl p-6 border border-gray-800">
              <h2 className="text-xl font-bold mb-4">Leave Management</h2>
              <button
                onClick={() => setShowRequestModal(true)}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-lg mb-6 transition-colors"
              >
                Request a Leave
              </button>
              
              {/* Circular Progress Indicators */}
              <div className="space-y-4">
                {/* Annual Leave */}
                <div className="flex items-center gap-4">
                  <div className="relative w-16 h-16">
                    <svg className="w-16 h-16 transform -rotate-90">
                      <circle
                        cx="32"
                        cy="32"
                        r="28"
                        stroke="#1a1a2e"
                        strokeWidth="6"
                        fill="none"
                      />
                      <circle
                        cx="32"
                        cy="32"
                        r="28"
                        stroke="#10b981"
                        strokeWidth="6"
                        fill="none"
                        strokeDasharray={`${(annualLeave.remainingDays / annualLeave.totalDays) * 175.93} 175.93`}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-lg font-bold text-green-400">{annualLeave.remainingDays}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Annual Leave</p>
                    <p className="text-xs text-gray-500">remaining</p>
                  </div>
                </div>

                {/* Sick Leave */}
                <div className="flex items-center gap-4">
                  <div className="relative w-16 h-16">
                    <svg className="w-16 h-16 transform -rotate-90">
                      <circle
                        cx="32"
                        cy="32"
                        r="28"
                        stroke="#1a1a2e"
                        strokeWidth="6"
                        fill="none"
                      />
                      <circle
                        cx="32"
                        cy="32"
                        r="28"
                        stroke="#ef4444"
                        strokeWidth="6"
                        fill="none"
                        strokeDasharray={`${(sickLeave.usedDays / sickLeave.totalDays) * 175.93} 175.93`}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-lg font-bold text-red-400">{sickLeave.usedDays}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Sick Leave</p>
                    <p className="text-xs text-gray-500">taken</p>
                  </div>
                </div>

                {/* Other Leave */}
                <div className="flex items-center gap-4">
                  <div className="relative w-16 h-16">
                    <svg className="w-16 h-16 transform -rotate-90">
                      <circle
                        cx="32"
                        cy="32"
                        r="28"
                        stroke="#1a1a2e"
                        strokeWidth="6"
                        fill="none"
                      />
                      <circle
                        cx="32"
                        cy="32"
                        r="28"
                        stroke="#f59e0b"
                        strokeWidth="6"
                        fill="none"
                        strokeDasharray={`${Math.min((otherLeavesUsed / 10) * 175.93, 175.93)} 175.93`}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-lg font-bold text-yellow-400">{otherLeavesUsed}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Other Leave</p>
                    <p className="text-xs text-gray-500">taken</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Team Availability Panel */}
            <div className="bg-[#1a1a2e] rounded-xl p-6 border border-gray-800">
              <h2 className="text-xl font-bold mb-4">Team Availability</h2>
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {loading ? (
                  <p className="text-gray-500 text-sm text-center py-4">Loading...</p>
                ) : teamMembers.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-4">No team members found</p>
                ) : (
                  teamMembers.map((member) => (
                    <div key={member.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-800/50 transition-colors">
                      <div className="relative w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {member.profilePhoto ? (
                          <img 
                            src={`http://localhost:5000${member.profilePhoto}`} 
                            alt={member.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Users size={20} className="text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{member.name}</p>
                        <span className={`text-xs px-2 py-1 rounded-full inline-block mt-1 ${
                          member.status === 'on_leave'
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                            : 'bg-green-500/20 text-green-400 border border-green-500/30'
                        }`}>
                          {member.status === 'on_leave' 
                            ? (member.leaveType ? getLeaveTypeLabel(member.leaveType) : 'On Leave')
                            : 'Available'}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Upcoming Public Holidays Panel */}
            <div className="bg-[#1a1a2e] rounded-xl p-6 border border-gray-800">
              <h2 className="text-xl font-bold mb-4">Upcoming Public Holidays</h2>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {/* Sample holidays - you can fetch from API if available */}
                <div className="text-sm p-2 rounded-lg hover:bg-gray-800/50">
                  <p className="font-medium">Jan 01, 2024 Monday</p>
                  <p className="text-gray-400">New Year's Day</p>
                </div>
                <div className="text-sm p-2 rounded-lg hover:bg-gray-800/50">
                  <p className="font-medium">Mar 29, 2024 Friday</p>
                  <p className="text-gray-400">Good Friday</p>
                </div>
                <div className="text-sm p-2 rounded-lg hover:bg-gray-800/50">
                  <p className="font-medium">Apr 01, 2024 Monday</p>
                  <p className="text-gray-400">Easter Monday</p>
                </div>
                <div className="text-sm p-2 rounded-lg hover:bg-gray-800/50">
                  <p className="font-medium">Dec 25, 2024 Wednesday</p>
                  <p className="text-gray-400">Christmas Day</p>
                </div>
              </div>
            </div>
          </div>

          {/* Calendar Panel */}
          <div className="bg-[#1a1a2e] rounded-xl p-6 border border-gray-800 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Calendar</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setCalendarView('week')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    calendarView === 'week' ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  Week
                </button>
                <button
                  onClick={() => setCalendarView('month')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    calendarView === 'month' ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  Month
                </button>
                <button
                  onClick={() => setCalendarView('year')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    calendarView === 'year' ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  Year
                </button>
              </div>
            </div>

            {/* Week Calendar View */}
            {calendarView === 'week' && (
              <div className="grid grid-cols-7 gap-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => {
                  const date = calendarDays[idx];
                  const hasLeave = hasLeaveOnDate(date);
                  const leaveType = getLeaveTypeForDate(date);
                  const isToday = date.toDateString() === new Date().toDateString();

                  let bgColor = 'bg-gray-800';
                  if (hasLeave) {
                    bgColor = leaveType === 'annual' ? 'bg-green-500/20' : 
                              leaveType === 'sick' ? 'bg-red-500/20' : 
                              'bg-yellow-500/20';
                  }

                  return (
                    <div
                      key={idx}
                      className={`p-4 rounded-lg border ${
                        isToday ? 'border-red-500' : 'border-gray-700'
                      } ${bgColor}`}
                    >
                      <p className="text-xs text-gray-400 mb-1">{day}</p>
                      <p className={`text-lg font-bold mb-2 ${isToday ? 'text-red-400' : 'text-white'}`}>
                        {date.getDate()}
                      </p>
                      {hasLeave && (
                        <div className="text-xs">
                          <p className="text-gray-300 truncate">{getLeaveTypeLabel(leaveType!)}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Legend */}
            <div className="flex gap-4 mt-4 pt-4 border-t border-gray-700">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-xs text-gray-400">Annual Leave</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="text-xs text-gray-400">Sick Leave</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <span className="text-xs text-gray-400">Others Leave</span>
              </div>
            </div>
          </div>

          {/* Leave Record Table */}
          <div className="bg-[#1a1a2e] rounded-xl border border-gray-800 overflow-hidden">
            <div className="p-6 border-b border-gray-800">
              <h2 className="text-xl font-bold">Leave Record</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-900/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Leave Type</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Status</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Date</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Notes</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                        Loading...
                      </td>
                    </tr>
                  ) : leaveRequests.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                        No leave requests found
                      </td>
                    </tr>
                  ) : (
                    leaveRequests.map((request) => (
                      <tr key={request.id} className="hover:bg-gray-800/50 transition-colors">
                        <td className="px-6 py-4">
                          <span className="font-medium text-white">{getLeaveTypeLabel(request.leaveType)}</span>
                        </td>
                        <td className="px-6 py-4">
                          {getStatusBadge(request.status)}
                        </td>
                        <td className="px-6 py-4 text-gray-300">
                          {formatDate(request.startDate)} to {formatDate(request.endDate)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="max-w-md truncate text-gray-400" title={request.reason}>
                            {request.reason}
                          </div>
                          {request.rejectionReason && (
                            <div className="text-xs text-red-400 mt-1">
                              Rejection: {request.rejectionReason}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            {request.status === 'pending' && (
                              <button
                                onClick={() => handleCancel(request.id)}
                                className="text-red-400 hover:text-red-300 text-sm font-medium"
                              >
                                Cancel
                              </button>
                            )}
                            <button className="text-blue-400 hover:text-blue-300 text-sm font-medium flex items-center gap-1">
                              <Eye size={14} />
                              View
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Request Leave Modal */}
        {showRequestModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-[#1a1a2e] rounded-xl p-6 max-w-2xl w-full border border-gray-700 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Request a Leave</h2>
                <button
                  onClick={() => {
                    setShowRequestModal(false);
                    setRequestForm({ leaveType: '', startDate: '', endDate: '', reason: '' });
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">Leave Type *</label>
                    <select
                      value={requestForm.leaveType}
                      onChange={(e) => setRequestForm({ ...requestForm, leaveType: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-red-500"
                      required
                    >
                      <option value="">Select leave type</option>
                      <option value="sick">Sick Leave</option>
                      <option value="casual">Casual Leave</option>
                      <option value="annual">Annual Leave</option>
                      <option value="maternity">Maternity Leave</option>
                      <option value="paternity">Paternity Leave</option>
                      <option value="compensatory">Compensatory Leave</option>
                      <option value="unpaid">Unpaid Leave</option>
                    </select>
                    {requestForm.leaveType && (
                      <p className="mt-1 text-xs text-gray-500">
                        Available: {getAvailableBalance(requestForm.leaveType)} days
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">Start Date *</label>
                    <input
                      type="date"
                      value={requestForm.startDate}
                      onChange={(e) => setRequestForm({ ...requestForm, startDate: e.target.value })}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-red-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">End Date *</label>
                    <input
                      type="date"
                      value={requestForm.endDate}
                      onChange={(e) => setRequestForm({ ...requestForm, endDate: e.target.value })}
                      min={requestForm.startDate || new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-red-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">Total Days</label>
                    <div className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg">
                      <span className="text-lg font-semibold text-red-400">{calculatedDays}</span>
                      <span className="text-gray-400 text-sm ml-2">working days</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">Reason *</label>
                  <textarea
                    value={requestForm.reason}
                    onChange={(e) => setRequestForm({ ...requestForm, reason: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-red-500"
                    placeholder="Please provide a reason for your leave request..."
                    required
                    minLength={10}
                  />
                  <p className="mt-1 text-xs text-gray-500">Minimum 10 characters required</p>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowRequestModal(false);
                      setRequestForm({ leaveType: '', startDate: '', endDate: '', reason: '' });
                    }}
                    className="px-6 py-2 border border-gray-700 rounded-lg text-gray-300 hover:bg-gray-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || calculatedDays === 0}
                    className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? 'Submitting...' : 'Submit Request'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </PrivateRoute>
  );
};

export default LeavePage;
