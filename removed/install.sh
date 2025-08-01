#!/bin/bash

echo "=== Nexlinx EMS Installation Script ==="
echo ""

# Check Node.js version
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ or 20+"
    exit 1
fi

NODE_VERSION=$(node -v | cut -c2-)
echo "✅ Node.js version: $NODE_VERSION"

# Check PostgreSQL
if ! command -v psql &> /dev/null; then
    echo "⚠️  PostgreSQL client not found. Please ensure PostgreSQL is installed and accessible."
fi

echo ""
echo "📦 Installing dependencies..."
npm install

echo ""
echo "⚙️  Setting up environment..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo "✅ Created .env file from example"
    echo "⚠️  Please edit .env file with your database credentials"
else
    echo "✅ .env file already exists"
fi

echo ""
echo "🗄️  Database setup..."
echo "Please ensure you have:"
echo "1. Created a PostgreSQL database"
echo "2. Updated DATABASE_URL in .env file"
echo "3. Run: npm run db:push"

echo ""
echo "🚀 To start the application:"
echo "   npm run dev     # Development mode"
echo "   npm run build   # Build for production"
echo "   npm start       # Production mode"
echo ""
echo "🌐 Application will be available at:"
echo "   Main Interface: http://localhost:5000"
echo "   Services API: http://localhost:5001"
echo "   WhatsApp Services: http://localhost:5002"
echo ""
echo "🔐 Default admin login:"
echo "   Username: admin"
echo "   Password: admin123"
echo "   (Change password immediately after first login)"

echo ""
echo "✅ Installation complete!"