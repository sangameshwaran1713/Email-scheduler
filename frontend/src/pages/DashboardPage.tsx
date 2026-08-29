import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';
import { ScheduledTable } from '../components/ScheduledTable';
import { SentTable } from '../components/SentTable';
import { ComposeModal } from '../components/ComposeModal';
import { EmailDetailView } from '../components/EmailDetailView';
import { getScheduledEmails, getSentEmails, searchEmails, fetchSlackStatus, disconnectSlack } from '../services/api';
import { Email, SlackStatus } from '../types/index';
import { useToast } from '../context/ToastContext';

export function DashboardPage() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'scheduled' | 'sent'>('scheduled');
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);

  const [scheduledEmails, setScheduledEmails] = useState<Email[]>([]);
  const [scheduledTotal, setScheduledTotal] = useState(0);

  const [sentEmails, setSentEmails] = useState<Email[]>([]);
  const [sentTotal, setSentTotal] = useState(0);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Email[]>([]);

  const [slackStatus, setSlackStatus] = useState<SlackStatus>({ isConnected: false });
  const [isLoading, setIsLoading] = useState(false);

  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [scheduledData, sentData, slackData] = await Promise.all([
        getScheduledEmails(1, 20),
        getSentEmails(1, 20),
        fetchSlackStatus(),
      ]);

      const fetchedScheduled = scheduledData?.emails || [];
      setScheduledEmails(fetchedScheduled);
      setScheduledTotal(scheduledData?.total ?? fetchedScheduled.length);

      const fetchedSent = sentData?.emails || [];
      setSentEmails(fetchedSent);
      setSentTotal(sentData?.total ?? fetchedSent.length);

      if (slackData) {
        setSlackStatus(slackData);
      }
    } catch (err: any) {
      setScheduledEmails([]);
      setScheduledTotal(0);
      setSentEmails([]);
      setSentTotal(0);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Handle Elasticsearch Search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await searchEmails(searchQuery);
        setSearchResults(res.emails || []);
      } catch (err) {
        setSearchResults([]);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleConnectSlack = () => {
    window.location.href = '/api/slack/connect';
  };

  const handleDisconnectSlack = async () => {
    try {
      await disconnectSlack();
      setSlackStatus({ isConnected: false });
      showToast('info', 'Slack Disconnected', 'Slack notifications have been disabled.');
    } catch {
      showToast('error', 'Disconnect Failed', 'Could not disconnect Slack integration');
    }
  };

  const handleNewCampaignCreated = (newEmails?: Email[]) => {
    if (newEmails && newEmails.length > 0) {
      setScheduledEmails((prev) => [...newEmails, ...prev]);
      setScheduledTotal((prev) => prev + newEmails.length);
    } else {
      loadDashboardData();
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex">
      {/* Sidebar Component (Fixed Left) */}
      <Sidebar
        activeTab={selectedEmail ? 'detail' : activeTab}
        onTabChange={(tab) => {
          setSelectedEmail(null);
          setActiveTab(tab);
        }}
        onOpenCompose={() => setShowComposeModal(true)}
        scheduledCount={scheduledTotal}
        sentCount={sentTotal}
      />

      {/* Main Content View (Offset by Sidebar width w-64) */}
      <div className="flex-1 ml-64 flex flex-col min-h-screen bg-[#f8fafc]">
        {/* Top Header */}
        <Header
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onRefresh={loadDashboardData}
          slackConnected={slackStatus.isConnected}
          onConnectSlack={slackStatus.isConnected ? handleDisconnectSlack : handleConnectSlack}
        />

        {/* Content Container */}
        <main className="flex-1 p-8 bg-[#f8fafc]">
          {selectedEmail ? (
            /* Email Detail Reader View */
            <EmailDetailView email={selectedEmail} onBack={() => setSelectedEmail(null)} />
          ) : activeTab === 'scheduled' ? (
            /* Scheduled Emails List View */
            <div>
              <ScheduledTable
                emails={searchQuery ? searchResults : scheduledEmails}
                isLoading={isLoading}
                onSelectEmail={(email) => setSelectedEmail(email)}
              />
            </div>
          ) : (
            /* Sent Emails List View */
            <div>
              <SentTable
                emails={searchQuery ? searchResults : sentEmails}
                isLoading={isLoading}
                onSelectEmail={(email) => setSelectedEmail(email)}
              />
            </div>
          )}
        </main>
      </div>

      {/* Compose Email Modal */}
      {showComposeModal && (
        <ComposeModal
          onClose={() => setShowComposeModal(false)}
          onSuccess={handleNewCampaignCreated}
        />
      )}
    </div>
  );
}
