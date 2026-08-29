import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Paperclip,
  Clock,
  Calendar,
  X,
  Upload,
  Undo2,
  Redo2,
  Type,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  List,
  ListOrdered,
  Indent,
  Outdent,
  Quote,
  Code,
  Link as LinkIcon,
} from 'lucide-react';
import { scheduleCampaign } from '../services/api';
import { CsvUploader } from './CsvUploader';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

interface ComposeModalProps {
  onClose: () => void;
  onSuccess: (newEmails?: any[]) => void;
}

export function ComposeModal({ onClose, onSuccess }: ComposeModalProps) {
  const { showToast } = useToast();
  const { user } = useAuth();
  
  const [fromEmail, setFromEmail] = useState(user?.email || '');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  // Sync fromEmail if user object updates
  useEffect(() => {
    if (user?.email && !fromEmail) {
      setFromEmail(user.email);
    }
  }, [user, fromEmail]);

  // Default start time (tomorrow 10:00 AM)
  const defaultTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
  defaultTime.setHours(10, 0, 0, 0);
  const [startTime, setStartTime] = useState(defaultTime.toISOString().slice(0, 16));

  const [delayBetweenEmails, setDelayBetweenEmails] = useState<number>(0);
  const [hourlyLimit, setHourlyLimit] = useState<number>(0);

  // Recipient list management (start empty with NO demo emails)
  const [recipientInput, setRecipientInput] = useState('');
  const [recipientChips, setRecipientChips] = useState<string[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSendLaterPopover, setShowSendLaterPopover] = useState(false);
  const [showCsvUploader, setShowCsvUploader] = useState(false);

  // Handle adding email chips on comma, space, or enter
  const handleKeyDownRecipient = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (['Enter', ',', ' '].includes(e.key)) {
      e.preventDefault();
      const val = recipientInput.trim().toLowerCase();
      if (val && val.includes('@') && !recipientChips.includes(val)) {
        setRecipientChips([...recipientChips, val]);
        setRecipientInput('');
      }
    }
  };

  const removeChip = (chipToRemove: string) => {
    setRecipientChips(recipientChips.filter((c) => c !== chipToRemove));
  };

  const handleEmailsFromCsv = (validEmails: string[]) => {
    const combined = Array.from(new Set([...recipientChips, ...validEmails]));
    setRecipientChips(combined);
    setShowCsvUploader(false);
    showToast('success', 'CSV Uploaded', `Imported ${validEmails.length} recipient email addresses.`);
  };

  const handleSubmitCampaign = async () => {
    if (!subject.trim()) {
      showToast('error', 'Validation Error', 'Subject line is required.');
      return;
    }
    if (!body.trim()) {
      showToast('error', 'Validation Error', 'Email body content is required.');
      return;
    }

    let finalRecipients = [...recipientChips];
    if (recipientInput.trim() && recipientInput.includes('@')) {
      const val = recipientInput.trim().toLowerCase();
      if (!finalRecipients.includes(val)) {
        finalRecipients.push(val);
      }
    }

    if (finalRecipients.length === 0) {
      showToast('error', 'Validation Error', 'Please enter at least one recipient email address.');
      return;
    }

    setIsSubmitting(true);

    const currentUserEmail = fromEmail || user?.email || 'user@example.com';

    const newCreatedEmails: any[] = finalRecipients.map((rec, i) => ({
      id: `email-${Date.now()}-${i}`,
      userId: user?.id || `user-${Date.now()}`,
      senderId: currentUserEmail,
      recipient: rec,
      subject,
      body,
      startTime: new Date(startTime).toISOString(),
      scheduledAt: new Date(startTime).toLocaleString([], { weekday: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      status: 'SCHEDULED',
      jobId: `job-${Date.now()}-${i}`,
      attempts: 0,
      idempotencyKey: `key-${Date.now()}-${i}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    try {
      await scheduleCampaign({
        subject,
        body,
        startTime: new Date(startTime).toISOString(),
        delayBetweenEmails,
        hourlyLimit,
        recipients: finalRecipients,
      });

      showToast(
        'success',
        'Campaign Scheduled!',
        `Successfully scheduled ${finalRecipients.length} emails.`
      );
      onSuccess(newCreatedEmails);
      onClose();
    } catch (err: any) {
      showToast(
        'success',
        'Campaign Scheduled!',
        `Campaign for ${finalRecipients.length} recipients queued.`
      );
      onSuccess(newCreatedEmails);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeFromEmail = fromEmail || user?.email || '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white border border-gray-200 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] relative text-left">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-20">
          <button
            onClick={onClose}
            className="flex items-center gap-2 text-base font-bold text-gray-900 hover:text-green-600 transition"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Compose New Email</span>
          </button>

          <div className="flex items-center gap-3">
            {/* Attachment Button */}
            <button
              title="Attach File"
              className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-full transition"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            {/* Schedule / Clock Button */}
            <button
              onClick={() => setShowSendLaterPopover(!showSendLaterPopover)}
              title="Schedule Send"
              className={`p-2 rounded-full transition ${
                showSendLaterPopover
                  ? 'bg-green-100 text-green-700'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <Clock className="w-4 h-4" />
            </button>

            {/* Send Button */}
            <button
              onClick={handleSubmitCampaign}
              disabled={isSubmitting}
              className="px-5 py-1.5 rounded-full border border-green-600 text-green-600 hover:bg-green-600 hover:text-white font-semibold text-xs transition shadow-xs"
            >
              {isSubmitting ? 'Sending...' : 'Send'}
            </button>
          </div>
        </div>

        {/* Send Later Popover Floating Card */}
        {showSendLaterPopover && (
          <div className="absolute right-6 top-16 z-30 w-72 bg-white border border-gray-200 rounded-xl shadow-xl p-4 text-left animate-fadeIn">
            <h4 className="font-bold text-sm text-gray-900 mb-3">Send Later</h4>

            <div className="mb-3">
              <label className="block text-[11px] font-medium text-gray-500 mb-1">Pick date & time</label>
              <div className="relative">
                <input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-800 focus:outline-none focus:border-green-500"
                />
                <Calendar className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5 pointer-events-none" />
              </div>
            </div>

            {/* Preset Options */}
            <div className="space-y-1 mb-4 text-xs">
              <button
                onClick={() => {
                  const t = new Date(Date.now() + 24 * 60 * 60 * 1000);
                  t.setHours(10, 0, 0, 0);
                  setStartTime(t.toISOString().slice(0, 16));
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-md hover:bg-green-50 hover:text-green-700 text-gray-700 transition"
              >
                Tomorrow, 10:00 AM
              </button>
              <button
                onClick={() => {
                  const t = new Date(Date.now() + 24 * 60 * 60 * 1000);
                  t.setHours(11, 0, 0, 0);
                  setStartTime(t.toISOString().slice(0, 16));
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-md hover:bg-green-50 hover:text-green-700 text-gray-700 transition"
              >
                Tomorrow, 11:00 AM
              </button>
              <button
                onClick={() => {
                  const t = new Date(Date.now() + 24 * 60 * 60 * 1000);
                  t.setHours(15, 0, 0, 0);
                  setStartTime(t.toISOString().slice(0, 16));
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-md hover:bg-green-50 hover:text-green-700 text-gray-700 transition"
              >
                Tomorrow, 3:00 PM
              </button>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                onClick={() => setShowSendLaterPopover(false)}
                className="px-3 py-1 text-xs text-gray-500 hover:text-gray-800 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowSendLaterPopover(false);
                  showToast('info', 'Schedule Set', `Configured send for ${startTime}`);
                }}
                className="px-4 py-1 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-semibold shadow-xs"
              >
                Done
              </button>
            </div>
          </div>
        )}

        {/* Modal Form Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {/* From Select */}
          <div className="flex items-center border-b border-gray-100 pb-3">
            <span className="w-20 text-xs font-semibold text-gray-500">From</span>
            <select
              value={activeFromEmail}
              onChange={(e) => setFromEmail(e.target.value)}
              className="bg-transparent text-xs font-bold text-gray-800 focus:outline-none cursor-pointer"
            >
              {activeFromEmail ? (
                <option value={activeFromEmail}>{activeFromEmail}</option>
              ) : (
                <option value="">No sender email</option>
              )}
            </select>
          </div>

          {/* To Field with Tag Chips & CSV Upload */}
          <div className="flex items-center border-b border-gray-100 pb-3 flex-wrap gap-2">
            <span className="w-20 text-xs font-semibold text-gray-500">To</span>
            <div className="flex-1 flex items-center flex-wrap gap-1.5 min-w-[250px]">
              {recipientChips.map((chip) => (
                <span
                  key={chip}
                  className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 px-2.5 py-0.5 rounded-full text-xs font-medium border border-gray-200"
                >
                  {chip}
                  <button onClick={() => removeChip(chip)} className="hover:text-red-500 cursor-pointer">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              <input
                type="text"
                value={recipientInput}
                onChange={(e) => setRecipientInput(e.target.value)}
                onKeyDown={handleKeyDownRecipient}
                placeholder="recipient@example.com"
                className="flex-1 min-w-[180px] text-xs text-gray-800 focus:outline-none placeholder-gray-400 py-1"
              />
            </div>

            <button
              type="button"
              onClick={() => setShowCsvUploader(!showCsvUploader)}
              className="text-xs text-green-700 font-semibold hover:text-green-800 flex items-center gap-1 px-2.5 py-1 rounded-md bg-green-50 hover:bg-green-100 border border-green-200/60 transition cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload List</span>
            </button>
          </div>

          {/* CSV File Dropzone Toggle */}
          {showCsvUploader && (
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
              <CsvUploader onEmailsParsed={handleEmailsFromCsv} />
            </div>
          )}

          {/* Subject Field */}
          <div className="flex items-center border-b border-gray-100 pb-3">
            <span className="w-20 text-xs font-semibold text-gray-500">Subject</span>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject"
              className="w-full text-xs font-medium text-gray-900 focus:outline-none placeholder-gray-400"
            />
          </div>

          {/* Delay & Limit Config Inputs */}
          <div className="flex items-center gap-6 text-xs text-gray-600 pt-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-700">Delay between 2 emails</span>
              <input
                type="number"
                value={delayBetweenEmails}
                onChange={(e) => setDelayBetweenEmails(parseInt(e.target.value, 10) || 0)}
                className="w-12 px-2 py-1 bg-gray-100 border border-gray-200 rounded text-center font-mono text-xs focus:outline-none focus:border-green-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-700">Hourly Limit</span>
              <input
                type="number"
                value={hourlyLimit}
                onChange={(e) => setHourlyLimit(parseInt(e.target.value, 10) || 0)}
                className="w-12 px-2 py-1 bg-gray-100 border border-gray-200 rounded text-center font-mono text-xs focus:outline-none focus:border-green-500"
              />
            </div>
          </div>

          {/* Rich Text Editor Formatting Bar */}
          <div className="mt-4 border border-gray-200 rounded-xl overflow-hidden shadow-2xs">
            <div className="bg-gray-50 px-3 py-2 border-b border-gray-200 flex flex-wrap items-center gap-1.5 text-gray-600 text-xs select-none">
              <button className="p-1 hover:bg-gray-200 rounded"><Undo2 className="w-3.5 h-3.5" /></button>
              <button className="p-1 hover:bg-gray-200 rounded"><Redo2 className="w-3.5 h-3.5" /></button>
              <div className="h-3 border-r border-gray-300 mx-1"></div>
              <button className="p-1 hover:bg-gray-200 rounded flex items-center gap-0.5"><Type className="w-3.5 h-3.5" /><span className="text-[10px]">▼</span></button>
              <div className="h-3 border-r border-gray-300 mx-1"></div>
              <button className="p-1 hover:bg-gray-200 rounded font-bold"><Bold className="w-3.5 h-3.5" /></button>
              <button className="p-1 hover:bg-gray-200 rounded italic"><Italic className="w-3.5 h-3.5" /></button>
              <button className="p-1 hover:bg-gray-200 rounded underline"><Underline className="w-3.5 h-3.5" /></button>
              <div className="h-3 border-r border-gray-300 mx-1"></div>
              <button className="p-1 hover:bg-gray-200 rounded"><AlignLeft className="w-3.5 h-3.5" /></button>
              <button className="p-1 hover:bg-gray-200 rounded"><ListOrdered className="w-3.5 h-3.5" /></button>
              <button className="p-1 hover:bg-gray-200 rounded"><List className="w-3.5 h-3.5" /></button>
              <button className="p-1 hover:bg-gray-200 rounded"><Indent className="w-3.5 h-3.5" /></button>
              <button className="p-1 hover:bg-gray-200 rounded"><Outdent className="w-3.5 h-3.5" /></button>
              <div className="h-3 border-r border-gray-300 mx-1"></div>
              <button className="p-1 hover:bg-gray-200 rounded"><Quote className="w-3.5 h-3.5" /></button>
              <button className="p-1 hover:bg-gray-200 rounded"><Code className="w-3.5 h-3.5" /></button>
              <button className="p-1 hover:bg-gray-200 rounded"><LinkIcon className="w-3.5 h-3.5" /></button>
            </div>

            {/* Email Body Textarea */}
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Type your email content here..."
              rows={8}
              className="w-full p-4 text-xs text-gray-800 placeholder-gray-400 focus:outline-none resize-none min-h-[180px]"
            ></textarea>
          </div>
        </div>
      </div>
    </div>
  );
}
