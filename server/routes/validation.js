const express = require('express');
const AIAnalysisService = require('../services/aiAnalysis');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * POST /api/validation/analyze
 * Perform comprehensive PRD analysis using AI
 */
router.post('/analyze', async (req, res) => {
  try {
    const { prdData, analysisType = 'comprehensive', options = {} } = req.body;

    if (!prdData) {
      return res.status(400).json({
        success: false,
        error: 'PRD data is required'
      });
    }

    const aiService = new AIAnalysisService();
    const analysis = await aiService.analyzePRD(prdData, analysisType);

    if (!analysis.success) {
      return res.status(500).json(analysis);
    }

    // Calculate overall score
    const overallScore = calculateOverallScore(analysis.results);
    
    // Generate executive summary if requested
    let executiveSummary = null;
    if (options.includeExecutiveSummary) {
      const summaryResult = await aiService.generateExecutiveSummary(prdData, analysis.results);
      if (summaryResult.success) {
        executiveSummary = summaryResult.summary;
      }
    }

    res.json({
      success: true,
      data: {
        ...analysis.results,
        overallScore,
        executiveSummary,
        analysisType,
        timestamp: analysis.timestamp
      }
    });

  } catch (error) {
    logger.error('PRD analysis failed:', error);
    res.status(500).json({
      success: false,
      error: 'Analysis failed'
    });
  }
});

/**
 * POST /api/validation/quick-score
 * Get a quick validation score without full AI analysis
 */
router.post('/quick-score', async (req, res) => {
  try {
    const { prdData } = req.body;

    if (!prdData) {
      return res.status(400).json({
        success: false,
        error: 'PRD data is required'
      });
    }

    const quickScore = calculateQuickScore(prdData);

    res.json({
      success: true,
      data: quickScore
    });

  } catch (error) {
    logger.error('Quick score calculation failed:', error);
    res.status(500).json({
      success: false,
      error: 'Quick score calculation failed'
    });
  }
});

/**
 * POST /api/validation/compare
 * Compare multiple PRDs or versions
 */
router.post('/compare', async (req, res) => {
  try {
    const { prdVersions, comparisonType = 'side-by-side' } = req.body;

    if (!prdVersions || !Array.isArray(prdVersions) || prdVersions.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'At least 2 PRD versions are required for comparison'
      });
    }

    const aiService = new AIAnalysisService();
    const comparisons = [];

    // Analyze each version
    for (const version of prdVersions) {
      const analysis = await aiService.analyzePRD(version.data, 'comprehensive');
      comparisons.push({
        version: version.name || 'Version ' + (comparisons.length + 1),
        analysis: analysis.results,
        overallScore: calculateOverallScore(analysis.results)
      });
    }

    // Generate comparison insights
    const comparisonInsights = generateComparisonInsights(comparisons);

    res.json({
      success: true,
      data: {
        comparisons,
        insights: comparisonInsights,
        comparisonType,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('PRD comparison failed:', error);
    res.status(500).json({
      success: false,
      error: 'Comparison failed'
    });
  }
});

/**
 * GET /api/validation/benchmarks
 * Get industry benchmarks for PRD scoring
 */
router.get('/benchmarks', async (req, res) => {
  try {
    const benchmarks = {
      completeness: {
        excellent: { min: 85, description: 'Comprehensive PRD with all required sections' },
        good: { min: 70, max: 84, description: 'Well-structured PRD with minor gaps' },
        fair: { min: 55, max: 69, description: 'Basic PRD with several missing elements' },
        poor: { max: 54, description: 'Incomplete PRD requiring significant work' }
      },
      clarity: {
        excellent: { min: 90, description: 'Crystal clear, unambiguous language' },
        good: { min: 75, max: 89, description: 'Clear with minor ambiguities' },
        fair: { min: 60, max: 74, description: 'Generally clear with some confusion' },
        poor: { max: 59, description: 'Unclear language and structure' }
      },
      marketFit: {
        excellent: { min: 80, description: 'Strong market validation and positioning' },
        good: { min: 65, max: 79, description: 'Good market understanding' },
        fair: { min: 50, max: 64, description: 'Basic market awareness' },
        poor: { max: 49, description: 'Weak market validation' }
      },
      competitivePositioning: {
        excellent: { min: 85, description: 'Clear competitive advantage' },
        good: { min: 70, max: 84, description: 'Good competitive awareness' },
        fair: { min: 55, max: 69, description: 'Basic competitive analysis' },
        poor: { max: 54, description: 'Limited competitive understanding' }
      }
    };

    res.json({
      success: true,
      data: benchmarks
    });

  } catch (error) {
    logger.error('Benchmarks retrieval failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve benchmarks'
    });
  }
});

/**
 * POST /api/validation/export
 * Export validation results in various formats
 */
router.post('/export', async (req, res) => {
  try {
    const { validationResults, format = 'json', includeRawData = false } = req.body;

    if (!validationResults) {
      return res.status(400).json({
        success: false,
        error: 'Validation results are required'
      });
    }

    let exportData;

    switch (format) {
      case 'json':
        exportData = includeRawData ? validationResults : cleanForExport(validationResults);
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename="prd-validation-results.json"');
        res.json(exportData);
        break;

      case 'pdf':
        // PDF export would require additional libraries like puppeteer
        res.status(501).json({
          success: false,
          error: 'PDF export not yet implemented'
        });
        break;

      case 'csv':
        const csvData = convertToCSV(validationResults);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="prd-validation-results.csv"');
        res.send(csvData);
        break;

      default:
        res.status(400).json({
          success: false,
          error: 'Unsupported export format'
        });
    }

  } catch (error) {
    logger.error('Export failed:', error);
    res.status(500).json({
      success: false,
      error: 'Export failed'
    });
  }
});

/**
 * Calculate overall score from analysis results
 */
function calculateOverallScore(results) {
  const scores = [];
  
  if (results.completenessAnalysis?.completenessScore) {
    scores.push(results.completenessAnalysis.completenessScore);
  }
  
  if (results.clarityAnalysis?.clarityScore) {
    scores.push(results.clarityAnalysis.clarityScore);
  }
  
  if (results.marketFitAnalysis?.marketFitScore) {
    scores.push(results.marketFitAnalysis.marketFitScore);
  }
  
  if (results.competitiveAnalysis?.positioningScore) {
    scores.push(results.competitiveAnalysis.positioningScore);
  }

  if (scores.length === 0) return 0;
  
  return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
}

/**
 * Calculate quick score without AI analysis
 */
function calculateQuickScore(prdData) {
  let score = 0;
  const maxScore = 100;
  
  // Check for required sections
  const requiredSections = ['problemStatement', 'solution', 'targetMarket', 'successMetrics', 'features'];
  const sectionScore = (maxScore / 5) * 2; // 40 points for sections
  
  requiredSections.forEach(section => {
    if (prdData.sections?.[section] && prdData.sections[section].length > 100) {
      score += sectionScore / requiredSections.length;
    }
  });
  
  // Check content quality indicators
  const contentScore = (maxScore / 5) * 1.5; // 30 points for content
  const totalContent = JSON.stringify(prdData).length;
  
  if (totalContent > 5000) score += contentScore * 0.6;
  if (totalContent > 10000) score += contentScore * 0.4;
  
  // Check for metrics and stakeholders
  const metricsScore = (maxScore / 5) * 1.5; // 30 points for metrics
  if (prdData.metrics?.length > 0) score += metricsScore * 0.5;
  if (prdData.stakeholders?.length > 0) score += metricsScore * 0.5;
  
  return {
    overallScore: Math.min(Math.round(score), 100),
    breakdown: {
      sections: Math.round(score * 0.4),
      content: Math.round(score * 0.3),
      metrics: Math.round(score * 0.3)
    },
    timestamp: new Date().toISOString()
  };
}

/**
 * Generate comparison insights
 */
function generateComparisonInsights(comparisons) {
  const insights = {
    bestVersion: null,
    improvements: [],
    regressions: [],
    recommendations: []
  };

  if (comparisons.length === 0) return insights;

  // Find best version by overall score
  insights.bestVersion = comparisons.reduce((best, current) => 
    current.overallScore > best.overallScore ? current : best
  );

  // Compare scores
  const scores = comparisons.map(c => c.overallScore);
  const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  const maxScore = Math.max(...scores);
  const minScore = Math.min(...scores);

  insights.improvements.push(`Average score: ${Math.round(avgScore)}`);
  insights.improvements.push(`Score range: ${minScore} - ${maxScore}`);

  if (maxScore - minScore > 20) {
    insights.recommendations.push('Significant score variations detected - consider standardizing PRD format');
  }

  return insights;
}

/**
 * Clean data for export (remove sensitive information)
 */
function cleanForExport(data) {
  const cleaned = JSON.parse(JSON.stringify(data));
  
  // Remove any sensitive fields
  delete cleaned.apiKeys;
  delete cleaned.tokens;
  delete cleaned.secrets;
  
  return cleaned;
}

/**
 * Convert validation results to CSV format
 */
function convertToCSV(data) {
  const headers = ['Metric', 'Score', 'Assessment'];
  const rows = [headers];
  
  if (data.completenessAnalysis) {
    rows.push(['Completeness', data.completenessAnalysis.completenessScore || 'N/A', 'Comprehensive']);
  }
  
  if (data.clarityAnalysis) {
    rows.push(['Clarity', data.clarityAnalysis.clarityScore || 'N/A', 'Clear']);
  }
  
  if (data.marketFitAnalysis) {
    rows.push(['Market Fit', data.marketFitAnalysis.marketFitScore || 'N/A', 'Validated']);
  }
  
  if (data.competitiveAnalysis) {
    rows.push(['Competitive Positioning', data.competitiveAnalysis.positioningScore || 'N/A', 'Strong']);
  }
  
  rows.push(['Overall Score', data.overallScore || 'N/A', 'Balanced']);
  
  return rows.map(row => row.join(',')).join('\n');
}

module.exports = router;
