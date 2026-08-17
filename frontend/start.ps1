# Movie Reservation Frontend - Quick Start Script
# Run this script in PowerShell to set up and start the frontend

Write-Host "🎬 Movie Reservation System - Frontend Setup" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is installed
Write-Host "Checking Node.js installation..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "✓ Node.js installed: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Node.js is not installed!" -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# Check if npm is installed
try {
    $npmVersion = npm --version
    Write-Host "✓ npm installed: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ npm is not installed!" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Check if node_modules exists
if (Test-Path "node_modules") {
    Write-Host "📦 Dependencies already installed" -ForegroundColor Green
    
    $install = Read-Host "Do you want to reinstall dependencies? (y/N)"
    if ($install -eq "y" -or $install -eq "Y") {
        Write-Host "Installing dependencies..." -ForegroundColor Yellow
        npm install
    }
} else {
    Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
    npm install
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "✗ Failed to install dependencies" -ForegroundColor Red
        exit 1
    }
    Write-Host "✓ Dependencies installed successfully" -ForegroundColor Green
}

Write-Host ""

# Check if backend is running
Write-Host "Checking backend API..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8001/health" -TimeoutSec 2 -UseBasicParsing
    Write-Host "✓ Backend API is running" -ForegroundColor Green
} catch {
    Write-Host "⚠ Backend API is not responding at http://localhost:8001" -ForegroundColor Yellow
    Write-Host "  Make sure to run 'docker compose up --build' first!" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🚀 Starting development server..." -ForegroundColor Cyan
Write-Host ""
Write-Host "Frontend will be available at: http://localhost:3000" -ForegroundColor Green
Write-Host "Backend API docs: http://localhost:8001/docs" -ForegroundColor Green
Write-Host ""
Write-Host "Default Admin Credentials:" -ForegroundColor Yellow
Write-Host "  Email: admin@example.com" -ForegroundColor White
Write-Host "  Password: change_this_admin_password" -ForegroundColor White
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Gray
Write-Host ""

# Start the dev server
npm run dev
