const OpenAI = require('openai');
const Anthropic = require('@anthropic-ai/sdk');
const logger = require('../utils/logger');

class AIAnalysisService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });
  }

  /**
   * Analyze PRD content using AI models
   * @param {Object} prdData - Structured PRD data
   * @param {string} analysisType - Type of analysis to perform
   * @returns {Object} Analysis results
   */
  async analyzePRD(prdData, analysisType = 'comprehensive') {
    try {
      const analysisPromises = [];

      switch (analysisType) {
        case 'comprehensive':
          analysisPromises.push(
            this.analyzeCompleteness(prdData),
            this.analyzeClarity(prdData),
            this.analyzeMarketFit(prdData),
            this.analyzeCompetitivePositioning(prdData),
            this.generateRecommendations(prdData)
          );
          break;
        case 'completeness':
          analysisPromises.push(this.analyzeCompleteness(prdData));
          break;
        case 'clarity':
          analysisPromises.push(this.analyzeClarity(prdData));
          break;
        case 'market-fit':
          analysisPromises.push(this.analyzeMarketFit(prdData));
          break;
        default:
          analysisPromises.push(this.analyzeCompleteness(prdData));
      }

      const results = await Promise.all(analysisPromises);
      
      return {
        success: true,
        analysisType,
        results: results.reduce((acc, result) => ({ ...acc, ...result }), {}),
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error('AI analysis failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Analyze PRD completeness using GPT-4
   */
  async analyzeCompleteness(prdData) {
    const prompt = `
    Analyze the completeness of this Product Requirements Document (PRD) and provide a detailed assessment.
    
    PRD Content:
    ${JSON.stringify(prdData, null, 2)}
    
    Please evaluate:
    1. Required sections present/missing
    2. Quality of content in each section
    3. Completeness score (0-100)
    4. Specific recommendations for improvement
    
    Respond in JSON format with the following structure:
    {
      "completenessScore": number,
      "sectionAnalysis": {
        "problemStatement": { "present": boolean, "quality": number, "issues": [] },
        "solution": { "present": boolean, "quality": number, "issues": [] },
        "targetMarket": { "present": boolean, "quality": number, "issues": [] },
        "successMetrics": { "present": boolean, "quality": number, "issues": [] },
        "features": { "present": boolean, "quality": number, "issues": [] }
      },
      "missingElements": [],
      "recommendations": [],
      "overallAssessment": "string"
    }
    `;

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 2000
      });

      const analysis = JSON.parse(response.choices[0].message.content);
      return { completenessAnalysis: analysis };

    } catch (error) {
      logger.error('Completeness analysis failed:', error);
      return { completenessAnalysis: { error: error.message } };
    }
  }

  /**
   * Analyze PRD clarity using Claude
   */
  async analyzeClarity(prdData) {
    const prompt = `
    Analyze the clarity and readability of this Product Requirements Document (PRD).
    
    PRD Content:
    ${JSON.stringify(prdData, null, 2)}
    
    Evaluate:
    1. Language clarity and precision
    2. Structure and organization
    3. Ambiguities or unclear statements
    4. Technical vs. business language balance
    5. Clarity score (0-100)
    
    Respond in JSON format:
    {
      "clarityScore": number,
      "strengths": [],
      "areasForImprovement": [],
      "ambiguousStatements": [],
      "recommendations": [],
      "overallAssessment": "string"
    }
    `;

    try {
      const response = await this.anthropic.messages.create({
        model: "claude-3-sonnet-20240229",
        max_tokens: 2000,
        temperature: 0.3,
        messages: [{ role: "user", content: prompt }]
      });

      const analysis = JSON.parse(response.content[0].text);
      return { clarityAnalysis: analysis };

    } catch (error) {
      logger.error('Clarity analysis failed:', error);
      return { clarityAnalysis: { error: error.message } };
    }
  }

  /**
   * Analyze market fit using AI
   */
  async analyzeMarketFit(prdData) {
    const prompt = `
    Analyze the market fit and positioning of this product based on the PRD.
    
    PRD Content:
    ${JSON.stringify(prdData, null, 2)}
    
    Evaluate:
    1. Market opportunity size and validation
    2. Target audience definition
    3. Problem-solution fit
    4. Competitive differentiation
    5. Market fit score (0-100)
    
    Respond in JSON format:
    {
      "marketFitScore": number,
      "marketOpportunity": {
        "size": "string",
        "validation": "string",
        "trends": []
      },
      "targetAudience": {
        "defined": boolean,
        "clarity": number,
        "sizing": "string"
      },
      "problemSolutionFit": {
        "problemClarity": number,
        "solutionAlignment": number,
        "validation": "string"
      },
      "competitiveAdvantage": {
        "differentiation": "string",
        "moats": [],
        "risks": []
      },
      "recommendations": [],
      "overallAssessment": "string"
    }
    `;

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 2000
      });

      const analysis = JSON.parse(response.choices[0].message.content);
      return { marketFitAnalysis: analysis };

    } catch (error) {
      logger.error('Market fit analysis failed:', error);
      return { marketFitAnalysis: { error: error.message } };
    }
  }

  /**
   * Analyze competitive positioning
   */
  async analyzeCompetitivePositioning(prdData) {
    const prompt = `
    Analyze the competitive positioning and market landscape for this product.
    
    PRD Content:
    ${JSON.stringify(prdData, null, 2)}
    
    Evaluate:
    1. Competitive landscape analysis
    2. Positioning strategy
    3. Differentiation opportunities
    4. Competitive threats
    5. Positioning score (0-100)
    
    Respond in JSON format:
    {
      "positioningScore": number,
      "competitiveLandscape": {
        "directCompetitors": [],
        "indirectCompetitors": [],
        "marketGaps": []
      },
      "positioningStrategy": {
        "valueProposition": "string",
        "targetSegments": [],
        "differentiation": []
      },
      "competitiveThreats": [],
      "opportunities": [],
      "recommendations": [],
      "overallAssessment": "string"
    }
    `;

    try {
      const response = await this.anthropic.messages.create({
        model: "claude-3-sonnet-20240229",
        max_tokens: 2000,
        temperature: 0.3,
        messages: [{ role: "user", content: prompt }]
      });

      const analysis = JSON.parse(response.content[0].text);
      return { competitiveAnalysis: analysis };

    } catch (error) {
      logger.error('Competitive analysis failed:', error);
      return { competitiveAnalysis: { error: error.message } };
    }
  }

  /**
   * Generate actionable recommendations
   */
  async generateRecommendations(prdData) {
    const prompt = `
    Generate specific, actionable recommendations to improve this PRD.
    
    PRD Content:
    ${JSON.stringify(prdData, null, 2)}
    
    Provide:
    1. High-priority improvements
    2. Content enhancements
    3. Structural improvements
    4. Research recommendations
    5. Timeline suggestions
    
    Respond in JSON format:
    {
      "highPriority": [
        {
          "title": "string",
          "description": "string",
          "impact": "high|medium|low",
          "effort": "high|medium|low",
          "timeline": "string"
        }
      ],
      "contentEnhancements": [
        {
          "section": "string",
          "improvement": "string",
          "rationale": "string"
        }
      ],
      "researchRecommendations": [
        {
          "area": "string",
          "method": "string",
          "timeline": "string"
        }
      ],
      "overallRoadmap": "string"
    }
    `;

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.4,
        max_tokens: 2000
      });

      const analysis = JSON.parse(response.choices[0].message.content);
      return { recommendations: analysis };

    } catch (error) {
      logger.error('Recommendations generation failed:', error);
      return { recommendations: { error: error.message } };
    }
  }

  /**
   * Generate executive summary
   */
  async generateExecutiveSummary(prdData, analysisResults) {
    const prompt = `
    Generate a concise executive summary of this PRD and its validation results.
    
    PRD Content:
    ${JSON.stringify(prdData, null, 2)}
    
    Analysis Results:
    ${JSON.stringify(analysisResults, null, 2)}
    
    Create a summary suitable for executives including:
    1. Product overview (2-3 sentences)
    2. Key strengths and opportunities
    3. Critical gaps and risks
    4. Recommended next steps
    5. Overall readiness assessment
    
    Keep it under 300 words and use business-friendly language.
    `;

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 500
      });

      return {
        success: true,
        summary: response.choices[0].message.content
      };

    } catch (error) {
      logger.error('Executive summary generation failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = AIAnalysisService;
