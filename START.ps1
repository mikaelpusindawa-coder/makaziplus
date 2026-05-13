Set-Location $PSScriptRoot
Write-Host ""
Write-Host " ========================================" -ForegroundColor Green
Write-Host "   MakaziPlus - Starting Dev Servers" -ForegroundColor Green
Write-Host " ========================================" -ForegroundColor Green
Write-Host ""
Write-Host " Server : http://localhost:5000" -ForegroundColor Cyan
Write-Host " App    : http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
npm run dev
