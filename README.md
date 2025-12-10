# Chat Flask + React

Sistema de chat em tempo real com Flask (backend) e React (frontend), utilizando Socket.IO para comunicação WebSocket.

## 🚀 Funcionalidades

### Chat Básico
- ✅ Salas de chat múltiplas
- ✅ Mensagens em tempo real
- ✅ Histórico de mensagens por sala
- ✅ Indicador de digitação
- ✅ Lista de usuários online
- ✅ Sistema de status (Online, Ausente, Ocupado)

### Recursos Avançados
- ✅ **Mensagens Privadas (DM)**: Use `/dm username mensagem`
- ✅ **Reações**: 6 emojis disponíveis (👍 ❤️ 😂 🎉 😮 😢)
- ✅ **Upload de Arquivos**: Envie imagens (preview automático) e documentos (até 5MB)
- ✅ **Notificações Desktop**: Receba alertas quando alguém mencionar você
- ✅ **Modo Escuro**: Interface adaptável

### Comandos Disponíveis

| Comando | Descrição | Exemplo |
|---------|-----------|---------|
| `/dm <usuário> <msg>` | Enviar mensagem privada | `/dm João Olá!` |
| `/nick <novo_nome>` | Alterar seu nome de usuário | `/nick JohnSilva` |
| `/rooms` | Listar todas as salas disponíveis | `/rooms` |
| `/status <estado>` | Alterar seu status | `/status ausente` |
| `/clear` | Limpar histórico da sala atual | `/clear` |
| `/help` | Mostrar lista de comandos | `/help` |
| `/users` | Listar usuários online | `/users` |
| `/me <ação>` | Mensagem em terceira pessoa | `/me está pensando...` |
| `/shrug` | Adiciona ¯\_(ツ)_/¯ | `/shrug não sei` |
| `/tableflip` | Envia (╯°□°)╯︵ ┻━┻ | `/tableflip` |
| `/about` | Informações sobre o chat | `/about` |
| `/time` | Mostra hora e data atual | `/time` |

## 📋 Requisitos

### Backend (Python)
- Python 3.13
- Flask 3.0.0
- Flask-SocketIO 5.3.5
- Flask-CORS
- python-socketio
- simple-websocket

### Frontend (React)
- Node.js 16+
- React 18.2.0
- Socket.IO-client 4.5.4

## 🔧 Instalação

### 1. Clone o repositório
```bash
cd chat_flask_react_project
```

### 2. Configure o Backend

```bash
# Entre na pasta do backend
cd flask_backend

# Crie um ambiente virtual (Windows)
python -m venv .venv
.venv\Scripts\Activate.ps1

# Instale as dependências
pip install -r requirements.txt
```

### 3. Configure o Frontend

```bash
# Entre na pasta do frontend
cd react_frontend

# Instale as dependências
npm install
```

## ▶️ Executando o Projeto

### Backend (Terminal 1)
```bash
cd flask_backend
.venv\Scripts\Activate.ps1
python app.py
```
O servidor Flask estará rodando em `http://localhost:5000`

### Frontend (Terminal 2)
```bash
cd react_frontend
npm start
```
O React estará rodando em `http://localhost:3000`

## 📁 Estrutura do Projeto

```
chat_flask_react_project/
│
├── flask_backend/
│   ├── app.py                 # Servidor Flask + Socket.IO
│   ├── requirements.txt       # Dependências Python
│   └── uploads/               # Arquivos enviados pelos usuários
│
└── react_frontend/
    ├── src/
    │   ├── App.js            # Componente principal
    │   ├── Chat.js           # Componente de chat
    │   ├── Chat.css          # Estilos do chat
    │   └── index.js          # Entry point
    ├── public/
    │   └── index.html        # HTML base
    └── package.json          # Dependências Node
```

## 🎯 Como Usar

### Entrar no Chat
1. Abra `http://localhost:3000`
2. Digite seu nome de usuário
3. Escolha ou crie uma sala
4. Clique em "Entrar"

### Trocar de Sala
- Selecione uma sala existente no dropdown
- Ou clique em "➕ Nova Sala" para criar uma nova

### Enviar Mensagens
- Digite sua mensagem no campo de texto
- Pressione Enter ou clique em "Enviar"
- Use comandos começando com `/` para funções especiais

### Mensagens Privadas
```
/dm NomeDoUsuario Sua mensagem privada aqui
```

### Reações
- Clique no ícone 😊 ao lado de qualquer mensagem
- Escolha uma das 6 reações disponíveis
- Veja quem reagiu passando o mouse sobre a reação

### Upload de Arquivos
- Clique no ícone 📎
- Selecione um arquivo (máx. 5MB)
- Imagens mostram preview automático
- Documentos têm link de download

### Alterar Status
```
/status online      # Status online (verde)
/status ausente     # Status ausente (amarelo)
/status ocupado     # Status ocupado (vermelho)
```

## 🔒 Segurança

- Validação de tamanho de arquivo (máx. 5MB)
- Sanitização de nomes de usuário e salas
- CORS configurado para permitir localhost:3000
- Arquivos salvos com nomes seguros (UUID)

## 🐛 Troubleshooting

### Backend não inicia
```bash
# Verifique se o ambiente virtual está ativo
.venv\Scripts\Activate.ps1

# Reinstale as dependências
pip install -r requirements.txt
```

### Frontend não conecta
- Verifique se o backend está rodando na porta 5000
- Confirme que não há firewall bloqueando
- Veja o console do navegador para erros

### Mensagens não aparecem
- Verifique se você entrou em uma sala
- Confirme que o Socket.IO está conectado (veja console)
- Teste em modo de navegação anônima

### Upload de arquivo falha
- Verifique o tamanho do arquivo (máx. 5MB)
- Confirme que a pasta `uploads/` existe
- Veja os logs do backend para erros

## 🎨 Personalização

### Alterar cores do tema
Edite `react_frontend/src/Chat.css`:
```css
:root {
    --primary-color: #007bff;
    --secondary-color: #6c757d;
    /* ... outras variáveis */
}
```

### Adicionar novos comandos
Edite `flask_backend/app.py`:
1. Adicione o comando no dicionário `COMMANDS`
2. Implemente o handler em `handle_command()`

### Modificar limite de upload
Em `flask_backend/app.py`:
```python
MAX_FILE_SIZE = 5 * 1024 * 1024  # Altere para o tamanho desejado
```

## 📝 Notas Técnicas

### Por que threading ao invés de eventlet?
- Python 3.13 tem incompatibilidades com eventlet
- simple-websocket é usado como alternativa
- Threading mode é estável para uso em desenvolvimento

### Estrutura de Dados
- `connected_users`: {sid: {username, room, color, status}}
- `rooms`: {room_name: [message_history]}
- `message_reactions`: {message_id: {emoji: [usernames]}}

### WebSocket Events
- `join`: Entrar em uma sala
- `message`: Enviar mensagem
- `typing`: Indicador de digitação
- `change_room`: Trocar de sala
- `add_reaction`: Adicionar reação
- `upload_file`: Upload de arquivo
- `request_dm`: Enviar mensagem privada

## 🚧 Melhorias Futuras

- [ ] Sistema de autenticação (login/senha)
- [ ] Persistência de mensagens (banco de dados)
- [ ] Chamadas de voz/vídeo
- [ ] Menções com @ e autocomplete
- [ ] Sistema de administração de salas
- [ ] Banir/silenciar usuários
- [ ] Temas customizáveis
- [ ] Exportar histórico de chat
- [ ] Criptografia end-to-end

## 📄 Licença

Este projeto é de uso livre para fins educacionais.

## 👤 Autor John Lenes Silva

Desenvolvido como projeto de chat em tempo real com Flask e React.

---

**Versão**: 1.0.0  
**Data**: Dezembro 2025  
**Stack**: Flask 3.0 + React 18 + Socket.IO
