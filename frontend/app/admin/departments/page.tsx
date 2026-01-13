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
  Home, ChevronDown, LogOut, Plus, Edit, Trash2, X, Check, TrendingUp
} from 'lucide-react';

interface Department {
  id: number;
  name: string;
  code?: string;
  description?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  employeeCount?: number;
}

const DepartmentsPage: React.FC = () => {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEmployeesModal, setShowEmployeesModal] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [departmentEmployees, setDepartmentEmployees] = useState<any[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showLeaveDropdown, setShowLeaveDropdown] = useState(false);
  const leaveDropdownRef = useRef<HTMLDivElement>(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    isActive: true
  });
  const [submitting, setSubmitting] = useState(false);

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
    if (user) {
      fetchDepartments();
    }
  }, [user]);

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get('/departments');
      const depts = response.data.departments || response.data || [];
      
      // Fetch employee count for each department
      const departmentsWithCounts = await Promise.all(
        depts.map(async (dept: Department) => {
          try {
            const usersRes = await axiosInstance.get('/auth/users', { params: { limit: 1000 } });
            const allUsers = usersRes.data.users || [];
            const employeeCount = allUsers.filter((u: any) => u.departmentId === dept.id && u.role === 'employee').length;
            return { ...dept, employeeCount };
          } catch {
            return { ...dept, employeeCount: 0 };
          }
        })
      );
      
      setDepartments(departmentsWithCounts);
    } catch (error: any) {
      console.error('Error fetching departments:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch departments');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setFormData({ name: '', code: '', description: '', isActive: true });
    setSelectedDepartment(null);
    setShowAddModal(true);
  };

  const handleEdit = (department: Department) => {
    setFormData({
      name: department.name,
      code: department.code || '',
      description: department.description || '',
      isActive: department.isActive
    });
    setSelectedDepartment(department);
    setShowEditModal(true);
  };

  const handleDelete = (department: Department) => {
    setSelectedDepartment(department);
    setShowDeleteModal(true);
  };

  const handleViewEmployees = async (department: Department) => {
    console.log('handleViewEmployees called for:', department);
    setSelectedDepartment(department);
    setShowEmployeesModal(true);
    setLoadingEmployees(true);
    
    try {
      const response = await axiosInstance.get('/auth/users', { params: { limit: 1000 } });
      const allUsers = response.data.users || [];
      const employees = allUsers.filter((u: any) => 
        u.departmentId === department.id && u.role === 'employee'
      );
      console.log('Filtered employees:', employees);
      setDepartmentEmployees(employees);
    } catch (error: any) {
      console.error('Error fetching employees:', error);
      toast.error('Failed to fetch employees');
      setDepartmentEmployees([]);
    } finally {
      setLoadingEmployees(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Department name is required');
      return;
    }

    setSubmitting(true);
    try {
      if (selectedDepartment) {
        // Update
        await axiosInstance.put(`/departments/${selectedDepartment.id}`, formData);
        toast.success('Department updated successfully');
        setShowEditModal(false);
      } else {
        // Create
        await axiosInstance.post('/departments', formData);
        toast.success('Department created successfully');
        setShowAddModal(false);
      }
      setFormData({ name: '', code: '', description: '', isActive: true });
      setSelectedDepartment(null);
      fetchDepartments();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save department');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!selectedDepartment) return;

    setSubmitting(true);
    try {
      await axiosInstance.delete(`/departments/${selectedDepartment.id}`);
      toast.success('Department deleted successfully');
      setShowDeleteModal(false);
      setSelectedDepartment(null);
      fetchDepartments();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete department');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredDepartments = departments.filter(dept => {
    const matchesSearch = !searchQuery || 
      dept.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dept.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dept.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && dept.isActive) ||
      (statusFilter === 'inactive' && !dept.isActive);
    
    return matchesSearch && matchesStatus;
  });

  return (
    <PrivateRoute>
      <div className="flex h-screen bg-gray-50 overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 bg-gradient-to-br from-teal-600 to-emerald-600 flex flex-col">
          <div className="p-6 border-b border-teal-500">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-teal-600" />
              </div>
              <div>
                <div className="text-white font-bold text-lg">TimeTrack</div>
                <div className="text-teal-100 text-xs">Admin Portal</div>
              </div>
            </div>
          </div>

          <nav className="flex-1 p-4 space-y-1">
            <Link href="/dashboard/admin" className="flex items-center gap-3 px-4 py-3 rounded-lg text-teal-100 hover:bg-teal-500 hover:text-white transition-colors">
              <Home className="w-5 h-5" />
              <span>Dashboard</span>
            </Link>
            <Link href="/users" className="flex items-center gap-3 px-4 py-3 rounded-lg text-teal-100 hover:bg-teal-500 hover:text-white transition-colors">
              <Users className="w-5 h-5" />
              <span>Employees</span>
            </Link>
            
            {/* Leave Management Dropdown */}
            <div className="relative" ref={leaveDropdownRef}>
              <button
                onClick={() => setShowLeaveDropdown(!showLeaveDropdown)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  pathname?.includes('/admin/leave')
                    ? 'bg-teal-500 text-white'
                    : 'text-teal-100 hover:bg-teal-500 hover:text-white'
                }`}
              >
                <Calendar className="w-5 h-5 flex-shrink-0" />
                <span className="flex-1 whitespace-nowrap">Leave Management</span>
                <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform ${showLeaveDropdown ? 'rotate-180' : ''}`} />
              </button>
              
              {showLeaveDropdown && (
                <div className="mt-2 ml-2 pl-2 border-l-2 border-teal-400 space-y-1">
                  <Link
                    href="/admin/leave"
                    className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-teal-200 hover:bg-teal-800 hover:text-white transition-colors"
                    onClick={() => setShowLeaveDropdown(false)}
                  >
                    <FileText className="w-4 h-4" />
                    <span className="text-sm">Employees on Leave</span>
                  </Link>
                  <Link
                    href="/admin/leave-balance"
                    className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-teal-200 hover:bg-teal-800 hover:text-white transition-colors"
                    onClick={() => setShowLeaveDropdown(false)}
                  >
                    <TrendingUp className="w-4 h-4" />
                    <span className="text-sm">Leave Balances</span>
                  </Link>
                </div>
              )}
            </div>

            <Link href="/dashboard/admin" className="flex items-center gap-3 px-4 py-3 rounded-lg text-teal-100 hover:bg-teal-500 hover:text-white transition-colors">
              <BarChart3 className="w-5 h-5" />
              <span>Reports</span>
            </Link>
            <Link
              href="/admin/departments"
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                pathname === '/admin/departments'
                  ? 'bg-teal-500 text-white'
                  : 'text-teal-100 hover:bg-teal-500 hover:text-white'
              }`}
            >
              <Building2 className="w-5 h-5" />
              <span>Departments</span>
            </Link>
          </nav>

          <div className="p-4 border-t border-teal-500 space-y-1">
            <Link href="/dashboard/admin" className="flex items-center gap-3 px-4 py-3 rounded-lg text-teal-100 hover:bg-teal-500 hover:text-white transition-colors">
              <Settings className="w-5 h-5" />
              <span>Preferences</span>
            </Link>
            <Link href="/dashboard/admin" className="flex items-center gap-3 px-4 py-3 rounded-lg text-teal-200 hover:bg-teal-800 hover:text-white transition-colors relative">
              <Bell className="w-5 h-5" />
              <span>Notifications</span>
              <span className="ml-auto bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">3</span>
            </Link>
          </div>

          <div className="p-4 border-t border-teal-500 relative">
            <button
              onClick={() => setShowProfileDropdown(!showProfileDropdown)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-teal-500 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-teal-500 flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 text-left">
                <div className="text-white font-medium text-sm">{user?.name || 'Admin'}</div>
                <div className="text-teal-100 text-xs">Administrator</div>
              </div>
              <ChevronDown className={`w-4 h-4 text-teal-100 transition-transform ${showProfileDropdown ? 'rotate-180' : ''}`} />
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
        <div className="flex-1 overflow-y-auto">
          {/* Header */}
          <div className="bg-white border-b border-gray-200 px-8 py-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Departments</h1>
                <p className="text-gray-600 mt-1">Manage your organization's departments</p>
              </div>
              <button
                onClick={handleAdd}
                className="flex items-center gap-2 px-6 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-400 transition-colors font-semibold"
              >
                <Plus className="w-5 h-5" />
                Add Department
              </button>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search departments..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>
            </div>
          </div>

          {/* Content */}
          <div className="p-8">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
              </div>
            ) : filteredDepartments.length === 0 ? (
              <div className="text-center py-12">
                <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 text-lg">No departments found</p>
                <p className="text-gray-500 text-sm mt-2">
                  {searchQuery || statusFilter !== 'all' 
                    ? 'Try adjusting your filters' 
                    : 'Get started by adding your first department'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredDepartments.map((dept) => (
                  <div
                    key={dept.id}
                    onClick={() => handleViewEmployees(dept)}
                    className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow cursor-pointer"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-900 mb-1">{dept.name}</h3>
                        {dept.code && (
                          <p className="text-sm text-gray-500">Code: {dept.code}</p>
                        )}
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        dept.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {dept.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    
                    {dept.description && (
                      <p className="text-gray-600 text-sm mb-4 line-clamp-2">{dept.description}</p>
                    )}
                    
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                      <Users className="w-4 h-4" />
                      <span>{dept.employeeCount || 0} employees</span>
                    </div>
                    
                    <div className="flex items-center gap-2 pt-4 border-t border-gray-200">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(dept);
                        }}
                        className="flex-1 px-4 py-2 text-sm bg-teal-50 text-teal-600 rounded-lg hover:bg-teal-100 transition-colors font-medium flex items-center justify-center gap-2"
                      >
                        <Edit className="w-4 h-4" />
                        Edit
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(dept);
                        }}
                        className="flex-1 px-4 py-2 text-sm bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors font-medium flex items-center justify-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                {selectedDepartment ? 'Edit Department' : 'Add Department'}
              </h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setShowEditModal(false);
                  setFormData({ name: '', code: '', description: '', isActive: true });
                  setSelectedDepartment(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Department Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Department Code
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="e.g., ENG, HR, FIN"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  rows={3}
                  placeholder="Enter department description..."
                />
              </div>
              
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                />
                <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                  Active
                </label>
              </div>
              
              <div className="flex items-center gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setShowEditModal(false);
                    setFormData({ name: '', code: '', description: '', isActive: true });
                    setSelectedDepartment(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                >
                  {submitting ? 'Saving...' : selectedDepartment ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedDepartment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Delete Department</h2>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedDepartment(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete <strong>{selectedDepartment.name}</strong>? 
              This action cannot be undone.
            </p>
            
            {selectedDepartment.employeeCount && selectedDepartment.employeeCount > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-yellow-800">
                  ⚠️ This department has {selectedDepartment.employeeCount} employee(s). 
                  Deleting it may affect employee records.
                </p>
              </div>
            )}
            
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedDepartment(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={submitting}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
              >
                {submitting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Employees Modal */}
      {showEmployeesModal && selectedDepartment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]" onClick={() => {
          setShowEmployeesModal(false);
          setSelectedDepartment(null);
          setDepartmentEmployees([]);
        }}>
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {selectedDepartment.name} - Employees
                </h2>
                <p className="text-gray-600 text-sm mt-1">
                  {selectedDepartment.code && `Code: ${selectedDepartment.code}`}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowEmployeesModal(false);
                  setSelectedDepartment(null);
                  setDepartmentEmployees([]);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {loadingEmployees ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
                </div>
              ) : departmentEmployees.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 text-lg">No employees in this department</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {departmentEmployees.map((employee: any) => (
                    <div
                      key={employee.id}
                      className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                        {employee.profilePhoto ? (
                          <img
                            src={`http://192.168.1.29:5000${employee.profilePhoto}`}
                            alt={employee.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Users className="w-6 h-6 text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900">{employee.name}</div>
                        <div className="text-sm text-gray-600">{employee.email}</div>
                        {employee.employeeId && (
                          <div className="text-xs text-gray-500 mt-1">ID: {employee.employeeId}</div>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="px-3 py-1 bg-teal-100 text-teal-800 rounded-full text-xs font-semibold">
                          {employee.role || 'Employee'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Total: <span className="font-semibold">{departmentEmployees.length} employee(s)</span>
              </p>
              <button
                onClick={() => {
                  setShowEmployeesModal(false);
                  setSelectedDepartment(null);
                  setDepartmentEmployees([]);
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </PrivateRoute>
  );
};

export default DepartmentsPage;
