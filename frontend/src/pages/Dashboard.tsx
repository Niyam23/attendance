import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import Navbar from '../components/Navbar';
import { LogIn, LogOut, Calendar, CheckCircle, XCircle } from 'lucide-react';
import './Dashboard.css';

interface TodayStatus {
  checkedIn: boolean;
  checkedOut: boolean;
  attendance?: {
    checkIn: string;
    checkOut?: string;
  };
}

const Dashboard: React.FC = () => {
  const [todayStatus, setTodayStatus] = useState<TodayStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [checking, setChecking] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    fetchTodayStatus();
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchTodayStatus = async (): Promise<void> => {
    try {
      const response = await axios.get('http://192.168.1.29:5000/api/attendance/today-status');
      setTodayStatus(response.data);
    } catch (error) {
      console.error('Error fetching today status:', error);
      toast.error('Failed to fetch today status');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async (): Promise<void> => {
    setChecking(true);
    try {
      await axios.post('http://192.168.1.29:5000/api/attendance/checkin');
      toast.success('Checked in successfully!');
      fetchTodayStatus();
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to check in';
      toast.error(message);
    } finally {
      setChecking(false);
    }
  };

  const handleCheckOut = async (): Promise<void> => {
    setChecking(true);
    try {
      await axios.post('http://192.168.1.29:5000/api/attendance/checkout');
      toast.success('Checked out successfully!');
      fetchTodayStatus();
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to check out';
      toast.error(message);
    } finally {
      setChecking(false);
    }
  };

  const formatTime = (dateString: string | undefined): string => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div>
        <Navbar />
        <div className="container">
          <div style={{ textAlign: 'center', padding: '40px' }}>Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Navbar />
      <div className="container">
        <div className="dashboard-header">
          <h1>Dashboard</h1>
          <div className="current-time">
            <Calendar size={20} />
            <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
            <span className="time">{currentTime}</span>
          </div>
        </div>

        <div className="dashboard-grid">
          <div className="card status-card">
            <h2>Today's Status</h2>
            <div className="status-indicators">
              <div className="status-item">
                {todayStatus?.checkedIn ? (
                  <CheckCircle className="status-icon success" />
                ) : (
                  <XCircle className="status-icon error" />
                )}
                <span>Checked In: {todayStatus?.checkedIn ? 'Yes' : 'No'}</span>
              </div>
              <div className="status-item">
                {todayStatus?.checkedOut ? (
                  <CheckCircle className="status-icon success" />
                ) : (
                  <XCircle className="status-icon error" />
                )}
                <span>Checked Out: {todayStatus?.checkedOut ? 'Yes' : 'No'}</span>
              </div>
            </div>
            {todayStatus?.attendance && (
              <div className="attendance-times">
                <div className="time-item">
                  <strong>Check In:</strong> {formatTime(todayStatus.attendance.checkIn)}
                </div>
                {todayStatus.attendance.checkOut && (
                  <div className="time-item">
                    <strong>Check Out:</strong> {formatTime(todayStatus.attendance.checkOut)}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="card action-card">
            <h2>Quick Actions</h2>
            <div className="action-buttons">
              <button
                className={`btn btn-success ${todayStatus?.checkedIn ? 'disabled' : ''}`}
                onClick={handleCheckIn}
                disabled={todayStatus?.checkedIn || checking}
                style={{ width: '100%', marginBottom: '16px' }}
              >
                <LogIn size={20} />
                Check In
              </button>
              <button
                className={`btn btn-danger ${!todayStatus?.checkedIn || todayStatus?.checkedOut ? 'disabled' : ''}`}
                onClick={handleCheckOut}
                disabled={!todayStatus?.checkedIn || todayStatus?.checkedOut || checking}
                style={{ width: '100%' }}
              >
                <LogOut size={20} />
                Check Out
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

