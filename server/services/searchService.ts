import { storage } from '../storage';
import { sanitizeInput } from '../security';
import type { ChatUser, ChatMessage } from '../../shared/types';

export interface SearchFilters {
  roomId?: string;
  userId?: number;
  messageType?: string;
  dateFrom?: Date;
  dateTo?: Date;
  hasMedia?: boolean;
}

export interface SearchOptions {
  limit?: number;
  offset?: number;
  sortBy?: 'relevance' | 'date' | 'user';
  sortOrder?: 'asc' | 'desc';
}

export interface SearchResult<T> {
  results: T[];
  total: number;
  hasMore: boolean;
  query: string;
  filters?: SearchFilters;
}

class SearchService {
  /**
   * البحث في الرسائل
   */
  async searchMessages(
    query: string,
    filters: SearchFilters = {},
    options: SearchOptions = {}
  ): Promise<SearchResult<ChatMessage & { user: ChatUser }>> {
    const sanitizedQuery = sanitizeInput(query?.trim() || '');
    
    if (!sanitizedQuery || sanitizedQuery.length < 2) {
      return {
        results: [],
        total: 0,
        hasMore: false,
        query: sanitizedQuery,
        filters
      };
    }

    const {
      limit = 20,
      offset = 0,
      sortBy = 'date',
      sortOrder = 'desc'
    } = options;

    try {
      // بناء الاستعلام الأساسي
      let whereConditions = ['messages.content ILIKE $1'];
      let queryParams: any[] = [`%${sanitizedQuery}%`];
      let paramIndex = 2;

      // إضافة فلاتر إضافية
      if (filters.roomId) {
        whereConditions.push(`messages.room_id = $${paramIndex}`);
        queryParams.push(filters.roomId);
        paramIndex++;
      }

      if (filters.userId) {
        whereConditions.push(`messages.user_id = $${paramIndex}`);
        queryParams.push(filters.userId);
        paramIndex++;
      }

      if (filters.messageType) {
        whereConditions.push(`messages.message_type = $${paramIndex}`);
        queryParams.push(filters.messageType);
        paramIndex++;
      }

      if (filters.dateFrom) {
        whereConditions.push(`messages.created_at >= $${paramIndex}`);
        queryParams.push(filters.dateFrom);
        paramIndex++;
      }

      if (filters.dateTo) {
        whereConditions.push(`messages.created_at <= $${paramIndex}`);
        queryParams.push(filters.dateTo);
        paramIndex++;
      }

      if (filters.hasMedia !== undefined) {
        if (filters.hasMedia) {
          whereConditions.push(`(messages.image_url IS NOT NULL OR messages.message_type = 'image')`);
        } else {
          whereConditions.push(`(messages.image_url IS NULL AND messages.message_type != 'image')`);
        }
      }

      // ترتيب النتائج
      let orderBy = 'messages.created_at DESC';
      if (sortBy === 'relevance') {
        // ترتيب حسب الصلة (البحث في بداية النص أولاً)
        orderBy = `
          CASE 
            WHEN messages.content ILIKE '${sanitizedQuery}%' THEN 1
            WHEN messages.content ILIKE '%${sanitizedQuery}%' THEN 2
            ELSE 3
          END,
          messages.created_at ${sortOrder.toUpperCase()}
        `;
      } else if (sortBy === 'date') {
        orderBy = `messages.created_at ${sortOrder.toUpperCase()}`;
      } else if (sortBy === 'user') {
        orderBy = `users.username ${sortOrder.toUpperCase()}, messages.created_at DESC`;
      }

      // الاستعلام الرئيسي
      const searchQuery = `
        SELECT 
          messages.*,
          users.username,
          users.user_type,
          users.profile_image,
          users.username_color,
          users.level,
          users.points,
          users.country,
          users.city,
          COUNT(*) OVER() as total_count
        FROM messages 
        JOIN users ON messages.user_id = users.id
        WHERE ${whereConditions.join(' AND ')}
        ORDER BY ${orderBy}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      queryParams.push(limit, offset);

      const result = await storage.query(searchQuery, queryParams);
      const messages = result.rows;

      const total = messages.length > 0 ? parseInt(messages[0].total_count) : 0;
      const hasMore = offset + limit < total;

      // تنسيق النتائج
      const formattedMessages = messages.map(row => ({
        id: row.id,
        content: row.content,
        userId: row.user_id,
        roomId: row.room_id,
        messageType: row.message_type,
        imageUrl: row.image_url,
        createdAt: row.created_at,
        textColor: row.text_color,
        bold: row.bold,
        user: {
          id: row.user_id,
          username: row.username,
          userType: row.user_type,
          profileImage: row.profile_image,
          usernameColor: row.username_color,
          level: row.level,
          points: row.points,
          country: row.country,
          city: row.city
        }
      }));

      return {
        results: formattedMessages,
        total,
        hasMore,
        query: sanitizedQuery,
        filters
      };

    } catch (error) {
      console.error('خطأ في البحث في الرسائل:', error);
      return {
        results: [],
        total: 0,
        hasMore: false,
        query: sanitizedQuery,
        filters
      };
    }
  }

  /**
   * البحث في المستخدمين
   */
  async searchUsers(
    query: string,
    options: SearchOptions = {}
  ): Promise<SearchResult<ChatUser>> {
    const sanitizedQuery = sanitizeInput(query?.trim() || '');
    
    if (!sanitizedQuery || sanitizedQuery.length < 2) {
      return {
        results: [],
        total: 0,
        hasMore: false,
        query: sanitizedQuery
      };
    }

    const {
      limit = 20,
      offset = 0,
      sortBy = 'relevance',
      sortOrder = 'desc'
    } = options;

    try {
      // ترتيب النتائج
      let orderBy = `
        CASE 
          WHEN username ILIKE '${sanitizedQuery}%' THEN 1
          WHEN username ILIKE '%${sanitizedQuery}%' THEN 2
          ELSE 3
        END,
        points DESC, level DESC
      `;

      if (sortBy === 'date') {
        orderBy = `created_at ${sortOrder.toUpperCase()}`;
      } else if (sortBy === 'user') {
        orderBy = `username ${sortOrder.toUpperCase()}`;
      }

      const searchQuery = `
        SELECT 
          *,
          COUNT(*) OVER() as total_count
        FROM users 
        WHERE username ILIKE $1
        ORDER BY ${orderBy}
        LIMIT $2 OFFSET $3
      `;

      const result = await storage.query(searchQuery, [
        `%${sanitizedQuery}%`,
        limit,
        offset
      ]);

      const users = result.rows;
      const total = users.length > 0 ? parseInt(users[0].total_count) : 0;
      const hasMore = offset + limit < total;

      // تنسيق النتائج
      const formattedUsers = users.map(row => ({
        id: row.id,
        username: row.username,
        userType: row.user_type,
        profileImage: row.profile_image,
        usernameColor: row.username_color,
        level: row.level,
        points: row.points,
        country: row.country,
        city: row.city,
        createdAt: row.created_at,
        isOnline: row.is_online,
        lastSeen: row.last_seen
      }));

      return {
        results: formattedUsers,
        total,
        hasMore,
        query: sanitizedQuery
      };

    } catch (error) {
      console.error('خطأ في البحث في المستخدمين:', error);
      return {
        results: [],
        total: 0,
        hasMore: false,
        query: sanitizedQuery
      };
    }
  }

  /**
   * البحث في الغرف
   */
  async searchRooms(
    query: string,
    options: SearchOptions = {}
  ): Promise<SearchResult<any>> {
    const sanitizedQuery = sanitizeInput(query?.trim() || '');
    
    if (!sanitizedQuery || sanitizedQuery.length < 2) {
      return {
        results: [],
        total: 0,
        hasMore: false,
        query: sanitizedQuery
      };
    }

    const {
      limit = 20,
      offset = 0,
      sortBy = 'relevance',
      sortOrder = 'desc'
    } = options;

    try {
      // ترتيب النتائج
      let orderBy = `
        CASE 
          WHEN name ILIKE '${sanitizedQuery}%' THEN 1
          WHEN name ILIKE '%${sanitizedQuery}%' THEN 2
          ELSE 3
        END,
        user_count DESC
      `;

      if (sortBy === 'date') {
        orderBy = `created_at ${sortOrder.toUpperCase()}`;
      }

      const searchQuery = `
        SELECT 
          *,
          COUNT(*) OVER() as total_count
        FROM rooms 
        WHERE name ILIKE $1 AND is_locked = false
        ORDER BY ${orderBy}
        LIMIT $2 OFFSET $3
      `;

      const result = await storage.query(searchQuery, [
        `%${sanitizedQuery}%`,
        limit,
        offset
      ]);

      const rooms = result.rows;
      const total = rooms.length > 0 ? parseInt(rooms[0].total_count) : 0;
      const hasMore = offset + limit < total;

      return {
        results: rooms,
        total,
        hasMore,
        query: sanitizedQuery
      };

    } catch (error) {
      console.error('خطأ في البحث في الغرف:', error);
      return {
        results: [],
        total: 0,
        hasMore: false,
        query: sanitizedQuery
      };
    }
  }

  /**
   * البحث الشامل (رسائل + مستخدمين + غرف)
   */
  async globalSearch(
    query: string,
    options: SearchOptions & { types?: ('messages' | 'users' | 'rooms')[] } = {}
  ) {
    const { types = ['messages', 'users', 'rooms'], ...searchOptions } = options;
    const results: any = {};

    // تحديد عدد النتائج لكل نوع
    const limitPerType = Math.ceil((searchOptions.limit || 20) / types.length);

    if (types.includes('messages')) {
      results.messages = await this.searchMessages(query, {}, { ...searchOptions, limit: limitPerType });
    }

    if (types.includes('users')) {
      results.users = await this.searchUsers(query, { ...searchOptions, limit: limitPerType });
    }

    if (types.includes('rooms')) {
      results.rooms = await this.searchRooms(query, { ...searchOptions, limit: limitPerType });
    }

    return results;
  }

  /**
   * اقتراحات البحث
   */
  async getSearchSuggestions(query: string, type: 'messages' | 'users' | 'rooms' = 'messages'): Promise<string[]> {
    const sanitizedQuery = sanitizeInput(query?.trim() || '');
    
    if (!sanitizedQuery || sanitizedQuery.length < 2) {
      return [];
    }

    try {
      let searchQuery = '';
      let queryParams: any[] = [];

      switch (type) {
        case 'messages':
          searchQuery = `
            SELECT DISTINCT 
              regexp_split_to_table(content, '\\s+') as word
            FROM messages 
            WHERE content ILIKE $1
            AND LENGTH(regexp_split_to_table(content, '\\s+')) > 2
            ORDER BY word
            LIMIT 10
          `;
          queryParams = [`%${sanitizedQuery}%`];
          break;

        case 'users':
          searchQuery = `
            SELECT username as word
            FROM users 
            WHERE username ILIKE $1
            ORDER BY 
              CASE WHEN username ILIKE $2 THEN 1 ELSE 2 END,
              username
            LIMIT 10
          `;
          queryParams = [`%${sanitizedQuery}%`, `${sanitizedQuery}%`];
          break;

        case 'rooms':
          searchQuery = `
            SELECT name as word
            FROM rooms 
            WHERE name ILIKE $1 AND is_locked = false
            ORDER BY 
              CASE WHEN name ILIKE $2 THEN 1 ELSE 2 END,
              name
            LIMIT 10
          `;
          queryParams = [`%${sanitizedQuery}%`, `${sanitizedQuery}%`];
          break;
      }

      const result = await storage.query(searchQuery, queryParams);
      return result.rows.map(row => row.word).filter(Boolean);

    } catch (error) {
      console.error('خطأ في جلب اقتراحات البحث:', error);
      return [];
    }
  }
}

export const searchService = new SearchService();