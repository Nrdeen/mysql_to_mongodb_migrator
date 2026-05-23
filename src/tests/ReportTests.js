/**
 * اختبارات النقارير والعناصر غير القابلة للترحيل
 * Test: Reports, Unmappable Items, Recommendations
 */

const MigrationTestSuite = require('./MigrationTestSuite');

class ReportTests {
  constructor() {
    this.suite = new MigrationTestSuite();
  }

  // ============================================
  // اختبار اكتشاف Triggers غير القابلة للترحيل
  // ============================================
  async testUnmappableTriggers(sourceConnection, sourceDatabase, dbType = 'mysql') {
    try {
      let triggers;

      if (dbType.toLowerCase() === 'mysql') {
        [triggers] = await sourceConnection.query(
          `SELECT TRIGGER_NAME, EVENT_OBJECT_TABLE, TRIGGER_TIME, TRIGGER_EVENT, ACTION_STATEMENT
           FROM INFORMATION_SCHEMA.TRIGGERS
           WHERE TRIGGER_SCHEMA = ?`,
          [sourceDatabase]
        );
      } else if (dbType.toLowerCase() === 'mssql') {
        const result = await sourceConnection.request().query(
          `SELECT name, object_name(parent_id) as table_name FROM sys.triggers WHERE is_ms_shipped = 0`
        );
        triggers = result.recordset;
      }

      if (triggers && triggers.length > 0) {
        this.suite.recordPass(
          'Unmappable Triggers Detection',
          `Found ${triggers.length} triggers - require application layer implementation`,
          true
        );

        // تجميع الاقتراحات
        const recommendations = this.generateTriggerRecommendations(triggers);
        console.log('\n📋 Trigger Migration Recommendations:');
        recommendations.forEach(rec => console.log(`  - ${rec}`));

        return triggers;
      } else {
        this.suite.recordPass('Unmappable Triggers Detection', 'No triggers found');
        return [];
      }
    } catch (error) {
      this.suite.recordFail('Unmappable Triggers Detection', error.message);
      return [];
    }
  }

  // ============================================
  // اختبار اكتشاف Stored Procedures غير القابلة للترحيل
  // ============================================
  async testUnmappableStoredProcedures(sourceConnection, sourceDatabase, dbType = 'mysql') {
    try {
      let procedures;

      if (dbType.toLowerCase() === 'mysql') {
        [procedures] = await sourceConnection.query(
          `SELECT ROUTINE_NAME, ROUTINE_TYPE FROM INFORMATION_SCHEMA.ROUTINES
           WHERE ROUTINE_SCHEMA = ? AND ROUTINE_TYPE = 'PROCEDURE'`,
          [sourceDatabase]
        );
      } else if (dbType.toLowerCase() === 'mssql') {
        const result = await sourceConnection.request().query(
          `SELECT o.name, o.type FROM sys.objects o WHERE o.type = 'P' AND o.is_ms_shipped = 0`
        );
        procedures = result.recordset;
      }

      if (procedures && procedures.length > 0) {
        this.suite.recordPass(
          'Unmappable Stored Procedures Detection',
          `Found ${procedures.length} procedures - require refactoring`,
          true
        );

        const recommendations = this.generateStoredProcedureRecommendations(procedures);
        console.log('\n📋 Stored Procedure Migration Recommendations:');
        recommendations.forEach(rec => console.log(`  - ${rec}`));

        return procedures;
      } else {
        this.suite.recordPass('Unmappable Stored Procedures Detection', 'No stored procedures found');
        return [];
      }
    } catch (error) {
      this.suite.recordFail('Unmappable Stored Procedures Detection', error.message);
      return [];
    }
  }

  // ============================================
  // اختبار اكتشاف CHECK Constraints
  // ============================================
  async testUnmappableCheckConstraints(sourceConnection, sourceDatabase, tableName, dbType = 'mysql') {
    try {
      let constraints;

      if (dbType.toLowerCase() === 'mysql') {
        [constraints] = await sourceConnection.query(
          `SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
           WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND CONSTRAINT_TYPE = 'CHECK'`,
          [sourceDatabase, tableName]
        );
      } else if (dbType.toLowerCase() === 'mssql') {
        const result = await sourceConnection.request().query(
          `SELECT name FROM sys.check_constraints WHERE parent_object_id = OBJECT_ID('${tableName}')`
        );
        constraints = result.recordset;
      }

      if (constraints && constraints.length > 0) {
        this.suite.recordPass(
          `Unmappable CHECK Constraints (${tableName})`,
          `Found ${constraints.length} CHECK constraints - require application logic`,
          true
        );

        const recommendations = this.generateCheckConstraintRecommendations();
        console.log('\n📋 CHECK Constraint Recommendations:');
        recommendations.forEach(rec => console.log(`  - ${rec}`));

        return constraints;
      } else {
        this.suite.recordPass(`Unmappable CHECK Constraints (${tableName})`, 'No CHECK constraints found');
        return [];
      }
    } catch (error) {
      this.suite.recordFail('Unmappable CHECK Constraints', error.message);
      return [];
    }
  }

  // ============================================
  // اختبار توليد التقرير الشامل
  // ============================================
  async testReportGeneration(sourceConnection, mongoDb, sourceDatabase, dbType = 'mysql') {
    try {
      const report = {
        metadata: {
          timestamp: new Date().toISOString(),
          sourceDatabase: sourceDatabase,
          sourceType: dbType.toUpperCase(),
          targetType: 'MongoDB'
        },
        schema: {
          tables: [],
          unmappableItems: {
            triggers: [],
            procedures: [],
            checkConstraints: [],
            functions: []
          }
        },
        migration: {
          status: 'completed',
          summary: {}
        },
        recommendations: []
      };

      // جمع بيانات الـ schema
      let tables;
      if (dbType.toLowerCase() === 'mysql') {
        [tables] = await sourceConnection.query(
          'SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ?',
          [sourceDatabase]
        );
      }

      report.schema.tables = tables;

      // جمع العناصر غير القابلة للترحيل
      const triggers = await this.testUnmappableTriggers(sourceConnection, sourceDatabase, dbType);
      const procedures = await this.testUnmappableStoredProcedures(sourceConnection, sourceDatabase, dbType);

      report.schema.unmappableItems.triggers = triggers || [];
      report.schema.unmappableItems.procedures = procedures || [];

      // إضافة توصيات عامة
      report.recommendations = this.generateGeneralRecommendations(
        tables?.length || 0,
        triggers?.length || 0,
        procedures?.length || 0
      );

      this.suite.recordPass(
        'Report Generation',
        `Generated comprehensive report with ${report.recommendations.length} recommendations`
      );

      return report;
    } catch (error) {
      this.suite.recordFail('Report Generation', error.message);
      return null;
    }
  }

  // ============================================
  // دوال مساعدة للتوصيات
  // ============================================

  generateTriggerRecommendations(triggers) {
    return [
      'Option 1: يمكن استرجاع منطق Trigger في application layer (Node.js/Python)',
      'Option 2: تحويل Trigger إلى middleware في Express.js',
      'Option 3: استخدام MongoDB Change Streams كبديل لـ Triggers',
      'Option 4: استخدام Mongoose hooks (pre/post hooks) للبيانات الجديدة',
      `${triggers.length} trigger(s) معثور عليها - توثيق منطق كل واحد منها مطلوب`
    ];
  }

  generateStoredProcedureRecommendations(procedures) {
    return [
      'Option 1: تحويل Procedure logic إلى functions في Node.js/Python',
      'Option 2: إنشاء API endpoints جديدة لـ functionality المطلوبة',
      'Option 3: استخدام aggregation pipelines في MongoDB للاستعلامات المعقدة',
      'Option 4: تقسيم Procedure logic إلى microservices مختلفة',
      `${procedures.length} procedure(s) معثورة - إعادة بناء في application layer مطلوبة`
    ];
  }

  generateCheckConstraintRecommendations() {
    return [
      'Option 1: إضافة validation في application layer (Joi/Yup/Mongoose)',
      'Option 2: استخدام Mongoose Schema validation',
      'Option 3: إنشاء custom middleware للتحقق من القيود',
      'Option 4: استخدام MongoDB schema validation (JSON Schema)',
      'أمثلة: age >= 18, status IN (active, inactive), balance > 0'
    ];
  }

  generateGeneralRecommendations(tableCount, triggerCount, procedureCount) {
    const recommendations = [
      `✓ تم اكتشاف ${tableCount} جدول - جميعها قابلة للترحيل`,
      `⚠️ ${triggerCount} trigger(s) غير قابلة للترحيل المباشر - تحتاج معالجة خاصة`,
      `⚠️ ${procedureCount} stored procedure(s) غير قابلة للترحيل - تحتاج إعادة بناء`,
      '',
      '🎯 خطة التنفيذ الموصى بها:',
      '1. نقل البيانات كاملة إلى MongoDB',
      '2. تحديد منطق Triggers و Procedures',
      '3. إعادة بناء في application layer',
      '4. تطبيق Validation والـ Constraints برمجياً',
      '5. اختبار شامل للبيانات والعمليات',
      '6. تحديث التوثيق والـ API documentation'
    ];
    return recommendations;
  }

  // ============================================
  // تشغيل جميع اختبارات النقارير
  // ============================================
  async runAllTests(sourceConnection, mongoDb, sourceDatabase, tableName, dbType = 'mysql') {
    console.log('\n📊 Starting Report & Unmappable Items Tests...\n');

    await this.testUnmappableTriggers(sourceConnection, sourceDatabase, dbType);
    await this.testUnmappableStoredProcedures(sourceConnection, sourceDatabase, dbType);
    if (tableName) {
      await this.testUnmappableCheckConstraints(sourceConnection, sourceDatabase, tableName, dbType);
    }
    const report = await this.testReportGeneration(sourceConnection, mongoDb, sourceDatabase, dbType);

    return {
      testResults: this.suite.printReport(),
      generatedReport: report
    };
  }
}

module.exports = ReportTests;
