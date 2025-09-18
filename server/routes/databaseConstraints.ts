import { Router } from 'express';
import { databaseConstraintsService } from '../services/databaseConstraintsService';

const router = Router();

/**
 * GET /api/database/constraints
 * فحص جميع محددات قاعدة البيانات
 */
router.get('/constraints', async (req, res) => {
  try {
    const report = await databaseConstraintsService.checkAllConstraints();
    res.json({
      success: true,
      data: report,
      message: 'تم فحص محددات قاعدة البيانات بنجاح',
    });
  } catch (error) {
    console.error('خطأ في فحص محددات قاعدة البيانات:', error);
    res.status(500).json({
      success: false,
      error: 'فشل في فحص محددات قاعدة البيانات',
      details: error instanceof Error ? error.message : 'خطأ غير معروف',
    });
  }
});

/**
 * GET /api/database/constraints/table/:tableName
 * فحص محددات جدول محدد
 */
router.get('/constraints/table/:tableName', async (req, res) => {
  try {
    const { tableName } = req.params;
    const constraints = await databaseConstraintsService.checkTableConstraints(tableName);
    
    res.json({
      success: true,
      data: {
        tableName,
        constraints,
      },
      message: `تم فحص محددات الجدول ${tableName} بنجاح`,
    });
  } catch (error) {
    console.error(`خطأ في فحص محددات الجدول ${req.params.tableName}:`, error);
    res.status(500).json({
      success: false,
      error: 'فشل في فحص محددات الجدول',
      details: error instanceof Error ? error.message : 'خطأ غير معروف',
    });
  }
});

/**
 * GET /api/database/constraints/foreign-keys
 * فحص المفاتيح الخارجية فقط
 */
router.get('/constraints/foreign-keys', async (req, res) => {
  try {
    const foreignKeys = await databaseConstraintsService.checkForeignKeys();
    
    res.json({
      success: true,
      data: foreignKeys,
      message: 'تم فحص المفاتيح الخارجية بنجاح',
    });
  } catch (error) {
    console.error('خطأ في فحص المفاتيح الخارجية:', error);
    res.status(500).json({
      success: false,
      error: 'فشل في فحص المفاتيح الخارجية',
      details: error instanceof Error ? error.message : 'خطأ غير معروف',
    });
  }
});

/**
 * GET /api/database/constraints/unique
 * فحص محددات التكرار (UNIQUE)
 */
router.get('/constraints/unique', async (req, res) => {
  try {
    const uniqueConstraints = await databaseConstraintsService.checkUniqueConstraints();
    
    res.json({
      success: true,
      data: uniqueConstraints,
      message: 'تم فحص محددات التكرار بنجاح',
    });
  } catch (error) {
    console.error('خطأ في فحص محددات التكرار:', error);
    res.status(500).json({
      success: false,
      error: 'فشل في فحص محددات التكرار',
      details: error instanceof Error ? error.message : 'خطأ غير معروف',
    });
  }
});

/**
 * GET /api/database/constraints/check
 * فحص محددات التحقق (CHECK)
 */
router.get('/constraints/check', async (req, res) => {
  try {
    const checkConstraints = await databaseConstraintsService.checkCheckConstraints();
    
    res.json({
      success: true,
      data: checkConstraints,
      message: 'تم فحص محددات التحقق بنجاح',
    });
  } catch (error) {
    console.error('خطأ في فحص محددات التحقق:', error);
    res.status(500).json({
      success: false,
      error: 'فشل في فحص محددات التحقق',
      details: error instanceof Error ? error.message : 'خطأ غير معروف',
    });
  }
});

/**
 * GET /api/database/constraints/validate
 * فحص سلامة البيانات في المحددات
 */
router.get('/constraints/validate', async (req, res) => {
  try {
    const validation = await databaseConstraintsService.validateConstraints();
    
    res.json({
      success: true,
      data: validation,
      message: validation.isValid 
        ? 'جميع المحددات سليمة' 
        : 'تم العثور على انتهاكات في المحددات',
    });
  } catch (error) {
    console.error('خطأ في فحص سلامة المحددات:', error);
    res.status(500).json({
      success: false,
      error: 'فشل في فحص سلامة المحددات',
      details: error instanceof Error ? error.message : 'خطأ غير معروف',
    });
  }
});

/**
 * GET /api/database/health
 * تقرير شامل عن صحة قاعدة البيانات
 */
router.get('/health', async (req, res) => {
  try {
    const healthReport = await databaseConstraintsService.generateHealthReport();
    
    res.json({
      success: true,
      data: healthReport,
      message: `حالة قاعدة البيانات: ${healthReport.status}`,
    });
  } catch (error) {
    console.error('خطأ في إنشاء تقرير الصحة:', error);
    res.status(500).json({
      success: false,
      error: 'فشل في إنشاء تقرير الصحة',
      details: error instanceof Error ? error.message : 'خطأ غير معروف',
    });
  }
});

/**
 * GET /api/database/tables
 * الحصول على معلومات الجداول والأعمدة
 */
router.get('/tables', async (req, res) => {
  try {
    const report = await databaseConstraintsService.checkAllConstraints();
    
    res.json({
      success: true,
      data: {
        tables: report.tables,
        summary: {
          totalTables: report.summary.totalTables,
        },
      },
      message: 'تم الحصول على معلومات الجداول بنجاح',
    });
  } catch (error) {
    console.error('خطأ في الحصول على معلومات الجداول:', error);
    res.status(500).json({
      success: false,
      error: 'فشل في الحصول على معلومات الجداول',
      details: error instanceof Error ? error.message : 'خطأ غير معروف',
    });
  }
});

/**
 * GET /api/database/indexes
 * الحصول على معلومات الفهارس
 */
router.get('/indexes', async (req, res) => {
  try {
    const report = await databaseConstraintsService.checkAllConstraints();
    
    res.json({
      success: true,
      data: {
        indexes: report.indexes,
        summary: {
          totalIndexes: report.summary.totalIndexes,
        },
      },
      message: 'تم الحصول على معلومات الفهارس بنجاح',
    });
  } catch (error) {
    console.error('خطأ في الحصول على معلومات الفهارس:', error);
    res.status(500).json({
      success: false,
      error: 'فشل في الحصول على معلومات الفهارس',
      details: error instanceof Error ? error.message : 'خطأ غير معروف',
    });
  }
});

/**
 * GET /api/database/summary
 * ملخص سريع عن حالة قاعدة البيانات
 */
router.get('/summary', async (req, res) => {
  try {
    const report = await databaseConstraintsService.checkAllConstraints();
    const validation = await databaseConstraintsService.validateConstraints();
    
    res.json({
      success: true,
      data: {
        summary: report.summary,
        isValid: validation.isValid,
        violationCount: validation.violations.length,
        status: validation.isValid ? 'healthy' : 'warning',
      },
      message: 'تم الحصول على ملخص قاعدة البيانات بنجاح',
    });
  } catch (error) {
    console.error('خطأ في الحصول على ملخص قاعدة البيانات:', error);
    res.status(500).json({
      success: false,
      error: 'فشل في الحصول على ملخص قاعدة البيانات',
      details: error instanceof Error ? error.message : 'خطأ غير معروف',
    });
  }
});

export default router;