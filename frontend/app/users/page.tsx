'use client'

import React, { useState, useEffect } from 'react';
import axiosInstance from '../utils/axios';
import toast from 'react-hot-toast';
import Navbar from '../components/Navbar';
import PrivateRoute from '../components/PrivateRoute';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';
import { 
  Users, Search, Filter, Mail, Phone, User, Eye, 
  Calendar, Briefcase, CheckCircle, XCircle, Loader
} from 'lucide-react';

interface Department {
  id: number;
  name: string;
  code?: string;
}

interface Employee {
  id: number;
  name: string;
  email?: string;
  mobileNumber?: string;
  employeeId?: string;
  role: string;
  profilePhoto?: string;
  onboardingCompleted?: boolean;
  createdAt: string;
  department?: Department;
  leaveBalances?: Array<{
    leaveType: string;
    totalDays: number;
    usedDays: number;
    remainingDays: number;
  }>;
}

const UsersPage: React.FC = () => {
  const { user } = useAuth();
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });
  const [includeLeaveBalance, setIncludeLeaveBalance] = useState(false);

  useEffect(() => {
    if (user && user.role !== 'admin') {
      router.push('/dashboard');
      return;
    }
    fetchDepartments();
  }, [user]);

  useEffect(() => {
    if (user && user.role === 'admin') {
      // Debounce search to avoid too many API calls
      const timer = setTimeout(() => {
        fetchUsers();
      }, search ? 500 : 0); // Wait 500ms after user stops typing

      return () => clearTimeout(timer);
    }
  }, [user, pagination.page, pagination.limit, search, roleFilter, departmentFilter, includeLeaveBalance]);

  const fetchDepartments = async () => {
    try {
      const response = await axiosInstance.get('/departments');
      setDepartments(response.data.departments || []);
    } catch (error: any) {
      console.error('Error fetching departments:', error);
      // Don't show error toast as departments are optional
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params: any = {
        page: pagination.page,
        limit: pagination.limit,
        includeLeaveBalance: includeLeaveBalance
      };

      if (roleFilter) {
        params.role = roleFilter;
      }

      if (search) {
        params.search = search;
      }

      const response = await axiosInstance.get('/auth/users', { params });
      let users = response.data.users || [];
      
      // Filter by department on client side (since backend doesn't support it yet)
      if (departmentFilter) {
        users = users.filter((emp: Employee) => emp.department?.id === parseInt(departmentFilter));
      }

      setEmployees(users);
      setPagination({
        ...pagination,
        total: departmentFilter ? users.length : (response.data.total || 0),
        totalPages: departmentFilter ? Math.ceil(users.length / pagination.limit) : (response.data.totalPages || 0)
      });
    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPagination({ ...pagination, page: 1 }); // Reset to first page on search
  };

  const handleRoleFilter = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setRoleFilter(e.target.value);
    setPagination({ ...pagination, page: 1 });
  };

  const handleDepartmentFilter = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setDepartmentFilter(e.target.value);
    setPagination({ ...pagination, page: 1 });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
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

  const getTotalLeaveBalance = (employee: Employee) => {
    if (!employee.leaveBalances || employee.leaveBalances.length === 0) {
      return 'Not Set';
    }
    const total = employee.leaveBalances.reduce((sum, balance) => 
      sum + parseFloat(balance.remainingDays.toString()), 0
    );
    return `${total.toFixed(1)} days`;
  };

  return (
    <PrivateRoute>
      <Navbar />
      <div className="min-h-screen bg-gray-50 py-6 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
                <Users className="w-8 h-8 text-indigo-600" />
                Employee Management
              </h1>
              <p className="text-gray-600 mt-1">View and manage all employees</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-indigo-600">{pagination.total}</div>
              <div className="text-sm text-gray-600">Total Users</div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <Search className="w-4 h-4 inline mr-1" />
                  Search
                </label>
                <input
                  type="text"
                  value={search}
                  onChange={handleSearch}
                  placeholder="Search by name, email, employee ID, or phone..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <Filter className="w-4 h-4 inline mr-1" />
                  Filter by Role
                </label>
                <select
                  value={roleFilter}
                  onChange={handleRoleFilter}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                >
                  <option value="">All Roles</option>
                  <option value="employee">Employees</option>
                  <option value="admin">Admins</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <Filter className="w-4 h-4 inline mr-1" />
                  Filter by Department
                </label>
                <select
                  value={departmentFilter}
                  onChange={handleDepartmentFilter}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                >
                  <option value="">All Departments</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id.toString()}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Items per Page
                </label>
                <select
                  value={pagination.limit}
                  onChange={(e) => setPagination({ ...pagination, limit: parseInt(e.target.value), page: 1 })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                >
                  <option value="10">10</option>
                  <option value="20">20</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <input
                type="checkbox"
                id="includeLeaveBalance"
                checked={includeLeaveBalance}
                onChange={(e) => {
                  setIncludeLeaveBalance(e.target.checked);
                  setPagination({ ...pagination, page: 1 });
                }}
                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
              />
              <label htmlFor="includeLeaveBalance" className="text-sm text-gray-700 cursor-pointer">
                Include Leave Balances
              </label>
            </div>
          </div>

          {/* Users Table */}
          {loading ? (
            <div className="bg-white rounded-xl shadow-lg p-10 text-center">
              <Loader className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-4" />
              <div className="text-lg text-gray-600">Loading employees...</div>
            </div>
          ) : employees.length === 0 ? (
            <div className="bg-white rounded-xl shadow-lg p-10 text-center">
              <Users size={48} className="mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600">No employees found</p>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-6">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Employee</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Employee ID</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Department</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Contact</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Role</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Status</th>
                        {includeLeaveBalance && (
                          <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Leave Balance</th>
                        )}
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Joined</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {employees.map((employee) => (
                        <tr key={employee.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center overflow-hidden">
                                {employee.profilePhoto ? (
                                  <img 
                                    src={`http://localhost:5000${employee.profilePhoto}`} 
                                    alt={employee.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <User className="w-6 h-6 text-indigo-600" />
                                )}
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{employee.name}</p>
                                {employee.email && (
                                  <p className="text-xs text-gray-500">{employee.email}</p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-gray-600 font-mono">
                              {employee.employeeId || 'N/A'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {employee.department ? (
                              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800">
                                {employee.department.name}
                              </span>
                            ) : (
                              <span className="text-sm text-gray-400">Not Assigned</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="space-y-1">
                              {employee.email && (
                                <div className="flex items-center gap-1 text-xs text-gray-600">
                                  <Mail className="w-3 h-3" />
                                  {employee.email}
                                </div>
                              )}
                              {employee.mobileNumber && (
                                <div className="flex items-center gap-1 text-xs text-gray-600">
                                  <Phone className="w-3 h-3" />
                                  {employee.mobileNumber}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              employee.role === 'admin' 
                                ? 'bg-purple-100 text-purple-800' 
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {employee.role.charAt(0).toUpperCase() + employee.role.slice(1)}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              {employee.onboardingCompleted ? (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                                  <CheckCircle className="w-3 h-3" />
                                  Active
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">
                                  <XCircle className="w-3 h-3" />
                                  Pending
                                </span>
                              )}
                            </div>
                          </td>
                          {includeLeaveBalance && (
                            <td className="px-6 py-4">
                              {employee.leaveBalances && employee.leaveBalances.length > 0 ? (
                                <div className="space-y-1">
                                  {employee.leaveBalances.slice(0, 3).map((balance) => (
                                    <div key={balance.leaveType} className="text-xs text-gray-600">
                                      <span className="font-medium">{getLeaveTypeLabel(balance.leaveType)}:</span>{' '}
                                      <span className="text-indigo-600 font-semibold">
                                        {balance.remainingDays.toFixed(1)}
                                      </span>
                                      <span className="text-gray-400">/{balance.totalDays}</span>
                                    </div>
                                  ))}
                                  {employee.leaveBalances.length > 3 && (
                                    <div className="text-xs text-gray-400">
                                      +{employee.leaveBalances.length - 3} more
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-xs text-gray-400">Not initialized</span>
                              )}
                            </td>
                          )}
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {formatDate(employee.createdAt)}
                          </td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => router.push(`/profile?id=${employee.id}`)}
                              className="text-indigo-600 hover:text-indigo-800 text-sm font-medium flex items-center gap-1"
                            >
                              <Eye size={14} />
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="bg-white rounded-xl shadow-lg p-4 flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                    {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                    {pagination.total} employees
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                      disabled={pagination.page === 1}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Previous
                    </button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                        .filter(page => {
                          // Show first, last, current, and pages around current
                          return page === 1 || 
                                 page === pagination.totalPages || 
                                 (page >= pagination.page - 1 && page <= pagination.page + 1);
                        })
                        .map((page, idx, arr) => {
                          // Add ellipsis if there's a gap
                          const prevPage = arr[idx - 1];
                          const showEllipsis = prevPage && page - prevPage > 1;
                          
                          return (
                            <React.Fragment key={page}>
                              {showEllipsis && <span className="px-2 text-gray-400">...</span>}
                              <button
                                onClick={() => setPagination({ ...pagination, page })}
                                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                  pagination.page === page
                                    ? 'bg-indigo-600 text-white'
                                    : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                                }`}
                              >
                                {page}
                              </button>
                            </React.Fragment>
                          );
                        })}
                    </div>
                    <button
                      onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                      disabled={pagination.page === pagination.totalPages}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </PrivateRoute>
  );
};

export default UsersPage;
