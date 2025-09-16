const axios = require('axios');
const cheerio = require('cheerio');
const logger = require('../utils/logger');

class CompetitiveIntelligenceService {
  constructor() {
    this.crunchbaseApiKey = process.env.CRUNCHBASE_API_KEY;
    this.similarwebApiKey = process.env.SIMILARWEB_API_KEY;
    this.g2ApiKey = process.env.G2_API_KEY;
    
    this.requestConfig = {
      timeout: 10000,
      headers: {
        'User-Agent': 'PRD-Validation-Tool/1.0'
      }
    };
  }

  /**
   * Get comprehensive competitive intelligence for a product/market
   * @param {Object} prdData - PRD data containing product information
   * @returns {Object} Competitive intelligence data
   */
  async getCompetitiveIntelligence(prdData) {
    try {
      const marketKeywords = this.extractMarketKeywords(prdData);
      const competitors = this.extractCompetitors(prdData);
      
      const intelligencePromises = [
        this.getMarketSize(marketKeywords),
        this.getCompetitorAnalysis(competitors),
        this.getIndustryTrends(marketKeywords),
        this.getFundingData(competitors),
        this.getMarketPositioning(marketKeywords)
      ];

      const results = await Promise.allSettled(intelligencePromises);
      
      const intelligence = {
        marketSize: results[0].status === 'fulfilled' ? results[0].value : null,
        competitorAnalysis: results[1].status === 'fulfilled' ? results[1].value : null,
        industryTrends: results[2].status === 'fulfilled' ? results[2].value : null,
        fundingData: results[3].status === 'fulfilled' ? results[3].value : null,
        marketPositioning: results[4].status === 'fulfilled' ? results[4].value : null,
        timestamp: new Date().toISOString()
      };

      return {
        success: true,
        data: intelligence
      };

    } catch (error) {
      logger.error('Competitive intelligence gathering failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Extract market keywords from PRD data
   */
  extractMarketKeywords(prdData) {
    const keywords = new Set();
    
    // Extract from problem statement
    if (prdData.sections?.problemStatement) {
      const problemText = prdData.sections.problemStatement.toLowerCase();
      const marketTerms = problemText.match(/\b(?:saas|software|platform|app|service|tool|solution|market|industry|business|enterprise|consumer|b2b|b2c)\b/g);
      if (marketTerms) marketTerms.forEach(term => keywords.add(term));
    }

    // Extract from solution
    if (prdData.sections?.solution) {
      const solutionText = prdData.sections.solution.toLowerCase();
      const techTerms = solutionText.match(/\b(?:ai|ml|blockchain|cloud|mobile|web|api|integration|automation|analytics|dashboard|reporting)\b/g);
      if (techTerms) techTerms.forEach(term => keywords.add(term));
    }

    // Extract from target market
    if (prdData.sections?.targetMarket) {
      const marketText = prdData.sections.targetMarket.toLowerCase();
      const industryTerms = marketText.match(/\b(?:healthcare|finance|education|retail|manufacturing|logistics|marketing|sales|hr|it|security)\b/g);
      if (industryTerms) industryTerms.forEach(term => keywords.add(term));
    }

    return Array.from(keywords);
  }

  /**
   * Extract competitor information from PRD
   */
  extractCompetitors(prdData) {
    const competitors = [];
    
    if (prdData.sections?.competitiveAnalysis) {
      const analysisText = prdData.sections.competitiveAnalysis;
      
      // Look for company names (capitalized words)
      const companyMatches = analysisText.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g);
      if (companyMatches) {
        competitors.push(...companyMatches.filter(name => 
          name.length > 2 && 
          !['The', 'This', 'That', 'These', 'Those', 'Product', 'Service', 'Solution'].includes(name)
        ));
      }
    }

    return [...new Set(competitors)];
  }

  /**
   * Get market size data
   */
  async getMarketSize(keywords) {
    try {
      // Simulate market size data (in real implementation, integrate with market research APIs)
      const marketSizes = {
        'saas': { size: '$195.2B', growth: '18.4%', year: '2024' },
        'ai': { size: '$136.6B', growth: '37.3%', year: '2024' },
        'cloud': { size: '$623.3B', growth: '21.7%', year: '2024' },
        'mobile': { size: '$935.2B', growth: '12.8%', year: '2024' },
        'healthcare': { size: '$4.5T', growth: '5.2%', year: '2024' },
        'finance': { size: '$12.6T', growth: '3.8%', year: '2024' }
      };

      const relevantMarkets = keywords.filter(keyword => marketSizes[keyword]);
      
      return {
        relevantMarkets: relevantMarkets.map(keyword => ({
          keyword,
          ...marketSizes[keyword]
        })),
        totalAddressableMarket: relevantMarkets.length > 0 ? 
          marketSizes[relevantMarkets[0]].size : 'Unknown',
        growthRate: relevantMarkets.length > 0 ? 
          marketSizes[relevantMarkets[0]].growth : 'Unknown'
      };

    } catch (error) {
      logger.error('Market size analysis failed:', error);
      return null;
    }
  }

  /**
   * Get competitor analysis
   */
  async getCompetitorAnalysis(competitors) {
    try {
      const competitorData = [];

      for (const competitor of competitors.slice(0, 5)) { // Limit to top 5 competitors
        try {
          // Simulate competitor data (in real implementation, use Crunchbase API)
          const competitorInfo = await this.getCompetitorInfo(competitor);
          competitorData.push(competitorInfo);
        } catch (error) {
          logger.warn(`Failed to get data for competitor: ${competitor}`, error);
        }
      }

      return {
        competitors: competitorData,
        totalCompetitors: competitors.length,
        marketSaturation: competitorData.length > 10 ? 'High' : 
                         competitorData.length > 5 ? 'Medium' : 'Low'
      };

    } catch (error) {
      logger.error('Competitor analysis failed:', error);
      return null;
    }
  }

  /**
   * Get individual competitor information
   */
  async getCompetitorInfo(competitorName) {
    // Simulate competitor data (replace with actual API calls)
    const mockData = {
      name: competitorName,
      founded: Math.floor(Math.random() * 20) + 2004,
      employees: Math.floor(Math.random() * 1000) + 10,
      funding: `$${Math.floor(Math.random() * 100)}M`,
      stage: ['Seed', 'Series A', 'Series B', 'Series C', 'IPO'][Math.floor(Math.random() * 5)],
      website: `https://${competitorName.toLowerCase().replace(/\s+/g, '')}.com`,
      description: `${competitorName} is a leading company in their market segment.`,
      strengths: ['Strong market presence', 'Innovative technology', 'Experienced team'],
      weaknesses: ['Limited market reach', 'High pricing', 'Complex user experience']
    };

    return mockData;
  }

  /**
   * Get industry trends
   */
  async getIndustryTrends(keywords) {
    try {
      // Simulate industry trends (in real implementation, use news APIs or research databases)
      const trends = {
        'ai': [
          { trend: 'AI Integration in Business Processes', impact: 'High', timeline: '2024-2025' },
          { trend: 'Generative AI Adoption', impact: 'Very High', timeline: '2024-2026' },
          { trend: 'AI Ethics and Regulation', impact: 'Medium', timeline: '2025-2027' }
        ],
        'saas': [
          { trend: 'Vertical SaaS Solutions', impact: 'High', timeline: '2024-2025' },
          { trend: 'AI-Powered SaaS Features', impact: 'Very High', timeline: '2024-2026' },
          { trend: 'SaaS Security Focus', impact: 'High', timeline: '2024-2025' }
        ],
        'cloud': [
          { trend: 'Multi-Cloud Adoption', impact: 'High', timeline: '2024-2025' },
          { trend: 'Edge Computing Growth', impact: 'Medium', timeline: '2025-2027' },
          { trend: 'Cloud Security Enhancement', impact: 'Very High', timeline: '2024-2025' }
        ]
      };

      const relevantTrends = [];
      keywords.forEach(keyword => {
        if (trends[keyword]) {
          relevantTrends.push(...trends[keyword]);
        }
      });

      return {
        trends: relevantTrends.slice(0, 10), // Limit to top 10 trends
        keyDrivers: relevantTrends.filter(t => t.impact === 'Very High'),
        emergingOpportunities: relevantTrends.filter(t => t.timeline.includes('2025'))
      };

    } catch (error) {
      logger.error('Industry trends analysis failed:', error);
      return null;
    }
  }

  /**
   * Get funding data for competitors
   */
  async getFundingData(competitors) {
    try {
      // Simulate funding data (in real implementation, use Crunchbase API)
      const fundingData = competitors.slice(0, 5).map(competitor => ({
        name: competitor,
        totalFunding: `$${Math.floor(Math.random() * 500) + 10}M`,
        lastRound: ['Seed', 'Series A', 'Series B', 'Series C'][Math.floor(Math.random() * 4)],
        lastFundingDate: new Date(2024 - Math.floor(Math.random() * 3), Math.floor(Math.random() * 12), 1),
        investors: ['Sequoia Capital', 'Andreessen Horowitz', 'Accel', 'General Catalyst'][Math.floor(Math.random() * 4)]
      }));

      return {
        competitorFunding: fundingData,
        averageFunding: `$${Math.floor(fundingData.reduce((sum, c) => sum + parseInt(c.totalFunding.replace(/[^0-9]/g, '')), 0) / fundingData.length)}M`,
        fundingTrend: 'Increasing',
        marketMaturity: fundingData.length > 3 ? 'Mature' : 'Emerging'
      };

    } catch (error) {
      logger.error('Funding data analysis failed:', error);
      return null;
    }
  }

  /**
   * Get market positioning insights
   */
  async getMarketPositioning(keywords) {
    try {
      // Simulate market positioning data
      const positioning = {
        marketGaps: [
          'Underserved SMB segment',
          'Integration with legacy systems',
          'Industry-specific customization'
        ],
        opportunities: [
          'AI-powered automation',
          'Mobile-first approach',
          'API-first architecture',
          'Real-time collaboration'
        ],
        threats: [
          'Large incumbent players',
          'Open source alternatives',
          'Economic downturn impact',
          'Regulatory changes'
        ],
        recommendations: [
          'Focus on niche market differentiation',
          'Build strong technical moats',
          'Develop strategic partnerships',
          'Invest in customer success'
        ]
      };

      return positioning;

    } catch (error) {
      logger.error('Market positioning analysis failed:', error);
      return null;
    }
  }

  /**
   * Get real-time competitor monitoring data
   */
  async getCompetitorMonitoring(competitorName) {
    try {
      // Simulate real-time monitoring (in real implementation, use web scraping or APIs)
      const monitoringData = {
        website: {
          traffic: Math.floor(Math.random() * 1000000) + 10000,
          growth: Math.floor(Math.random() * 100) - 50, // -50% to +50%
          keywords: ['product management', 'saas', 'collaboration']
        },
        social: {
          twitter: Math.floor(Math.random() * 100000) + 1000,
          linkedin: Math.floor(Math.random() * 50000) + 500,
          growth: Math.floor(Math.random() * 50) + 10
        },
        news: [
          { headline: `${competitorName} raises new funding round`, date: new Date(), sentiment: 'positive' },
          { headline: `${competitorName} launches new feature`, date: new Date(), sentiment: 'neutral' }
        ]
      };

      return monitoringData;

    } catch (error) {
      logger.error('Competitor monitoring failed:', error);
      return null;
    }
  }
}

module.exports = CompetitiveIntelligenceService;
