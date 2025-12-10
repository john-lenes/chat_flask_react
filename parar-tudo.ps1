# ====================================
# Script para PARAR tudo de uma vez
# ====================================

Write-Host @"

╔════════════════════════════════════════════╗
║        🛑 PARANDO TODOS OS SERVIÇOS       ║
╚════════════════════════════════════════════╝

"@ -ForegroundColor Red

Write-Host "🔍 Buscando processos..." -ForegroundColor Yellow

$processos = Get-Process python,node,ngrok -ErrorAction SilentlyContinue

if ($processos) {
    Write-Host "`n📋 Processos encontrados:`n" -ForegroundColor Cyan
    $processos | Format-Table Id, ProcessName, StartTime -AutoSize
    
    Write-Host "`n💀 Encerrando processos..." -ForegroundColor Red
    $processos | Stop-Process -Force -ErrorAction SilentlyContinue
    
    Start-Sleep -Seconds 2
    
    Write-Host "`n✅ Todos os serviços foram parados!`n" -ForegroundColor Green
} else {
    Write-Host "`n✅ Nenhum processo em execução!`n" -ForegroundColor Green
}

Write-Host "Pressione qualquer tecla para sair..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
