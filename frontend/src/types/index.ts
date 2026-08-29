export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string | null;
  googleId?: string;
  createdAt?: string;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (newToken: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

export interface Sender {
  id: string;
  email: string;
  name?: string | null;
}

export interface Email {
  id: string;
  userId: string;
  senderId: string;
  recipient: string;
  subject: string;
  body: string;
  startTime: string;
  scheduledAt: string;
  sentAt?: string | null;
  status: 'SCHEDULED' | 'PROCESSING' | 'SENT' | 'FAILED';
  jobId: string;
  attempts: number;
  idempotencyKey: string;
  createdAt: string;
  updatedAt: string;
  sender?: Sender;
}

export interface SlackStatus {
  isConnected: boolean;
  slackTeamId?: string;
  slackUserId?: string;
}

export interface ScheduleCampaignPayload {
  subject: string;
  body: string;
  startTime: string;
  delayBetweenEmails: number;
  hourlyLimit: number;
  recipients: string[];
  senderId?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  page?: number;
  limit?: number;
  total?: number;
}
