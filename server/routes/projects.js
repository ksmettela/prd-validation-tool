const express = require('express');
const Joi = require('joi');
const logger = require('../utils/logger');

const router = express.Router();

// Validation schemas
const projectSchema = Joi.object({
  name: Joi.string().min(2).required(),
  description: Joi.string().optional(),
  status: Joi.string().valid('draft', 'in-progress', 'completed', 'archived').default('draft'),
  tags: Joi.array().items(Joi.string()).optional(),
  teamMembers: Joi.array().items(Joi.string()).optional(),
  visibility: Joi.string().valid('private', 'team', 'public').default('private')
});

/**
 * GET /api/projects
 * Get user's projects
 */
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;
    const userId = req.user.userId;

    // Get user's projects (mock implementation)
    let projects = await getUserProjects(userId);

    // Apply filters
    if (status) {
      projects = projects.filter(project => project.status === status);
    }

    if (search) {
      projects = projects.filter(project => 
        project.name.toLowerCase().includes(search.toLowerCase()) ||
        project.description?.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedProjects = projects.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: {
        projects: paginatedProjects,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: projects.length,
          pages: Math.ceil(projects.length / limit)
        }
      }
    });

  } catch (error) {
    logger.error('Failed to fetch projects:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch projects'
    });
  }
});

/**
 * POST /api/projects
 * Create a new project
 */
router.post('/', async (req, res) => {
  try {
    const { error, value } = projectSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }

    const userId = req.user.userId;
    const project = {
      id: generateProjectId(),
      ...value,
      ownerId: userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      prdCount: 0,
      lastActivity: new Date().toISOString()
    };

    await saveProject(project);

    res.status(201).json({
      success: true,
      data: project
    });

  } catch (error) {
    logger.error('Project creation failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create project'
    });
  }
});

/**
 * GET /api/projects/:id
 * Get specific project
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const project = await getProjectById(id);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    // Check if user has access to project
    if (!hasProjectAccess(project, userId)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Get project PRDs
    const prds = await getProjectPRDs(id);

    res.json({
      success: true,
      data: {
        ...project,
        prds
      }
    });

  } catch (error) {
    logger.error('Failed to fetch project:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch project'
    });
  }
});

/**
 * PUT /api/projects/:id
 * Update project
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const project = await getProjectById(id);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    // Check if user has permission to update
    if (project.ownerId !== userId && !req.user.role === 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Permission denied'
      });
    }

    const { error, value } = projectSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }

    const updatedProject = {
      ...project,
      ...value,
      updatedAt: new Date().toISOString()
    };

    await saveProject(updatedProject);

    res.json({
      success: true,
      data: updatedProject
    });

  } catch (error) {
    logger.error('Project update failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update project'
    });
  }
});

/**
 * DELETE /api/projects/:id
 * Delete project
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const project = await getProjectById(id);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    // Check if user has permission to delete
    if (project.ownerId !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Permission denied'
      });
    }

    await deleteProject(id);

    res.json({
      success: true,
      message: 'Project deleted successfully'
    });

  } catch (error) {
    logger.error('Project deletion failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete project'
    });
  }
});

/**
 * POST /api/projects/:id/collaborators
 * Add collaborators to project
 */
router.post('/:id/collaborators', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId: collaboratorId, role = 'viewer' } = req.body;
    const userId = req.user.userId;

    const project = await getProjectById(id);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    // Check if user has permission to add collaborators
    if (project.ownerId !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Permission denied'
      });
    }

    // Add collaborator
    if (!project.teamMembers) {
      project.teamMembers = [];
    }

    const existingCollaborator = project.teamMembers.find(member => member.userId === collaboratorId);
    if (existingCollaborator) {
      return res.status(400).json({
        success: false,
        error: 'User is already a collaborator'
      });
    }

    project.teamMembers.push({
      userId: collaboratorId,
      role,
      addedAt: new Date().toISOString(),
      addedBy: userId
    });

    project.updatedAt = new Date().toISOString();
    await saveProject(project);

    res.json({
      success: true,
      data: project
    });

  } catch (error) {
    logger.error('Failed to add collaborator:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add collaborator'
    });
  }
});

/**
 * DELETE /api/projects/:id/collaborators/:collaboratorId
 * Remove collaborator from project
 */
router.delete('/:id/collaborators/:collaboratorId', async (req, res) => {
  try {
    const { id, collaboratorId } = req.params;
    const userId = req.user.userId;

    const project = await getProjectById(id);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    // Check if user has permission to remove collaborators
    if (project.ownerId !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Permission denied'
      });
    }

    // Remove collaborator
    if (project.teamMembers) {
      project.teamMembers = project.teamMembers.filter(member => member.userId !== collaboratorId);
      project.updatedAt = new Date().toISOString();
      await saveProject(project);
    }

    res.json({
      success: true,
      data: project
    });

  } catch (error) {
    logger.error('Failed to remove collaborator:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove collaborator'
    });
  }
});

/**
 * GET /api/projects/:id/analytics
 * Get project analytics
 */
router.get('/:id/analytics', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const project = await getProjectById(id);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    // Check if user has access to project
    if (!hasProjectAccess(project, userId)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const analytics = await getProjectAnalytics(id);

    res.json({
      success: true,
      data: analytics
    });

  } catch (error) {
    logger.error('Failed to fetch project analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch project analytics'
    });
  }
});

// Helper functions (mock implementations - replace with actual database operations)
let projects = [];
let projectIdCounter = 1;

async function getUserProjects(userId) {
  return projects.filter(project => 
    project.ownerId === userId || 
    (project.teamMembers && project.teamMembers.some(member => member.userId === userId))
  );
}

async function getProjectById(id) {
  return projects.find(project => project.id === id);
}

async function saveProject(project) {
  const existingIndex = projects.findIndex(p => p.id === project.id);
  if (existingIndex >= 0) {
    projects[existingIndex] = project;
  } else {
    projects.push(project);
  }
}

async function deleteProject(id) {
  projects = projects.filter(project => project.id !== id);
}

async function getProjectPRDs(projectId) {
  // Mock PRD data
  return [
    {
      id: 'prd_1',
      name: 'Sample PRD',
      status: 'completed',
      score: 85,
      createdAt: new Date().toISOString()
    }
  ];
}

async function getProjectAnalytics(projectId) {
  return {
    totalPRDs: 5,
    averageScore: 78,
    completedPRDs: 3,
    inProgressPRDs: 2,
    teamActivity: {
      lastWeek: 12,
      lastMonth: 45
    },
    scoreTrend: [
      { date: '2024-01-01', score: 65 },
      { date: '2024-01-15', score: 72 },
      { date: '2024-02-01', score: 78 }
    ]
  };
}

function hasProjectAccess(project, userId) {
  return project.ownerId === userId || 
         (project.teamMembers && project.teamMembers.some(member => member.userId === userId)) ||
         project.visibility === 'public';
}

function generateProjectId() {
  return `project_${projectIdCounter++}`;
}

module.exports = router;
