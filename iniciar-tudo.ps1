# ====================================
# Script COMPLETO para iniciar o chat com tunel
# ====================================
# Uso: .\iniciar-tudo.ps1

param(
    [switch]$ComTunel,
    [switch]$Local
)

$ErrorActionPreference = "Continue"

Write-Host "`n============================================" -ForegroundColor Cyan
Write-Host "     CHAT FLASK + REACT - INICIADOR" -ForegroundColor Cyan
Write-Host "============================================`n" -ForegroundColor Cyan

# Funcao para verificar se porta esta em uso
function Test-Port {
    param($Port)
    $connection = Test-NetConnection -ComputerName localhost -Port $Port -WarningAction SilentlyContinue -InformationLevel Quiet
    return $connection
}

# Funcao para matar processos nas portas
function Stop-PortProcesses {
    Write-Host "Limpando processos anteriores..." -ForegroundColor Yellow
    Get-Process python,node,ngrok -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    Write-Host "Processos limpos!`n" -ForegroundColor Green
}

# Mostrar menu se nenhum parametro foi passado
if (-not $ComTunel -and -not $Local) {
    Write-Host "Selecione o modo de execucao:`n" -ForegroundColor Yellow
    Write-Host "1. Local (apenas seu computador)"
    Write-Host "2. Com Tunel (ngrok - compartilhar com amigos)"
    Write-Host "0. Cancelar`n"
    
    $opcao = Read-Host "Opcao"
    
    switch ($opcao) {
        "1" { $Local = $true }
        "2" { $ComTunel = $true }
        "0" { 
            Write-Host "`nCancelado pelo usuario" -ForegroundColor Yellow
            exit 
        }
        default {
            Write-Host "`nOpcao invalida!" -ForegroundColor Red
            exit
        }
    }
}

# Limpar processos anteriores
Stop-PortProcesses

# Diretorio base
$BASE_DIR = "c:\Users\john.silva_sankhya\Downloads\chat_flask_react_project"
Set-Location $BASE_DIR

if ($Local) {
    Write-Host "MODO LOCAL - Iniciando servidores...`n" -ForegroundColor Green
    
    # Iniciar Backend
    Write-Host "Iniciando Backend (Flask)..." -ForegroundColor Cyan
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$BASE_DIR\flask_backend'; & .\.venv\Scripts\Activate.ps1; python app.py"
    Start-Sleep -Seconds 3
    
    # Iniciar Frontend
    Write-Host "Iniciando Frontend (React)..." -ForegroundColor Cyan
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$BASE_DIR\react_frontend'; npm start"
    Start-Sleep -Seconds 5
    
    Write-Host "`n============================================" -ForegroundColor Green
    Write-Host "           SERVIDORES ATIVOS" -ForegroundColor Green
    Write-Host "============================================" -ForegroundColor Green
    Write-Host "  Backend:  http://localhost:5000" -ForegroundColor White
    Write-Host "  Frontend: http://localhost:3000" -ForegroundColor White
    Write-Host "============================================" -ForegroundColor Green
    Write-Host "  Acesse: http://localhost:3000" -ForegroundColor Yellow
    Write-Host "============================================`n" -ForegroundColor Green

} elseif ($ComTunel) {
    Write-Host "MODO TUNEL - Configurando ngrok...`n" -ForegroundColor Green
    
    # Verificar ngrok
    $ngrokInstalled = Get-Command ngrok -ErrorAction SilentlyContinue
    if (-not $ngrokInstalled) {
        Write-Host "ngrok nao encontrado!" -ForegroundColor Red
        Write-Host "Instalando ngrok..." -ForegroundColor Yellow
        winget install ngrok
        Write-Host "`nFeche e reabra o PowerShell, depois execute:`n" -ForegroundColor Yellow
        Write-Host "1. ngrok config add-authtoken SEU_TOKEN" -ForegroundColor White
        Write-Host "   (Pegue o token em: https://dashboard.ngrok.com/signup)" -ForegroundColor Gray
        Write-Host "2. Execute este script novamente`n" -ForegroundColor White
        exit
    }
    
    # Iniciar Backend
    Write-Host "Iniciando Backend (Flask)..." -ForegroundColor Cyan
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$BASE_DIR\flask_backend'; & .\.venv\Scripts\Activate.ps1; Write-Host 'Backend Flask rodando na porta 5000' -ForegroundColor Green; python app.py"
    Start-Sleep -Seconds 3
    
    # Iniciar tunel Backend
    Write-Host "Criando tunel para Backend..." -ForegroundColor Cyan
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host 'TUNEL BACKEND - Copie a URL abaixo!' -ForegroundColor Yellow; Write-Host ''; ngrok http 5000"
    Start-Sleep -Seconds 3
    
    # Pedir URL do backend
    Write-Host "`nAGUARDE O NGROK INICIAR (5 segundos)..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5
    
    Write-Host "`n============================================" -ForegroundColor Cyan
    Write-Host "  COPIE a URL do tunel Backend" -ForegroundColor Cyan
    Write-Host "  Exemplo: https://abc123.ngrok.io" -ForegroundColor Cyan
    Write-Host "============================================`n" -ForegroundColor Cyan
    
    $backendUrl = Read-Host "Cole a URL do Backend aqui"
    
    if ([string]::IsNullOrWhiteSpace($backendUrl)) {
        Write-Host "`nURL invalida! Cancelando..." -ForegroundColor Red
        Stop-PortProcesses
        exit
    }
    
    # Iniciar Frontend com variavel de ambiente
    Write-Host "`nIniciando Frontend com tunel configurado..." -ForegroundColor Cyan
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$env:REACT_APP_BACKEND_URL='$backendUrl'; cd '$BASE_DIR\react_frontend'; Write-Host 'Frontend React - Backend: $backendUrl' -ForegroundColor Green; npm start"
    Start-Sleep -Seconds 8
    
    # Iniciar tunel Frontend
    Write-Host "Criando tunel para Frontend..." -ForegroundColor Cyan
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host 'TUNEL FRONTEND - Compartilhe esta URL com seus amigos!' -ForegroundColor Yellow; Write-Host ''; ngrok http 3000"
    Start-Sleep -Seconds 5
    
    Write-Host "`n============================================" -ForegroundColor Green
    Write-Host "       TUNEIS CRIADOS COM SUCESSO!" -ForegroundColor Green
    Write-Host "============================================" -ForegroundColor Green
    Write-Host "  4 janelas foram abertas:" -ForegroundColor White
    Write-Host "" -ForegroundColor White
    Write-Host "  1. Backend Flask (porta 5000)" -ForegroundColor White
    Write-Host "  2. Tunel Backend (ngrok)" -ForegroundColor White
    Write-Host "  3. Frontend React (porta 3000)" -ForegroundColor White
    Write-Host "  4. Tunel Frontend (ngrok)" -ForegroundColor White
    Write-Host "============================================" -ForegroundColor Green
    Write-Host "  COMPARTILHE a URL do Tunel Frontend" -ForegroundColor Yellow
    Write-Host "  (janela 4) com seus amigos!" -ForegroundColor Yellow
    Write-Host "============================================" -ForegroundColor Green
    Write-Host "  Backend configurado: $backendUrl" -ForegroundColor Cyan
    Write-Host "============================================`n" -ForegroundColor Green

    Write-Host "Dica: Deixe todas as janelas abertas durante o teste!`n" -ForegroundColor Yellow
}

Write-Host "Pressione qualquer tecla para ver processos..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# Mostrar processos
Write-Host "`nProcessos em execucao:`n" -ForegroundColor Cyan
Get-Process python,node,ngrok -ErrorAction SilentlyContinue | Format-Table Id, ProcessName, StartTime -AutoSize

Write-Host "`nPara parar tudo: .\parar-tudo.ps1`n" -ForegroundColor Yellow
