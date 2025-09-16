const db = require('../config/database');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

class User {
  constructor(data) {
    this.id = data.id;
    this.userId = data.user_id;
    this.email = data.email;
    this.name = data.name;
    this.company = data.company;
    this.role = data.role;
    this.isActive = data.is_active;
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
    this.lastLogin = data.last_login;
  }

  // Create a new user
  static async create(userData) {
    try {
      const userId = uuidv4();
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      const query = `
        INSERT INTO users (user_id, email, password_hash, name, company, role)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;
      
      const values = [
        userId,
        userData.email,
        hashedPassword,
        userData.name,
        userData.company || '',
        userData.role || 'pm'
      ];
      
      const result = await db.query(query, values);
      return new User(result.rows[0]);
    } catch (error) {
      throw new Error(`Failed to create user: ${error.message}`);
    }
  }

  // Find user by email
  static async findByEmail(email) {
    try {
      const query = 'SELECT * FROM users WHERE email = $1';
      const result = await db.query(query, [email]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return new User(result.rows[0]);
    } catch (error) {
      throw new Error(`Failed to find user by email: ${error.message}`);
    }
  }

  // Find user by ID
  static async findById(userId) {
    try {
      const query = 'SELECT * FROM users WHERE user_id = $1';
      const result = await db.query(query, [userId]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return new User(result.rows[0]);
    } catch (error) {
      throw new Error(`Failed to find user by ID: ${error.message}`);
    }
  }

  // Update user
  async update(updateData) {
    try {
      const allowedFields = ['name', 'company'];
      const updates = [];
      const values = [];
      let paramCount = 1;

      for (const [key, value] of Object.entries(updateData)) {
        if (allowedFields.includes(key) && value !== undefined) {
          updates.push(`${key} = $${paramCount}`);
          values.push(value);
          paramCount++;
        }
      }

      if (updates.length === 0) {
        throw new Error('No valid fields to update');
      }

      updates.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(this.userId);

      const query = `
        UPDATE users 
        SET ${updates.join(', ')} 
        WHERE user_id = $${paramCount}
        RETURNING *
      `;

      const result = await db.query(query, values);
      
      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      return new User(result.rows[0]);
    } catch (error) {
      throw new Error(`Failed to update user: ${error.message}`);
    }
  }

  // Update last login
  async updateLastLogin() {
    try {
      const query = `
        UPDATE users 
        SET last_login = CURRENT_TIMESTAMP 
        WHERE user_id = $1
      `;
      
      await db.query(query, [this.userId]);
    } catch (error) {
      throw new Error(`Failed to update last login: ${error.message}`);
    }
  }

  // Change password
  async changePassword(currentPassword, newPassword) {
    try {
      // Get current password hash
      const query = 'SELECT password_hash FROM users WHERE user_id = $1';
      const result = await db.query(query, [this.userId]);
      
      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      const currentHash = result.rows[0].password_hash;
      
      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, currentHash);
      if (!isValidPassword) {
        throw new Error('Current password is incorrect');
      }

      // Hash new password
      const newHash = await bcrypt.hash(newPassword, 10);
      
      // Update password
      const updateQuery = `
        UPDATE users 
        SET password_hash = $1, updated_at = CURRENT_TIMESTAMP 
        WHERE user_id = $2
      `;
      
      await db.query(updateQuery, [newHash, this.userId]);
      return true;
    } catch (error) {
      throw new Error(`Failed to change password: ${error.message}`);
    }
  }

  // Verify password
  async verifyPassword(password) {
    try {
      const query = 'SELECT password_hash FROM users WHERE user_id = $1';
      const result = await db.query(query, [this.userId]);
      
      if (result.rows.length === 0) {
        return false;
      }

      const hash = result.rows[0].password_hash;
      return await bcrypt.compare(password, hash);
    } catch (error) {
      throw new Error(`Failed to verify password: ${error.message}`);
    }
  }

  // Get user statistics
  async getStatistics() {
    try {
      const queries = [
        // PRD count
        'SELECT COUNT(*) as prd_count FROM prd_documents WHERE user_id = $1',
        // Project count
        'SELECT COUNT(*) as project_count FROM projects WHERE owner_id = $1',
        // Average validation score
        'SELECT AVG(overall_score) as avg_score FROM validation_results WHERE user_id = $1',
        // Recent activity count
        'SELECT COUNT(*) as recent_activity FROM analytics_events WHERE user_id = $1 AND created_at >= NOW() - INTERVAL \'30 days\''
      ];

      const results = await Promise.all(
        queries.map(query => db.query(query, [this.userId]))
      );

      return {
        prdCount: parseInt(results[0].rows[0].prd_count) || 0,
        projectCount: parseInt(results[1].rows[0].project_count) || 0,
        averageScore: parseFloat(results[2].rows[0].avg_score) || 0,
        recentActivity: parseInt(results[3].rows[0].recent_activity) || 0
      };
    } catch (error) {
      throw new Error(`Failed to get user statistics: ${error.message}`);
    }
  }

  // Get user's recent activity
  async getRecentActivity(limit = 10) {
    try {
      const query = `
        SELECT 
          ae.event_type,
          ae.event_data,
          ae.created_at,
          p.name as project_name
        FROM analytics_events ae
        LEFT JOIN projects p ON ae.project_id = p.project_id
        WHERE ae.user_id = $1
        ORDER BY ae.created_at DESC
        LIMIT $2
      `;
      
      const result = await db.query(query, [this.userId, limit]);
      return result.rows;
    } catch (error) {
      throw new Error(`Failed to get recent activity: ${error.message}`);
    }
  }

  // Convert to JSON (without sensitive data)
  toJSON() {
    return {
      id: this.id,
      userId: this.userId,
      email: this.email,
      name: this.name,
      company: this.company,
      role: this.role,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      lastLogin: this.lastLogin
    };
  }

  // Get all users (admin only)
  static async getAll(limit = 50, offset = 0) {
    try {
      const query = `
        SELECT * FROM users 
        ORDER BY created_at DESC 
        LIMIT $1 OFFSET $2
      `;
      
      const result = await db.query(query, [limit, offset]);
      return result.rows.map(row => new User(row));
    } catch (error) {
      throw new Error(`Failed to get all users: ${error.message}`);
    }
  }

  // Deactivate user
  async deactivate() {
    try {
      const query = `
        UPDATE users 
        SET is_active = false, updated_at = CURRENT_TIMESTAMP 
        WHERE user_id = $1
        RETURNING *
      `;
      
      const result = await db.query(query, [this.userId]);
      
      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      return new User(result.rows[0]);
    } catch (error) {
      throw new Error(`Failed to deactivate user: ${error.message}`);
    }
  }

  // Activate user
  async activate() {
    try {
      const query = `
        UPDATE users 
        SET is_active = true, updated_at = CURRENT_TIMESTAMP 
        WHERE user_id = $1
        RETURNING *
      `;
      
      const result = await db.query(query, [this.userId]);
      
      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      return new User(result.rows[0]);
    } catch (error) {
      throw new Error(`Failed to activate user: ${error.message}`);
    }
  }
}

module.exports = User;
