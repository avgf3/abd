// استيراد المحول الجديد
export { 
  db, 
  dbType, 
  dbAdapter, 
  checkDatabaseHealth, 
  getDatabaseStatus,
  type DatabaseType,
  type DatabaseAdapter
} from './database-adapter';

// للتوافق مع الكود الموجود
export const pool = null; // سيتم إزالته تدريجياً