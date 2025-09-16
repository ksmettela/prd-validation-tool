const express = require('express');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * GET /api/analytics/dashboard
 * Get dashboard analytics for user
 */
router.get('/dashboard', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { timeframe = '30days' } = req.query;

    const analytics = await getDashboardAnalytics(userId, timeframe);

    res.json({
      success: true,
      data: analytics
    });

  } catch (error) {
    logger.error('Dashboard analytics failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard analytics'
    });
  }
});

/**
 * GET /api/analytics/prd-trends
 * Get PRD validation trends over time
 */
router.get('/prd-trends', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { timeframe = '12months', metric = 'overallScore' } = req.query;

    const trends = await getPRDTrends(userId, timeframe, metric);

    res.json({
      success: true,
      data: trends
    });

  } catch (error) {
    logger.error('PRD trends failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch PRD trends'
    });
  }
});

/**
 * GET /api/analytics/competitive-insights
 * Get competitive intelligence analytics
 */
router.get('/competitive-insights', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { timeframe = '6months' } = req.query;

    const insights = await getCompetitiveInsights(userId, timeframe);

    res.json({
      success: true,
      data: insights
    });

  } catch (error) {
    logger.error('Competitive insights failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch competitive insights'
    });
  }
});

/**
 * GET /api/analytics/team-performance
 * Get team performance metrics
 */
router.get('/team-performance', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { timeframe = '3months' } = req.query;

    const performance = await getTeamPerformance(userId, timeframe);

    res.json({
      success: true,
      data: performance
    });

  } catch (error) {
    logger.error('Team performance analytics failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch team performance'
    });
  }
});

/**
 * GET /api/analytics/industry-benchmarks
 * Get industry benchmark comparisons
 */
router.get('/industry-benchmarks', async (req, res) => {
  try {
    const { industry = 'saas', companySize = 'medium' } = req.query;

    const benchmarks = await getIndustryBenchmarks(industry, companySize);

    res.json({
      success: true,
      data: benchmarks
    });

  } catch (error) {
    logger.error('Industry benchmarks failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch industry benchmarks'
    });
  }
});

/**
 * GET /api/analytics/export
 * Export analytics data
 */
router.get('/export', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { format = 'json', timeframe = '6months', includeRawData = false } = req.query;

    const analyticsData = await exportAnalyticsData(userId, timeframe, includeRawData);

    switch (format) {
      case 'json':
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename="analytics-export.json"');
        res.json(analyticsData);
        break;

      case 'csv':
        const csvData = convertAnalyticsToCSV(analyticsData);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="analytics-export.csv"');
        res.send(csvData);
        break;

      default:
        res.status(400).json({
          success: false,
          error: 'Unsupported export format'
        });
    }

  } catch (error) {
    logger.error('Analytics export failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export analytics data'
    });
  }
});

/**
 * POST /api/analytics/custom-report
 * Generate custom analytics report
 */
router.post('/custom-report', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { 
      metrics = ['overallScore', 'completenessScore', 'marketFitScore'],
      filters = {},
      timeframe = '6months',
      groupBy = 'month'
    } = req.body;

    const report = await generateCustomReport(userId, {
      metrics,
      filters,
      timeframe,
      groupBy
    });

    res.json({
      success: true,
      data: report
    });

  } catch (error) {
    logger.error('Custom report generation failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate custom report'
    });
  }
});

// Helper functions (mock implementations - replace with actual database operations)

async function getDashboardAnalytics(userId, timeframe) {
  return {
    overview: {
      totalPRDs: 24,
      averageScore: 78,
      completedThisMonth: 8,
      improvementRate: 12.5
    },
    scoreDistribution: {
      excellent: 6, // 80-100
      good: 10,     // 60-79
      fair: 6,      // 40-59
      poor: 2       // 0-39
    },
    recentActivity: [
      {
        type: 'prd_validated',
        description: 'PRD "Mobile App Redesign" validated',
        score: 85,
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        type: 'prd_validated',
        description: 'PRD "API Integration" validated',
        score: 72,
        timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
      }
    ],
    topPerformingAreas: [
      { area: 'Problem Statement', score: 88 },
      { area: 'Solution Definition', score: 82 },
      { area: 'Target Market', score: 79 }
    ],
    areasForImprovement: [
      { area: 'Competitive Analysis', score: 65 },
      { area: 'Success Metrics', score: 68 },
      { area: 'Risk Assessment', score: 71 }
    ]
  };
}

async function getPRDTrends(userId, timeframe, metric) {
  const trends = [];
  const months = 12;
  const now = new Date();
  
  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    trends.push({
      date: date.toISOString().split('T')[0],
      score: Math.floor(Math.random() * 30) + 60, // Mock data: 60-90
      prdCount: Math.floor(Math.random() * 10) + 1
    });
  }

  return {
    trends,
    metric,
    timeframe,
    summary: {
      average: Math.round(trends.reduce((sum, t) => sum + t.score, 0) / trends.length),
      trend: 'increasing',
      change: '+8.5%'
    }
  };
}

async function getCompetitiveInsights(userId, timeframe) {
  return {
    marketAnalysis: {
      totalCompetitors: 12,
      averageFunding: '$45M',
      marketSaturation: 'Medium',
      growthRate: '15.2%'
    },
    competitorComparison: [
      {
        name: 'Competitor A',
        marketShare: '25%',
        funding: '$120M',
        strengths: ['Strong brand', 'Large team'],
        weaknesses: ['High pricing', 'Complex UX']
      },
      {
        name: 'Competitor B',
        marketShare: '18%',
        funding: '$80M',
        strengths: ['Innovative features', 'Good UX'],
        weaknesses: ['Limited market reach', 'New player']
      }
    ],
    opportunities: [
      'Underserved SMB segment',
      'Mobile-first approach',
      'Industry-specific customization'
    ],
    threats: [
      'Large incumbent players',
      'Economic downturn impact',
      'Regulatory changes'
    ]
  };
}

async function getTeamPerformance(userId, timeframe) {
  return {
    teamMetrics: {
      totalMembers: 8,
      activeMembers: 6,
      averagePRDScore: 76,
      collaborationRate: 85
    },
    individualPerformance: [
      {
        name: 'Sarah Johnson',
        role: 'Senior PM',
        prdCount: 12,
        averageScore: 82,
        improvement: '+5.2%'
      },
      {
        name: 'Mike Chen',
        role: 'Product Manager',
        prdCount: 8,
        averageScore: 78,
        improvement: '+3.1%'
      }
    ],
    teamTrends: [
      {
        metric: 'Average Score',
        trend: 'increasing',
        change: '+4.2%'
      },
      {
        metric: 'Collaboration',
        trend: 'stable',
        change: '+0.8%'
      }
    ]
  };
}

async function getIndustryBenchmarks(industry, companySize) {
  return {
    industry,
    companySize,
    benchmarks: {
      averageScore: 74,
      completenessScore: 71,
      marketFitScore: 68,
      competitiveScore: 76
    },
    percentiles: {
      '25th': 65,
      '50th': 74,
      '75th': 82,
      '90th': 88
    },
    recommendations: [
      'Focus on improving market fit validation',
      'Strengthen competitive analysis',
      'Enhance PRD completeness'
    ]
  };
}

async function exportAnalyticsData(userId, timeframe, includeRawData) {
  return {
    user: userId,
    timeframe,
    exportedAt: new Date().toISOString(),
    data: {
      dashboard: await getDashboardAnalytics(userId, timeframe),
      trends: await getPRDTrends(userId, timeframe, 'overallScore'),
      competitive: await getCompetitiveInsights(userId, timeframe),
      team: await getTeamPerformance(userId, timeframe),
      ...(includeRawData && { rawData: 'Raw data would be included here' })
    }
  };
}

function convertAnalyticsToCSV(data) {
  const rows = [
    ['Metric', 'Value', 'Date'],
    ['Total PRDs', data.data.dashboard.overview.totalPRDs, data.exportedAt],
    ['Average Score', data.data.dashboard.overview.averageScore, data.exportedAt],
    ['Improvement Rate', data.data.dashboard.overview.improvementRate, data.exportedAt]
  ];

  return rows.map(row => row.join(',')).join('\n');
}

async function generateCustomReport(userId, options) {
  return {
    reportId: `report_${Date.now()}`,
    generatedAt: new Date().toISOString(),
    options,
    data: {
      metrics: options.metrics.map(metric => ({
        metric,
        value: Math.floor(Math.random() * 40) + 60,
        trend: 'increasing',
        change: `+${Math.floor(Math.random() * 10)}%`
      })),
      insights: [
        'Strong performance in problem definition',
        'Opportunity for improvement in competitive analysis',
        'Consistent growth in market fit validation'
      ],
      recommendations: [
        'Focus on competitive research',
        'Enhance market validation processes',
        'Strengthen success metrics definition'
      ]
    }
  };
}

module.exports = router;
