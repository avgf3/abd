// استيراد المحول الجديد
export { 
  db, 
  dbType, 
  dbAdapter, 
  checkDatabaseHealth, 
  getDatabaseStatus,
  type DatabaseType,
  type DatabaseAdapter
} from './database-adapter-improved';

// للتوافق مع الكود الموجود
export const pool = null; // سيتم إزالته تدريجياً
export const sqlite = null; // سيتم إزالته تدريجياً