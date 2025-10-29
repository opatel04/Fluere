import axios, { AxiosInstance } from 'axios';
import crypto from 'crypto';
import config from '../config/env';
import logger from '../config/logger';
import { query } from '../config/database';

const TRELLO_API_BASE = 'https://api.trello.com/1';
const TRELLO_AUTH_BASE = 'https://trello.com/1';

interface TrelloTokens {
  token: string;
  tokenSecret?: string;
}

interface TrelloBoard {
  id: string;
  name: string;
  desc: string;
  url: string;
  closed: boolean;
  prefs: any;
}

interface TrelloList {
  id: string;
  name: string;
  closed: boolean;
  idBoard: string;
  pos: number;
}

interface TrelloCard {
  id: string;
  name: string;
  desc: string;
  due: string | null;
  idList: string;
  idBoard: string;
  url: string;
  labels: TrelloLabel[];
  idMembers: string[];
  closed: boolean;
}

interface TrelloLabel {
  id: string;
  idBoard: string;
  name: string;
  color: string;
}

interface CreateCardOptions {
  name: string;
  desc?: string;
  idList: string;
  due?: string;
  pos?: 'top' | 'bottom' | number;
  idLabels?: string[];
  idMembers?: string[];
}

interface UpdateCardOptions {
  name?: string;
  desc?: string;
  idList?: string;
  due?: string;
  closed?: boolean;
  pos?: 'top' | 'bottom' | number;
}

class TrelloService {
  private apiKey: string;
  private apiSecret: string;

  constructor() {
    this.apiKey = config.trello.apiKey;
    this.apiSecret = config.trello.apiSecret;
  }

  /**
   * Generate Trello OAuth authorization URL
   * Trello uses OAuth 1.0a
   */
  getAuthUrl(userId: string, returnUrl?: string): string {
    try {
      const params = new URLSearchParams({
        key: this.apiKey,
        name: 'TaskSnap',
        scope: 'read,write',
        expiration: 'never',
        response_type: 'token',
        return_url: returnUrl || config.trello.callbackUrl,
        callback_method: 'fragment',
      });

      // Store user ID in state for callback
      const authUrl = `${TRELLO_AUTH_BASE}/authorize?${params.toString()}&state=${userId}`;

      logger.info(`Generated Trello auth URL for user ${userId}`);
      return authUrl;
    } catch (error) {
      logger.error('Error generating Trello auth URL:', error);
      throw new Error('Failed to generate Trello authorization URL');
    }
  }

  /**
   * Save Trello token to database
   */
  async saveToken(userId: string, token: string): Promise<void> {
    try {
      // Get user info from Trello
      const userInfo = await this.getUserInfo(token);

      await query(
        `INSERT INTO trello_tokens (user_id, token, username, full_name)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id)
         DO UPDATE SET
           token = $2,
           username = $3,
           full_name = $4,
           updated_at = NOW()`,
        [userId, token, userInfo.username, userInfo.fullName]
      );

      logger.info(`Saved Trello token for user ${userId}`);
    } catch (error) {
      logger.error('Error saving Trello token:', error);
      throw new Error('Failed to save Trello token');
    }
  }

  /**
   * Get Trello token from database
   */
  async getToken(userId: string): Promise<string | null> {
    try {
      const result = await query(
        'SELECT token FROM trello_tokens WHERE user_id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0].token;
    } catch (error) {
      logger.error('Error retrieving Trello token:', error);
      throw new Error('Failed to retrieve Trello token');
    }
  }

  /**
   * Get user info from Trello
   */
  private async getUserInfo(token: string): Promise<{ username: string; fullName: string }> {
    try {
      const response = await axios.get(`${TRELLO_API_BASE}/members/me`, {
        params: {
          key: this.apiKey,
          token: token,
        },
      });

      return {
        username: response.data.username,
        fullName: response.data.fullName,
      };
    } catch (error) {
      logger.error('Error getting Trello user info:', error);
      throw new Error('Failed to get user info from Trello');
    }
  }

  /**
   * Create authenticated Axios instance for Trello API
   */
  private async getClient(userId: string): Promise<AxiosInstance> {
    const token = await this.getToken(userId);

    if (!token) {
      throw new Error('No Trello token found for user');
    }

    return axios.create({
      baseURL: TRELLO_API_BASE,
      params: {
        key: this.apiKey,
        token: token,
      },
    });
  }

  /**
   * Get all boards for a user
   */
  async getBoards(userId: string): Promise<TrelloBoard[]> {
    try {
      const client = await this.getClient(userId);
      const response = await client.get('/members/me/boards', {
        params: {
          filter: 'open',
          fields: 'id,name,desc,url,closed,prefs',
        },
      });

      logger.info(`Fetched ${response.data.length} boards for user ${userId}`);
      return response.data;
    } catch (error) {
      logger.error('Error fetching Trello boards:', error);
      throw new Error('Failed to fetch Trello boards');
    }
  }

  /**
   * Get a specific board
   */
  async getBoard(userId: string, boardId: string): Promise<TrelloBoard> {
    try {
      const client = await this.getClient(userId);
      const response = await client.get(`/boards/${boardId}`);

      logger.info(`Fetched board ${boardId} for user ${userId}`);
      return response.data;
    } catch (error) {
      logger.error('Error fetching Trello board:', error);
      throw new Error('Failed to fetch Trello board');
    }
  }

  /**
   * Get lists for a board
   */
  async getLists(userId: string, boardId: string): Promise<TrelloList[]> {
    try {
      const client = await this.getClient(userId);
      const response = await client.get(`/boards/${boardId}/lists`, {
        params: {
          filter: 'open',
          fields: 'id,name,closed,idBoard,pos',
        },
      });

      logger.info(`Fetched ${response.data.length} lists for board ${boardId}`);
      return response.data;
    } catch (error) {
      logger.error('Error fetching Trello lists:', error);
      throw new Error('Failed to fetch Trello lists');
    }
  }

  /**
   * Get a specific list
   */
  async getList(userId: string, listId: string): Promise<TrelloList> {
    try {
      const client = await this.getClient(userId);
      const response = await client.get(`/lists/${listId}`);

      logger.info(`Fetched list ${listId} for user ${userId}`);
      return response.data;
    } catch (error) {
      logger.error('Error fetching Trello list:', error);
      throw new Error('Failed to fetch Trello list');
    }
  }

  /**
   * Create a new list on a board
   */
  async createList(
    userId: string,
    boardId: string,
    name: string,
    pos?: 'top' | 'bottom' | number
  ): Promise<TrelloList> {
    try {
      const client = await this.getClient(userId);

      const params: any = {
        name,
        idBoard: boardId,
      };

      if (pos !== undefined) {
        params.pos = pos;
      }

      const response = await client.post('/lists', null, { params });

      logger.info(`Created list "${name}" on board ${boardId} for user ${userId}`);
      return response.data;
    } catch (error) {
      logger.error('Error creating Trello list:', error);
      throw new Error('Failed to create Trello list');
    }
  }

  /**
   * Update a list (rename, archive, reposition)
   */
  async updateList(
    userId: string,
    listId: string,
    options: {
      name?: string;
      closed?: boolean;
      pos?: 'top' | 'bottom' | number;
    }
  ): Promise<TrelloList> {
    try {
      const client = await this.getClient(userId);

      const params: any = {};
      if (options.name !== undefined) params.name = options.name;
      if (options.closed !== undefined) params.closed = options.closed;
      if (options.pos !== undefined) params.pos = options.pos;

      const response = await client.put(`/lists/${listId}`, null, { params });

      logger.info(`Updated list ${listId} for user ${userId}`);
      return response.data;
    } catch (error) {
      logger.error('Error updating Trello list:', error);
      throw new Error('Failed to update Trello list');
    }
  }

  /**
   * Find a list by name on a board, or create it if it doesn't exist
   */
  async findOrCreateList(
    userId: string,
    boardId: string,
    listName: string,
    position?: 'top' | 'bottom' | number
  ): Promise<TrelloList> {
    try {
      // Get all lists on the board
      const lists = await this.getLists(userId, boardId);

      // Try to find existing list by name (case-insensitive)
      const existingList = lists.find(
        list => list.name.toLowerCase() === listName.toLowerCase()
      );

      if (existingList) {
        logger.info(`Found existing list "${listName}" on board ${boardId}`);
        return existingList;
      }

      // Create new list if not found
      logger.info(`Creating new list "${listName}" on board ${boardId}`);
      return await this.createList(userId, boardId, listName, position);
    } catch (error) {
      logger.error('Error finding or creating Trello list:', error);
      throw new Error('Failed to find or create Trello list');
    }
  }

  /**
   * Move a card to a different list
   */
  async moveCard(
    userId: string,
    cardId: string,
    targetListId: string,
    position?: 'top' | 'bottom' | number
  ): Promise<TrelloCard> {
    try {
      const options: UpdateCardOptions = {
        idList: targetListId,
      };

      if (position !== undefined) {
        options.pos = position;
      }

      const updatedCard = await this.updateCard(userId, cardId, options);

      logger.info(`Moved card ${cardId} to list ${targetListId} for user ${userId}`);
      return updatedCard;
    } catch (error) {
      logger.error('Error moving Trello card:', error);
      throw new Error('Failed to move Trello card');
    }
  }

  /**
   * Get cards from a list
   */
  async getCards(userId: string, listId: string): Promise<TrelloCard[]> {
    try {
      const client = await this.getClient(userId);
      const response = await client.get(`/lists/${listId}/cards`, {
        params: {
          fields: 'id,name,desc,due,idList,idBoard,url,labels,idMembers,closed',
        },
      });

      logger.info(`Fetched ${response.data.length} cards from list ${listId}`);
      return response.data;
    } catch (error) {
      logger.error('Error fetching Trello cards:', error);
      throw new Error('Failed to fetch Trello cards');
    }
  }

  /**
   * Get a specific card
   */
  async getCard(userId: string, cardId: string): Promise<TrelloCard> {
    try {
      const client = await this.getClient(userId);
      const response = await client.get(`/cards/${cardId}`);

      logger.info(`Fetched card ${cardId} for user ${userId}`);
      return response.data;
    } catch (error) {
      logger.error('Error fetching Trello card:', error);
      throw new Error('Failed to fetch Trello card');
    }
  }

  /**
   * Create a new card
   */
  async createCard(userId: string, options: CreateCardOptions): Promise<TrelloCard> {
    try {
      const client = await this.getClient(userId);

      const data: any = {
        name: options.name,
        idList: options.idList,
      };

      if (options.desc) data.desc = options.desc;
      if (options.due) data.due = options.due;
      if (options.pos) data.pos = options.pos;
      if (options.idLabels) data.idLabels = options.idLabels.join(',');
      if (options.idMembers) data.idMembers = options.idMembers.join(',');

      const response = await client.post('/cards', null, { params: data });

      logger.info(`Created card "${options.name}" in list ${options.idList} for user ${userId}`);
      return response.data;
    } catch (error) {
      logger.error('Error creating Trello card:', error);
      throw new Error('Failed to create Trello card');
    }
  }

  /**
   * Update a card
   */
  async updateCard(
    userId: string,
    cardId: string,
    options: UpdateCardOptions
  ): Promise<TrelloCard> {
    try {
      const client = await this.getClient(userId);

      const data: any = {};

      if (options.name !== undefined) data.name = options.name;
      if (options.desc !== undefined) data.desc = options.desc;
      if (options.idList !== undefined) data.idList = options.idList;
      if (options.due !== undefined) data.due = options.due;
      if (options.closed !== undefined) data.closed = options.closed;
      if (options.pos !== undefined) data.pos = options.pos;

      const response = await client.put(`/cards/${cardId}`, null, { params: data });

      logger.info(`Updated card ${cardId} for user ${userId}`);
      return response.data;
    } catch (error) {
      logger.error('Error updating Trello card:', error);
      throw new Error('Failed to update Trello card');
    }
  }

  /**
   * Delete a card (archive)
   */
  async deleteCard(userId: string, cardId: string): Promise<void> {
    try {
      const client = await this.getClient(userId);
      await client.delete(`/cards/${cardId}`);

      logger.info(`Deleted card ${cardId} for user ${userId}`);
    } catch (error) {
      logger.error('Error deleting Trello card:', error);
      throw new Error('Failed to delete Trello card');
    }
  }

  /**
   * Add a comment to a card
   */
  async addComment(userId: string, cardId: string, text: string): Promise<any> {
    try {
      const client = await this.getClient(userId);
      const response = await client.post(`/cards/${cardId}/actions/comments`, null, {
        params: { text },
      });

      logger.info(`Added comment to card ${cardId} for user ${userId}`);
      return response.data;
    } catch (error) {
      logger.error('Error adding comment to Trello card:', error);
      throw new Error('Failed to add comment to Trello card');
    }
  }

  /**
   * Get labels for a board
   */
  async getLabels(userId: string, boardId: string): Promise<TrelloLabel[]> {
    try {
      const client = await this.getClient(userId);
      const response = await client.get(`/boards/${boardId}/labels`);

      logger.info(`Fetched labels for board ${boardId}`);
      return response.data;
    } catch (error) {
      logger.error('Error fetching Trello labels:', error);
      throw new Error('Failed to fetch Trello labels');
    }
  }

  /**
   * Create a label
   */
  async createLabel(
    userId: string,
    boardId: string,
    name: string,
    color: string
  ): Promise<TrelloLabel> {
    try {
      const client = await this.getClient(userId);
      const response = await client.post(`/boards/${boardId}/labels`, null, {
        params: { name, color },
      });

      logger.info(`Created label "${name}" on board ${boardId}`);
      return response.data;
    } catch (error) {
      logger.error('Error creating Trello label:', error);
      throw new Error('Failed to create Trello label');
    }
  }

  /**
   * Update a label
   */
  async updateLabel(
    userId: string,
    labelId: string,
    name?: string,
    color?: string
  ): Promise<TrelloLabel> {
    try {
      const client = await this.getClient(userId);
      const params: any = {};

      if (name !== undefined) params.name = name;
      if (color !== undefined) params.color = color;

      const response = await client.put(`/labels/${labelId}`, null, { params });

      logger.info(`Updated label ${labelId}`);
      return response.data;
    } catch (error) {
      logger.error('Error updating Trello label:', error);
      throw new Error('Failed to update Trello label');
    }
  }

  /**
   * Add label to card
   */
  async addLabelToCard(userId: string, cardId: string, labelId: string): Promise<void> {
    try {
      const client = await this.getClient(userId);
      await client.post(`/cards/${cardId}/idLabels`, null, {
        params: { value: labelId },
      });

      logger.info(`Added label ${labelId} to card ${cardId}`);
    } catch (error) {
      logger.error('Error adding label to card:', error);
      throw new Error('Failed to add label to card');
    }
  }

  /**
   * Create webhook for board updates
   */
  async createWebhook(
    userId: string,
    boardId: string,
    callbackUrl: string
  ): Promise<any> {
    try {
      const client = await this.getClient(userId);
      const response = await client.post('/webhooks', null, {
        params: {
          idModel: boardId,
          callbackURL: callbackUrl,
          description: 'TaskSnap board updates',
        },
      });

      logger.info(`Created webhook for board ${boardId}`);
      return response.data;
    } catch (error) {
      logger.error('Error creating Trello webhook:', error);
      throw new Error('Failed to create Trello webhook');
    }
  }

  /**
   * Delete webhook
   */
  async deleteWebhook(userId: string, webhookId: string): Promise<void> {
    try {
      const client = await this.getClient(userId);
      await client.delete(`/webhooks/${webhookId}`);

      logger.info(`Deleted webhook ${webhookId}`);
    } catch (error) {
      logger.error('Error deleting Trello webhook:', error);
      throw new Error('Failed to delete Trello webhook');
    }
  }

  /**
   * Disconnect Trello account
   */
  async disconnect(userId: string): Promise<void> {
    try {
      // Delete token from database
      await query('DELETE FROM trello_tokens WHERE user_id = $1', [userId]);

      logger.info(`Disconnected Trello for user ${userId}`);
    } catch (error) {
      logger.error('Error disconnecting Trello:', error);
      throw new Error('Failed to disconnect Trello account');
    }
  }

  /**
   * Check if user has Trello connected
   */
  async isConnected(userId: string): Promise<boolean> {
    try {
      const token = await this.getToken(userId);
      return token !== null;
    } catch (error) {
      logger.error('Error checking Trello connection status:', error);
      return false;
    }
  }

  /**
   * Search for cards across boards
   */
  async searchCards(
    userId: string,
    query: string,
    boardIds?: string[]
  ): Promise<TrelloCard[]> {
    try {
      const client = await this.getClient(userId);

      const params: any = {
        query,
        modelTypes: 'cards',
        card_fields: 'id,name,desc,due,idList,idBoard,url,labels,closed',
      };

      if (boardIds && boardIds.length > 0) {
        params.idBoards = boardIds.join(',');
      }

      const response = await client.get('/search', { params });

      logger.info(`Searched for cards with query "${query}"`);
      return response.data.cards || [];
    } catch (error) {
      logger.error('Error searching Trello cards:', error);
      throw new Error('Failed to search Trello cards');
    }
  }
}

export default new TrelloService();
