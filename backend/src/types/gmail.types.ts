/**
 * Gmail API Types and Interfaces
 */

export interface GmailTokens {
  access_token: string;
  refresh_token?: string;
  scope: string;
  token_type: string;
  expiry_date: number;
}

export interface EmailMessage {
  id: string;
  threadId: string;
  labelIds?: string[];
  snippet: string;
  historyId: string;
  internalDate: string;
  payload: EmailPayload;
  sizeEstimate: number;
  raw?: string;
}

export interface EmailPayload {
  partId?: string;
  mimeType: string;
  filename?: string;
  headers: EmailHeader[];
  body?: EmailBody;
  parts?: EmailPayload[];
}

export interface EmailHeader {
  name: string;
  value: string;
}

export interface EmailBody {
  attachmentId?: string;
  size: number;
  data?: string;
}

export interface ParsedEmail {
  messageId: string;
  threadId: string;
  subject: string;
  from: string;
  to: string;
  cc?: string;
  bcc?: string;
  date: string;
  body: string;
  bodyHtml?: string;
  snippet: string;
  labels: string[];
  hasAttachments: boolean;
  attachments?: EmailAttachment[];
  internalDate: Date;
}

export interface EmailAttachment {
  filename: string;
  mimeType: string;
  size: number;
  attachmentId: string;
}

export interface FetchEmailsOptions {
  maxResults?: number;
  query?: string;
  labelIds?: string[];
  pageToken?: string;
  includeSpamTrash?: boolean;
}

export interface FetchEmailsResponse {
  messages: EmailMessage[];
  nextPageToken?: string;
  resultSizeEstimate?: number;
}

export interface GmailWatchResponse {
  historyId: string;
  expiration: string;
}

export interface GmailHistoryRecord {
  id: string;
  messages?: EmailMessage[];
  messagesAdded?: Array<{ message: EmailMessage }>;
  messagesDeleted?: Array<{ message: { id: string; threadId: string } }>;
  labelsAdded?: Array<{
    message: EmailMessage;
    labelIds: string[];
  }>;
  labelsRemoved?: Array<{
    message: EmailMessage;
    labelIds: string[];
  }>;
}

export interface GmailLabel {
  id: string;
  name: string;
  type: 'system' | 'user';
  messageListVisibility?: 'show' | 'hide';
  labelListVisibility?: 'labelShow' | 'labelShowIfUnread' | 'labelHide';
  color?: {
    textColor: string;
    backgroundColor: string;
  };
}

export interface GmailUserProfile {
  emailAddress: string;
  messagesTotal: number;
  threadsTotal: number;
  historyId: string;
}

// Database models
export interface GmailTokenRecord {
  id: string;
  user_id: string;
  access_token: string;
  refresh_token: string | null;
  expires_at: Date;
  email: string;
  scopes: string;
  created_at: Date;
  updated_at: Date;
}

export interface GmailWatchRecord {
  id: string;
  user_id: string;
  history_id: string;
  expiration: Date;
  created_at: Date;
  updated_at: Date;
}
