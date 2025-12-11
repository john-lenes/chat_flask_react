# 🚀 Deploy no Render - Guia Completo

## Passo 1: Preparar o Projeto

✅ Projeto já está no GitHub: https://github.com/john-lenes/chat_flask_react

## Passo 2: Criar Conta no Render

1. Acesse: https://render.com
2. Clique em **"Get Started for Free"**
3. Faça login com GitHub

## Passo 3: Deploy do Backend (Flask)

### 3.1 Criar Web Service
1. No dashboard do Render, clique em **"New +"** → **"Web Service"**
2. Conecte seu repositório GitHub: `john-lenes/chat_flask_react`
3. Configure:
   - **Name:** `chat-backend`
   - **Region:** Oregon (US West)
   - **Branch:** `main`
   - **Root Directory:** (deixe em branco)
   - **Runtime:** Python 3
   - **Build Command:** 
     ```
     cd flask_backend && pip install -r requirements.txt
     ```
   - **Start Command:**
     ```
     cd flask_backend && python app.py
     ```
   - **Plan:** Free

### 3.2 Variáveis de Ambiente
Clique em **"Advanced"** e adicione:
- `PYTHON_VERSION` = `3.13.0`
- `PORT` = `5000`

### 3.3 Deploy
1. Clique em **"Create Web Service"**
2. Aguarde o build (2-5 minutos)
3. **COPIE A URL** gerada (ex: `https://chat-backend-xxxx.onrender.com`)

## Passo 4: Deploy do Frontend (React)

### 4.1 Criar Static Site
1. No dashboard, clique em **"New +"** → **"Static Site"**
2. Conecte o mesmo repositório
3. Configure:
   - **Name:** `chat-frontend`
   - **Branch:** `main`
   - **Root Directory:** (deixe em branco)
   - **Build Command:**
     ```
     cd react_frontend && npm install && npm run build
     ```
   - **Publish Directory:**
     ```
     react_frontend/build
     ```

### 4.2 Variáveis de Ambiente
Clique em **"Advanced"** e adicione:
- `REACT_APP_BACKEND_URL` = `https://chat-backend-xxxx.onrender.com` (a URL que você copiou no passo 3.3)

### 4.3 Deploy
1. Clique em **"Create Static Site"**
2. Aguarde o build (3-7 minutos)
3. **Acesse a URL gerada** (ex: `https://chat-frontend-xxxx.onrender.com`)

## Passo 5: Testar o Chat

1. Abra a URL do frontend
2. Entre com seu nome
3. Crie ou entre em uma sala
4. Teste enviar mensagens!

## 🔧 Configurações Importantes

### CORS no Backend
O backend já está configurado para aceitar requisições de qualquer origem:
```python
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")
```

### WebSocket no Render
O Render suporta WebSocket automaticamente, sem configuração adicional.

## ⚠️ Limitações do Plano Free

- **Backend dorme após 15 minutos** de inatividade
- Ao acordar, leva ~30 segundos
- 750 horas/mês grátis (suficiente para 1 app rodando 24/7)
- Largura de banda: 100GB/mês

## 💡 Dicas

### Manter o Backend Ativo
Crie um cron job para "pingar" o backend a cada 10 minutos:
- Use https://cron-job.org (grátis)
- Configure para acessar: `https://chat-backend-xxxx.onrender.com`
- Intervalo: 10 minutos

### Atualizar o Chat
Qualquer push para o GitHub dispara deploy automático:
```bash
git add .
git commit -m "Atualização do chat"
git push
```

## 🐛 Troubleshooting

### Backend não inicia
1. Vá em **Logs** no dashboard do Render
2. Verifique se há erros no build
3. Confirme que `requirements.txt` está correto

### Frontend não conecta ao backend
1. Verifique a variável `REACT_APP_BACKEND_URL`
2. Deve apontar para a URL do backend (com https://)
3. Reconstrua o frontend se mudar a variável

### WebSocket não funciona
1. Confirme que está usando `https://` (não `http://`)
2. Verifique os logs do backend
3. Teste com `curl https://chat-backend-xxxx.onrender.com`

## 📊 Monitoramento

### Ver Logs do Backend
1. Acesse o dashboard do Render
2. Clique em `chat-backend`
3. Vá em **"Logs"**

### Ver Métricas
1. Clique em `chat-backend` ou `chat-frontend`
2. Vá em **"Metrics"**
3. Veja CPU, memória e tráfego

## 🔄 Deploy Alternativo: Vercel (apenas Frontend)

Se preferir apenas o frontend no Vercel:

1. Acesse https://vercel.com
2. Import do GitHub
3. Configure:
   - **Framework:** Create React App
   - **Root Directory:** `react_frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `build`
   - **Environment Variable:** 
     - `REACT_APP_BACKEND_URL` = URL do backend no Render

## ✅ Checklist Final

- [ ] Backend deployado no Render
- [ ] URL do backend copiada
- [ ] Frontend deployado com REACT_APP_BACKEND_URL configurada
- [ ] Chat acessível e funcionando
- [ ] WebSocket conectando
- [ ] Mensagens sendo enviadas/recebidas

## 🎉 Pronto!

Seu chat está online e acessível para qualquer pessoa com a URL!

**Frontend:** `https://chat-frontend-xxxx.onrender.com`  
**Backend:** `https://chat-backend-xxxx.onrender.com`

Compartilhe a URL do frontend com seus amigos! 🚀
