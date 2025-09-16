const { Pool } = require('pg');
const logger = require('../utils/logger');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'prd_validation',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
};

// Create connection pool
const pool = new Pool(dbConfig);

// Handle pool errors
pool.on('error', (err) => {
  logger.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Test database connection
const testConnection = async () => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    logger.info('Database connected successfully:', result.rows[0]);
    client.release();
    return true;
  } catch (error) {
    logger.error('Database connection failed:', error);
    return false;
  }
};

// Initialize database tables
const initializeDatabase = async () => {
  try {
    const client = await pool.connect();
    
    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        company VARCHAR(255),
        role VARCHAR(50) DEFAULT 'pm',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP
      )
    `);

    // Create projects table
    await client.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        project_id VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        status VARCHAR(50) DEFAULT 'draft',
        tags TEXT[],
        owner_id VARCHAR(255) NOT NULL,
        visibility VARCHAR(50) DEFAULT 'private',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (owner_id) REFERENCES users(user_id)
      )
    `);

    // Create project_members table
    await client.query(`
      CREATE TABLE IF NOT EXISTS project_members (
        id SERIAL PRIMARY KEY,
        project_id VARCHAR(255) NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'viewer',
        added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        added_by VARCHAR(255) NOT NULL,
        FOREIGN KEY (project_id) REFERENCES projects(project_id),
        FOREIGN KEY (user_id) REFERENCES users(user_id),
        UNIQUE(project_id, user_id)
      )
    `);

    // Create prd_documents table
    await client.query(`
      CREATE TABLE IF NOT EXISTS prd_documents (
        id SERIAL PRIMARY KEY,
        document_id VARCHAR(255) UNIQUE NOT NULL,
        project_id VARCHAR(255),
        user_id VARCHAR(255) NOT NULL,
        filename VARCHAR(255) NOT NULL,
        original_filename VARCHAR(255) NOT NULL,
        file_type VARCHAR(50) NOT NULL,
        file_size BIGINT NOT NULL,
        content TEXT,
        structured_data JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(project_id),
        FOREIGN KEY (user_id) REFERENCES users(user_id)
      )
    `);

    // Create validation_results table
    await client.query(`
      CREATE TABLE IF NOT EXISTS validation_results (
        id SERIAL PRIMARY KEY,
        validation_id VARCHAR(255) UNIQUE NOT NULL,
        document_id VARCHAR(255) NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        overall_score INTEGER NOT NULL,
        completeness_score INTEGER NOT NULL,
        clarity_score INTEGER NOT NULL,
        market_fit_score INTEGER NOT NULL,
        competitive_score INTEGER NOT NULL,
        section_analysis JSONB NOT NULL,
        recommendations TEXT[],
        strengths TEXT[],
        areas_for_improvement TEXT[],
        executive_summary TEXT,
        analysis_metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (document_id) REFERENCES prd_documents(document_id),
        FOREIGN KEY (user_id) REFERENCES users(user_id)
      )
    `);

    // Create competitive_intelligence table
    await client.query(`
      CREATE TABLE IF NOT EXISTS competitive_intelligence (
        id SERIAL PRIMARY KEY,
        intelligence_id VARCHAR(255) UNIQUE NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        project_id VARCHAR(255),
        market_keywords TEXT[],
        market_size_data JSONB,
        competitor_data JSONB,
        industry_trends JSONB,
        funding_data JSONB,
        market_positioning JSONB,
        competitive_score INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(user_id),
        FOREIGN KEY (project_id) REFERENCES projects(project_id)
      )
    `);

    // Create analytics_events table
    await client.query(`
      CREATE TABLE IF NOT EXISTS analytics_events (
        id SERIAL PRIMARY KEY,
        event_id VARCHAR(255) UNIQUE NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        project_id VARCHAR(255),
        event_type VARCHAR(100) NOT NULL,
        event_data JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(user_id),
        FOREIGN KEY (project_id) REFERENCES projects(project_id)
      )
    `);

    // Create indexes for better performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_user_id ON users(user_id);
      CREATE INDEX IF NOT EXISTS idx_projects_owner_id ON projects(owner_id);
      CREATE INDEX IF NOT EXISTS idx_projects_project_id ON projects(project_id);
      CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON project_members(project_id);
      CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON project_members(user_id);
      CREATE INDEX IF NOT EXISTS idx_prd_documents_user_id ON prd_documents(user_id);
      CREATE INDEX IF NOT EXISTS idx_prd_documents_project_id ON prd_documents(project_id);
      CREATE INDEX IF NOT EXISTS idx_validation_results_document_id ON validation_results(document_id);
      CREATE INDEX IF NOT EXISTS idx_validation_results_user_id ON validation_results(user_id);
      CREATE INDEX IF NOT EXISTS idx_competitive_intelligence_user_id ON competitive_intelligence(user_id);
      CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);
      CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at);
    `);

    client.release();
    logger.info('Database tables initialized successfully');
    return true;
  } catch (error) {
    logger.error('Database initialization failed:', error);
    return false;
  }
};

// Database utility functions
const db = {
  // Execute a query with parameters
  query: async (text, params = []) => {
    const start = Date.now();
    try {
      const result = await pool.query(text, params);
      const duration = Date.now() - start;
      logger.debug('Executed query', { text, duration, rows: result.rowCount });
      return result;
    } catch (error) {
      logger.error('Database query error:', { text, params, error: error.message });
      throw error;
    }
  },

  // Get a client from the pool
  getClient: async () => {
    return await pool.connect();
  },

  // Execute a transaction
  transaction: async (callback) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  // Close all connections
  close: async () => {
    await pool.end();
    logger.info('Database connection pool closed');
  },

  // Test connection
  testConnection,
  
  // Initialize database
  initializeDatabase
};

module.exports = db;
