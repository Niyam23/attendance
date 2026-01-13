import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import Navbar from '../components/Navbar';
import { Calendar, Clock, Search } from 'lucide-react';
import './AttendanceHistory.css';

interface AttendanceRecord {
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
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
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

  const fetchAttendance = async (): Promise<void> => {
    setLoading(true);
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate })
      };

      const response = await axios.get('http://192.168.1.29:5000/api/attendance/my-attendance', { params });
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

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
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
    <div>
      <Navbar />
      <div className="container">
        <div className="history-header">
          <h1>Attendance History</h1>
        </div>

        <div className="card filters-card">
          <h2>
            <Search size={20} />
            Filters
          </h2>
          <div className="filters-grid">
            <div className="form-group">
              <label>Start Date</label>
              <input
                type="date"
                name="startDate"
                value={filters.startDate}
                onChange={handleFilterChange}
              />
            </div>
            <div className="form-group">
              <label>End Date</label>
              <input
                type="date"
                name="endDate"
                value={filters.endDate}
                onChange={handleFilterChange}
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
            Loading...
          </div>
        ) : attendances.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
            <Calendar size={48} style={{ color: '#ccc', marginBottom: '16px' }} />
            <p>No attendance records found</p>
          </div>
        ) : (
          <>
            <div className="card">
              <div className="table-container">
                <table className="attendance-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Check In</th>
                      <th>Check Out</th>
                      <th>Hours</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendances.map((attendance) => (
                      <tr key={attendance.id}>
                        <td>
                          <div className="date-cell">
                            <Calendar size={16} />
                            {formatDate(attendance.checkIn)}
                          </div>
                        </td>
                        <td>
                          <div className="time-cell">
                            <Clock size={16} />
                            {formatTime(attendance.checkIn)}
                          </div>
                        </td>
                        <td>
                          <div className="time-cell">
                            <Clock size={16} />
                            {formatTime(attendance.checkOut)}
                          </div>
                        </td>
                        <td>{calculateHours(attendance.checkIn, attendance.checkOut)}</td>
                        <td>
                          <span className={`status-badge status-${attendance.status}`}>
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
              <div className="pagination">
                <button
                  className="btn btn-secondary"
                  onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                  disabled={pagination.page === 1}
                >
                  Previous
                </button>
                <span>
                  Page {pagination.page} of {pagination.totalPages} (Total: {pagination.total})
                </span>
                <button
                  className="btn btn-secondary"
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
    </div>
  );
};

export default AttendanceHistory;

