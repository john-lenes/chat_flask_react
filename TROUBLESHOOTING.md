# 🔧 Troubleshooting - Chat não carrega no Mobile

## ❌ Problema: Chat não funciona em dispositivos móveis

### ✅ Checklist de Verificação

#### 1. **Verificar Backend**
- Acesse: https://chat-backend-pv4g.onrender.com
- Deve retornar: `Chat Backend is running!`
- Se não funcionar, o backend está offline (Render free tier hiberna após inatividade)

#### 2. **Configurar Variável de Ambiente no Render**

**CRITICAL**: O frontend precisa da variável `REACT_APP_BACKEND_URL` configurada!

**Passos:**
1. Acesse: https://dashboard.render.com
2. Selecione seu **Static Site** (frontend)
3. Vá em **"Environment"** no menu lateral
4. Clique em **"Add Environment Variable"**
5. Configure:
   - **Key**: `REACT_APP_BACKEND_URL`
   - **Value**: `https://chat-backend-pv4g.onrender.com`
6. Clique em **"Save Changes"**
7. Aguarde o **redeploy automático** (2-5 minutos)

#### 3. **Forçar Rebuild Completo**

Se ainda não funcionar após configurar a variável:

1. No Render, vá em **"Manual Deploy"**
2. Clique em **"Clear build cache & deploy"**
3. Aguarde o build completo (pode demorar 5-10 minutos)

#### 4. **Verificar Logs do Deploy**

No Render (Static Site):
1. Vá em **"Logs"**
2. Procure por:
   - ✅ `Build succeeded`
   - ✅ `Deploy live`
   - ❌ Erros de build ou variáveis não definidas

#### 5. **Testar no Console do Navegador**

Abra o DevTools no mobile (ou desktop):
1. Console → Procure por:
   - `🔌 Conectando ao backend: https://...`
   - `✅ Conectado ao servidor Socket.IO`
   
2. Se aparecer:
   - `❌ Erro de conexão` → Backend offline ou CORS
   - `Conectando ao backend: http://localhost:5000` → Variável de ambiente NÃO configurada!

#### 6. **Indicadores Visuais no Chat**

Agora o chat mostra o status de conexão:
- 🔄 **Conectando...** (amarelo) → Tentando conectar
- ⚠️ **Desconectado** (vermelho) → Sem conexão
- Bolinha verde pulsando → Conectado ✅

### 🚨 Problema Comum: Variável de Ambiente

**Sintoma**: Console mostra `http://localhost:5000`

**Causa**: `REACT_APP_BACKEND_URL` não configurada no Render

**Solução**: Siga o passo 2 acima

### 📱 Teste Final

Após configurar tudo:
1. Limpe o cache do navegador mobile
2. Acesse a URL do frontend
3. Verifique se o indicador mostra "Conectando..." e depois conecta
4. Se aparecer mensagens, está funcionando! ✅

### 🆘 Se Ainda Não Funcionar

Compartilhe:
1. Screenshot do console do navegador (F12 → Console)
2. Logs do Render (aba Logs)
3. Screenshot da tela mostrando o erro
