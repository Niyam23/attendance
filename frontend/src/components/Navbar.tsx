import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, Calendar, History, User } from 'lucide-react';
import './Navbar.css';

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = (): void => {
    logout();
    navigate('/auth');
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-brand">
          <Calendar className="navbar-icon" />
          <span>Attendance System</span>
        </div>
        <div className="navbar-menu">
          <Link to="/dashboard" className="navbar-link">
            <Calendar size={20} />
            Dashboard
          </Link>
          <Link to="/history" className="navbar-link">
            <History size={20} />
            History
          </Link>
          <div className="navbar-user">
            <User size={20} />
            <span>{user?.name}</span>
            <span className="navbar-role">({user?.role})</span>
          </div>
          <button onClick={handleLogout} className="navbar-logout">
            <LogOut size={20} />
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
