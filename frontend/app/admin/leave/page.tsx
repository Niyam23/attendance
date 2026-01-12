'use client'

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import axiosInstance from '../../utils/axios';
import toast from 'react-hot-toast';
import PrivateRoute from '../../components/PrivateRoute';
import { useAuth } from '../../context/AuthContext';
import { 
  Plus, Download, Edit, X, Check, XCircle, Users, Calendar, Filter,
  Search, ChevronLeft, ChevronRight, Settings, Bell, LogOut, ChevronDown, FileText, TrendingUp, Home, BarChart3, Building2
} from 'lucide-react';

interface LeaveEmployee {
  id: number;
  employee: {
    id: number;
    name: string;
    email: string;
    employeeId: string;
    profilePhoto?: string;
  };
  leaveType: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  status: string;
}

const AdminLeaveManagementPage: React.FC = () => {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [employees, setEmployees] = useState<LeaveEmployee[]>([]);
  const [allEmployees, setAllEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState<LeaveEmployee | null>(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLeaves, setSelectedLeaves] = useState<number[]>([]);
  const [showLeaveDropdown, setShowLeaveDropdown] = useState(true);
  const pathname = usePathname();
  const leaveDropdownRef = useRef<HTMLDivElement>(null);
  const [addLeaveForm, setAddLeaveForm] = useState({
    userId: '',
    leaveType: '',
    startDate: '',
    endDate: '',
    reason: '',
    status: 'approved'
  });
  const [calculatedDays, setCalculatedDays] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user && user.role !== 'admin') {
      router.push('/dashboard');
      return;
    }
    fetchEmployeesOnLeave();
    fetchAllEmployees();
  }, [user, pagination.page]);

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
    if (addLeaveForm.startDate && addLeaveForm.endDate) {
      const start = new Date(addLeaveForm.startDate);
      const end = new Date(addLeaveForm.endDate);
      if (end >= start) {
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
      } else {
        setCalculatedDays(0);
      }
    } else {
      setCalculatedDays(0);
    }
  }, [addLeaveForm.startDate, addLeaveForm.endDate]);

  const fetchEmployeesOnLeave = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get('/leave/admin/employees-on-leave', {
        params: { page: pagination.page, limit: pagination.limit }
      });
      setEmployees(response.data.employees || []);
      setPagination(prev => ({ ...prev, total: response.data.total || response.data.employees?.length || 0 }));
    } catch (error: any) {
      console.error('Error fetching employees on leave:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch employees on leave');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllEmployees = async () => {
    try {
      const response = await axiosInstance.get('/auth/users', { params: { role: 'employee', limit: 1000 } });
      setAllEmployees(response.data.users || []);
    } catch (error: any) {
      console.error('Error fetching employees:', error);
    }
  };

  const handleAddLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addLeaveForm.userId || !addLeaveForm.leaveType || !addLeaveForm.startDate || !addLeaveForm.endDate || !addLeaveForm.reason) {
      toast.error('Please fill all required fields');
      return;
    }

    if (addLeaveForm.reason.length < 10) {
      toast.error('Reason must be at least 10 characters');
      return;
    }

    setSubmitting(true);
    try {
      await axiosInstance.post('/leave/admin/create', addLeaveForm);
      toast.success('Leave added successfully');
      setShowAddModal(false);
      setAddLeaveForm({ userId: '', leaveType: '', startDate: '', endDate: '', reason: '', status: 'approved' });
      setCalculatedDays(0);
      fetchEmployeesOnLeave();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to add leave');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExport = async (format: 'csv' | 'json' = 'csv') => {
    try {
      const response = await axiosInstance.get('/leave/admin/export', {
        params: { format },
        responseType: format === 'csv' ? 'blob' : 'json'
      });
      
      if (format === 'csv') {
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `leave_data_${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        toast.success('Data exported successfully');
      } else {
        const dataStr = JSON.stringify(response.data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = window.URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `leave_data_${Date.now()}.json`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        toast.success('Data exported successfully');
      }
    } catch (error: any) {
      console.error('Export error:', error);
      toast.error('Failed to export data');
    }
  };

  const handleBulkAction = async (action: 'approve' | 'reject') => {
    if (selectedLeaves.length === 0) {
      toast.error('Please select leaves to perform bulk action');
      return;
    }

    try {
      const response = await axiosInstance.post('/leave/admin/bulk-action', {
        leaveIds: selectedLeaves,
        action,
        rejectionReason: action === 'reject' ? 'Bulk rejected by admin' : undefined
      });
      toast.success(`${action === 'approve' ? 'Approved' : 'Rejected'} ${response.data.results[action === 'approve' ? 'approved' : 'rejected'].length} leave(s)`);
      setSelectedLeaves([]);
      fetchEmployeesOnLeave();
    } catch (error: any) {
      toast.error(error.response?.data?.message || `Failed to ${action} leaves`);
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

  const getLeaveTypeColor = (type: string) => {
    const colors: { [key: string]: string } = {
      annual: 'bg-blue-100 text-blue-800',
      sick: 'bg-red-100 text-red-800',
      personal: 'bg-purple-100 text-purple-800',
      maternity: 'bg-pink-100 text-pink-800',
      casual: 'bg-yellow-100 text-yellow-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const calculateDays = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  return (
    <PrivateRoute>
      <div className="flex h-screen bg-gray-50 overflow-hidden">
        {/* Sidebar - Reusing from admin dashboard */}
        <div className="w-64 bg-purple-900 flex flex-col">
          <div className="p-6 border-b border-purple-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-purple-900" />
              </div>
              <div>
                <div className="text-white font-bold text-lg">LeaveFlow</div>
                <div className="text-purple-300 text-xs">Admin Portal</div>
              </div>
            </div>
          </div>
          <nav className="flex-1 p-4 space-y-1">
            <Link href="/dashboard/admin" className="flex items-center gap-3 px-4 py-3 rounded-lg text-purple-200 hover:bg-purple-800 hover:text-white transition-colors">
              <Home className="w-5 h-5" />
              <span>Dashboard</span>
            </Link>
            <Link href="/users" className="flex items-center gap-3 px-4 py-3 rounded-lg text-purple-200 hover:bg-purple-800 hover:text-white transition-colors">
              <Users className="w-5 h-5" />
              <span>Employees</span>
            </Link>
            
            {/* Leave Management Dropdown */}
            <div className="relative" ref={leaveDropdownRef}>
              <button
                onClick={() => setShowLeaveDropdown(!showLeaveDropdown)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-purple-800 text-white transition-colors"
              >
                <Calendar className="w-5 h-5 flex-shrink-0" />
                <span className="flex-1 whitespace-nowrap">Leave Management</span>
                <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform ${showLeaveDropdown ? 'rotate-180' : ''}`} />
              </button>
              
              {showLeaveDropdown && (
                <div className="mt-2 ml-2 pl-2 border-l-2 border-purple-700 space-y-1">
                  <Link
                    href="/admin/leave"
                    className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-purple-800 text-white"
                    onClick={() => setShowLeaveDropdown(false)}
                  >
                    <FileText className="w-4 h-4" />
                    <span className="text-sm">Employees on Leave</span>
                  </Link>
                  <Link
                    href="/admin/leave-balance"
                    className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-purple-200 hover:bg-purple-800 hover:text-white transition-colors"
                    onClick={() => setShowLeaveDropdown(false)}
                  >
                    <TrendingUp className="w-4 h-4" />
                    <span className="text-sm">Leave Balances</span>
                  </Link>
                </div>
              )}
            </div>

            <Link href="/dashboard/admin" className="flex items-center gap-3 px-4 py-3 rounded-lg text-purple-200 hover:bg-purple-800 hover:text-white transition-colors">
              <BarChart3 className="w-5 h-5" />
              <span>Reports</span>
            </Link>
            <Link href="/dashboard/admin" className="flex items-center gap-3 px-4 py-3 rounded-lg text-purple-200 hover:bg-purple-800 hover:text-white transition-colors">
              <Building2 className="w-5 h-5" />
              <span>Departments</span>
            </Link>
          </nav>

          {/* Settings Section */}
          <div className="p-4 border-t border-purple-800 space-y-1">
            <Link href="/dashboard/admin" className="flex items-center gap-3 px-4 py-3 rounded-lg text-purple-200 hover:bg-purple-800 hover:text-white transition-colors">
              <Settings className="w-5 h-5" />
              <span>Preferences</span>
            </Link>
            <Link href="/dashboard/admin" className="flex items-center gap-3 px-4 py-3 rounded-lg text-purple-200 hover:bg-purple-800 hover:text-white transition-colors relative">
              <Bell className="w-5 h-5" />
              <span>Notifications</span>
              <span className="ml-auto bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">3</span>
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
              <ChevronDown className={`w-4 h-4 text-purple-300 transition-transform ${showProfileDropdown ? 'rotate-180' : ''}`} />
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
        <div className="flex-1 overflow-y-auto bg-gray-50">
          {/* Header */}
          <div className="bg-white border-b border-gray-200 px-8 py-6">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold text-gray-900">Employees Currently on Leave</h1>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleExport('csv')}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Export
                </button>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center gap-2 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold"
                >
                  <Plus className="w-5 h-5" />
                  Add Leave
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-8">
            {/* Filters */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
              <div className="flex items-center gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search employees..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                {selectedLeaves.length > 0 && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleBulkAction('approve')}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Approve Selected ({selectedLeaves.length})
                    </button>
                    <button
                      onClick={() => handleBulkAction('reject')}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      Reject Selected ({selectedLeaves.length})
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">
                        <input
                          type="checkbox"
                          checked={selectedLeaves.length === employees.length && employees.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedLeaves(employees.map(e => e.id));
                            } else {
                              setSelectedLeaves([]);
                            }
                          }}
                          className="rounded border-gray-300"
                        />
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">EMPLOYEE</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">DEPARTMENT</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">LEAVE TYPE</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">START DATE</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">END DATE</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">DURATION</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">STATUS</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {loading ? (
                      <tr>
                        <td colSpan={9} className="px-6 py-8 text-center text-gray-500">
                          Loading...
                        </td>
                      </tr>
                    ) : employees.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-6 py-8 text-center text-gray-500">
                          No employees currently on leave
                        </td>
                      </tr>
                    ) : (
                      employees
                        .filter(emp => 
                          !searchQuery || 
                          emp.employee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          emp.employee.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          emp.employee.employeeId.toLowerCase().includes(searchQuery.toLowerCase())
                        )
                        .map((employee) => (
                          <tr key={employee.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4">
                              <input
                                type="checkbox"
                                checked={selectedLeaves.includes(employee.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedLeaves([...selectedLeaves, employee.id]);
                                  } else {
                                    setSelectedLeaves(selectedLeaves.filter(id => id !== employee.id));
                                  }
                                }}
                                className="rounded border-gray-300"
                              />
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                                  {employee.employee.profilePhoto ? (
                                    <img
                                      src={`http://localhost:5000${employee.employee.profilePhoto}`}
                                      alt={employee.employee.name}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <Users className="w-5 h-5 text-gray-400" />
                                  )}
                                </div>
                                <div>
                                  <div className="font-medium text-gray-900">{employee.employee.name}</div>
                                  <div className="text-sm text-gray-500">{employee.employee.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-700">Engineering</td>
                            <td className="px-6 py-4">
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getLeaveTypeColor(employee.leaveType)}`}>
                                {getLeaveTypeLabel(employee.leaveType)}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-700">{formatDate(employee.startDate)}</td>
                            <td className="px-6 py-4 text-sm text-gray-700">{formatDate(employee.endDate)}</td>
                            <td className="px-6 py-4 text-sm text-gray-700">{employee.totalDays} days</td>
                            <td className="px-6 py-4">
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                Active
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => {
                                    setSelectedLeave(employee);
                                    setShowEditModal(true);
                                  }}
                                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="Edit"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={async () => {
                                    if (confirm('Are you sure you want to cancel this leave?')) {
                                      try {
                                        await axiosInstance.put(`/leave/admin/cancel/${employee.id}`, {
                                          reason: 'Cancelled by admin'
                                        });
                                        toast.success('Leave cancelled successfully');
                                        fetchEmployeesOnLeave();
                                      } catch (error: any) {
                                        toast.error(error.response?.data?.message || 'Failed to cancel leave');
                                      }
                                    }
                                  }}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Cancel"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.total > pagination.limit && (
                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} employees
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                      disabled={pagination.page === 1}
                      className="p-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="px-4 py-2 bg-purple-600 text-white rounded-lg font-semibold">{pagination.page}</span>
                    <button
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                      disabled={pagination.page * pagination.limit >= pagination.total}
                      className="p-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Add Leave Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Add Leave</h2>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setAddLeaveForm({ userId: '', leaveType: '', startDate: '', endDate: '', reason: '', status: 'approved' });
                    setCalculatedDays(0);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleAddLeave} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Select Employee *
                  </label>
                  <select
                    value={addLeaveForm.userId}
                    onChange={(e) => setAddLeaveForm({ ...addLeaveForm, userId: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  >
                    <option value="">Select an employee</option>
                    {allEmployees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.employeeId || emp.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Leave Type *
                    </label>
                    <select
                      value={addLeaveForm.leaveType}
                      onChange={(e) => setAddLeaveForm({ ...addLeaveForm, leaveType: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      required
                    >
                      <option value="">Select leave type</option>
                      <option value="annual">Annual Leave</option>
                      <option value="sick">Sick Leave</option>
                      <option value="casual">Casual Leave</option>
                      <option value="maternity">Maternity Leave</option>
                      <option value="paternity">Paternity Leave</option>
                      <option value="compensatory">Compensatory Leave</option>
                      <option value="unpaid">Unpaid Leave</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Status *
                    </label>
                    <select
                      value={addLeaveForm.status}
                      onChange={(e) => setAddLeaveForm({ ...addLeaveForm, status: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      required
                    >
                      <option value="approved">Approved</option>
                      <option value="pending">Pending</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Start Date *
                    </label>
                    <input
                      type="date"
                      value={addLeaveForm.startDate}
                      onChange={(e) => setAddLeaveForm({ ...addLeaveForm, startDate: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      End Date *
                    </label>
                    <input
                      type="date"
                      value={addLeaveForm.endDate}
                      onChange={(e) => setAddLeaveForm({ ...addLeaveForm, endDate: e.target.value })}
                      min={addLeaveForm.startDate}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Total Working Days
                  </label>
                  <div className="px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg">
                    <span className="text-lg font-bold text-purple-600">{calculatedDays}</span>
                    <span className="text-gray-600 ml-2">days</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Reason *
                  </label>
                  <textarea
                    value={addLeaveForm.reason}
                    onChange={(e) => setAddLeaveForm({ ...addLeaveForm, reason: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Enter reason for leave..."
                    required
                    minLength={10}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Minimum 10 characters required ({addLeaveForm.reason.length} characters)
                  </p>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      setAddLeaveForm({ userId: '', leaveType: '', startDate: '', endDate: '', reason: '', status: 'approved' });
                      setCalculatedDays(0);
                    }}
                    className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || calculatedDays === 0 || addLeaveForm.reason.length < 10}
                    className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                  >
                    {submitting ? 'Adding...' : 'Add Leave'}
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

export default AdminLeaveManagementPage;
