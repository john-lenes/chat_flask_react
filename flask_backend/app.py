from flask import Flask, request, jsonify
from flask_socketio import SocketIO, emit, join_room, leave_room
from flask_cors import CORS
from datetime import datetime
import json
import random
import base64
import os

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading', max_http_buffer_size=10000000)

# Armazenar usuários conectados e histórico de mensagens
connected_users = {}  # {sid: {'username': '', 'room': '', 'color': '', 'status': 'online'}}
rooms = {'geral': []}  # {room_name: [message_history]}
private_messages = {}  # {user1_user2: [messages]}
message_reactions = {}  # {message_id: {emoji: [usernames]}}
MAX_HISTORY = 100
UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Cores para avatares
USER_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2']

# Comandos especiais
COMMANDS = {
    '/help': 'Mostra todos os comandos disponíveis',
    '/users': 'Lista todos os usuários online na sala atual',
    '/rooms': 'Lista todas as salas disponíveis',
    '/clear': 'Limpa suas mensagens (apenas para você)',
    '/roll': 'Rola um dado de 6 lados',
    '/dm': 'Envia mensagem privada: /dm @usuario mensagem',
    '/status': 'Muda seu status: /status online|ausente|ocupado',
    '/me': 'Ação em terceira pessoa: /me está digitando',
    '/shrug': 'Adiciona ¯\\_(ツ)_/¯ à sua mensagem',
    '/tableflip': 'Adiciona (╯°□°)╯︵ ┻━┻',
    '/about': 'Informações sobre o chat',
    '/time': 'Mostra a hora atual',
}

@app.route('/')
def index():
    return {
        "status": "Flask backend running",
        "users_online": len(connected_users),
        "rooms": list(rooms.keys()),
        "total_messages": sum(len(msgs) for msgs in rooms.values())
    }

@app.route('/stats')
def stats():
    room_stats = {}
    for room_name, messages in rooms.items():
        users_in_room = [u['username'] for u in connected_users.values() if u.get('room') == room_name]
        room_stats[room_name] = {
            'users': len(users_in_room),
            'messages': len(messages)
        }
    return {
        "total_users": len(connected_users),
        "rooms": room_stats
    }

@socketio.on('connect')
def handle_connect():
    print(f'Cliente conectado: {request.sid}')

@socketio.on('disconnect')
def handle_disconnect():
    if request.sid in connected_users:
        user_data = connected_users[request.sid]
        username = user_data['username']
        room = user_data['room']
        
        leave_room(room)
        del connected_users[request.sid]
        
        emit('user_left', {
            'username': username,
            'users_online': len([u for u in connected_users.values() if u['room'] == room]),
            'timestamp': datetime.now().isoformat()
        }, room=room)
        print(f'Usuário desconectado: {username} da sala {room}')

@socketio.on('join')
def handle_join(data):
    username = data.get('username', 'Anônimo')
    room = data.get('room', 'geral')
    color = random.choice(USER_COLORS)
    
    # Criar sala se não existir
    if room not in rooms:
        rooms[room] = []
    
    connected_users[request.sid] = {
        'username': username,
        'room': room,
        'color': color,
        'status': 'online'
    }
    
    # Entrar na sala do Socket.IO
    join_room(room)
    
    # Enviar histórico de mensagens da sala
    emit('message_history', rooms[room])
    
    # Enviar lista de salas disponíveis
    emit('rooms_list', list(rooms.keys()))
    
    # Enviar lista de usuários online
    users_list = [{
        'username': u['username'],
        'color': u['color'],
        'status': u['status']
    } for u in connected_users.values()]
    emit('users_list', users_list, broadcast=True)
    # Enviar lista de salas disponíveis
    emit('rooms_list', list(rooms.keys()))
    
    # Notificar todos na sala sobre o novo usuário
    emit('user_joined', {
        'username': username,
        'color': color,
        'users_online': len([u for u in connected_users.values() if u['room'] == room]),
        'timestamp': datetime.now().isoformat()
    }, room=room)
    
    print(f'Usuário entrou: {username} na sala {room} (Total na sala: {len([u for u in connected_users.values() if u["room"] == room])})')

@socketio.on('message')
def handle_message(data):
    print(f'DEBUG: Recebeu mensagem - data: {data}, type: {type(data)}')
    if request.sid not in connected_users:
        print(f'DEBUG: SID {request.sid} não está em connected_users')
        return
    
    user_data = connected_users[request.sid]
    username = user_data['username']
    room = user_data['room']
    color = user_data['color']
    
    print(f'DEBUG: Usuário {username} na sala {room}')
    
    # Suportar tanto string quanto objeto
    if isinstance(data, str):
        message_text = data
    else:
        message_text = data.get('message', '')
    
    print(f'DEBUG: Texto da mensagem: {message_text}')
    
    # Processar comandos
    if message_text.startswith('/'):
        handle_command(message_text, room)
        return
    
    message_data = {
        'username': username,
        'message': message_text,
        'timestamp': datetime.now().isoformat(),
        'color': color,
        'id': len(rooms[room]),
        'type': 'message'
    }
    
    # Adicionar ao histórico da sala
    rooms[room].append(message_data)
    
    # Limitar tamanho do histórico
    if len(rooms[room]) > MAX_HISTORY:
        rooms[room].pop(0)
    
    print(f'[{room}] {username}: {message_text}')
    
    # Enviar para todos na sala
    emit('message', message_data, room=room)

def handle_command(command, room):
    cmd = command.split()[0].lower()
    
    if cmd == '/help':
        help_text = '\n'.join([f'{cmd}: {desc}' for cmd, desc in COMMANDS.items()])
        emit('command_response', {'message': f'Comandos disponíveis:\n{help_text}', 'type': 'info'})
    
    elif cmd == '/users':
        users_in_room = [u['username'] for u in connected_users.values() if u['room'] == room]
        emit('command_response', {'message': f'Usuários online ({len(users_in_room)}): {", ".join(users_in_room)}', 'type': 'info'})
    
    elif cmd == '/rooms':
        rooms_info = []
        for room_name in rooms.keys():
            count = len([u for u in connected_users.values() if u['room'] == room_name])
            rooms_info.append(f'{room_name} ({count})')
        emit('command_response', {'message': f'Salas disponíveis: {", ".join(rooms_info)}', 'type': 'info'})
    
    elif cmd == '/clear':
        emit('clear_messages')
    
    elif cmd == '/roll':
        result = random.randint(1, 6)
        user_data = connected_users[request.sid]
        emit('message', {
            'username': user_data['username'],
            'message': f'🎲 Rolou um dado e tirou: {result}!',
            'timestamp': datetime.now().isoformat(),
            'color': user_data['color'],
            'type': 'action'
        }, room=room)
    
    elif cmd == '/dm':
        parts = command.split(maxsplit=2)
        if len(parts) < 3:
            emit('command_response', {'message': 'Uso: /dm @usuario mensagem', 'type': 'error'})
            return
        target_user = parts[1].lstrip('@')
        message_text = parts[2]
        
        # Encontrar o usuário alvo
        target_sid = None
        for sid, user in connected_users.items():
            if user['username'].lower() == target_user.lower():
                target_sid = sid
                break
        
        if not target_sid:
            emit('command_response', {'message': f'Usuário {target_user} não encontrado', 'type': 'error'})
            return
        
        user_data = connected_users[request.sid]
        dm_data = {
            'from': user_data['username'],
            'to': target_user,
            'message': message_text,
            'timestamp': datetime.now().isoformat(),
            'color': user_data['color'],
            'type': 'dm'
        }
        
        # Enviar para ambos os usuários
        emit('private_message', dm_data, room=request.sid)
        emit('private_message', dm_data, room=target_sid)
    
    elif cmd == '/status':
        parts = command.split(maxsplit=1)
        if len(parts) < 2:
            emit('command_response', {'message': 'Uso: /status online|ausente|ocupado', 'type': 'error'})
            return
        new_status = parts[1].lower()
        if new_status not in ['online', 'ausente', 'ocupado']:
            emit('command_response', {'message': 'Status inválido. Use: online, ausente ou ocupado', 'type': 'error'})
            return
        
        user_data = connected_users[request.sid]
        user_data['status'] = new_status
        
        # Atualizar lista de usuários para todos
        users_list = [{
            'username': u['username'],
            'color': u['color'],
            'status': u['status']
        } for u in connected_users.values()]
        emit('users_list', users_list, broadcast=True)
        emit('command_response', {'message': f'Status alterado para: {new_status}', 'type': 'success'})
    
    elif cmd == '/me':
        parts = command.split(maxsplit=1)
        if len(parts) < 2:
            emit('command_response', {'message': 'Uso: /me faz algo', 'type': 'error'})
            return
        action_text = parts[1]
        user_data = connected_users[request.sid]
        emit('message', {
            'username': user_data['username'],
            'message': action_text,
            'timestamp': datetime.now().isoformat(),
            'color': user_data['color'],
            'type': 'action'
        }, room=room)
    
    elif cmd == '/shrug':
        parts = command.split(maxsplit=1)
        message_text = parts[1] if len(parts) > 1 else ''
        user_data = connected_users[request.sid]
        full_message = f"{message_text} ¯\\_(ツ)_/¯".strip()
        
        message_data = {
            'username': user_data['username'],
            'message': full_message,
            'timestamp': datetime.now().isoformat(),
            'color': user_data['color'],
            'id': len(rooms[room]),
            'type': 'message'
        }
        rooms[room].append(message_data)
        emit('message', message_data, room=room)
    
    elif cmd == '/tableflip':
        user_data = connected_users[request.sid]
        emit('message', {
            'username': user_data['username'],
            'message': '(╯°□°)╯︵ ┻━┻',
            'timestamp': datetime.now().isoformat(),
            'color': user_data['color'],
            'id': len(rooms[room]),
            'type': 'message'
        }, room=room)
    
    elif cmd == '/about':
        about_text = '''
💬 Chat em Tempo Real v2.0
✨ Recursos: Salas, DMs, Reações, Upload de arquivos
🛠️ Tecnologias: Flask + Socket.IO + React
👨‍💻 Desenvolvido com ❤️
        '''
        emit('command_response', {'message': about_text.strip(), 'type': 'info'})
    
    elif cmd == '/time':
        current_time = datetime.now().strftime('%H:%M:%S - %d/%m/%Y')
        emit('command_response', {'message': f'⏰ Horário atual: {current_time}', 'type': 'info'})
    
    else:
        emit('command_response', {'message': f'Comando desconhecido: {cmd}. Use /help para ver os comandos disponíveis.', 'type': 'error'})

@socketio.on('add_reaction')
def handle_add_reaction(data):
    message_id = data.get('message_id')
    emoji = data.get('emoji')
    
    if request.sid not in connected_users:
        return
    
    username = connected_users[request.sid]['username']
    room = connected_users[request.sid]['room']
    
    # Inicializar reações para a mensagem
    if message_id not in message_reactions:
        message_reactions[message_id] = {}
    
    # Inicializar lista de usuários para o emoji
    if emoji not in message_reactions[message_id]:
        message_reactions[message_id][emoji] = []
    
    # Adicionar ou remover reação
    if username in message_reactions[message_id][emoji]:
        message_reactions[message_id][emoji].remove(username)
    else:
        message_reactions[message_id][emoji].append(username)
    
    # Limpar emoji se não tiver usuários
    if not message_reactions[message_id][emoji]:
        del message_reactions[message_id][emoji]
    
    emit('reaction_updated', {
        'message_id': message_id,
        'reactions': message_reactions[message_id]
    }, room=room)

@socketio.on('upload_file')
def handle_upload_file(data):
    if request.sid not in connected_users:
        return
    
    user_data = connected_users[request.sid]
    username = user_data['username']
    room = user_data['room']
    
    file_data = data.get('file')
    file_name = data.get('filename')
    file_type = data.get('type', 'file')
    
    if not file_data or not file_name:
        emit('command_response', {'message': 'Dados do arquivo inválidos', 'type': 'error'})
        return
    
    # Criar mensagem com arquivo
    message_data = {
        'username': username,
        'message': f'📎 Enviou um arquivo: {file_name}',
        'timestamp': datetime.now().isoformat(),
        'color': user_data['color'],
        'id': len(rooms[room]),
        'type': 'file',
        'file': {
            'name': file_name,
            'data': file_data,
            'type': file_type
        }
    }
    
    rooms[room].append(message_data)
    
    if len(rooms[room]) > MAX_HISTORY:
        rooms[room].pop(0)
    
    emit('message', message_data, room=room)

@socketio.on('typing')
def handle_typing(data):
    if request.sid not in connected_users:
        return
    user_data = connected_users[request.sid]
    emit('user_typing', {
        'username': user_data['username'],
        'is_typing': data.get('is_typing', False)
    }, room=user_data['room'], include_self=False)

@socketio.on('change_room')
def handle_change_room(data):
    if request.sid not in connected_users:
        return
    
    new_room = data.get('room', 'geral')
    user_data = connected_users[request.sid]
    old_room = user_data['room']
    username = user_data['username']
    
    if old_room == new_room:
        return
    
    # Criar sala se não existir
    if new_room not in rooms:
        rooms[new_room] = []
    
    # Sair da sala antiga
    leave_room(old_room)
    emit('user_left', {
        'username': username,
        'users_online': len([u for u in connected_users.values() if u['room'] == old_room]) - 1,
        'timestamp': datetime.now().isoformat()
    }, room=old_room)
    
    # Entrar na nova sala
    user_data['room'] = new_room
    join_room(new_room)
    
    # Enviar histórico da nova sala
    emit('message_history', rooms[new_room])
    emit('room_changed', {'room': new_room})
    
    # Notificar nova sala
    emit('user_joined', {
        'username': username,
        'color': user_data['color'],
        'users_online': len([u for u in connected_users.values() if u['room'] == new_room]),
        'timestamp': datetime.now().isoformat()
    }, room=new_room)
    
    print(f'{username} mudou de {old_room} para {new_room}')

@socketio.on('edit_message')
def handle_edit_message(data):
    if request.sid not in connected_users:
        return
    
    message_id = data.get('message_id')
    new_text = data.get('new_text', '').strip()
    user_data = connected_users[request.sid]
    room = user_data['room']
    username = user_data['username']
    
    if not new_text or message_id is None:
        return
    
    # Encontrar e atualizar a mensagem
    if room in rooms and message_id < len(rooms[room]):
        message = rooms[room][message_id]
        if message.get('username') == username:
            message['message'] = new_text
            message['edited'] = True
            message['edited_at'] = datetime.now().isoformat()
            
            emit('message_edited', {
                'message_id': message_id,
                'new_text': new_text,
                'edited': True
            }, room=room)
            print(f'{username} editou mensagem {message_id}')

@socketio.on('delete_message')
def handle_delete_message(data):
    if request.sid not in connected_users:
        return
    
    message_id = data.get('message_id')
    user_data = connected_users[request.sid]
    room = user_data['room']
    username = user_data['username']
    
    if message_id is None:
        return
    
    # Encontrar e remover a mensagem
    if room in rooms and message_id < len(rooms[room]):
        message = rooms[room][message_id]
        if message.get('username') == username:
            # Marcar como deletada ao invés de remover completamente
            message['message'] = '[Mensagem deletada]'
            message['deleted'] = True
            message['deleted_at'] = datetime.now().isoformat()
            
            emit('message_deleted', {
                'message_id': message_id,
                'deleted': True
            }, room=room)
            print(f'{username} deletou mensagem {message_id}')

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=True, allow_unsafe_werkzeug=True)

