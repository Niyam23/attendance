'use client'

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import axiosInstance from '../../utils/axios';
import toast from 'react-hot-toast';
import PrivateRoute from '../../components/PrivateRoute';
import { useAuth } from '../../context/AuthContext';
import { 
  Users, Calendar, Settings, Bell, Search, Plus, Edit, X, 
  CheckCircle, XCircle, TrendingUp, ChevronDown, LogOut, Home, FileText, BarChart3, Building2
} from 'lucide-react';

interface Department {
  id: number;
  name: string;
  code?: string;
}

interface EmployeeBalance {
  employee: {
    id: number;
    name: string;
    email: string;
    employeeId: string;
    profilePhoto?: string;
    department?: Department;
  };
  balances: Array<{
    id: number;
    leaveType: string;
    totalDays: number;
    usedDays: number;
    remainingDays: number;
    year: number;
  }>;
  hasBalances: boolean;
}

const LeaveBalanceManagementPage: React.FC = () => {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [employees, setEmployees] = useState<EmployeeBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showInitModal, setShowInitModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [selectedBalance, setSelectedBalance] = useState<any>(null);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showLeaveDropdown, setShowLeaveDropdown] = useState(true);
  const leaveDropdownRef = useRef<HTMLDivElement>(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });

  // Initialize form state
  const [initForm, setInitForm] = useState({
    annual: 0,
    sick: 0,
    casual: 0,
    maternity: 0,
    paternity: 0
  });

  const [carryForward, setCarryForward] = useState(false);
  const [previousYearBalance, setPreviousYearBalance] = useState(0);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [employeeEligibility, setEmployeeEligibility] = useState<{maternity: boolean, paternity: boolean}>({maternity: true, paternity: true});

  const [adjustForm, setAdjustForm] = useState({
    leaveType: '',
    adjustment: '',
    reason: ''
  });

  useEffect(() => {
    if (user && user.role !== 'admin') {
      router.push('/dashboard');
      return;
    }
    fetchEmployeeBalances();
    fetchDefaultAllocations();
  }, [user, selectedYear]);

  const fetchDefaultAllocations = async () => {
    try {
      const response = await axiosInstance.get('/leave/admin/default-allocations');
      if (response.data.defaultAllocations) {
        setInitForm({
          annual: response.data.defaultAllocations.annual || 0,
          sick: response.data.defaultAllocations.sick || 0,
          casual: response.data.defaultAllocations.casual || 0,
          maternity: response.data.defaultAllocations.maternity || 0,
          paternity: response.data.defaultAllocations.paternity || 0
        });
      }
    } catch (error: any) {
      console.error('Error fetching default allocations:', error);
      // Use fallback defaults if API fails - but still fetch from API
      console.error('Failed to fetch defaults, using fallbacks');
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (leaveDropdownRef.current && !leaveDropdownRef.current.contains(event.target as Node)) {
        setShowLeaveDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchEmployeeBalances = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get('/leave/admin/all-balances', {
        params: { year: selectedYear }
      });
      setEmployees(response.data.employees || []);
      setPagination(prev => ({ ...prev, total: response.data.total || 0 }));
    } catch (error: any) {
      console.error('Error fetching employee balances:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch employee balances');
    } finally {
      setLoading(false);
    }
  };

  const fetchPreviousYearBalance = async (employeeId: number) => {
    try {
      const previousYear = selectedYear - 1;
      const response = await axiosInstance.get('/leave/admin/all-balances', {
        params: { year: previousYear }
      });
      const employee = response.data.employees.find((e: any) => e.employee.id === employeeId);
      if (employee && employee.balances) {
        const annualBalance = employee.balances.find((b: any) => b.leaveType === 'annual');
        setPreviousYearBalance(annualBalance ? annualBalance.remainingDays : 0);
      } else {
        setPreviousYearBalance(0);
      }
    } catch (error: any) {
      console.error('Error fetching previous year balance:', error);
      setPreviousYearBalance(0);
    }
  };

  const handleInitializeBalance = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedEmployee) return;

    // Validation
    const allocations: { [key: string]: number } = {};
    Object.entries(initForm).forEach(([key, value]) => {
      const numValue = parseFloat(value.toString());
      if (numValue < 0) {
        toast.error(`${getLeaveTypeLabel(key)} cannot be negative`);
        return;
      }
      if (numValue > 0) {
        allocations[key] = numValue;
      }
    });

    if (Object.keys(allocations).length === 0) {
      toast.error('Please set at least one leave type with days greater than 0');
      return;
    }

    // Check if all values are 0
    const totalDays = Object.values(allocations).reduce((sum, val) => sum + val, 0);
    if (totalDays === 0) {
      toast.error('At least one leave type must have days greater than 0');
      return;
    }

    // Show confirmation modal
    setShowConfirmModal(true);
  };

  const confirmInitializeBalance = async () => {
    if (!selectedEmployee) return;

    try {
      const allocations: { [key: string]: number } = {};
      Object.entries(initForm).forEach(([key, value]) => {
        const numValue = parseFloat(value.toString());
        if (numValue > 0) {
          allocations[key] = numValue;
        }
      });

      const response = await axiosInstance.post(`/leave/admin/initialize-balance/${selectedEmployee.id}`, {
        allocations,
        year: selectedYear,
        carryForward: carryForward && allocations.annual ? true : false
      });

      if (response.data.created.length > 0) {
        toast.success(`Leave balance initialized for ${selectedEmployee.name}${response.data.carriedForwardDays > 0 ? ` (Carried forward ${response.data.carriedForwardDays} days)` : ''}`);
        setShowInitModal(false);
        setShowConfirmModal(false);
        setSelectedEmployee(null);
        fetchDefaultAllocations();
        setCarryForward(false);
        setPreviousYearBalance(0);
        fetchEmployeeBalances();
      }

      if (response.data.existing.length > 0) {
        toast.error(`Some balances already exist: ${response.data.existing.map((e: any) => e.leaveType).join(', ')}`);
      }
    } catch (error: any) {
      console.error('Error initializing balance:', error);
      toast.error(error.response?.data?.message || 'Failed to initialize leave balance');
    }
  };

  const handleAdjustBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee || !adjustForm.leaveType || !adjustForm.adjustment || !adjustForm.reason) {
      toast.error('Please fill all fields');
      return;
    }

    if (adjustForm.reason.length < 10) {
      toast.error('Reason must be at least 10 characters');
      return;
    }

    try {
      await axiosInstance.post('/leave/admin/adjust-balance', {
        userId: selectedEmployee.id,
        leaveType: adjustForm.leaveType,
        adjustment: parseFloat(adjustForm.adjustment),
        reason: adjustForm.reason,
        year: selectedYear
      });
      toast.success('Leave balance adjusted successfully');
      setShowAdjustModal(false);
      setSelectedEmployee(null);
      setSelectedBalance(null);
      setAdjustForm({ leaveType: '', adjustment: '', reason: '' });
      fetchEmployeeBalances();
    } catch (error: any) {
      console.error('Error adjusting balance:', error);
      toast.error(error.response?.data?.message || 'Failed to adjust leave balance');
    }
  };

  const getLeaveTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      sick: 'Sick Leave',
      casual: 'Casual Leave',
      annual: 'Annual Leave',
      maternity: 'Maternity Leave',
      paternity: 'Paternity Leave',
      compensatory: 'Compensatory Leave'
    };
    return labels[type] || type;
  };

  const filteredEmployees = employees.filter(emp => 
    !searchQuery || 
    emp.employee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.employee.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.employee.employeeId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <PrivateRoute>
      <div className="flex h-screen bg-gray-50 overflow-hidden">
        {/* Sidebar */}
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
                    className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-purple-200 hover:bg-purple-800 hover:text-white transition-colors"
                    onClick={() => setShowLeaveDropdown(false)}
                  >
                    <FileText className="w-4 h-4" />
                    <span className="text-sm">Employees on Leave</span>
                  </Link>
                  <Link
                    href="/admin/leave-balance"
                    className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-purple-800 text-white"
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
          <div className="bg-white border-b border-gray-200 px-8 py-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Leave Balance Management</h1>
                <p className="text-gray-600 mt-1">Initialize and manage employee leave balances</p>
              </div>
              <div className="flex items-center gap-3">
                        <select
                          value={selectedYear}
                          onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        >
                          <option value={new Date().getFullYear()}>{new Date().getFullYear()}</option>
                          <option value={new Date().getFullYear() + 1}>{new Date().getFullYear() + 1}</option>
                        </select>
              </div>
            </div>
          </div>

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
                <div className="text-sm text-gray-600">
                  {employees.filter(e => e.hasBalances).length} with balances | {employees.filter(e => !e.hasBalances).length} without balances
                </div>
              </div>
            </div>

            {/* Employee Balances Table */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Employee</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Leave Balances</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {loading ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                          Loading...
                        </td>
                      </tr>
                    ) : filteredEmployees.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                          No employees found
                        </td>
                      </tr>
                    ) : (
                      filteredEmployees.map((empBal) => (
                        <tr key={empBal.employee.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                                {empBal.employee.profilePhoto ? (
                                  <img
                                    src={`http://localhost:5000${empBal.employee.profilePhoto}`}
                                    alt={empBal.employee.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <Users className="w-5 h-5 text-gray-400" />
                                )}
                              </div>
                              <div>
                                <div className="font-medium text-gray-900">{empBal.employee.name}</div>
                                <div className="text-sm text-gray-500">{empBal.employee.employeeId || empBal.employee.email}</div>
                                {empBal.employee.department && (
                                  <div className="text-xs text-indigo-600 mt-1">
                                    {empBal.employee.department.name}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {empBal.hasBalances ? (
                              <div className="grid grid-cols-3 gap-2">
                                {empBal.balances.map((balance) => (
                                  <div key={balance.id} className="bg-gray-50 rounded-lg p-2">
                                    <div className="text-xs font-semibold text-gray-700">{getLeaveTypeLabel(balance.leaveType)}</div>
                                    <div className="text-sm">
                                      <span className="font-bold text-purple-600">{balance.remainingDays}</span>
                                      <span className="text-gray-500">/{balance.totalDays}</span>
                                    </div>
                                    <div className="text-xs text-gray-400">Used: {balance.usedDays}</div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-sm text-red-600 font-medium">Not Initialized</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {empBal.hasBalances ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                                <CheckCircle className="w-3 h-3" />
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                                <XCircle className="w-3 h-3" />
                                Not Set
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              {!empBal.hasBalances ? (
                                <button
                                  onClick={() => {
                                    setSelectedEmployee(empBal.employee);
                                    setCarryForward(false);
                                    setPreviousYearBalance(0);
                                    fetchDefaultAllocations();
                                    setEmployeeEligibility({ maternity: true, paternity: true });
                                    if (empBal.employee.id) {
                                      fetchPreviousYearBalance(empBal.employee.id);
                                    }
                                    setShowInitModal(true);
                                  }}
                                  className="px-3 py-1 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-semibold"
                                >
                                  Initialize
                                </button>
                              ) : (
                                <>
                                  <button
                                    onClick={() => {
                                      setSelectedEmployee(empBal.employee);
                                      setSelectedBalance(empBal.balances[0]);
                                      setAdjustForm({ ...adjustForm, leaveType: empBal.balances[0]?.leaveType || '' });
                                      setShowAdjustModal(true);
                                    }}
                                    className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-semibold"
                                  >
                                    Adjust
                                  </button>
                                  <button
                                    onClick={() => {
                                      setSelectedEmployee(empBal.employee);
                                      setCarryForward(false);
                                      setPreviousYearBalance(0);
                                      fetchDefaultAllocations();
                                      setEmployeeEligibility({ maternity: true, paternity: true });
                                      if (empBal.employee.id) {
                                        fetchPreviousYearBalance(empBal.employee.id);
                                      }
                                      setShowInitModal(true);
                                    }}
                                    className="px-3 py-1 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-semibold"
                                  >
                                    Re-Initialize
                                  </button>
                                </>
                              )}
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
        </div>

        {/* Initialize Balance Modal */}
        {showInitModal && selectedEmployee && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Initialize Leave Balance
                </h2>
                <button
                  onClick={() => {
                    setShowInitModal(false);
                    setShowConfirmModal(false);
                    setSelectedEmployee(null);
                    fetchDefaultAllocations();
                    setCarryForward(false);
                    setPreviousYearBalance(0);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleInitializeBalance} className="space-y-6">
                {/* Employee and Year Context */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-gray-600">Employee</div>
                      <div className="text-lg font-semibold text-gray-900">{selectedEmployee.name}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-600">Leave Year</div>
                      <div className="text-lg font-semibold text-gray-900">{selectedYear}</div>
                    </div>
                  </div>
                </div>

                {/* Carry Forward Section - Only show for next year initialization */}
                {selectedYear > new Date().getFullYear() && (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        id="carryForward"
                        checked={carryForward}
                        onChange={(e) => setCarryForward(e.target.checked)}
                        className="mt-1 w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                      />
                      <div className="flex-1">
                        <label htmlFor="carryForward" className="block text-sm font-semibold text-gray-900 mb-1 cursor-pointer">
                          Carry forward balance from {selectedYear - 1}
                        </label>
                        {carryForward && previousYearBalance > 0 ? (
                          <div className="text-sm text-purple-700 mt-1">
                            Available balance from {selectedYear - 1}: <strong>{previousYearBalance} days</strong>
                          </div>
                        ) : carryForward && previousYearBalance === 0 ? (
                          <div className="text-sm text-gray-600 mt-1">
                            No balance available to carry forward from {selectedYear - 1}
                          </div>
                        ) : null}
                        <div className="text-xs text-gray-500 mt-1">
                          Applies to Annual Leave only. Unused annual leave from {selectedYear - 1} will be added to the new allocation for {selectedYear}.
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Leave Allocations */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-4">
                    Set Leave Allocations
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries(initForm).map(([key, value]) => {
                      const isAnnual = key === 'annual';
                      const isRestricted = (key === 'maternity' || key === 'paternity') && !employeeEligibility[key as 'maternity' | 'paternity'];
                      const allocationTypes: {[key: string]: string} = {
                        annual: 'Yearly allocation',
                        sick: 'Yearly allocation',
                        casual: 'Yearly allocation',
                        maternity: 'Eligibility-based',
                        paternity: 'Eligibility-based'
                      };

                      return (
                        <div key={key}>
                          <div className="flex items-center justify-between mb-1">
                            <label className="block text-sm font-medium text-gray-700">
                              {getLeaveTypeLabel(key)}
                            </label>
                            {isRestricted && (
                              <span className="text-xs text-red-600" title="Not applicable based on employee eligibility">
                                Restricted
                              </span>
                            )}
                          </div>
                          <input
                            type="number"
                            min="0"
                            max={isAnnual && carryForward && previousYearBalance > 0 ? undefined : (key === 'annual' ? 30 : key === 'sick' ? 15 : key === 'casual' ? 15 : undefined)}
                            step="0.5"
                            value={value}
                            onChange={(e) => {
                              const newValue = parseFloat(e.target.value) || 0;
                              if (newValue >= 0) {
                                setInitForm({ ...initForm, [key]: newValue });
                              }
                            }}
                            disabled={isRestricted}
                            className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                              isRestricted ? 'bg-gray-100 cursor-not-allowed' : ''
                            }`}
                            placeholder="Days"
                          />
                          <div className="text-xs text-gray-500 mt-1">{allocationTypes[key]}</div>
                          {isRestricted && (
                            <div className="text-xs text-red-600 mt-1" title="Not applicable based on employee eligibility">
                              Not applicable based on employee eligibility
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Unpaid Leave Info */}
                  <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="text-sm text-yellow-800">
                      <strong>Note:</strong> Unpaid leave and Compensatory leave are not pre-allocated. Unpaid leave is tracked when applied, and Compensatory leave is earned based on work patterns.
                    </p>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <strong>Note:</strong> Only leave types with days greater than 0 will be initialized. 
                    Existing balances will not be overwritten. This action initializes leave balances for the selected year only.
                  </p>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowInitModal(false);
                      setShowConfirmModal(false);
                      setSelectedEmployee(null);
                      fetchDefaultAllocations();
                      setCarryForward(false);
                      setPreviousYearBalance(0);
                    }}
                    className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={Object.values(initForm).every(v => parseFloat(v.toString()) === 0)}
                    className={`px-6 py-2 rounded-lg transition-colors font-semibold ${
                      Object.values(initForm).every(v => parseFloat(v.toString()) === 0)
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-purple-600 text-white hover:bg-purple-700'
                    }`}
                  >
                    Initialize Balance
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Confirmation Modal */}
        {showConfirmModal && selectedEmployee && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Confirm Leave Balance Initialization</h3>
              <div className="space-y-3 mb-6">
                <div className="text-sm text-gray-600">
                  You are initializing leave balances for <strong>{selectedEmployee.name}</strong> ({selectedYear})
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="space-y-2">
                    {Object.entries(initForm).map(([key, value]) => {
                      const numValue = parseFloat(value.toString());
                      if (numValue > 0) {
                        const displayValue = key === 'annual' && carryForward && previousYearBalance > 0 
                          ? `${numValue} (includes ${previousYearBalance} carried forward)`
                          : numValue;
                        return (
                          <div key={key} className="flex justify-between text-sm">
                            <span className="text-gray-700">{getLeaveTypeLabel(key)}:</span>
                            <span className="font-semibold text-gray-900">{displayValue} days</span>
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-sm text-yellow-800">
                    <strong>Warning:</strong> This action cannot be edited. Please verify all values before proceeding.
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmInitializeBalance}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold"
                >
                  Confirm & Initialize
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Adjust Balance Modal */}
        {showAdjustModal && selectedEmployee && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-8 max-w-lg w-full">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Adjust Leave Balance - {selectedEmployee.name}
                </h2>
                <button
                  onClick={() => {
                    setShowAdjustModal(false);
                    setSelectedEmployee(null);
                    setSelectedBalance(null);
                    setAdjustForm({ leaveType: '', adjustment: '', reason: '' });
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleAdjustBalance} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Leave Type *
                  </label>
                  <select
                    value={adjustForm.leaveType}
                    onChange={(e) => setAdjustForm({ ...adjustForm, leaveType: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  >
                    <option value="">Select leave type</option>
                    {selectedEmployee && employees.find(e => e.employee.id === selectedEmployee.id)?.balances.map((bal) => (
                      <option key={bal.id} value={bal.leaveType}>
                        {getLeaveTypeLabel(bal.leaveType)} (Current: {bal.remainingDays}/{bal.totalDays})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Adjustment (Days) *
                  </label>
                  <div className="space-y-2">
                    <input
                      type="number"
                      step="0.5"
                      value={adjustForm.adjustment}
                      onChange={(e) => setAdjustForm({ ...adjustForm, adjustment: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="e.g., +5 to add, -2 to subtract"
                      required
                    />
                    <p className="text-xs text-gray-500">
                      Use positive numbers to add days, negative numbers to subtract days
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Reason *
                  </label>
                  <textarea
                    value={adjustForm.reason}
                    onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Enter reason for adjustment..."
                    required
                    minLength={10}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Minimum 10 characters ({adjustForm.reason.length} characters)
                  </p>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAdjustModal(false);
                      setSelectedEmployee(null);
                      setSelectedBalance(null);
                      setAdjustForm({ leaveType: '', adjustment: '', reason: '' });
                    }}
                    className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={adjustForm.reason.length < 10}
                    className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                  >
                    Adjust Balance
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

export default LeaveBalanceManagementPage;
