import { databaseConstraintsService } from '../services/databaseConstraintsService';

/**
 * اختبار نظام فحص محددات قاعدة البيانات
 */
async function testDatabaseConstraintsSystem() {
  console.log('🧪 بدء اختبار نظام فحص محددات قاعدة البيانات...\n');

  try {
    // اختبار 1: فحص جميع المحددات
    console.log('📋 اختبار 1: فحص جميع المحددات');
    const constraintsReport = await databaseConstraintsService.checkAllConstraints();
    console.log(`✅ تم العثور على ${constraintsReport.summary.totalConstraints} محدد`);
    console.log(`✅ تم العثور على ${constraintsReport.summary.totalTables} جدول`);
    console.log(`✅ تم العثور على ${constraintsReport.summary.totalIndexes} فهرس`);
    console.log(`✅ المفاتيح الخارجية: ${constraintsReport.summary.foreignKeyCount}`);
    console.log(`✅ محددات التكرار: ${constraintsReport.summary.uniqueConstraintCount}`);
    console.log(`✅ محددات التحقق: ${constraintsReport.summary.checkConstraintCount}\n`);

    // اختبار 2: فحص المفاتيح الخارجية
    console.log('🔗 اختبار 2: فحص المفاتيح الخارجية');
    const foreignKeys = await databaseConstraintsService.checkForeignKeys();
    console.log(`✅ تم العثور على ${foreignKeys.length} مفتاح خارجي`);
    
    if (foreignKeys.length > 0) {
      console.log('📝 أمثلة على المفاتيح الخارجية:');
      foreignKeys.slice(0, 3).forEach((fk, index) => {
        console.log(`   ${index + 1}. ${fk.tableName}.${fk.columnName} → ${fk.referencedTable}.${fk.referencedColumn}`);
      });
    }
    console.log('');

    // اختبار 3: فحص محددات التكرار
    console.log('🔒 اختبار 3: فحص محددات التكرار');
    const uniqueConstraints = await databaseConstraintsService.checkUniqueConstraints();
    console.log(`✅ تم العثور على ${uniqueConstraints.length} محدد تكرار`);
    
    if (uniqueConstraints.length > 0) {
      console.log('📝 أمثلة على محددات التكرار:');
      uniqueConstraints.slice(0, 3).forEach((uc, index) => {
        console.log(`   ${index + 1}. ${uc.tableName}.${uc.columnName}`);
      });
    }
    console.log('');

    // اختبار 4: فحص محددات التحقق
    console.log('✅ اختبار 4: فحص محددات التحقق');
    const checkConstraints = await databaseConstraintsService.checkCheckConstraints();
    console.log(`✅ تم العثور على ${checkConstraints.length} محدد تحقق`);
    
    if (checkConstraints.length > 0) {
      console.log('📝 أمثلة على محددات التحقق:');
      checkConstraints.slice(0, 3).forEach((cc, index) => {
        console.log(`   ${index + 1}. ${cc.tableName}: ${cc.definition}`);
      });
    }
    console.log('');

    // اختبار 5: فحص سلامة البيانات
    console.log('🛡️ اختبار 5: فحص سلامة البيانات');
    const validation = await databaseConstraintsService.validateConstraints();
    console.log(`✅ حالة المحددات: ${validation.isValid ? 'سليمة' : 'يوجد انتهاكات'}`);
    
    if (!validation.isValid) {
      console.log('⚠️ انتهاكات تم العثور عليها:');
      validation.violations.forEach((violation, index) => {
        console.log(`   ${index + 1}. ${violation.message} (${violation.violationCount} انتهاك)`);
      });
    }
    console.log('');

    // اختبار 6: إنشاء تقرير الصحة
    console.log('🏥 اختبار 6: إنشاء تقرير الصحة');
    const healthReport = await databaseConstraintsService.generateHealthReport();
    console.log(`✅ حالة قاعدة البيانات: ${healthReport.status}`);
    console.log(`✅ إجمالي الجداول: ${healthReport.summary.totalTables}`);
    console.log(`✅ إجمالي المحددات: ${healthReport.summary.totalConstraints}`);
    console.log(`✅ انتهاكات المفاتيح الخارجية: ${healthReport.summary.foreignKeyViolations}`);
    console.log(`✅ فهارس مفقودة: ${healthReport.summary.missingIndexes}`);
    
    if (healthReport.recommendations.length > 0) {
      console.log('💡 التوصيات:');
      healthReport.recommendations.forEach((recommendation, index) => {
        console.log(`   ${index + 1}. ${recommendation}`);
      });
    }
    console.log('');

    // اختبار 7: فحص جدول محدد (إذا كان هناك جداول)
    if (constraintsReport.summary.totalTables > 0) {
      console.log('📊 اختبار 7: فحص جدول محدد');
      
      // الحصول على اسم أول جدول
      const firstTable = constraintsReport.tables[0]?.tableName;
      if (firstTable) {
        const tableConstraints = await databaseConstraintsService.checkTableConstraints(firstTable);
        console.log(`✅ محددات الجدول ${firstTable}: ${tableConstraints.length} محدد`);
        
        if (tableConstraints.length > 0) {
          console.log('📝 أنواع المحددات:');
          const constraintTypes = tableConstraints.reduce((acc, constraint) => {
            acc[constraint.constraintType] = (acc[constraint.constraintType] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);
          
          Object.entries(constraintTypes).forEach(([type, count]) => {
            console.log(`   - ${type}: ${count}`);
          });
        }
      }
    }

    console.log('\n🎉 تم إكمال جميع الاختبارات بنجاح!');
    console.log('📈 ملخص النتائج:');
    console.log(`   - إجمالي الجداول: ${constraintsReport.summary.totalTables}`);
    console.log(`   - إجمالي المحددات: ${constraintsReport.summary.totalConstraints}`);
    console.log(`   - إجمالي الفهارس: ${constraintsReport.summary.totalIndexes}`);
    console.log(`   - حالة الصحة: ${healthReport.status}`);
    console.log(`   - سلامة البيانات: ${validation.isValid ? 'سليمة' : 'يوجد مشاكل'}`);

  } catch (error) {
    console.error('❌ فشل في اختبار نظام فحص محددات قاعدة البيانات:', error);
    console.error('🔍 تفاصيل الخطأ:', error instanceof Error ? error.message : 'خطأ غير معروف');
  }
}

/**
 * اختبار API endpoints
 */
async function testAPIEndpoints() {
  console.log('\n🌐 اختبار API endpoints...\n');

  const endpoints = [
    '/api/database/constraints',
    '/api/database/constraints/foreign-keys',
    '/api/database/constraints/unique',
    '/api/database/constraints/check',
    '/api/database/constraints/validate',
    '/api/database/health',
    '/api/database/tables',
    '/api/database/indexes',
    '/api/database/summary',
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`🔗 اختبار ${endpoint}...`);
      const response = await fetch(`http://localhost:3000${endpoint}`);
      const data = await response.json();
      
      if (data.success) {
        console.log(`✅ ${endpoint}: نجح`);
        if (data.data && typeof data.data === 'object') {
          const keys = Object.keys(data.data);
          console.log(`   📊 البيانات المتاحة: ${keys.join(', ')}`);
        }
      } else {
        console.log(`❌ ${endpoint}: فشل - ${data.error}`);
      }
    } catch (error) {
      console.log(`❌ ${endpoint}: خطأ في الاتصال - ${error}`);
    }
  }
}

// تشغيل الاختبارات
if (require.main === module) {
  testDatabaseConstraintsSystem()
    .then(() => testAPIEndpoints())
    .catch(console.error);
}

export { testDatabaseConstraintsSystem, testAPIEndpoints };