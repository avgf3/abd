/**
 * Database Performance Optimization Script
 * Creates indexes to improve query performance and prevent timeouts
 */

import { dbAdapter } from '../database-adapter';

export async function optimizeDatabaseIndexes(): Promise<void> {
  try {
    if (!dbAdapter.client) {
      console.warn('⚠️ Database client not available for optimization');
      return;
    }

    // Create indexes for frequently queried columns
    const indexes = [
      // Users table indexes
      'CREATE INDEX IF NOT EXISTS idx_users_id ON users(id)',
      'CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)',
      'CREATE INDEX IF NOT EXISTS idx_users_is_online ON users(is_online)',
      'CREATE INDEX IF NOT EXISTS idx_users_last_seen ON users(last_seen)',
      'CREATE INDEX IF NOT EXISTS idx_users_user_type ON users(user_type)',
      'CREATE INDEX IF NOT EXISTS idx_users_current_room ON users(current_room)',
      
      // Messages table indexes
      'CREATE INDEX IF NOT EXISTS idx_messages_room_id ON messages(room_id)',
      'CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id)',
      'CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp)',
      'CREATE INDEX IF NOT EXISTS idx_messages_is_private ON messages(is_private)',
      'CREATE INDEX IF NOT EXISTS idx_messages_deleted_at ON messages(deleted_at)',
      'CREATE INDEX IF NOT EXISTS idx_messages_room_timestamp ON messages(room_id, timestamp DESC)',
      
      // Rooms table indexes
      'CREATE INDEX IF NOT EXISTS idx_rooms_id ON rooms(id)',
      'CREATE INDEX IF NOT EXISTS idx_rooms_is_active ON rooms(is_active)',
      'CREATE INDEX IF NOT EXISTS idx_rooms_deleted_at ON rooms(deleted_at)',
      
      // Room members table indexes (if exists)
      'CREATE INDEX IF NOT EXISTS idx_room_members_room_id ON room_members(room_id)',
      'CREATE INDEX IF NOT EXISTS idx_room_members_user_id ON room_members(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_room_members_banned_until ON room_members(banned_until)',
      'CREATE INDEX IF NOT EXISTS idx_room_members_muted_until ON room_members(muted_until)',
      
      // Stories table indexes
      'CREATE INDEX IF NOT EXISTS idx_stories_user_id ON stories(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_stories_expires_at ON stories(expires_at)',
      'CREATE INDEX IF NOT EXISTS idx_stories_created_at ON stories(created_at)',
      
      // Story views table indexes
      'CREATE INDEX IF NOT EXISTS idx_story_views_story_id ON story_views(story_id)',
      'CREATE INDEX IF NOT EXISTS idx_story_views_viewer_id ON story_views(viewer_id)',
      
      // Story reactions table indexes
      'CREATE INDEX IF NOT EXISTS idx_story_reactions_story_id ON story_reactions(story_id)',
      'CREATE INDEX IF NOT EXISTS idx_story_reactions_user_id ON story_reactions(user_id)',
      
      // Message reactions table indexes
      'CREATE INDEX IF NOT EXISTS idx_message_reactions_message_id ON message_reactions(message_id)',
      'CREATE INDEX IF NOT EXISTS idx_message_reactions_user_id ON message_reactions(user_id)',
      
      // Points history table indexes
      'CREATE INDEX IF NOT EXISTS idx_points_history_user_id ON points_history(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_points_history_created_at ON points_history(created_at)',
      
      // VIP users table indexes
      'CREATE INDEX IF NOT EXISTS idx_vip_users_user_id ON vip_users(user_id)',
      
      // Bots table indexes
      'CREATE INDEX IF NOT EXISTS idx_bots_username ON bots(username)',
      'CREATE INDEX IF NOT EXISTS idx_bots_current_room ON bots(current_room)',
      'CREATE INDEX IF NOT EXISTS idx_bots_is_active ON bots(is_active)',
      
      // Blocked devices table indexes
      'CREATE INDEX IF NOT EXISTS idx_blocked_devices_user_id ON blocked_devices(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_blocked_devices_ip_address ON blocked_devices(ip_address)',
      'CREATE INDEX IF NOT EXISTS idx_blocked_devices_device_id ON blocked_devices(device_id)',
    ];

    // Execute indexes one by one to avoid overwhelming the database
    for (const indexQuery of indexes) {
      try {
        await dbAdapter.client.unsafe(indexQuery);
        } catch (error: any) {
        // Ignore errors for indexes that already exist or tables that don't exist
        if (!error.message?.includes('already exists') && 
            !error.message?.includes('does not exist') &&
            !error.message?.includes('relation') &&
            !error.message?.includes('column')) {
          console.warn(`⚠️ Failed to create index: ${error.message}`);
        }
      }
    }

    // Analyze tables to update statistics
    const tables = [
      'users', 'messages', 'rooms', 'room_members', 'stories', 
      'story_views', 'story_reactions', 'message_reactions', 
      'points_history', 'vip_users', 'bots', 'blocked_devices'
    ];

    for (const table of tables) {
      try {
        await dbAdapter.client.unsafe(`ANALYZE ${table}`);
        } catch (error: any) {
        // Ignore errors for tables that don't exist
        if (!error.message?.includes('does not exist')) {
          console.warn(`⚠️ Failed to analyze table ${table}: ${error.message}`);
        }
      }
    }

    } catch (error) {
    console.error('❌ Database optimization failed:', error);
  }
}

/**
 * Check database performance and suggest optimizations
 */
export async function checkDatabasePerformance(): Promise<void> {
  try {
    if (!dbAdapter.client) {
      console.warn('⚠️ Database client not available for performance check');
      return;
    }

    // Check for missing indexes on frequently queried columns
    const missingIndexes = await dbAdapter.client`
      SELECT 
        schemaname,
        tablename,
        attname,
        n_distinct,
        correlation
      FROM pg_stats 
      WHERE schemaname = 'public' 
        AND tablename IN ('users', 'messages', 'rooms', 'room_members')
        AND attname IN ('id', 'username', 'room_id', 'sender_id', 'timestamp', 'is_online', 'last_seen')
      ORDER BY tablename, attname
    ` as any;

    missingIndexes.forEach((stat: any) => {
      });

    // Check for slow queries (if pg_stat_statements is available)
    try {
      const slowQueries = await dbAdapter.client`
        SELECT 
          query,
          calls,
          total_time,
          mean_time,
          rows
        FROM pg_stat_statements 
        WHERE mean_time > 1000  -- queries taking more than 1 second on average
        ORDER BY mean_time DESC 
        LIMIT 10
      ` as any;

      if (slowQueries.length > 0) {
        slowQueries.forEach((query: any) => {
          });
      } else {
        }
    } catch (error) {
      }

  } catch (error) {
    console.error('❌ Database performance check failed:', error);
  }
}