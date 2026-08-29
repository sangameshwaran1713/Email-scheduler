import React from 'react';
import { Star, Send } from 'lucide-react';
import { Email } from '../types/index';

interface SentTableProps {
  emails: Email[];
  isLoading?: boolean;
  onSelectEmail?: (email: Email) => void;
}

export function SentTable({ emails, isLoading, onSelectEmail }: SentTableProps) {
  if (isLoading) {
    return (
      <div className="py-16 text-center text-gray-400 text-xs flex items-center justify-center gap-2">
        <span className="w-4 h-4 rounded-full border-2 border-green-500/20 border-t-green-500 animate-spin"></span>
        Loading sent emails...
      </div>
    );
  }

  if (!emails || emails.length === 0) {
    return (
      <div className="py-16 px-6 text-center border border-gray-100 rounded-xl bg-white shadow-xs">
        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3 text-gray-400">
          <Send className="w-6 h-6" />
        </div>
        <h4 className="font-bold text-gray-800 text-sm">No Sent Emails Yet</h4>
        <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
          Dispatched emails will appear here once processed by the system.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-100">
      {emails.map((email) => {
        return (
          <div
            key={email.id}
            onClick={() => onSelectEmail && onSelectEmail(email)}
            className="p-4 hover:bg-gray-50 transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left"
          >
            {/* Recipient & Sent Badge */}
            <div className="flex items-center gap-3 min-w-[200px]">
              <span className="text-xs font-bold text-gray-900 min-w-[100px]">
                To: {email.recipient}
              </span>
              <span className="inline-flex items-center px-3 py-0.5 rounded-full bg-green-100 text-green-700 text-[11px] font-semibold">
                Sent
              </span>
            </div>

            {/* Subject Line & Preview Body */}
            <div className="flex-1 text-xs truncate">
              <span className="font-bold text-gray-900">{email.subject}</span>
              <span className="text-gray-400 mx-1 font-normal">-</span>
              <span className="text-gray-500 truncate">{email.body}</span>
            </div>

            {/* Star Favorite Toggle */}
            <button
              onClick={(e) => {
                e.stopPropagation();
              }}
              className="text-gray-300 hover:text-amber-400 transition ml-2 flex-shrink-0"
            >
              <Star className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
