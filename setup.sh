#!/bin/bash

# PRD Validation Tool Setup Script
echo "🚀 Setting up PRD Validation Tool..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16+ and try again."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo "❌ Node.js version 16+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# Install root dependencies
echo "📦 Installing root dependencies..."
npm install

# Install server dependencies
echo "📦 Installing server dependencies..."
cd server
npm install
cd ..

# Install client dependencies
echo "📦 Installing client dependencies..."
cd client
npm install
cd ..

# Create environment file if it doesn't exist
if [ ! -f "server/.env" ]; then
    echo "📝 Creating environment file..."
    cp server/env.example server/.env
    echo "⚠️  Please edit server/.env with your configuration"
else
    echo "✅ Environment file already exists"
fi

# Create uploads directory
echo "📁 Creating uploads directory..."
mkdir -p server/uploads
mkdir -p server/logs

# Create logs directory
echo "📁 Creating logs directory..."
mkdir -p logs

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit server/.env with your API keys and database configuration"
echo "2. Set up PostgreSQL database (optional - app will work without it)"
echo "3. Run 'npm run dev' to start both frontend and backend"
echo ""
echo "Default URLs:"
echo "  Frontend: http://localhost:3000"
echo "  Backend:  http://localhost:5000"
echo ""
echo "Demo credentials:"
echo "  Email: demo@dataplane.com"
echo "  Password: demo123"
echo ""
