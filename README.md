# Chat Flask + React

Sistema de chat em tempo real com Flask (backend) e React (frontend), usando Socket.IO para comunicação WebSocket e Tailwind CSS v3 para estilização.

## 🚀 Funcionalidades

### Chat Básico
- ✅ Salas de chat múltiplas (criação dinâmica)
- ✅ Mensagens em tempo real via WebSocket
- ✅ Histórico de mensagens por sala
- ✅ Indicador de digitação
- ✅ Lista de usuários online
- ✅ Sistema de status (Online, Ausente, Ocupado)
- ✅ Cache de mensagens por sala (preserva histórico ao trocar de sala)

### Recursos Avançados
- ✅ **Mensagens Privadas (DM)**: Use `/dm @usuario mensagem`
- ✅ **Reações**: 6 emojis com contagem e autores
- ✅ **Upload de Arquivos**: Imagens (preview) e documentos até 5 MB
- ✅ **Drag & Drop**: Arraste arquivos direto para a área do chat
- ✅ **Edição e Exclusão**: Edite ou delete suas próprias mensagens
- ✅ **Responder Mensagens**: Thread com preview da mensagem original
- ✅ **@ Menções**: Autocompletar e destaque visual
- ✅ **Busca no Histórico**: Pesquise mensagens com contador de resultados
- ✅ **Fixar Mensagens**: Mensagens importantes fixadas no topo
- ✅ **Notificações Desktop**: Alertas quando não está na aba
- ✅ **Notificação Sonora**: Som de nova mensagem
- ✅ **Modo Escuro**: Toggle completo (dark mode via classe `html.dark`)
- ✅ **6 Temas Visuais**: Default, Oceano, Floresta, Pôr do Sol, Roxo Espaço, AMOLED

### Formatação de Texto (Markdown inline)
| Sintaxe | Resultado |
|---------|-----------|
| `**negrito**` | **negrito** |
| `*itálico*` | *itálico* |
| `~~tachado~~` | ~~tachado~~ |
| `` `código` `` | `código` |

### Comandos Disponíveis

| Comando | Descrição |
|---------|-----------|
| `/help` | Lista todos os comandos |
| `/users` | Lista usuários online na sala |
| `/rooms` | Lista todas as salas |
| `/dm @usuario msg` | Envia mensagem privada |
| `/status online\|ausente\|ocupado` | Altera seu status |
| `/me <ação>` | Mensagem em terceira pessoa |
| `/roll` | Rola um dado de 6 lados |
| `/clear` | Limpa mensagens (local) |
| `/shrug` | Adiciona ¯\_(ツ)_/¯ |
| `/tableflip` | Envia (╯°□°)╯︵ ┻━┻ |
| `/about` | Informações sobre o chat |
| `/time` | Hora e data atual |

## 📋 Tecnologias

### Backend
- Python 3.13
- Flask 3.0.0
- Flask-SocketIO 5.3.5
- Flask-CORS 4.0.0
- simple-websocket

### Frontend
- React 18.2.0
- Tailwind CSS 3
- Socket.IO-client 4.5.4
- react-hot-toast 2.6.0

## 🔧 Instalação

### 1. Clone o repositório
```bash
git clone https://github.com/john-lenes/chat_flask_react.git
cd chat_flask_react
```

### 2. Configure o Backend

```bash
cd flask_backend

# Crie e ative o ambiente virtual
python -m venv .venv
source .venv/bin/activate        # Linux/Mac
# .venv\Scripts\Activate.ps1    # Windows

pip install -r requirements.txt
```

### 3. Configure as variáveis de ambiente

```bash
# Copie o template e preencha os valores
cp .env.example .env
```

Edite `.env` e defina pelo menos `SECRET_KEY` com um valor seguro:
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

### 4. Configure o Frontend

```bash
cd react_frontend
npm install
```

Para apontar para um backend remoto, crie `react_frontend/.env.local`:
```
REACT_APP_BACKEND_URL=https://seu-backend.onrender.com
```

## ▶️ Executando o Projeto

### Backend (Terminal 1)
```bash
cd flask_backend
source .venv/bin/activate
python app.py
```
Servidor disponível em `http://localhost:5000`

### Frontend (Terminal 2)
```bash
cd react_frontend
npm start
```
Aplicação disponível em `http://localhost:3000`

## 📁 Estrutura do Projeto

```
chat_flask_react/
├── .env.example               # Template de variáveis de ambiente
├── .gitignore
├── Procfile                   # Deploy Heroku/Render
├── render.yaml                # Configuração Render
├── README.md
│
├── flask_backend/
│   ├── app.py                 # Servidor Flask + Socket.IO
│   ├── requirements.txt       # Dependências Python
│   └── uploads/               # Arquivos enviados (ignorado pelo git)
│
└── react_frontend/
    ├── package.json
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── public/
    │   └── index.html
    └── src/
        ├── App.js
        ├── Chat.js            # Componente principal do chat
        ├── index.js
        └── index.css          # Tailwind + variáveis de tema
```

## 🔒 Segurança

- `SECRET_KEY` carregada via variável de ambiente
- Validação e sanitização de todos os inputs no backend (username, sala, mensagens, reply, filename)
- Rate limiting: mínimo 0,5 s entre mensagens por usuário
- Unicidade de usernames (case-insensitive)
- CORS restrito às origens configuradas em `CORS_ORIGINS`
- Tamanho máximo de arquivo validado nos dois lados (5 MB)
- XSS prevenido via `escapeHtml()` antes de aplicar markdown no frontend
- Links externos com `rel="noopener noreferrer"`

## 🐛 Troubleshooting

### Backend não inicia
```bash
# Verifique o ambiente virtual e reinstale as dependências
pip install -r requirements.txt
```

### Frontend não conecta ao backend
- Confirme que o backend está rodando na porta 5000
- Verifique `REACT_APP_BACKEND_URL` em `react_frontend/.env.local`
- Inspecione o console do navegador para erros de WebSocket

### Upload de arquivo falha
- Verifique o tamanho (máx. 5 MB)
- Confirme que a pasta `flask_backend/uploads/` existe

## 📝 Notas Técnicas

### Modo threading
Flask-SocketIO usa `async_mode='threading'` com `simple-websocket` por compatibilidade com Python 3.13 (eventlet tem incompatibilidades nesta versão).

### Estrutura de Dados em Memória
- `connected_users`: `{sid: {username, room, color, status}}`
- `rooms`: `{room_name: [message_dicts]}`
- `message_reactions`: `{message_id: {emoji: [usernames]}}`

### Temas e Dark Mode (Tailwind)
- Dark mode: classe `dark` no elemento `html`
- Temas: atributo `data-theme` no `body` (ex: `body[data-theme="ocean"]`)
- Tokens de cor definidos em `src/index.css` como variáveis CSS customizadas

## 📄 Licença

Projeto de uso livre para fins educacionais.

## 👤 Autor

John Lenes Silva — Projeto de chat em tempo real com Flask e React.

---

**Versão**: 3.6.0 | **Stack**: Flask 3.0 + React 18 + Tailwind CSS 3 + Socket.IO
