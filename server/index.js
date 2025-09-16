const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

// Import routes
const documentRoutes = require('./routes/documents');
const validationRoutes = require('./routes/validation');
const analyticsRoutes = require('./routes/analytics');
const competitiveRoutes = require('./routes/competitive');
const userRoutes = require('./routes/users');
const projectRoutes = require('./routes/projects');

// Import middleware
const authMiddleware = require('./middleware/auth');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));

// Compression and parsing
app.use(compression());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API routes
app.use('/api/documents', authMiddleware, documentRoutes);
app.use('/api/validation', authMiddleware, validationRoutes);
app.use('/api/analytics', authMiddleware, analyticsRoutes);
app.use('/api/competitive', authMiddleware, competitiveRoutes);
app.use('/api/users', userRoutes);
app.use('/api/projects', authMiddleware, projectRoutes);

// Error handling
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.originalUrl 
  });
});

// Import database configuration
const db = require('./config/database');

// Initialize database and start server
const startServer = async () => {
  try {
    // Test database connection
    const dbConnected = await db.testConnection();
    if (!dbConnected) {
      logger.error('Failed to connect to database. Server will not start.');
      process.exit(1);
    }

    // Initialize database tables
    const dbInitialized = await db.initializeDatabase();
    if (!dbInitialized) {
      logger.error('Failed to initialize database. Server will not start.');
      process.exit(1);
    }

    // Start server
    app.listen(PORT, () => {
      logger.info(`PRD Validation Server running on port ${PORT}`);
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📊 Database connected and initialized`);
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await db.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await db.close();
  process.exit(0);
});

// Start the server
startServer();

module.exports = app;
