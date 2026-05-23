const express = require('express');
const path = require('node:path');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');

const config = require('./config/env');
const { initDatabase, closeDatabase, getDatabaseInfo } = require('./config/database');
const openapiSpec = require('./docs/openapi');
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const postRoutes = require('./routes/post.routes');
const demoRoutes = require('./routes/demo.routes');
const envelopeRoutes = require('./routes/envelope.routes');
const migrationRoutes = require('./routes/migration.routes');
const dbSelector = require('./middleware/dbSelector');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./utils/logger');

const app = express();

// Simple UI for API testing
app.use('/ui', express.static(path.join(__dirname, '..', 'public')));
app.get('/', (req, res) => res.redirect('/ui'));

// Security middleware
app.use(helmet());
app.use(cors());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Body parser
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// OpenAPI / Swagger (documentation)
app.get('/openapi.json', (req, res) => {
  res.json(openapiSpec);
});
app.use(
  '/api-docs',
  // Helmet's default CSP can block Swagger UI (inline config scripts).
  // Override CSP for docs only.
  (req, res, next) => {
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' 'unsafe-eval';"
    );
    next();
  },
  swaggerUi.serve,
  swaggerUi.setup(openapiSpec, {
    customSiteTitle: 'API Docs',
    explorer: true,
    swaggerOptions: {
      persistAuthorization: true
    }
  })
);

// Health check
app.get('/health', (req, res) => {
  const info = getDatabaseInfo();
  res.json({
    status: 'ok',
    database: info.defaultType,
    enabledDatabases: info.enabledTypes,
    timestamp: new Date().toISOString()
  });
});

// Routes
// Enables per-request DB selection for /api/* when DB_TYPE=both.
app.use('/api', dbSelector);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/demo', demoRoutes);
app.use('/api/envelopes', envelopeRoutes);
app.use('/api/migration', migrationRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handler (must be last)
app.use(errorHandler);

let server = null;
let shuttingDown = false;

const shutdown = async (signal) => {
  if (shuttingDown) return;
  shuttingDown = true;

  try {
    logger.info(`${signal} signal received: shutting down`);

    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }

    await closeDatabase();
    process.exit(0);
  } catch (err) {
    logger.error('Shutdown error:', err);
    process.exit(1);
  }
};

const startServer = async () => {
  try {
    await initDatabase();

    server = app.listen(config.port, () => {
      logger.info(`Server running on port ${config.port}`);
      logger.info(`Environment: ${config.env}`);
      logger.info(`Database: ${String(config.db.type).toUpperCase()}`);
    });

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

module.exports = app;

