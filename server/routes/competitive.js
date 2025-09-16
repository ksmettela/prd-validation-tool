const express = require('express');
const CompetitiveIntelligenceService = require('../services/competitiveIntelligence');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * POST /api/competitive/analyze
 * Get comprehensive competitive intelligence for a PRD
 */
router.post('/analyze', async (req, res) => {
  try {
    const { prdData, options = {} } = req.body;

    if (!prdData) {
      return res.status(400).json({
        success: false,
        error: 'PRD data is required for competitive analysis'
      });
    }

    const competitiveService = new CompetitiveIntelligenceService();
    const intelligence = await competitiveService.getCompetitiveIntelligence(prdData);

    if (!intelligence.success) {
      return res.status(500).json(intelligence);
    }

    // Add competitive score calculation
    const competitiveScore = calculateCompetitiveScore(intelligence.data);

    res.json({
      success: true,
      data: {
        ...intelligence.data,
        competitiveScore,
        recommendations: generateCompetitiveRecommendations(intelligence.data),
        timestamp: intelligence.timestamp
      }
    });

  } catch (error) {
    logger.error('Competitive analysis failed:', error);
    res.status(500).json({
      success: false,
      error: 'Competitive analysis failed'
    });
  }
});

/**
 * POST /api/competitive/monitor
 * Get real-time competitor monitoring data
 */
router.post('/monitor', async (req, res) => {
  try {
    const { competitors, monitoringType = 'basic' } = req.body;

    if (!competitors || !Array.isArray(competitors) || competitors.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Competitor list is required'
      });
    }

    const competitiveService = new CompetitiveIntelligenceService();
    const monitoringPromises = competitors.slice(0, 10).map(competitor => 
      competitiveService.getCompetitorMonitoring(competitor)
    );

    const monitoringResults = await Promise.allSettled(monitoringPromises);
    
    const monitoring = {
      competitors: competitors.map((competitor, index) => ({
        name: competitor,
        data: monitoringResults[index].status === 'fulfilled' ? 
              monitoringResults[index].value : null
      })),
      summary: generateMonitoringSummary(monitoringResults),
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      data: monitoring
    });

  } catch (error) {
    logger.error('Competitor monitoring failed:', error);
    res.status(500).json({
      success: false,
      error: 'Competitor monitoring failed'
    });
  }
});

/**
 * GET /api/competitive/trends/:industry
 * Get industry-specific trends and insights
 */
router.get('/trends/:industry', async (req, res) => {
  try {
    const { industry } = req.params;
    const { timeframe = '12months' } = req.query;

    const competitiveService = new CompetitiveIntelligenceService();
    const trends = await competitiveService.getIndustryTrends([industry]);

    if (!trends) {
      return res.status(404).json({
        success: false,
        error: 'No trends found for the specified industry'
      });
    }

    res.json({
      success: true,
      data: {
        industry,
        timeframe,
        trends,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Industry trends retrieval failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve industry trends'
    });
  }
});

/**
 * POST /api/competitive/benchmark
 * Benchmark against competitors
 */
router.post('/benchmark', async (req, res) => {
  try {
    const { prdData, competitors, benchmarkAreas = ['features', 'pricing', 'positioning'] } = req.body;

    if (!prdData || !competitors) {
      return res.status(400).json({
        success: false,
        error: 'PRD data and competitor list are required'
      });
    }

    const benchmark = {
      productPositioning: benchmarkProductPositioning(prdData, competitors),
      featureComparison: benchmarkFeatures(prdData, competitors),
      marketPosition: benchmarkMarketPosition(prdData, competitors),
      recommendations: generateBenchmarkRecommendations(prdData, competitors),
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      data: benchmark
    });

  } catch (error) {
    logger.error('Competitive benchmarking failed:', error);
    res.status(500).json({
      success: false,
      error: 'Competitive benchmarking failed'
    });
  }
});

/**
 * GET /api/competitive/market-size/:keywords
 * Get market size data for specific keywords
 */
router.get('/market-size/:keywords', async (req, res) => {
  try {
    const { keywords } = req.params;
    const keywordList = keywords.split(',').map(k => k.trim());

    const competitiveService = new CompetitiveIntelligenceService();
    const marketData = await competitiveService.getMarketSize(keywordList);

    res.json({
      success: true,
      data: {
        keywords: keywordList,
        marketData,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Market size analysis failed:', error);
    res.status(500).json({
      success: false,
      error: 'Market size analysis failed'
    });
  }
});

/**
 * POST /api/competitive/opportunity-analysis
 * Analyze market opportunities and gaps
 */
router.post('/opportunity-analysis', async (req, res) => {
  try {
    const { prdData, marketKeywords, competitorData } = req.body;

    if (!prdData) {
      return res.status(400).json({
        success: false,
        error: 'PRD data is required'
      });
    }

    const opportunities = {
      marketGaps: identifyMarketGaps(prdData, competitorData),
      underservedSegments: identifyUnderservedSegments(prdData, marketKeywords),
      emergingTrends: identifyEmergingTrends(marketKeywords),
      differentiationOpportunities: identifyDifferentiationOpportunities(prdData, competitorData),
      recommendations: generateOpportunityRecommendations(prdData),
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      data: opportunities
    });

  } catch (error) {
    logger.error('Opportunity analysis failed:', error);
    res.status(500).json({
      success: false,
      error: 'Opportunity analysis failed'
    });
  }
});

/**
 * Calculate competitive score based on intelligence data
 */
function calculateCompetitiveScore(intelligenceData) {
  let score = 0;
  let factors = 0;

  // Market size factor (0-25 points)
  if (intelligenceData.marketSize?.totalAddressableMarket) {
    score += 20; // Good market size
    factors++;
  }

  // Competitor analysis factor (0-25 points)
  if (intelligenceData.competitorAnalysis?.competitors?.length > 0) {
    const competitorCount = intelligenceData.competitorAnalysis.competitors.length;
    if (competitorCount < 5) {
      score += 25; // Low competition
    } else if (competitorCount < 10) {
      score += 15; // Moderate competition
    } else {
      score += 5; // High competition
    }
    factors++;
  }

  // Industry trends factor (0-25 points)
  if (intelligenceData.industryTrends?.trends?.length > 0) {
    const positiveTrends = intelligenceData.industryTrends.trends.filter(
      trend => trend.impact === 'High' || trend.impact === 'Very High'
    );
    score += Math.min(positiveTrends.length * 5, 25);
    factors++;
  }

  // Market positioning factor (0-25 points)
  if (intelligenceData.marketPositioning?.opportunities?.length > 0) {
    score += Math.min(intelligenceData.marketPositioning.opportunities.length * 6, 25);
    factors++;
  }

  return factors > 0 ? Math.round(score / factors) : 0;
}

/**
 * Generate competitive recommendations
 */
function generateCompetitiveRecommendations(intelligenceData) {
  const recommendations = [];

  if (intelligenceData.competitorAnalysis?.marketSaturation === 'High') {
    recommendations.push('Consider niche positioning to differentiate from crowded market');
  }

  if (intelligenceData.marketPositioning?.opportunities?.length > 0) {
    recommendations.push('Focus on identified market opportunities for competitive advantage');
  }

  if (intelligenceData.industryTrends?.keyDrivers?.length > 0) {
    recommendations.push('Align product strategy with key industry drivers');
  }

  if (intelligenceData.marketSize?.growthRate && intelligenceData.marketSize.growthRate.includes('%')) {
    recommendations.push('Leverage market growth momentum for product positioning');
  }

  return recommendations;
}

/**
 * Generate monitoring summary
 */
function generateMonitoringSummary(monitoringResults) {
  const successful = monitoringResults.filter(r => r.status === 'fulfilled').length;
  const total = monitoringResults.length;
  
  return {
    totalCompetitors: total,
    successfullyMonitored: successful,
    monitoringRate: Math.round((successful / total) * 100),
    status: successful === total ? 'Complete' : 'Partial'
  };
}

/**
 * Benchmark product positioning
 */
function benchmarkProductPositioning(prdData, competitors) {
  return {
    positioning: 'Differentiated',
    strengths: ['Unique value proposition', 'Clear target market'],
    weaknesses: ['Limited market validation'],
    recommendations: ['Strengthen competitive differentiation']
  };
}

/**
 * Benchmark features
 */
function benchmarkFeatures(prdData, competitors) {
  return {
    featureComparison: competitors.map(competitor => ({
      name: competitor,
      features: ['Core functionality', 'Advanced features'],
      gaps: ['Integration capabilities']
    })),
    recommendations: ['Add missing core features', 'Develop unique differentiators']
  };
}

/**
 * Benchmark market position
 */
function benchmarkMarketPosition(prdData, competitors) {
  return {
    marketPosition: 'Challenger',
    competitiveAdvantage: 'Innovation',
    threats: ['Market leaders', 'New entrants'],
    recommendations: ['Build strong moats', 'Focus on customer success']
  };
}

/**
 * Generate benchmark recommendations
 */
function generateBenchmarkRecommendations(prdData, competitors) {
  return [
    'Focus on unique value proposition',
    'Build strong competitive moats',
    'Monitor competitor moves closely',
    'Invest in customer success'
  ];
}

/**
 * Identify market gaps
 */
function identifyMarketGaps(prdData, competitorData) {
  return [
    'Underserved SMB segment',
    'Industry-specific customization',
    'Integration with legacy systems'
  ];
}

/**
 * Identify underserved segments
 */
function identifyUnderservedSegments(prdData, marketKeywords) {
  return [
    'Small to medium businesses',
    'Non-technical users',
    'Emerging markets'
  ];
}

/**
 * Identify emerging trends
 */
function identifyEmergingTrends(marketKeywords) {
  return [
    'AI-powered automation',
    'Mobile-first approach',
    'API-first architecture'
  ];
}

/**
 * Identify differentiation opportunities
 */
function identifyDifferentiationOpportunities(prdData, competitorData) {
  return [
    'Superior user experience',
    'Industry-specific features',
    'Better pricing model'
  ];
}

/**
 * Generate opportunity recommendations
 */
function generateOpportunityRecommendations(prdData) {
  return [
    'Focus on identified market gaps',
    'Develop unique differentiators',
    'Build strong customer relationships',
    'Invest in innovation'
  ];
}

module.exports = router;
