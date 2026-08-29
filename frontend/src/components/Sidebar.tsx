import React, { useState } from 'react';
import { Clock, Send, ChevronDown, Plus, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  activeTab: 'scheduled' | 'sent' | 'detail';
  onTabChange: (tab: 'scheduled' | 'sent') => void;
  onOpenCompose: () => void;
  scheduledCount?: number;
  sentCount?: number;
}

export function Sidebar({
  activeTab,
  onTabChange,
  onOpenCompose,
  scheduledCount = 0,
  sentCount = 0,
}: SidebarProps) {
  const { user, logout } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const userName = user?.name || 'User Profile';
  const userEmail = user?.email || '';
  const userAvatar = user?.avatar || null;

  return (
    <aside className="w-64 bg-white border-r border-gray-200 h-screen flex flex-col fixed left-0 top-0 z-30 overflow-y-auto select-none">
      {/* Brand Header */}
      <div className="px-6 pt-6 pb-2">
        <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-1">
          <span>ONG</span>
        </h1>
      </div>

      {/* User Profile Card with Logout Dropdown */}
      <div className="px-6 py-4 relative">
        <div
          onClick={() => setShowProfileMenu(!showProfileMenu)}
          className="flex items-center justify-between p-2 rounded-xl hover:bg-gray-50 transition cursor-pointer border border-gray-100 bg-gray-50/50"
        >
          <div className="flex items-center gap-3 overflow-hidden">
            {userAvatar ? (
              <img
                src={userAvatar}
                alt={userName}
                className="w-9 h-9 rounded-full object-cover border border-gray-200 flex-shrink-0"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-800 font-semibold text-xs flex-shrink-0">
                {userName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="overflow-hidden text-left">
              <div className="text-xs font-bold text-gray-900 truncate">{userName}</div>
              <div className="text-[11px] text-gray-500 truncate">{userEmail}</div>
            </div>
          </div>
          <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0 ml-1" />
        </div>

        {/* Logout Popover Menu */}
        {showProfileMenu && (
          <div className="absolute left-6 right-6 top-20 z-40 bg-white border border-gray-200 rounded-xl shadow-lg p-2 text-left animate-fadeIn">
            <button
              onClick={() => {
                setShowProfileMenu(false);
                logout();
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log out</span>
            </button>
          </div>
        )}
      </div>

      {/* Compose Button */}
      <div className="px-6 py-2">
        <button
          onClick={onOpenCompose}
          className="w-full py-2.5 px-4 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-full transition shadow-sm flex items-center justify-center gap-2 text-sm active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          <span>Compose</span>
        </button>
      </div>

      {/* Navigation Section */}
      <div className="px-4 py-6 flex-1">
        <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-3 mb-3 text-left">
          CORE
        </div>

        <nav className="space-y-1">
          {/* Scheduled Nav Button */}
          <button
            onClick={() => onTabChange('scheduled')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs transition ${
              activeTab === 'scheduled'
                ? 'bg-green-50 text-green-700 font-bold shadow-sm'
                : 'text-gray-600 hover:bg-gray-50 font-medium'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Clock className={`w-4 h-4 ${activeTab === 'scheduled' ? 'text-green-600' : 'text-gray-400'}`} />
              <span>Scheduled</span>
            </div>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                activeTab === 'scheduled'
                  ? 'bg-green-100/80 text-green-700'
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              {scheduledCount}
            </span>
          </button>

          {/* Sent Nav Button */}
          <button
            onClick={() => onTabChange('sent')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs transition ${
              activeTab === 'sent'
                ? 'bg-green-50 text-green-700 font-bold shadow-sm'
                : 'text-gray-600 hover:bg-gray-50 font-medium'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Send className={`w-4 h-4 ${activeTab === 'sent' ? 'text-green-600' : 'text-gray-400'}`} />
              <span>Sent</span>
            </div>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                activeTab === 'sent'
                  ? 'bg-green-100/80 text-green-700'
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              {sentCount}
            </span>
          </button>
        </nav>
      </div>
    </aside>
  );
}
