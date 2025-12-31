'use client'

import React, { useState, useEffect } from 'react';
import axiosInstance from '../utils/axios';
import toast from 'react-hot-toast';
import Navbar from '../components/Navbar';
import PrivateRoute from '../components/PrivateRoute';
import { Calendar, Clock, Search } from 'lucide-react';

interface Attendance {
  id: number;
  checkIn: string;
  checkOut?: string;
  status: string;
}

interface Filters {
  startDate: string;
  endDate: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const AttendanceHistory: React.FC = () => {
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>({
    startDate: '',
    endDate: ''
  });
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });

  useEffect(() => {
    fetchAttendance();
  }, [pagination.page, filters]);

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const params: any = {
        page: pagination.page,
        limit: pagination.limit,
      };
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;

      const response = await axiosInstance.get('/attendance/my-attendance', { params });
      setAttendances(response.data.attendances);
      setPagination({
        ...pagination,
        total: response.data.total,
        totalPages: response.data.totalPages
      });
    } catch (error) {
      console.error('Error fetching attendance:', error);
      toast.error('Failed to fetch attendance history');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
    setPagination({ ...pagination, page: 1 });
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const formatTime = (dateString: string | undefined): string => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const calculateHours = (checkIn: string, checkOut: string | undefined): string => {
    if (!checkOut) return 'N/A';
    const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  return (
    <PrivateRoute>
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Attendance History</h1>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="flex items-center gap-2 text-xl font-bold text-gray-800 mb-5">
            <Search size={20} />
            Filters
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Start Date</label>
              <input
                type="date"
                name="startDate"
                value={filters.startDate}
                onChange={handleFilterChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">End Date</label>
              <input
                type="date"
                name="endDate"
                value={filters.endDate}
                onChange={handleFilterChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-xl shadow-lg p-10 text-center">
            <div className="text-lg text-gray-600">Loading...</div>
          </div>
        ) : attendances.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-10 text-center">
            <Calendar size={48} className="mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600">No attendance records found</p>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 border-b-2 border-gray-200">Date</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 border-b-2 border-gray-200">Check In</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 border-b-2 border-gray-200">Check Out</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 border-b-2 border-gray-200">Hours</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 border-b-2 border-gray-200">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendances.map((attendance) => (
                      <tr key={attendance.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 border-b border-gray-200">
                          <div className="flex items-center gap-2">
                            <Calendar size={16} className="text-indigo-600" />
                            <span className="text-gray-700">{formatDate(attendance.checkIn)}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 border-b border-gray-200">
                          <div className="flex items-center gap-2">
                            <Clock size={16} className="text-indigo-600" />
                            <span className="text-gray-700">{formatTime(attendance.checkIn)}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 border-b border-gray-200">
                          <div className="flex items-center gap-2">
                            <Clock size={16} className="text-indigo-600" />
                            <span className="text-gray-700">{formatTime(attendance.checkOut)}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 border-b border-gray-200 text-gray-700">{calculateHours(attendance.checkIn, attendance.checkOut)}</td>
                        <td className="px-6 py-4 border-b border-gray-200">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${
                            attendance.status === 'present' ? 'bg-green-100 text-green-800' :
                            attendance.status === 'absent' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {attendance.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {pagination.totalPages > 1 && (
              <div className="flex justify-center items-center gap-4 mt-6 p-5 bg-white rounded-xl shadow-lg">
                <button
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                  disabled={pagination.page === 1}
                >
                  Previous
                </button>
                <span className="text-gray-700">
                  Page {pagination.page} of {pagination.totalPages} (Total: {pagination.total})
                </span>
                <button
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                  disabled={pagination.page === pagination.totalPages}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </PrivateRoute>
  );
};

export default AttendanceHistory;

