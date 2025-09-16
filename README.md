# PRD Validation Tool

An AI-powered platform for validating and analyzing Product Requirements Documents (PRDs) with competitive intelligence and market insights.

## 🚀 Features

### Core Functionality
- **Document Analysis**: Parse and analyze PRDs from PDF, DOCX, DOC, and TXT formats
- **AI-Powered Validation**: Comprehensive scoring using GPT-4 and Claude models
- **Competitive Intelligence**: Real-time market analysis and competitor tracking
- **Interactive Dashboard**: Visual insights and analytics
- **Collaboration Tools**: Team-based project management and review workflows

### Validation Framework
- **Completeness Analysis**: Check for required PRD sections and content quality
- **Clarity Assessment**: Evaluate language clarity and structure
- **Market Fit Validation**: Analyze market positioning and opportunity
- **Competitive Positioning**: Compare against industry standards and competitors

### Competitive Intelligence
- **Market Size Analysis**: Total addressable market and growth trends
- **Competitor Tracking**: Real-time monitoring of competitor activities
- **Industry Trends**: Emerging opportunities and market drivers
- **Funding Intelligence**: Track competitor funding and market maturity

## 🛠️ Technology Stack

### Backend
- **Node.js** with Express.js
- **PostgreSQL** for structured data
- **Vector Database** for semantic search and embeddings
- **AI Models**: OpenAI GPT-4 and Anthropic Claude
- **File Processing**: PDF parsing, DOCX processing
- **APIs**: Crunchbase, Similarweb, G2 integration

### Frontend
- **React** with TypeScript
- **Material-UI** for modern, responsive design
- **Recharts** for data visualization
- **React Router** for navigation
- **Axios** for API communication

## 📋 Prerequisites

- Node.js 16+ and npm
- PostgreSQL 12+
- OpenAI API key
- Anthropic API key (optional)
- Competitive intelligence API keys (optional)

## 🚀 Quick Start

### 1. Clone and Install

\`\`\`bash
git clone <repository-url>
cd prd-validation-tool
npm run install-all
\`\`\`

### 2. Environment Setup

\`\`\`bash
# Copy environment template
cp server/env.example server/.env

# Edit server/.env with your configuration
# Add your API keys and database credentials
\`\`\`

### 3. Database Setup

\`\`\`bash
# Create PostgreSQL database
createdb prd_validation

# Run migrations (when implemented)
npm run migrate
\`\`\`

### 4. Start Development Servers

\`\`\`bash
# Start both frontend and backend
npm run dev

# Or start individually
npm run server  # Backend on http://localhost:5000
npm run client  # Frontend on http://localhost:3000
\`\`\`

## 📁 Project Structure

\`\`\`
prd-validation-tool/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Application pages
│   │   ├── contexts/       # React contexts (Auth, etc.)
│   │   ├── services/       # API service functions
│   │   └── utils/          # Utility functions
├── server/                 # Node.js backend
│   ├── routes/             # API route handlers
│   ├── services/           # Business logic services
│   ├── middleware/         # Express middleware
│   ├── models/             # Database models
│   ├── utils/              # Utility functions
│   └── config/             # Configuration files
└── docs/                   # Documentation
\`\`\`

## 🔧 Configuration

### Environment Variables

Key environment variables for the server:

\`\`\`env
# AI Services
OPENAI_API_KEY=your-openai-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/prd_validation

# Security
JWT_SECRET=your-jwt-secret

# Competitive Intelligence
CRUNCHBASE_API_KEY=your-crunchbase-key
SIMILARWEB_API_KEY=your-similarweb-key
\`\`\`

### API Endpoints

#### Document Management
- \`POST /api/documents/upload\` - Upload and parse PRD documents
- \`POST /api/documents/parse-text\` - Parse PRD content from text
- \`GET /api/documents/supported-formats\` - Get supported file formats

#### Validation
- \`POST /api/validation/analyze\` - Comprehensive PRD analysis
- \`POST /api/validation/quick-score\` - Quick validation score
- \`POST /api/validation/compare\` - Compare multiple PRDs

#### Competitive Intelligence
- \`POST /api/competitive/analyze\` - Get competitive intelligence
- \`POST /api/competitive/monitor\` - Monitor competitors
- \`GET /api/competitive/trends/:industry\` - Industry trends

#### Analytics
- \`GET /api/analytics/dashboard\` - Dashboard analytics
- \`GET /api/analytics/prd-trends\` - PRD validation trends
- \`GET /api/analytics/team-performance\` - Team performance metrics

## 🎯 Usage

### 1. User Registration/Login
- Create an account or use demo credentials
- Access the dashboard with your account

### 2. Upload PRD Documents
- Navigate to "Upload PRD" page
- Drag and drop or select files (PDF, DOCX, DOC, TXT)
- Documents are automatically parsed and analyzed

### 3. Review Validation Results
- View comprehensive scoring across multiple dimensions
- Get AI-powered recommendations for improvement
- Export results in various formats

### 4. Competitive Analysis
- Access real-time competitive intelligence
- Monitor market trends and competitor activities
- Get strategic recommendations

### 5. Team Collaboration
- Create projects to organize PRDs
- Invite team members and assign roles
- Track team performance and progress

## 📊 Scoring Framework

### Overall Score Calculation
The overall PRD score is calculated from multiple dimensions:

- **Completeness (40%)**: Required sections and content quality
- **Clarity (25%)**: Language clarity and structure
- **Market Fit (20%)**: Market validation and positioning
- **Competitive Position (15%)**: Competitive differentiation

### Score Ranges
- **Excellent (80-100%)**: Comprehensive, market-ready PRD
- **Good (60-79%)**: Well-structured with minor gaps
- **Fair (40-59%)**: Basic structure with significant gaps
- **Poor (0-39%)**: Incomplete or poorly structured

## 🔒 Security

- JWT-based authentication
- Role-based access control
- Input validation and sanitization
- File upload security
- API rate limiting
- CORS configuration

## 🧪 Testing

\`\`\`bash
# Run backend tests
cd server && npm test

# Run frontend tests
cd client && npm test

# Run integration tests
npm run test:integration
\`\`\`

## 🚀 Deployment

### Production Build

\`\`\`bash
# Build frontend
npm run build

# Start production server
NODE_ENV=production npm start
\`\`\`

### Docker Deployment

\`\`\`bash
# Build Docker image
docker build -t prd-validation-tool .

# Run with Docker Compose
docker-compose up -d
\`\`\`

## 📈 Roadmap

### Phase 1 (Current)
- ✅ Core document parsing and validation
- ✅ AI-powered analysis framework
- ✅ Basic competitive intelligence
- ✅ User dashboard and analytics

### Phase 2 (Next)
- 🔄 Advanced competitive monitoring
- 🔄 Team collaboration features
- 🔄 API integrations
- 🔄 Mobile optimization

### Phase 3 (Future)
- 📋 Industry-specific templates
- 📋 Predictive analytics
- 📋 Marketplace integrations
- 📋 Global expansion features

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

