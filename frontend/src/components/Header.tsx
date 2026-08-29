import React from 'react';
import { Search, Filter, RotateCw } from 'lucide-react';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onRefresh?: () => void;
  slackConnected?: boolean;
  onConnectSlack?: () => void;
}

export function Header({
  searchQuery,
  onSearchChange,
  onRefresh,
  slackConnected = false,
  onConnectSlack,
}: HeaderProps) {
  return (
    <header className="h-16 px-8 flex items-center justify-between border-b border-gray-100 bg-white sticky top-0 z-20">
      {/* Search Input Bar */}
      <div className="relative max-w-lg w-full">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search"
          className="w-full pl-9 pr-4 py-2 bg-gray-100/70 border border-transparent rounded-full text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-green-500 transition"
        />
        <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5 pointer-events-none" />
      </div>

      {/* Right Controls: Filter, Refresh, Slack */}
      <div className="flex items-center gap-3">
        <button
          onClick={onRefresh}
          className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition"
          title="Refresh"
        >
          <RotateCw className="w-4 h-4" />
        </button>

        <button
          className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition"
          title="Filter"
        >
          <Filter className="w-4 h-4" />
        </button>

        {onConnectSlack && (
          <button
            onClick={onConnectSlack}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition flex items-center gap-1.5 ${
              slackConnected
                ? 'bg-green-50 border-green-200 text-green-700'
                : 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${slackConnected ? 'bg-green-500' : 'bg-purple-500'}`}></span>
            {slackConnected ? 'Slack Connected' : 'Connect Slack'}
          </button>
        )}
      </div>
    </header>
  );
}
