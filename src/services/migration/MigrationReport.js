/**
 * Migration Report Generator
 * Generates comprehensive technical report of the migration process
 */

const logger = require('../../utils/logger');
const fs = require('fs').promises;
const path = require('path');

class MigrationReport {
  constructor(config) {
    this.config = config;
    this.report = {
      timestamp: new Date().toISOString(),
      summary: {},
      schemaAnalysis: {},
      migrationPlan: {},
      results: {},
      recommendations: [],
      unmappableItems: {}
    };
  }

  /**
   * Generate comprehensive report
   */
  async generate() {
    try {
      logger.info('Generating migration report...');

      this.generateSummary();
      this.generateSchemaAnalysis();
      this.generateMigrationPlan();
      this.generateResults();
      this.generateRecommendations();
      this.generateUnmappableItems();

      logger.info('Migration report generated successfully');
      return this.report;
    } catch (error) {
      logger.error('Failed to generate migration report:', error);
      throw error;
    }
  }

  /**
   * Generate executive summary
   */
  generateSummary() {
    const { schema, migrationPlan, results } = this.config;

    this.report.summary = {
      sourceDatabase: this.config.sourceDatabase,
      targetDatabase: 'MongoDB',
      migrationStatus: results.failed.length === 0 ? 'SUCCESS' : 'COMPLETED_WITH_ERRORS',
      startTime: results.startTime,
      endTime: results.endTime,
      durationSeconds: results.totalTime,
      statistics: {
        totalTables: migrationPlan.metrics.totalTables,
        totalColumns: migrationPlan.metrics.totalColumns,
        totalIndexes: migrationPlan.metrics.totalIndexes,
        totalRows: migrationPlan.metrics.totalRows,
        totalMongoDBCollections: migrationPlan.metrics.totalTables
      },
      successfulMigrations: results.success.length,
      failedMigrations: results.failed.length,
      skippedMigrations: results.skipped.length,
      unmappableObjectsCount: {
        triggers: migrationPlan.metrics.unmappableTriggers,
        procedures: migrationPlan.metrics.unmappableProcedures,
        functions: migrationPlan.metrics.unmappableFunctions,
        checkConstraints: migrationPlan.metrics.unmappableConstraints
      }
    };
  }

  /**
   * Generate schema analysis section
   */
  generateSchemaAnalysis() {
    const { schema } = this.config;

    this.report.schemaAnalysis = {
      tables: schema.tables.length,
      views: schema.views.length,
      dataTypes: this.aggregateDataTypes(schema.tables),
      relationships: schema.relationships.length,
      constraints: schema.constraints.length,
      indexes: schema.tables.reduce((sum, t) => sum + t.indexes.length, 0),
      totalDataSize: schema.tables.reduce((sum, t) => sum + t.statistics.sizeInBytes, 0),
      tableDetails: schema.tables.map(t => ({
        name: t.name,
        columns: t.columns.length,
        rows: t.statistics.rowCount,
        dataSize: `${(t.statistics.sizeInBytes / 1024 / 1024).toFixed(2)} MB`,
        primaryKey: t.primaryKey ? t.primaryKey.columns.join(', ') : 'None',
        indexes: t.indexes.length
      }))
    };
  }

  /**
   * Aggregate data types used in schema
   */
  aggregateDataTypes(tables) {
    const types = {};

    tables.forEach(table => {
      table.columns.forEach(col => {
        types[col.type] = (types[col.type] || 0) + 1;
      });
    });

    return types;
  }

  /**
   * Generate migration plan details
   */
  generateMigrationPlan() {
    const { migrationPlan } = this.config;

    this.report.migrationPlan = {
      collections: migrationPlan.collections.map(c => ({
        sourceTable: c.sourceTable,
        targetCollection: c.targetCollection,
        fields: c.fields.length,
        indexes: c.indexes.length,
        estimatedDocuments: c.rowCount,
        schema: {
          fields: c.fields.map(f => ({
            sourceColumn: f.sourceColumn,
            targetField: f.targetField,
            type: f.type,
            indexed: f.indexed,
            unique: f.unique,
            nullable: f.nullable
          })),
          indexes: c.indexes.map(i => ({
            name: i.name,
            fields: i.fields,
            unique: i.unique
          }))
        }
      })),
      relationalMapping: this.generateRelationalMapping(),
      indexingStrategy: this.generateIndexingStrategy()
    };
  }

  /**
   * Generate relational mapping
   */
  generateRelationalMapping() {
    const { schema } = this.config;

    return schema.relationships.map(rel => ({
      relationship: `${rel.from} -> ${rel.to}`,
      type: rel.type,
      foreignKeys: rel.foreignKeys,
      migrationStrategy: rel.migrationStrategy,
      recommendations: this.getRelationshipRecommendations(rel)
    }));
  }

  /**
   * Get recommendations for relationship handling
   */
  getRelationshipRecommendations(rel) {
    if (rel.type === 'ONE_TO_MANY') {
      return [
        'Consider embedding the referenced data if cardinality is low (1-100)',
        'Use references (_id) if cardinality is high or data changes frequently',
        'Consider a hybrid approach for denormalization when query performance is critical'
      ];
    }
    return ['Assess cardinality and query patterns before deciding embedding vs referencing'];
  }

  /**
   * Generate indexing strategy
   */
  generateIndexingStrategy() {
    const { migrationPlan } = this.config;
    const totalIndexes = migrationPlan.collections.reduce(
      (sum, c) => sum + c.indexes.length,
      0
    );

    return {
      totalIndexes: totalIndexes,
      recommendations: [
        'Monitor index usage and remove unused indexes',
        'Consider compound indexes for multi-field queries',
        'Use sparse indexes for fields with null values',
        'Regular review of query patterns to optimize indexes'
      ],
      autoCreatedIndexes: migrationPlan.collections.map(c => ({
        collection: c.targetCollection,
        indexes: c.indexes.map(i => ({
          name: i.name,
          fields: i.fields,
          rationale: `Mapped from ${c.sourceTable} indexes`
        }))
      }))
    };
  }

  /**
   * Generate migration results
   */
  generateResults() {
    const { results } = this.config;

    this.report.results = {
      summary: {
        successful: results.success.length,
        failed: results.failed.length,
        skipped: results.skipped.length
      },
      successfulItems: results.success.map(item => ({
        ...item,
        timestamp: new Date().toISOString()
      })),
      failedItems: results.failed.map(item => ({
        ...item,
        timestamp: new Date().toISOString()
      })),
      skippedItems: results.skipped.map(item => ({
        ...item,
        timestamp: new Date().toISOString()
      }))
    };
  }

  /**
   * Generate recommendations
   */
  generateRecommendations() {
    const { migrationPlan } = this.config;

    this.report.recommendations = [
      {
        category: 'Data Validation',
        items: [
          'Verify data integrity after migration',
          'Compare row counts between source and target',
          'Run data quality validation tests',
          'Check for NULL handling consistency'
        ]
      },
      {
        category: 'Application Updates',
        items: [
          'Update application code to use MongoDB drivers / ODM (e.g., Mongoose)',
          'Implement proper error handling for MongoDB operations',
          'Update database connection strings',
          'Test all database operations thoroughly'
        ]
      },
      {
        category: 'Unmappable Features',
        items: [
          `${migrationPlan.metrics.unmappableTriggers} trigger(s) need application logic`,
          `${migrationPlan.metrics.unmappableProcedures} stored procedure(s) need rewriting`,
          `${migrationPlan.metrics.unmappableFunctions} function(s) need rewriting`,
          `${migrationPlan.metrics.unmappableConstraints} CHECK constraint(s) need application validation`
        ]
      },
      {
        category: 'Performance Optimization',
        items: [
          'Review and optimize MongoDB queries',
          'Consider document structure for common queries',
          'Implement appropriate indexing based on query patterns',
          'Use aggregation pipeline for complex queries instead of application logic'
        ]
      },
      {
        category: 'Monitoring and Maintenance',
        items: [
          'Set up monitoring for MongoDB cluster',
          'Implement logging for all database operations',
          'Schedule regular backups',
          'Monitor connection pool usage',
          'Review slow query logs regularly'
        ]
      }
    ];
  }

  /**
   * Generate unmappable items section
   */
  generateUnmappableItems() {
    const { migrationPlan } = this.config;

    this.report.unmappableItems = {
      totalUnmappable: migrationPlan.metrics.unmappableTriggers +
        migrationPlan.metrics.unmappableProcedures +
        migrationPlan.metrics.unmappableFunctions +
        migrationPlan.metrics.unmappableConstraints,
      items: {
        triggers: migrationPlan.unmappableItems.triggers.map(t => ({
          name: t.name,
          table: t.table,
          event: t.event,
          reason: 'SQL Triggers cannot be directly migrated to MongoDB',
          alternativeApproaches: [
            'Implement logic in application code (before/after operations)',
            'Use MongoDB Change Streams to react to data changes',
            'Deploy application-level validation and triggers',
            'Use MongoDB transactions for multi-document atomicity'
          ]
        })),
        procedures: migrationPlan.unmappableItems.procedures.map(p => ({
          name: p.name,
          reason: 'Stored procedures are specific to SQL databases',
          alternativeApproaches: [
            'Rewrite as Node.js functions or application methods',
            'Use MongoDB aggregation pipeline for complex queries',
            'Implement business logic in application layer',
            'Create helper functions for common operations'
          ]
        })),
        functions: migrationPlan.unmappableItems.functions.map(f => ({
          name: f.name,
          reason: 'SQL functions need to be migrated to application code',
          alternativeApproaches: [
            'Create JavaScript functions in the application',
            'Use MongoDB aggregation operators ($substr, $toUpper, etc.)',
            'Implement as helper utilities',
            'Consider computed fields or materialized views'
          ]
        })),
        checkConstraints: migrationPlan.unmappableItems.checkConstraints.map(c => ({
          name: c.name,
          table: c.table,
          reason: 'CHECK constraints must be enforced in application',
          alternativeApproaches: [
            'Implement validation in application layer',
            'Use MongoDB JSON Schema validators',
            'Create custom validation functions',
            'Add data validation middleware'
          ]
        }))
      }
    };
  }

  /**
   * Export report to JSON file
   */
  async exportToJSON(outputPath) {
    try {
      const filePath = path.join(outputPath, `migration-report-${Date.now()}.json`);
      await fs.writeFile(filePath, JSON.stringify(this.report, null, 2), 'utf-8');
      logger.info(`Report exported to ${filePath}`);
      return filePath;
    } catch (error) {
      logger.error('Failed to export report:', error);
      throw error;
    }
  }

  /**
   * Export report to HTML file
   */
  async exportToHTML(outputPath) {
    try {
      const html = this.generateHtmlReport();
      const filePath = path.join(outputPath, `migration-report-${Date.now()}.html`);
      await fs.writeFile(filePath, html, 'utf-8');
      logger.info(`HTML report exported to ${filePath}`);
      return filePath;
    } catch (error) {
      logger.error('Failed to export HTML report:', error);
      throw error;
    }
  }

  /**
   * Generate HTML version of report
   */
  generateHtmlReport() {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Migration Report - ${this.config.sourceDatabase} to MongoDB</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; }
          h1 { color: #333; }
          h2 { color: #666; border-bottom: 2px solid #ddd; padding-bottom: 10px; }
          table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
          th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
          th { background-color: #f5f5f5; }
          .success { color: green; }
          .error { color: red; }
          .warning { color: orange; }
          .section { margin-bottom: 40px; }
        </style>
      </head>
      <body>
        <h1>Database Migration Report</h1>
        <p><strong>Generated:</strong> ${this.report.timestamp}</p>
        
        <div class="section">
          <h2>Executive Summary</h2>
          <p><strong>Source Database:</strong> ${this.report.summary.sourceDatabase}</p>
          <p><strong>Target Database:</strong> ${this.report.summary.targetDatabase}</p>
          <p><strong>Status:</strong> <span class="${this.report.summary.migrationStatus === 'SUCCESS' ? 'success' : 'warning'}">${this.report.summary.migrationStatus}</span></p>
          <p><strong>Duration:</strong> ${this.report.summary.durationSeconds}s</p>
          <p><strong>Tables Migrated:</strong> ${this.report.summary.statistics.totalTables}</p>
          <p><strong>Total Rows:</strong> ${this.report.summary.statistics.totalRows}</p>
          <p><strong>Successful Operations:</strong> <span class="success">${this.report.summary.successfulMigrations}</span></p>
          <p><strong>Failed Operations:</strong> <span class="${this.report.summary.failedMigrations > 0 ? 'error' : 'success'}">${this.report.summary.failedMigrations}</span></p>
        </div>

        <div class="section">
          <h2>Schema Analysis</h2>
          <table>
            <tr>
              <th>Metric</th>
              <th>Count</th>
            </tr>
            <tr>
              <td>Tables</td>
              <td>${this.report.schemaAnalysis.tables}</td>
            </tr>
            <tr>
              <td>Views</td>
              <td>${this.report.schemaAnalysis.views}</td>
            </tr>
            <tr>
              <td>Relationships</td>
              <td>${this.report.schemaAnalysis.relationships}</td>
            </tr>
            <tr>
              <td>Indexes</td>
              <td>${this.report.schemaAnalysis.indexes}</td>
            </tr>
          </table>
        </div>

        <div class="section">
          <h2>Unmappable Items</h2>
          <p><strong>Total Unmappable Objects:</strong> <span class="warning">${this.report.unmappableItems.totalUnmappable}</span></p>
          <p>See detailed report for alternatives and migration strategies.</p>
        </div>

        <div class="section">
          <h2>Recommendations</h2>
          ${this.report.recommendations.map(rec => `
            <h3>${rec.category}</h3>
            <ul>
              ${rec.items.map(item => `<li>${item}</li>`).join('')}
            </ul>
          `).join('')}
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Get report as object
   */
  getReport() {
    return this.report;
  }
}

module.exports = MigrationReport;
