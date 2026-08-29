import React from 'react';
import { ArrowLeft, Star, Trash2, Archive } from 'lucide-react';
import { Email } from '../types/index';

interface EmailDetailViewProps {
  email?: Email | null;
  onBack: () => void;
}

export function EmailDetailView({ email, onBack }: EmailDetailViewProps) {
  const subjectText = email?.subject || 'Oliver, hello there! | MJWYT44 BM#52W01';
  const recipientName = email?.recipient || 'Amanda Clark';

  // Use the generated tennis image asset or fallback placeholder
  const tennisImageSrc = '/tennis_coach_profile.jpg';

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-left max-w-4xl mx-auto">
      {/* Top Header Controls */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-gray-900 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{subjectText}</span>
        </button>

        <div className="flex items-center gap-3 text-gray-400">
          <button className="hover:text-amber-500 transition">
            <Star className="w-4 h-4" />
          </button>
          <button className="hover:text-rose-500 transition">
            <Trash2 className="w-4 h-4" />
          </button>
          <button className="hover:text-gray-700 transition">
            <Archive className="w-4 h-4" />
          </button>
          <div className="w-7 h-7 rounded-full bg-gray-200 overflow-hidden ml-2">
            <div className="w-full h-full bg-amber-600 text-white font-bold text-xs flex items-center justify-center">
              O
            </div>
          </div>
        </div>
      </div>

      {/* Sender Info Row */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-600 text-white font-bold text-sm flex items-center justify-center shadow-sm">
            A
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-900 text-sm">{recipientName}</span>
              <span className="text-xs text-gray-400">&lt;sender@example.com&gt;</span>
            </div>
            <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
              <span>to me</span>
              <span className="text-[10px]">▼</span>
            </div>
          </div>
        </div>
        <div className="text-xs text-gray-400">Nov 3, 10:23 AM</div>
      </div>

      {/* Email Body Content */}
      <div className="space-y-4 text-sm text-gray-800 leading-relaxed max-w-2xl mb-8">
        <p>Hey Oliver,</p>
        <p>You've just RECEIVED something</p>

        {/* Yellow Callout Banner Box */}
        <div className="my-5 p-4 rounded-xl bg-[#fffde7] border border-[#ffe082] text-amber-900 text-xs font-semibold space-y-1.5 shadow-xs">
          <div className="flex items-center gap-2 text-amber-800 font-bold">
            <span>⚡ Extremely Exclusive—Only 4 Spots Worldwide Per Year | $25,000 investment ⚡</span>
          </div>
          <div className="text-amber-800">
            ⚡ To explore securing your private transformation, simply reply right now with <strong className="text-black font-extrabold font-mono">"FLY OUT FIX"</strong>.
          </div>
        </div>

        <p>Your coach for world-class performance,</p>
        <p className="font-semibold text-gray-900">Grant</p>
        <p className="text-xs text-gray-500 italic">
          P.S. Always remember that you can develop world class technique! 🎾
        </p>
      </div>

      {/* Attachments Section */}
      <div className="pt-6 border-t border-gray-100">
        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
          Attachments (2)
        </div>
        <div className="flex flex-wrap gap-4">
          {/* Attachment 1 */}
          <div className="w-52 border border-gray-200 rounded-xl overflow-hidden shadow-xs hover:shadow-md transition bg-gray-50/60 group cursor-pointer">
            <div className="h-28 overflow-hidden bg-gray-200 relative">
              <img
                src={tennisImageSrc}
                alt="Tennis Coach Profile"
                className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                onError={(e) => {
                  // Fallback CSS graphics if image file is not found
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            <div className="p-2.5 bg-white text-left">
              <div className="text-xs font-semibold text-gray-800 truncate">Tennis_Coach_Profile.png</div>
              <div className="text-[10px] text-gray-400 mt-0.5">1.2 MB</div>
            </div>
          </div>

          {/* Attachment 2 */}
          <div className="w-52 border border-gray-200 rounded-xl overflow-hidden shadow-xs hover:shadow-md transition bg-gray-50/60 group cursor-pointer">
            <div className="h-28 overflow-hidden bg-gray-200 relative">
              <img
                src={tennisImageSrc}
                alt="Tennis Coach Profile 2"
                className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            <div className="p-2.5 bg-white text-left">
              <div className="text-xs font-semibold text-gray-800 truncate">Tennis_Coach_Profile2.png</div>
              <div className="text-[10px] text-gray-400 mt-0.5">1.2 MB</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
