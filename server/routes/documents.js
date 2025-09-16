const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const DocumentParser = require('../services/documentParser');
const logger = require('../utils/logger');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.docx', '.doc', '.txt'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOCX, DOC, and TXT files are allowed.'));
    }
  }
});

// Ensure uploads directory exists
const ensureUploadsDir = async () => {
  const uploadsDir = path.join(__dirname, '../uploads');
  try {
    await fs.access(uploadsDir);
  } catch {
    await fs.mkdir(uploadsDir, { recursive: true });
  }
};

ensureUploadsDir();

/**
 * POST /api/documents/upload
 * Upload and parse a PRD document
 */
router.post('/upload', upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No document file provided'
      });
    }

    const documentParser = new DocumentParser();
    const result = await documentParser.parseDocument(req.file.path);

    if (!result.success) {
      return res.status(400).json(result);
    }

    // Clean up uploaded file after parsing
    try {
      await fs.unlink(req.file.path);
    } catch (error) {
      logger.warn('Failed to delete uploaded file:', error);
    }

    res.json({
      success: true,
      data: {
        filename: req.file.originalname,
        ...result
      }
    });

  } catch (error) {
    logger.error('Document upload failed:', error);
    
    // Clean up file on error
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (cleanupError) {
        logger.warn('Failed to cleanup file on error:', cleanupError);
      }
    }

    res.status(500).json({
      success: false,
      error: 'Document upload and parsing failed'
    });
  }
});

/**
 * POST /api/documents/parse-text
 * Parse PRD content from text input
 */
router.post('/parse-text', async (req, res) => {
  try {
    const { content, title } = req.body;

    if (!content || typeof content !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Content is required and must be a string'
      });
    }

    const documentParser = new DocumentParser();
    const structuredData = documentParser.extractStructuredData(content);

    res.json({
      success: true,
      data: {
        title: title || 'Untitled PRD',
        content,
        metadata: {
          format: 'text',
          wordCount: content.split(/\s+/).length,
          characterCount: content.length,
          parsedAt: new Date().toISOString()
        },
        structuredData
      }
    });

  } catch (error) {
    logger.error('Text parsing failed:', error);
    res.status(500).json({
      success: false,
      error: 'Text parsing failed'
    });
  }
});

/**
 * GET /api/documents/supported-formats
 * Get list of supported document formats
 */
router.get('/supported-formats', (req, res) => {
  const documentParser = new DocumentParser();
  res.json({
    success: true,
    data: {
      formats: documentParser.supportedFormats,
      maxFileSize: '50MB'
    }
  });
});

/**
 * POST /api/documents/validate-structure
 * Validate PRD structure and completeness
 */
router.post('/validate-structure', async (req, res) => {
  try {
    const { structuredData, content } = req.body;

    if (!structuredData && !content) {
      return res.status(400).json({
        success: false,
        error: 'Either structuredData or content is required'
      });
    }

    const validation = await validatePRDStructure(structuredData, content);

    res.json({
      success: true,
      data: validation
    });

  } catch (error) {
    logger.error('Structure validation failed:', error);
    res.status(500).json({
      success: false,
      error: 'Structure validation failed'
    });
  }
});

/**
 * Validate PRD structure and completeness
 */
async function validatePRDStructure(structuredData, content) {
  const requiredSections = [
    'problemStatement',
    'solution',
    'targetMarket',
    'successMetrics',
    'features'
  ];

  const optionalSections = [
    'userPersonas',
    'timeline',
    'risks',
    'competitiveAnalysis'
  ];

  const validation = {
    overallScore: 0,
    completenessScore: 0,
    sectionAnalysis: {},
    recommendations: [],
    missingSections: [],
    strengths: [],
    areasForImprovement: []
  };

  let totalScore = 0;
  let maxScore = 0;

  // Check required sections
  requiredSections.forEach(section => {
    const hasSection = structuredData?.sections?.[section] || 
                      (content && checkSectionInContent(content, section));
    
    if (hasSection) {
      const sectionScore = 20; // 20 points per required section
      validation.sectionAnalysis[section] = {
        present: true,
        score: sectionScore,
        completeness: calculateSectionCompleteness(structuredData?.sections?.[section] || content)
      };
      totalScore += sectionScore;
      validation.strengths.push(`Strong ${section.replace(/([A-Z])/g, ' $1').toLowerCase()}`);
    } else {
      validation.sectionAnalysis[section] = {
        present: false,
        score: 0,
        completeness: 0
      };
      validation.missingSections.push(section);
      validation.recommendations.push(`Add a comprehensive ${section.replace(/([A-Z])/g, ' $1').toLowerCase()} section`);
    }
    maxScore += 20;
  });

  // Check optional sections
  optionalSections.forEach(section => {
    const hasSection = structuredData?.sections?.[section] || 
                      (content && checkSectionInContent(content, section));
    
    if (hasSection) {
      const sectionScore = 10; // 10 points per optional section
      validation.sectionAnalysis[section] = {
        present: true,
        score: sectionScore,
        completeness: calculateSectionCompleteness(structuredData?.sections?.[section] || content)
      };
      totalScore += sectionScore;
      validation.strengths.push(`Includes ${section.replace(/([A-Z])/g, ' $1').toLowerCase()}`);
    } else {
      validation.sectionAnalysis[section] = {
        present: false,
        score: 0,
        completeness: 0
      };
      validation.areasForImprovement.push(`Consider adding ${section.replace(/([A-Z])/g, ' $1').toLowerCase()}`);
    }
    maxScore += 10;
  });

  // Calculate scores
  validation.overallScore = Math.round((totalScore / maxScore) * 100);
  validation.completenessScore = Math.round((totalScore / maxScore) * 100);

  // Add general recommendations
  if (validation.overallScore < 60) {
    validation.recommendations.push('Focus on adding missing required sections first');
  } else if (validation.overallScore < 80) {
    validation.recommendations.push('Consider adding optional sections to improve completeness');
  } else {
    validation.recommendations.push('Great structure! Consider adding more detail to existing sections');
  }

  return validation;
}

/**
 * Check if a section exists in content
 */
function checkSectionInContent(content, sectionName) {
  const sectionPatterns = {
    problemStatement: /problem\s+statement|problem\s+definition/i,
    solution: /solution|proposed\s+solution/i,
    targetMarket: /target\s+market|market\s+analysis/i,
    userPersonas: /user\s+personas|target\s+users/i,
    features: /features|functional\s+requirements/i,
    successMetrics: /success\s+metrics|kpis|key\s+performance\s+indicators/i,
    timeline: /timeline|roadmap|milestones/i,
    risks: /risks|challenges|assumptions/i,
    competitiveAnalysis: /competitive\s+analysis|competitors/i
  };

  const pattern = sectionPatterns[sectionName];
  return pattern ? pattern.test(content) : false;
}

/**
 * Calculate section completeness score
 */
function calculateSectionCompleteness(sectionContent) {
  if (!sectionContent || sectionContent.length < 50) {
    return 0;
  }

  let score = 0;
  const wordCount = sectionContent.split(/\s+/).length;

  // Basic length check
  if (wordCount > 100) score += 30;
  else if (wordCount > 50) score += 20;

  // Content quality indicators
  if (sectionContent.includes(':')) score += 10; // Has structured content
  if (sectionContent.match(/\d+/)) score += 10; // Contains numbers/metrics
  if (sectionContent.length > 200) score += 20; // Substantial content
  if (sectionContent.split('\n').length > 3) score += 10; // Well-formatted
  if (sectionContent.match(/[.!?]$/)) score += 10; // Proper sentences
  if (sectionContent.match(/\b(user|customer|stakeholder|target)\b/i)) score += 10; // User-focused

  return Math.min(score, 100);
}

module.exports = router;
