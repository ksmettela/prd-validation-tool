const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

class DocumentParser {
  constructor() {
    this.supportedFormats = ['.pdf', '.docx', '.doc', '.txt'];
  }

  /**
   * Parse document based on file extension
   * @param {string} filePath - Path to the document file
   * @returns {Object} Parsed document content and metadata
   */
  async parseDocument(filePath) {
    try {
      const extension = path.extname(filePath).toLowerCase();
      
      if (!this.supportedFormats.includes(extension)) {
        throw new Error(`Unsupported file format: ${extension}`);
      }

      let content, metadata;

      switch (extension) {
        case '.pdf':
          ({ content, metadata } = await this.parsePDF(filePath));
          break;
        case '.docx':
        case '.doc':
          ({ content, metadata } = await this.parseDOCX(filePath));
          break;
        case '.txt':
          ({ content, metadata } = await this.parseTXT(filePath));
          break;
      }

      // Extract structured information from content
      const structuredData = this.extractStructuredData(content);

      return {
        success: true,
        content,
        metadata: {
          ...metadata,
          fileSize: (await fs.stat(filePath)).size,
          parsedAt: new Date().toISOString()
        },
        structuredData
      };

    } catch (error) {
      logger.error('Document parsing failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Parse PDF documents
   */
  async parsePDF(filePath) {
    const dataBuffer = await fs.readFile(filePath);
    const pdfData = await pdfParse(dataBuffer);
    
    return {
      content: pdfData.text,
      metadata: {
        format: 'pdf',
        pages: pdfData.numpages,
        title: pdfData.info?.Title || '',
        author: pdfData.info?.Author || '',
        subject: pdfData.info?.Subject || '',
        creator: pdfData.info?.Creator || '',
        producer: pdfData.info?.Producer || ''
      }
    };
  }

  /**
   * Parse DOCX/DOC documents
   */
  async parseDOCX(filePath) {
    const dataBuffer = await fs.readFile(filePath);
    const result = await mammoth.extractRawText({ buffer: dataBuffer });
    
    return {
      content: result.value,
      metadata: {
        format: 'docx',
        messages: result.messages || []
      }
    };
  }

  /**
   * Parse TXT documents
   */
  async parseTXT(filePath) {
    const content = await fs.readFile(filePath, 'utf-8');
    
    return {
      content,
      metadata: {
        format: 'txt'
      }
    };
  }

  /**
   * Extract structured data from PRD content
   */
  extractStructuredData(content) {
    const structuredData = {
      sections: {},
      metrics: {},
      stakeholders: [],
      features: [],
      risks: [],
      timeline: null
    };

    // Extract sections using common PRD patterns
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

    // Find sections in content
    const lines = content.split('\n');
    let currentSection = null;
    let sectionContent = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Check if line matches a section header
      let matchedSection = null;
      for (const [sectionName, pattern] of Object.entries(sectionPatterns)) {
        if (pattern.test(line)) {
          matchedSection = sectionName;
          break;
        }
      }

      if (matchedSection) {
        // Save previous section
        if (currentSection && sectionContent.length > 0) {
          structuredData.sections[currentSection] = sectionContent.join('\n');
        }
        
        // Start new section
        currentSection = matchedSection;
        sectionContent = [line];
      } else if (currentSection && line.length > 0) {
        sectionContent.push(line);
      }
    }

    // Save last section
    if (currentSection && sectionContent.length > 0) {
      structuredData.sections[currentSection] = sectionContent.join('\n');
    }

    // Extract metrics and KPIs
    structuredData.metrics = this.extractMetrics(content);
    
    // Extract stakeholders
    structuredData.stakeholders = this.extractStakeholders(content);
    
    // Extract features
    structuredData.features = this.extractFeatures(content);
    
    // Extract risks
    structuredData.risks = this.extractRisks(content);

    return structuredData;
  }

  /**
   * Extract metrics and KPIs from content
   */
  extractMetrics(content) {
    const metrics = [];
    const metricPatterns = [
      /(\d+(?:\.\d+)?%)\s*(?:increase|decrease|growth|reduction)/gi,
      /(\d+(?:,\d{3})*)\s*(?:users|customers|revenue|conversions)/gi,
      /(?:target|goal|objective).*?(\d+(?:\.\d+)?)/gi
    ];

    metricPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        metrics.push(...matches);
      }
    });

    return [...new Set(metrics)]; // Remove duplicates
  }

  /**
   * Extract stakeholders from content
   */
  extractStakeholders(content) {
    const stakeholders = [];
    const stakeholderPatterns = [
      /(?:stakeholders?|users?|customers?|target\s+audience).*?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi,
      /(?:for|targeting)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi
    ];

    stakeholderPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        stakeholders.push(...matches.map(match => match.trim()));
      }
    });

    return [...new Set(stakeholders)];
  }

  /**
   * Extract features from content
   */
  extractFeatures(content) {
    const features = [];
    const featurePatterns = [
      /(?:feature|functionality|capability):\s*([^\n]+)/gi,
      /(?:will|should|must)\s+(?:support|provide|enable|allow)\s+([^\n]+)/gi
    ];

    featurePatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        features.push(...matches.map(match => match.trim()));
      }
    });

    return [...new Set(features)];
  }

  /**
   * Extract risks from content
   */
  extractRisks(content) {
    const risks = [];
    const riskPatterns = [
      /(?:risk|challenge|concern|threat):\s*([^\n]+)/gi,
      /(?:potential|possible|likely)\s+(?:risk|issue|problem)\s*([^\n]+)/gi
    ];

    riskPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        risks.push(...matches.map(match => match.trim()));
      }
    });

    return [...new Set(risks)];
  }
}

module.exports = DocumentParser;
