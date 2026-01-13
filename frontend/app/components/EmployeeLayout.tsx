'use client'

import React, { useState, useEffect, useRef, ReactNode } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import PrivateRoute from './PrivateRoute';
import {
  LayoutDashboard, Calendar, Plane, User, LogOut, Settings, History
} from 'lucide-react';

interface EmployeeLayoutProps {
  children: ReactNode;
}

const EmployeeLayout: React.FC<EmployeeLayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Redirect if admin tries to access employee pages
    if (user && user.role === 'admin') {
      router.push('/dashboard/admin');
      return;
    }
  }, [user, router]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowProfileDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user || user.role === 'admin') {
    return null;
  }

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
                <div className="text-teal-100 text-xs">Employee Portal</div>
              </div>
            </div>
          </div>

          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            <Link
              href="/dashboard"
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                pathname === '/dashboard'
                  ? 'bg-teal-500 text-white'
                  : 'text-teal-100 hover:bg-teal-500 hover:text-white'
              }`}
            >
              <LayoutDashboard className="w-5 h-5" />
              <span>Dashboard</span>
            </Link>
            <Link
              href="/history"
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                pathname === '/history'
                  ? 'bg-teal-500 text-white'
                  : 'text-teal-100 hover:bg-teal-500 hover:text-white'
              }`}
            >
              <History className="w-5 h-5" />
              <span>My Attendance</span>
            </Link>
            <Link
              href="/leave"
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                pathname === '/leave'
                  ? 'bg-teal-500 text-white'
                  : 'text-teal-100 hover:bg-teal-500 hover:text-white'
              }`}
            >
              <Plane className="w-5 h-5" />
              <span>Leave Request</span>
            </Link>
          </nav>

          <div className="p-4 border-t border-teal-500 space-y-1">
            <Link
              href="/profile"
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-teal-100 hover:bg-teal-500 hover:text-white transition-colors"
            >
              <Settings className="w-5 h-5" />
              <span>Settings</span>
            </Link>
          </div>

          {/* Profile Section */}
          <div className="p-4 border-t border-teal-500 relative">
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-teal-500 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-teal-500 flex items-center justify-center text-white font-semibold">
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="flex-1 text-left">
                  <div className="text-white font-medium text-sm">{user?.name || 'User'}</div>
                  <div className="text-teal-100 text-xs">Employee</div>
                </div>
              </button>

              {showProfileDropdown && (
                <div className="absolute bottom-full left-4 right-4 mb-2 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50">
                  <Link
                    href="/profile"
                    className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    onClick={() => setShowProfileDropdown(false)}
                  >
                    <User className="w-4 h-4" />
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
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </PrivateRoute>
  );
};

export default EmployeeLayout;