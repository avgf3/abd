import { sql } from 'drizzle-orm';
import { dbAdapter, dbType } from '../database-adapter';
import * as schema from '../../shared/schema';

// أنواع البيانات لنتائج فحص المحددات
export interface ConstraintInfo {
  constraintName: string;
  tableName: string;
  constraintType: 'PRIMARY KEY' | 'FOREIGN KEY' | 'UNIQUE' | 'CHECK' | 'NOT NULL';
  columnName?: string;
  referencedTable?: string;
  referencedColumn?: string;
  definition?: string;
  isDeferrable?: boolean;
  initiallyDeferred?: boolean;
}

export interface TableInfo {
  tableName: string;
  columnName: string;
  dataType: string;
  isNullable: boolean;
  columnDefault?: string;
  characterMaximumLength?: number;
}

export interface IndexInfo {
  indexName: string;
  tableName: string;
  columnName: string;
  isUnique: boolean;
  isPrimary: boolean;
}

export interface DatabaseConstraintsReport {
  constraints: ConstraintInfo[];
  tables: TableInfo[];
  indexes: IndexInfo[];
  foreignKeys: ConstraintInfo[];
  uniqueConstraints: ConstraintInfo[];
  checkConstraints: ConstraintInfo[];
  summary: {
    totalConstraints: number;
    totalTables: number;
    totalIndexes: number;
    foreignKeyCount: number;
    uniqueConstraintCount: number;
    checkConstraintCount: number;
  };
}

export class DatabaseConstraintsService {
  private get db() {
    return dbAdapter.db;
  }

  private get type() {
    return dbType;
  }

  private isConnected(): boolean {
    return !!this.db && this.type !== 'disabled';
  }

  /**
   * فحص جميع محددات قاعدة البيانات
   */
  async checkAllConstraints(): Promise<DatabaseConstraintsReport> {
    if (!this.isConnected()) {
      throw new Error('قاعدة البيانات غير متصلة');
    }

    try {
      const [constraints, tables, indexes] = await Promise.all([
        this.getConstraints(),
        this.getTablesInfo(),
        this.getIndexesInfo(),
      ]);

      const foreignKeys = constraints.filter(c => c.constraintType === 'FOREIGN KEY');
      const uniqueConstraints = constraints.filter(c => c.constraintType === 'UNIQUE');
      const checkConstraints = constraints.filter(c => c.constraintType === 'CHECK');

      return {
        constraints,
        tables,
        indexes,
        foreignKeys,
        uniqueConstraints,
        checkConstraints,
        summary: {
          totalConstraints: constraints.length,
          totalTables: tables.length,
          totalIndexes: indexes.length,
          foreignKeyCount: foreignKeys.length,
          uniqueConstraintCount: uniqueConstraints.length,
          checkConstraintCount: checkConstraints.length,
        },
      };
    } catch (error) {
      console.error('خطأ في فحص محددات قاعدة البيانات:', error);
      throw error;
    }
  }

  /**
   * الحصول على جميع محددات قاعدة البيانات
   */
  async getConstraints(): Promise<ConstraintInfo[]> {
    if (!this.isConnected()) {
      return [];
    }

    try {
      const query = sql`
        SELECT 
          tc.constraint_name,
          tc.table_name,
          tc.constraint_type,
          kcu.column_name,
          ccu.table_name AS referenced_table,
          ccu.column_name AS referenced_column,
          cc.check_clause AS definition,
          tc.is_deferrable,
          tc.initially_deferred
        FROM information_schema.table_constraints tc
        LEFT JOIN information_schema.key_column_usage kcu 
          ON tc.constraint_name = kcu.constraint_name 
          AND tc.table_schema = kcu.table_schema
        LEFT JOIN information_schema.constraint_column_usage ccu 
          ON ccu.constraint_name = tc.constraint_name 
          AND ccu.table_schema = tc.table_schema
        LEFT JOIN information_schema.check_constraints cc 
          ON cc.constraint_name = tc.constraint_name 
          AND cc.table_schema = tc.table_schema
        WHERE tc.table_schema = 'public'
        ORDER BY tc.table_name, tc.constraint_type, tc.constraint_name
      `;

      const result = await (this.db as any).execute(query);
      return result.rows || result || [];
    } catch (error) {
      console.error('خطأ في الحصول على محددات قاعدة البيانات:', error);
      return [];
    }
  }

  /**
   * الحصول على معلومات الجداول والأعمدة
   */
  async getTablesInfo(): Promise<TableInfo[]> {
    if (!this.isConnected()) {
      return [];
    }

    try {
      const query = sql`
        SELECT 
          t.table_name,
          c.column_name,
          c.data_type,
          c.is_nullable,
          c.column_default,
          c.character_maximum_length
        FROM information_schema.tables t
        JOIN information_schema.columns c 
          ON t.table_name = c.table_name 
          AND t.table_schema = c.table_schema
        WHERE t.table_schema = 'public' 
          AND t.table_type = 'BASE TABLE'
        ORDER BY t.table_name, c.ordinal_position
      `;

      const result = await (this.db as any).execute(query);
      return result.rows || result || [];
    } catch (error) {
      console.error('خطأ في الحصول على معلومات الجداول:', error);
      return [];
    }
  }

  /**
   * الحصول على معلومات الفهارس
   */
  async getIndexesInfo(): Promise<IndexInfo[]> {
    if (!this.isConnected()) {
      return [];
    }

    try {
      const query = sql`
        SELECT 
          i.indexname,
          i.tablename,
          a.attname AS column_name,
          i.indexdef LIKE '%UNIQUE%' AS is_unique,
          i.indexdef LIKE '%PRIMARY%' AS is_primary
        FROM pg_indexes i
        JOIN pg_class c ON c.relname = i.tablename
        JOIN pg_attribute a ON a.attrelid = c.oid
        JOIN pg_index idx ON idx.indexrelid = (i.schemaname||'.'||i.indexname)::regclass
        WHERE i.schemaname = 'public'
          AND a.attnum = ANY(idx.indkey)
        ORDER BY i.tablename, i.indexname, a.attnum
      `;

      const result = await (this.db as any).execute(query);
      return result.rows || result || [];
    } catch (error) {
      console.error('خطأ في الحصول على معلومات الفهارس:', error);
      return [];
    }
  }

  /**
   * فحص محددات جدول محدد
   */
  async checkTableConstraints(tableName: string): Promise<ConstraintInfo[]> {
    if (!this.isConnected()) {
      return [];
    }

    try {
      const query = sql`
        SELECT 
          tc.constraint_name,
          tc.table_name,
          tc.constraint_type,
          kcu.column_name,
          ccu.table_name AS referenced_table,
          ccu.column_name AS referenced_column,
          cc.check_clause AS definition,
          tc.is_deferrable,
          tc.initially_deferred
        FROM information_schema.table_constraints tc
        LEFT JOIN information_schema.key_column_usage kcu 
          ON tc.constraint_name = kcu.constraint_name 
          AND tc.table_schema = kcu.table_schema
        LEFT JOIN information_schema.constraint_column_usage ccu 
          ON ccu.constraint_name = tc.constraint_name 
          AND ccu.table_schema = tc.table_schema
        LEFT JOIN information_schema.check_constraints cc 
          ON cc.constraint_name = tc.constraint_name 
          AND cc.table_schema = tc.table_schema
        WHERE tc.table_schema = 'public' 
          AND tc.table_name = ${tableName}
        ORDER BY tc.constraint_type, tc.constraint_name
      `;

      const result = await (this.db as any).execute(query);
      return result.rows || result || [];
    } catch (error) {
      console.error(`خطأ في فحص محددات الجدول ${tableName}:`, error);
      return [];
    }
  }

  /**
   * فحص محددات المفاتيح الخارجية
   */
  async checkForeignKeys(): Promise<ConstraintInfo[]> {
    if (!this.isConnected()) {
      return [];
    }

    try {
      const query = sql`
        SELECT 
          tc.constraint_name,
          tc.table_name,
          tc.constraint_type,
          kcu.column_name,
          ccu.table_name AS referenced_table,
          ccu.column_name AS referenced_column,
          tc.is_deferrable,
          tc.initially_deferred
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
          ON tc.constraint_name = kcu.constraint_name 
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage ccu 
          ON ccu.constraint_name = tc.constraint_name 
          AND ccu.table_schema = tc.table_schema
        WHERE tc.table_schema = 'public' 
          AND tc.constraint_type = 'FOREIGN KEY'
        ORDER BY tc.table_name, tc.constraint_name
      `;

      const result = await (this.db as any).execute(query);
      return result.rows || result || [];
    } catch (error) {
      console.error('خطأ في فحص المفاتيح الخارجية:', error);
      return [];
    }
  }

  /**
   * فحص محددات التكرار (UNIQUE)
   */
  async checkUniqueConstraints(): Promise<ConstraintInfo[]> {
    if (!this.isConnected()) {
      return [];
    }

    try {
      const query = sql`
        SELECT 
          tc.constraint_name,
          tc.table_name,
          tc.constraint_type,
          kcu.column_name,
          tc.is_deferrable,
          tc.initially_deferred
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
          ON tc.constraint_name = kcu.constraint_name 
          AND tc.table_schema = kcu.table_schema
        WHERE tc.table_schema = 'public' 
          AND tc.constraint_type = 'UNIQUE'
        ORDER BY tc.table_name, tc.constraint_name
      `;

      const result = await (this.db as any).execute(query);
      return result.rows || result || [];
    } catch (error) {
      console.error('خطأ في فحص محددات التكرار:', error);
      return [];
    }
  }

  /**
   * فحص محددات التحقق (CHECK)
   */
  async checkCheckConstraints(): Promise<ConstraintInfo[]> {
    if (!this.isConnected()) {
      return [];
    }

    try {
      const query = sql`
        SELECT 
          tc.constraint_name,
          tc.table_name,
          tc.constraint_type,
          cc.check_clause AS definition,
          tc.is_deferrable,
          tc.initially_deferred
        FROM information_schema.table_constraints tc
        JOIN information_schema.check_constraints cc 
          ON cc.constraint_name = tc.constraint_name 
          AND cc.table_schema = tc.table_schema
        WHERE tc.table_schema = 'public' 
          AND tc.constraint_type = 'CHECK'
        ORDER BY tc.table_name, tc.constraint_name
      `;

      const result = await (this.db as any).execute(query);
      return result.rows || result || [];
    } catch (error) {
      console.error('خطأ في فحص محددات التحقق:', error);
      return [];
    }
  }

  /**
   * فحص سلامة البيانات في المحددات
   */
  async validateConstraints(): Promise<{
    isValid: boolean;
    violations: Array<{
      table: string;
      constraint: string;
      violationCount: number;
      message: string;
    }>;
  }> {
    if (!this.isConnected()) {
      return { isValid: true, violations: [] };
    }

    const violations: Array<{
      table: string;
      constraint: string;
      violationCount: number;
      message: string;
    }> = [];

    try {
      // فحص المفاتيح الخارجية المكسورة
      const foreignKeys = await this.checkForeignKeys();
      
      for (const fk of foreignKeys) {
        if (fk.tableName && fk.columnName && fk.referencedTable && fk.referencedColumn) {
          const violationQuery = sql`
            SELECT COUNT(*) as violation_count
            FROM ${sql.identifier(fk.tableName)} t1
            LEFT JOIN ${sql.identifier(fk.referencedTable)} t2 
              ON t1.${sql.identifier(fk.columnName)} = t2.${sql.identifier(fk.referencedColumn)}
            WHERE t1.${sql.identifier(fk.columnName)} IS NOT NULL 
              AND t2.${sql.identifier(fk.referencedColumn)} IS NULL
          `;

          const result = await (this.db as any).execute(violationQuery);
          const violationCount = parseInt(result.rows?.[0]?.violation_count || result?.[0]?.violation_count || '0');

          if (violationCount > 0) {
            violations.push({
              table: fk.tableName,
              constraint: fk.constraintName,
              violationCount,
              message: `مفتاح خارجي مكسور: ${fk.tableName}.${fk.columnName} → ${fk.referencedTable}.${fk.referencedColumn}`,
            });
          }
        }
      }

      return {
        isValid: violations.length === 0,
        violations,
      };
    } catch (error) {
      console.error('خطأ في فحص سلامة المحددات:', error);
      return {
        isValid: false,
        violations: [{
          table: 'unknown',
          constraint: 'unknown',
          violationCount: 0,
          message: `خطأ في فحص المحددات: ${error}`,
        }],
      };
    }
  }

  /**
   * إنشاء تقرير مفصل عن حالة قاعدة البيانات
   */
  async generateHealthReport(): Promise<{
    status: 'healthy' | 'warning' | 'error';
    summary: {
      totalTables: number;
      totalConstraints: number;
      foreignKeyViolations: number;
      missingIndexes: number;
    };
    recommendations: string[];
    details: DatabaseConstraintsReport;
  }> {
    try {
      const details = await this.checkAllConstraints();
      const validation = await this.validateConstraints();
      
      const recommendations: string[] = [];
      let status: 'healthy' | 'warning' | 'error' = 'healthy';

      // تحليل النتائج وتقديم التوصيات
      if (validation.violations.length > 0) {
        status = 'error';
        recommendations.push('يوجد انتهاكات في المفاتيح الخارجية تحتاج إلى إصلاح');
      }

      if (details.summary.totalIndexes < details.summary.totalTables * 2) {
        status = status === 'error' ? 'error' : 'warning';
        recommendations.push('يُنصح بإضافة المزيد من الفهارس لتحسين الأداء');
      }

      if (details.summary.checkConstraintCount === 0) {
        status = status === 'error' ? 'error' : 'warning';
        recommendations.push('لا توجد محددات تحقق للبيانات - يُنصح بإضافة بعضها');
      }

      return {
        status,
        summary: {
          totalTables: details.summary.totalTables,
          totalConstraints: details.summary.totalConstraints,
          foreignKeyViolations: validation.violations.length,
          missingIndexes: Math.max(0, details.summary.totalTables * 2 - details.summary.totalIndexes),
        },
        recommendations,
        details,
      };
    } catch (error) {
      console.error('خطأ في إنشاء تقرير الصحة:', error);
      return {
        status: 'error',
        summary: {
          totalTables: 0,
          totalConstraints: 0,
          foreignKeyViolations: 0,
          missingIndexes: 0,
        },
        recommendations: [`خطأ في إنشاء التقرير: ${error}`],
        details: {
          constraints: [],
          tables: [],
          indexes: [],
          foreignKeys: [],
          uniqueConstraints: [],
          checkConstraints: [],
          summary: {
            totalConstraints: 0,
            totalTables: 0,
            totalIndexes: 0,
            foreignKeyCount: 0,
            uniqueConstraintCount: 0,
            checkConstraintCount: 0,
          },
        },
      };
    }
  }
}

// تصدير مثيل الخدمة
export const databaseConstraintsService = new DatabaseConstraintsService();