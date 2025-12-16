import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import config from '../config/env';
import logger from '../config/logger';
import { query } from '../config/database';

// Gmail API scopes - using minimal required permissions
// Only requesting READ access for better security
const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',  // Read emails only
  'https://www.googleapis.com/auth/userinfo.email',   // User's email address
  'https://www.googleapis.com/auth/userinfo.profile', // User's basic profile
];

// NOTE: If you need to modify emails (mark as read, add labels, etc.):
// Add 'https://www.googleapis.com/auth/gmail.modify' to the array above
// and uncomment the modify methods below

interface GmailTokens {
  access_token: string;
  refresh_token?: string;
  scope: string;
  token_type: string;
  expiry_date: number;
}

interface EmailMessage {
  id: string;
  threadId: string;
  labelIds?: string[];
  snippet: string;
  historyId: string;
  internalDate: string;
  payload: {
    partId?: string;
    mimeType: string;
    filename?: string;
    headers: Array<{ name: string; value: string }>;
    body?: {
      attachmentId?: string;
      size: number;
      data?: string;
    };
    parts?: any[];
  };
  sizeEstimate: number;
}

interface ParsedEmail {
  messageId: string;
  threadId: string;
  subject: string;
  from: string;
  to: string;
  date: string;
  body: string;
  snippet: string;
  labels: string[];
  hasAttachments: boolean;
  internalDate: Date;
}

class GmailService {
  private oauth2Client: OAuth2Client;

  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      config.gmail.clientId,
      config.gmail.clientSecret,
      config.gmail.redirectUri
    );
  }

  /**
   * Generate Gmail OAuth URL for user authorization
   */
  getAuthUrl(userId: string): string {
    try {
      const authUrl = this.oauth2Client.generateAuthUrl({
        access_type: 'offline', // Required to get refresh token
        scope: GMAIL_SCOPES,
        prompt: 'consent', // Force consent screen to always get refresh token
        state: userId, // Pass user ID to identify user in callback
      });

      logger.info(`Generated Gmail auth URL for user ${userId}`);
      return authUrl;
    } catch (error) {
      logger.error('Error generating Gmail auth URL:', error);
      throw new Error('Failed to generate Gmail authorization URL');
    }
  }

  /**
   * Exchange authorization code for tokens
   */
  async getTokensFromCode(code: string): Promise<GmailTokens> {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);

      if (!tokens.access_token) {
        throw new Error('No access token received');
      }

      logger.info('Successfully exchanged code for tokens');

      return tokens as GmailTokens;
    } catch (error) {
      logger.error('Error exchanging code for tokens:', error);
      throw new Error('Failed to exchange authorization code for tokens');
    }
  }

  /**
   * Create or update user from Gmail OAuth and save tokens
   */
  async createOrUpdateUser(userId: string | undefined, tokens: GmailTokens): Promise<{ userId: string; email: string; name: string }> {
    try {
      const { access_token, refresh_token, expiry_date } = tokens;
      const { v4: uuidv4 } = await import('uuid');

      // Get user email from Google
      const userInfo = await this.getUserInfo(access_token);

      let finalUserId = userId;

      // If no userId provided, check if user exists by email or create new user
      if (!finalUserId) {
        const existingUser = await query(
          `SELECT id FROM users WHERE email = $1`,
          [userInfo.email]
        );

        if (existingUser.rows.length > 0) {
          finalUserId = existingUser.rows[0].id;
        } else {
          // Create new user
          const newUser = await query(
            `INSERT INTO users (id, email, created_at, updated_at)
             VALUES ($1, $2, NOW(), NOW())
             RETURNING id`,
            [uuidv4(), userInfo.email]
          );
          finalUserId = newUser.rows[0].id;
          logger.info(`Created new user ${finalUserId} from Gmail OAuth`);
        }
      }

      // Save Gmail tokens
      await query(
        `INSERT INTO gmail_tokens (user_id, access_token, refresh_token, expires_at, email, scopes)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (user_id)
         DO UPDATE SET
           access_token = $2,
           refresh_token = COALESCE($3, gmail_tokens.refresh_token),
           expires_at = $4,
           email = $5,
           scopes = $6,
           updated_at = NOW()`,
        [
          finalUserId,
          access_token,
          refresh_token || null,
          new Date(expiry_date),
          userInfo.email,
          tokens.scope,
        ]
      );

      logger.info(`Saved Gmail tokens for user ${finalUserId}`);

      return {
        userId: finalUserId!,
        email: userInfo.email,
        name: userInfo.name,
      };
    } catch (error) {
      logger.error('Error creating/updating user:', error);
      throw new Error('Failed to save Gmail tokens');
    }
  }

  /**
   * Save Gmail tokens to database
   */
  async saveTokens(userId: string, tokens: GmailTokens): Promise<void> {
    try {
      const { access_token, refresh_token, expiry_date } = tokens;

      // Get user email from Google
      const userInfo = await this.getUserInfo(access_token);

      await query(
        `INSERT INTO gmail_tokens (user_id, access_token, refresh_token, expires_at, email, scopes)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (user_id)
         DO UPDATE SET
           access_token = $2,
           refresh_token = COALESCE($3, gmail_tokens.refresh_token),
           expires_at = $4,
           email = $5,
           scopes = $6,
           updated_at = NOW()`,
        [
          userId,
          access_token,
          refresh_token || null,
          new Date(expiry_date),
          userInfo.email,
          tokens.scope,
        ]
      );

      logger.info(`Saved Gmail tokens for user ${userId}`);
    } catch (error) {
      logger.error('Error saving Gmail tokens:', error);
      throw new Error('Failed to save Gmail tokens');
    }
  }

  /**
   * Get user info from Google
   */
  async getUserInfo(accessToken: string): Promise<{ email: string; name: string }> {
    try {
      this.oauth2Client.setCredentials({ access_token: accessToken });
      const oauth2 = google.oauth2({ version: 'v2', auth: this.oauth2Client });
      const { data } = await oauth2.userinfo.get();

      return {
        email: data.email || '',
        name: data.name || '',
      };
    } catch (error) {
      logger.error('Error getting user info:', error);
      throw new Error('Failed to get user info from Google');
    }
  }

  /**
   * Get Gmail tokens from database
   */
  async getTokens(userId: string): Promise<GmailTokens | null> {
    try {
      const result = await query(
        'SELECT access_token, refresh_token, expires_at, scopes FROM gmail_tokens WHERE user_id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const { access_token, refresh_token, expires_at, scopes } = result.rows[0];

      return {
        access_token,
        refresh_token,
        scope: scopes,
        token_type: 'Bearer',
        expiry_date: new Date(expires_at).getTime(),
      };
    } catch (error) {
      logger.error('Error retrieving Gmail tokens:', error);
      throw new Error('Failed to retrieve Gmail tokens');
    }
  }

  /**
   * Refresh access token if expired
   */
  async refreshAccessToken(userId: string): Promise<string> {
    try {
      const tokens = await this.getTokens(userId);

      if (!tokens || !tokens.refresh_token) {
        throw new Error('No refresh token available');
      }

      this.oauth2Client.setCredentials({
        refresh_token: tokens.refresh_token,
      });

      const { credentials } = await this.oauth2Client.refreshAccessToken();

      if (!credentials.access_token) {
        throw new Error('No access token received from refresh');
      }

      // Update tokens in database
      await query(
        `UPDATE gmail_tokens
         SET access_token = $1, expires_at = $2, updated_at = NOW()
         WHERE user_id = $3`,
        [
          credentials.access_token,
          new Date(credentials.expiry_date || Date.now() + 3600000),
          userId,
        ]
      );

      logger.info(`Refreshed access token for user ${userId}`);

      return credentials.access_token;
    } catch (error) {
      logger.error('Error refreshing access token:', error);
      throw new Error('Failed to refresh access token');
    }
  }

  /**
   * Get valid access token (refresh if needed)
   */
  async getValidAccessToken(userId: string): Promise<string> {
    try {
      const tokens = await this.getTokens(userId);

      if (!tokens) {
        throw new Error('No tokens found for user');
      }

      // Check if token is expired or will expire in the next 5 minutes
      const expiryBuffer = 5 * 60 * 1000; // 5 minutes
      const isExpired = tokens.expiry_date < Date.now() + expiryBuffer;

      if (isExpired && tokens.refresh_token) {
        return await this.refreshAccessToken(userId);
      }

      return tokens.access_token;
    } catch (error) {
      logger.error('Error getting valid access token:', error);
      throw new Error('Failed to get valid access token');
    }
  }

  /**
   * Initialize Gmail API client for a user
   */
  private async getGmailClient(userId: string) {
    const accessToken = await this.getValidAccessToken(userId);
    this.oauth2Client.setCredentials({ access_token: accessToken });

    return google.gmail({ version: 'v1', auth: this.oauth2Client });
  }

  /**
   * Fetch emails from Gmail
   */
  async fetchEmails(
    userId: string,
    options: {
      maxResults?: number;
      query?: string;
      labelIds?: string[];
      pageToken?: string;
    } = {}
  ): Promise<{ messages: EmailMessage[]; nextPageToken?: string }> {
    try {
      const gmail = await this.getGmailClient(userId);

      const response = await gmail.users.messages.list({
        userId: 'me',
        maxResults: options.maxResults || 10,
        q: options.query,
        labelIds: options.labelIds,
        pageToken: options.pageToken,
      });

      const messageIds = response.data.messages || [];

      if (messageIds.length === 0) {
        return { messages: [] };
      }

      // Fetch full message details
      const messages = await Promise.all(
        messageIds.map(async (msg) => {
          const fullMessage = await gmail.users.messages.get({
            userId: 'me',
            id: msg.id!,
            format: 'full',
          });
          return fullMessage.data as EmailMessage;
        })
      );

      logger.info(`Fetched ${messages.length} emails for user ${userId}`);

      return {
        messages,
        nextPageToken: response.data.nextPageToken || undefined,
      };
    } catch (error) {
      logger.error('Error fetching emails:', error);
      throw new Error('Failed to fetch emails from Gmail');
    }
  }

  /**
   * Parse email message into structured format
   */
  parseEmail(message: EmailMessage): ParsedEmail {
    try {
      const headers = message.payload.headers;

      const getHeader = (name: string): string => {
        const header = headers.find((h) => h.name.toLowerCase() === name.toLowerCase());
        return header?.value || '';
      };

      // Extract email body
      let body = '';

      const extractBody = (parts: any): string => {
        if (parts.body?.data) {
          return Buffer.from(parts.body.data, 'base64').toString('utf-8');
        }

        if (parts.parts) {
          // First try to find HTML part
          for (const part of parts.parts) {
            if (part.mimeType === 'text/html') {
              const partBody = extractBody(part);
              if (partBody) return partBody;
            }
          }

          // If no HTML found, look for plain text
          for (const part of parts.parts) {
            if (part.mimeType === 'text/plain') {
              const partBody = extractBody(part);
              if (partBody) return partBody;
            }
          }

          // If neither found, recurse into multipart/alternative or mixed
          for (const part of parts.parts) {
            if (part.mimeType.startsWith('multipart/')) {
              const partBody = extractBody(part);
              if (partBody) return partBody;
            }
          }
        }

        return '';
      };

      body = extractBody(message.payload);

      // Check for attachments
      const hasAttachments = this.hasAttachments(message.payload);

      return {
        messageId: message.id,
        threadId: message.threadId,
        subject: getHeader('Subject'),
        from: getHeader('From'),
        to: getHeader('To'),
        date: getHeader('Date'),
        body,
        snippet: message.snippet,
        labels: message.labelIds || [],
        hasAttachments,
        internalDate: new Date(parseInt(message.internalDate)),
      };
    } catch (error) {
      logger.error('Error parsing email:', error);
      throw new Error('Failed to parse email message');
    }
  }

  /**
   * Check if email has attachments
   */
  private hasAttachments(payload: any): boolean {
    if (payload.filename && payload.filename.length > 0) {
      return true;
    }

    if (payload.parts) {
      return payload.parts.some((part: any) => this.hasAttachments(part));
    }

    return false;
  }

  // ============================================================================
  // MODIFY METHODS - DISABLED (Requires gmail.modify scope)
  // ============================================================================
  // These methods are commented out because they require gmail.modify permission.
  // If you need these features, add 'gmail.modify' to GMAIL_SCOPES above.
  // ============================================================================

  /**
   * Mark email as read
   * REQUIRES: gmail.modify scope
   */
  // async markAsRead(userId: string, messageId: string): Promise<void> {
  //   try {
  //     const gmail = await this.getGmailClient(userId);
  //
  //     await gmail.users.messages.modify({
  //       userId: 'me',
  //       id: messageId,
  //       requestBody: {
  //         removeLabelIds: ['UNREAD'],
  //       },
  //     });
  //
  //     logger.info(`Marked message ${messageId} as read for user ${userId}`);
  //   } catch (error) {
  //     logger.error('Error marking email as read:', error);
  //     throw new Error('Failed to mark email as read');
  //   }
  // }

  /**
   * Add label to email
   * REQUIRES: gmail.modify scope
   */
  // async addLabel(userId: string, messageId: string, labelId: string): Promise<void> {
  //   try {
  //     const gmail = await this.getGmailClient(userId);
  //
  //     await gmail.users.messages.modify({
  //       userId: 'me',
  //       id: messageId,
  //       requestBody: {
  //         addLabelIds: [labelId],
  //       },
  //     });
  //
  //     logger.info(`Added label ${labelId} to message ${messageId} for user ${userId}`);
  //   } catch (error) {
  //     logger.error('Error adding label to email:', error);
  //     throw new Error('Failed to add label to email');
  //   }
  // }

  /**
   * Subscribe to Gmail push notifications
   */
  async subscribeToNotifications(userId: string, topicName: string): Promise<void> {
    try {
      const gmail = await this.getGmailClient(userId);

      const response = await gmail.users.watch({
        userId: 'me',
        requestBody: {
          topicName: topicName,
          labelIds: ['INBOX'],
        },
      });

      // Save watch details to database
      await query(
        `INSERT INTO gmail_watches (user_id, history_id, expiration)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id)
         DO UPDATE SET
           history_id = $2,
           expiration = $3,
           updated_at = NOW()`,
        [
          userId,
          response.data.historyId,
          new Date(parseInt(response.data.expiration || '0')),
        ]
      );

      logger.info(`Subscribed to Gmail notifications for user ${userId}`);
    } catch (error) {
      logger.error('Error subscribing to Gmail notifications:', error);
      throw new Error('Failed to subscribe to Gmail notifications');
    }
  }

  /**
   * Stop Gmail push notifications
   */
  async unsubscribeFromNotifications(userId: string): Promise<void> {
    try {
      const gmail = await this.getGmailClient(userId);

      await gmail.users.stop({
        userId: 'me',
      });

      // Remove watch from database
      await query('DELETE FROM gmail_watches WHERE user_id = $1', [userId]);

      logger.info(`Unsubscribed from Gmail notifications for user ${userId}`);
    } catch (error) {
      logger.error('Error unsubscribing from Gmail notifications:', error);
      throw new Error('Failed to unsubscribe from Gmail notifications');
    }
  }

  /**
   * Get a single email by its Gmail message ID
   */
  async getEmailById(userId: string, messageId: string): Promise<EmailMessage | null> {
    try {
      const gmail = await this.getGmailClient(userId);

      const response = await gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full',
      });

      logger.info(`Fetched email ${messageId} for user ${userId}`);
      return response.data as EmailMessage;
    } catch (error: any) {
      if (error.code === 404) {
        logger.warn(`Email ${messageId} not found for user ${userId}`);
        return null;
      }
      logger.error('Error fetching email by ID:', error);
      throw new Error('Failed to fetch email from Gmail');
    }
  }

  /**
   * Get message history since a history ID
   */
  async getHistory(
    userId: string,
    startHistoryId: string
  ): Promise<any[]> {
    try {
      const gmail = await this.getGmailClient(userId);

      const response = await gmail.users.history.list({
        userId: 'me',
        startHistoryId: startHistoryId,
        historyTypes: ['messageAdded', 'labelAdded'],
      });

      return response.data.history || [];
    } catch (error) {
      logger.error('Error getting Gmail history:', error);
      throw new Error('Failed to get Gmail history');
    }
  }

  /**
   * Disconnect Gmail account
   */
  async disconnect(userId: string): Promise<void> {
    try {
      // Unsubscribe from notifications first
      try {
        await this.unsubscribeFromNotifications(userId);
      } catch (error) {
        // Ignore errors if already unsubscribed
        logger.warn('Error unsubscribing during disconnect:', error);
      }

      // Delete tokens from database
      await query('DELETE FROM gmail_tokens WHERE user_id = $1', [userId]);

      logger.info(`Disconnected Gmail for user ${userId}`);
    } catch (error) {
      logger.error('Error disconnecting Gmail:', error);
      throw new Error('Failed to disconnect Gmail account');
    }
  }

  /**
   * Check if user has Gmail connected
   */
  async isConnected(userId: string): Promise<boolean> {
    try {
      const tokens = await this.getTokens(userId);
      return tokens !== null;
    } catch (error) {
      logger.error('Error checking Gmail connection status:', error);
      return false;
    }
  }
}

export default new GmailService();
