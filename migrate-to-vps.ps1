# PowerShell script to migrate McLeave to VPS
# Run this on your Windows machine

param(
    [Parameter(Mandatory=$true)]
    [string]$ServerIP,
    
    [Parameter(Mandatory=$false)]
    [string]$Username = "root"
)

Write-Host "🚀 McLeave VPS Migration Script" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green
Write-Host ""

# Check if database exists
$dbPath = ".\server\mcleave.db"
if (-not (Test-Path $dbPath)) {
    Write-Host "❌ Database not found at: $dbPath" -ForegroundColor Red
    exit 1
}

Write-Host "📊 Database found: $dbPath" -ForegroundColor Green

# Get database stats
$dbSize = (Get-Item $dbPath).Length / 1KB
Write-Host "   Size: $([math]::Round($dbSize, 2)) KB" -ForegroundColor Gray

# Test SSH connection
Write-Host ""
Write-Host "🔌 Testing connection to $ServerIP..." -ForegroundColor Yellow
try {
    $result = ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=no "${Username}@${ServerIP}" "echo 'Connected'" 2>&1
    if ($result -match "Connected") {
        Write-Host "✅ SSH connection successful" -ForegroundColor Green
    } else {
        Write-Host "❌ SSH connection failed" -ForegroundColor Red
        Write-Host $result
        exit 1
    }
} catch {
    Write-Host "❌ SSH connection failed: $_" -ForegroundColor Red
    exit 1
}

# Create remote directory
Write-Host ""
Write-Host "📁 Creating remote directory..." -ForegroundColor Yellow
ssh "${Username}@${ServerIP}" "mkdir -p ~/mcleave/data"

# Copy database
Write-Host ""
Write-Host "📤 Copying database to VPS..." -ForegroundColor Yellow
scp "${dbPath}" "${Username}@${ServerIP}:~/mcleave/data/"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Database copied successfully" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to copy database" -ForegroundColor Red
    exit 1
}

# Check if docker-compose exists on server
Write-Host ""
Write-Host "🔍 Checking Docker installation..." -ForegroundColor Yellow
$dockerCheck = ssh "${Username}@${ServerIP}" "which docker && which docker-compose" 2>&1

if ($dockerCheck -match "docker") {
    Write-Host "✅ Docker is installed" -ForegroundColor Green
} else {
    Write-Host "⚠️  Docker not found. You'll need to install it on the server first." -ForegroundColor Yellow
    Write-Host "   Run: curl -fsSL https://get.docker.com | sh" -ForegroundColor Gray
}

Write-Host ""
Write-Host "✅ Migration preparation complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. SSH to your server: ssh ${Username}@${ServerIP}" -ForegroundColor White
Write-Host "2. Navigate to project: cd ~/mcleave" -ForegroundColor White
Write-Host "3. Run: docker-compose up -d" -ForegroundColor White
Write-Host ""
Write-Host "📖 Full guide: VPS-SETUP.md"
