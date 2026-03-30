from flask import Flask, request, jsonify
from flask_socketio import SocketIO, emit, join_room, leave_room
from flask_cors import CORS
from datetime import datetime
import logging
import random
import os
import re
import time

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S',
)
logger = logging.getLogger(__name__)

# ── App setup ─────────────────────────────────────────────────────────────────
app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', os.urandom(24).hex())

CORS_ORIGINS = [
    o.strip()
    for o in os.environ.get('CORS_ORIGINS', 'http://localhost:3000').split(',')
]
CORS(app, origins=CORS_ORIGINS)

socketio = SocketIO(
    app,
    cors_allowed_origins=CORS_ORIGINS,
    async_mode='threading',
    max_http_buffer_size=10_000_000,
)

# ── In-memory state ───────────────────────────────────────────────────────────
connected_users: dict = {}      # {sid: {username, room, color, status}}
rooms: dict = {'geral': []}     # {room_name: [message_dicts]}
message_reactions: dict = {}    # {message_id: {emoji: [usernames]}}
room_message_counters: dict = {}  # {room: int} — monotonically increasing IDs
user_last_message_time: dict = {}  # {sid: float} — rate-limit timestamps

# ── Constants ─────────────────────────────────────────────────────────────────
MAX_HISTORY = 100
MAX_MESSAGE_LENGTH = 2000
MAX_USERNAME_LENGTH = 20
MIN_USERNAME_LENGTH = 2
MAX_FILE_B64_SIZE = 7 * 1024 * 1024   # ~5 MB decoded (base64 overhead ~37%)
RATE_LIMIT_SECONDS = 0.5

UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

USER_COLORS = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A',
    '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2',
]

USERNAME_RE = re.compile(r'^[a-zA-Z0-9_áéíóúãõâêôçÁÉÍÓÚÃÕÂÊÔÇ]{2,20}$')
ROOM_RE = re.compile(r'^[a-zA-Z0-9_-]{1,30}$')

COMMANDS = {
    '/help':      'Mostra todos os comandos disponíveis',
    '/users':     'Lista todos os usuários online na sala atual',
    '/rooms':     'Lista todas as salas disponíveis',
    '/clear':     'Limpa suas mensagens (apenas para você)',
    '/roll':      'Rola um dado de 6 lados',
    '/dm':        'Envia mensagem privada: /dm @usuario mensagem',
    '/status':    'Muda seu status: /status online|ausente|ocupado',
    '/me':        'Ação em terceira pessoa: /me está digitando',
    '/shrug':     'Adiciona ¯\\_(ツ)_/¯ à sua mensagem',
    '/tableflip': 'Adiciona (╯°□°)╯︵ ┻━┻',
    '/about':     'Informações sobre o chat',
    '/time':      'Mostra a hora atual',
}

# ── Helpers ───────────────────────────────────────────────────────────────────

def next_message_id(room: str) -> int:
    """Return the next monotonic message ID for a room."""
    room_message_counters[room] = room_message_counters.get(room, 0) + 1
    return room_message_counters[room]


def sanitize_text(value) -> str:
    """Coerce to str, strip whitespace, and truncate to MAX_MESSAGE_LENGTH."""
    if not isinstance(value, str):
        return ''
    return value.strip()[:MAX_MESSAGE_LENGTH]


def users_in_room(room: str) -> list:
    return [u for u in connected_users.values() if u.get('room') == room]


def build_users_list() -> list:
    return [
        {'username': u['username'], 'color': u['color'], 'status': u['status']}
        for u in connected_users.values()
    ]


# ── HTTP routes ───────────────────────────────────────────────────────────────

@app.route('/')
def index():
    return jsonify({
        'status': 'Flask backend running',
        'users_online': len(connected_users),
        'rooms': list(rooms.keys()),
        'total_messages': sum(len(m) for m in rooms.values()),
    })


@app.route('/stats')
def stats():
    room_stats = {
        name: {'users': len(users_in_room(name)), 'messages': len(msgs)}
        for name, msgs in rooms.items()
    }
    return jsonify({'total_users': len(connected_users), 'rooms': room_stats})


# ── Socket.IO events ──────────────────────────────────────────────────────────

@socketio.on('connect')
def handle_connect():
    logger.info('Cliente conectado: %s', request.sid)


@socketio.on('disconnect')
def handle_disconnect():
    if request.sid not in connected_users:
        return
    user_data = connected_users.pop(request.sid)
    user_last_message_time.pop(request.sid, None)
    username = user_data['username']
    room = user_data['room']
    leave_room(room)
    emit('user_left', {
        'username': username,
        'users_online': len(users_in_room(room)),
        'timestamp': datetime.now().isoformat(),
    }, room=room)
    logger.info('Usuário desconectado: %s da sala %s', username, room)


@socketio.on('join')
def handle_join(data):
    username = sanitize_text(data.get('username', ''))
    room = sanitize_text(data.get('room', 'geral'))

    # Validate username
    if not USERNAME_RE.match(username):
        emit('error', {
            'message': 'Nome de usuário inválido (2-20 caracteres, sem espaços especiais).'
        })
        return

    # Validate room name
    if not ROOM_RE.match(room):
        emit('error', {'message': 'Nome de sala inválido.'})
        return

    # Enforce username uniqueness (case-insensitive)
    taken = {u['username'].lower() for u in connected_users.values()}
    if username.lower() in taken:
        emit('error', {
            'message': f'O nome "{username}" já está em uso. Escolha outro.'
        })
        return

    color = random.choice(USER_COLORS)

    if room not in rooms:
        rooms[room] = []

    connected_users[request.sid] = {
        'username': username,
        'room': room,
        'color': color,
        'status': 'online',
    }

    join_room(room)

    # Send room history and metadata to the joining user
    emit('message_history', rooms[room])
    emit('rooms_list', list(rooms.keys()))

    # Broadcast updated user list to everyone
    emit('users_list', build_users_list(), broadcast=True)

    # Notify the room about the new arrival
    emit('user_joined', {
        'username': username,
        'color': color,
        'users_online': len(users_in_room(room)),
        'timestamp': datetime.now().isoformat(),
    }, room=room)

    logger.info('Usuário entrou: %s na sala %s', username, room)


@socketio.on('message')
def handle_message(data):
    if request.sid not in connected_users:
        return

    user_data = connected_users[request.sid]
    username = user_data['username']
    room = user_data['room']
    color = user_data['color']

    # Rate limiting
    now = time.time()
    if now - user_last_message_time.get(request.sid, 0) < RATE_LIMIT_SECONDS:
        emit('command_response', {
            'message': 'Você está enviando mensagens muito rápido. Aguarde um instante.',
            'type': 'error',
        })
        return
    user_last_message_time[request.sid] = now

    # Normalise payload — accept both plain string and dict
    reply_to = None
    if isinstance(data, str):
        message_text = sanitize_text(data)
    else:
        message_text = sanitize_text(data.get('message', ''))
        raw_reply = data.get('replyTo')
        if isinstance(raw_reply, dict):
            reply_to = {
                'id': raw_reply.get('id'),
                'username': sanitize_text(str(raw_reply.get('username', '')))[:MAX_USERNAME_LENGTH],
                'message': sanitize_text(str(raw_reply.get('message', '')))[:100],
            }
        handle_command(message_text, room)
        return

    msg_id = next_message_id(room)
    message_data = {
        'username': username,
        'message': message_text,
        'timestamp': datetime.now().isoformat(),
        'color': color,
        'id': msg_id,
        'type': 'message',
        'replyTo': reply_to,
    }

    rooms[room].append(message_data)
    if len(rooms[room]) > MAX_HISTORY:
        rooms[room].pop(0)

    logger.info('[%s] %s: %s', room, username, message_text[:80])
    emit('message', message_data, room=room)


def handle_command(command: str, room: str):
    """Dispatch slash commands. Called from handle_message."""
    parts = command.split()
    cmd = parts[0].lower()

    if cmd == '/help':
        help_text = '\n'.join(f'{c}: {d}' for c, d in COMMANDS.items())
        emit('command_response', {
            'message': f'Comandos disponíveis:\n{help_text}',
            'type': 'info',
        })

    elif cmd == '/users':
        in_room = [u['username'] for u in connected_users.values() if u['room'] == room]
        emit('command_response', {
            'message': f'Usuários online ({len(in_room)}): {", ".join(in_room)}',
            'type': 'info',
        })

    elif cmd == '/rooms':
        rooms_info = [f'{r} ({len(users_in_room(r))})' for r in rooms]
        emit('command_response', {
            'message': f'Salas disponíveis: {", ".join(rooms_info)}',
            'type': 'info',
        })

    elif cmd == '/clear':
        emit('clear_messages')

    elif cmd == '/roll':
        result = random.randint(1, 6)
        ud = connected_users[request.sid]
        emit('message', {
            'username': ud['username'],
            'message': f'🎲 Rolou um dado e tirou: {result}!',
            'timestamp': datetime.now().isoformat(),
            'color': ud['color'],
            'id': next_message_id(room),
            'type': 'action',
        }, room=room)

    elif cmd == '/dm':
        raw = command.split(maxsplit=2)
        if len(raw) < 3:
            emit('command_response', {'message': 'Uso: /dm @usuario mensagem', 'type': 'error'})
            return
        target_user = raw[1].lstrip('@')
        msg_text = sanitize_text(raw[2])
        if not msg_text:
            emit('command_response', {'message': 'Mensagem não pode estar vazia.', 'type': 'error'})
            return
        target_sid = next(
            (sid for sid, u in connected_users.items()
             if u['username'].lower() == target_user.lower()),
            None,
        )
        if not target_sid:
            emit('command_response', {
                'message': f'Usuário "{target_user}" não encontrado.',
                'type': 'error',
            })
            return
        ud = connected_users[request.sid]
        dm_data = {
            'from': ud['username'],
            'to': target_user,
            'message': msg_text,
            'timestamp': datetime.now().isoformat(),
            'color': ud['color'],
            'type': 'dm',
        }
        emit('private_message', dm_data, room=request.sid)
        emit('private_message', dm_data, room=target_sid)

    elif cmd == '/status':
        raw = command.split(maxsplit=1)
        if len(raw) < 2:
            emit('command_response', {'message': 'Uso: /status online|ausente|ocupado', 'type': 'error'})
            return
        new_status = raw[1].lower()
        if new_status not in ('online', 'ausente', 'ocupado'):
            emit('command_response', {
                'message': 'Status inválido. Use: online, ausente ou ocupado',
                'type': 'error',
            })
            return
        connected_users[request.sid]['status'] = new_status
        emit('users_list', build_users_list(), broadcast=True)
        emit('command_response', {
            'message': f'Status alterado para: {new_status}',
            'type': 'success',
        })

    elif cmd == '/me':
        raw = command.split(maxsplit=1)
        if len(raw) < 2:
            emit('command_response', {'message': 'Uso: /me faz algo', 'type': 'error'})
            return
        ud = connected_users[request.sid]
        emit('message', {
            'username': ud['username'],
            'message': raw[1],
            'timestamp': datetime.now().isoformat(),
            'color': ud['color'],
            'id': next_message_id(room),
            'type': 'action',
        }, room=room)

    elif cmd == '/shrug':
        raw = command.split(maxsplit=1)
        suffix = raw[1] if len(raw) > 1 else ''
        full = f'{suffix} ¯\\_(ツ)_/¯'.strip()
        ud = connected_users[request.sid]
        msg = {
            'username': ud['username'],
            'message': full,
            'timestamp': datetime.now().isoformat(),
            'color': ud['color'],
            'id': next_message_id(room),
            'type': 'message',
        }
        rooms[room].append(msg)
        if len(rooms[room]) > MAX_HISTORY:
            rooms[room].pop(0)
        emit('message', msg, room=room)

    elif cmd == '/tableflip':
        ud = connected_users[request.sid]
        msg = {
            'username': ud['username'],
            'message': '(╯°□°)╯︵ ┻━┻',
            'timestamp': datetime.now().isoformat(),
            'color': ud['color'],
            'id': next_message_id(room),
            'type': 'message',
        }
        rooms[room].append(msg)
        if len(rooms[room]) > MAX_HISTORY:
            rooms[room].pop(0)
        emit('message', msg, room=room)

    elif cmd == '/about':
        emit('command_response', {
            'message': (
                '💬 Chat em Tempo Real v3.6\n'
                '✨ Recursos: Salas, DMs, Reações, Upload de arquivos\n'
                '🛠️ Tecnologias: Flask + Socket.IO + React + Tailwind CSS'
            ),
            'type': 'info',
        })

    elif cmd == '/time':
        current_time = datetime.now().strftime('%H:%M:%S — %d/%m/%Y')
        emit('command_response', {'message': f'⏰ {current_time}', 'type': 'info'})

    else:
        emit('command_response', {
            'message': f'Comando desconhecido: {cmd}. Use /help para ver os disponíveis.',
            'type': 'error',
        })


@socketio.on('add_reaction')
def handle_add_reaction(data):
    if request.sid not in connected_users:
        return
    message_id = data.get('message_id')
    emoji = data.get('emoji', '')
    if message_id is None or not emoji:
        return

    username = connected_users[request.sid]['username']
    room = connected_users[request.sid]['room']

    if message_id not in message_reactions:
        message_reactions[message_id] = {}
    if emoji not in message_reactions[message_id]:
        message_reactions[message_id][emoji] = []

    users = message_reactions[message_id][emoji]
    if username in users:
        users.remove(username)
    else:
        users.append(username)

    if not message_reactions[message_id][emoji]:
        del message_reactions[message_id][emoji]

    emit('reaction_updated', {
        'message_id': message_id,
        'reactions': message_reactions[message_id],
    }, room=room)


@socketio.on('upload_file')
def handle_upload_file(data):
    if request.sid not in connected_users:
        return

    user_data = connected_users[request.sid]
    username = user_data['username']
    room = user_data['room']

    file_data = data.get('file', '')
    file_name = sanitize_text(data.get('filename', ''))[:255]
    file_type = data.get('type', 'file')

    if not file_data or not file_name:
        emit('command_response', {'message': 'Dados do arquivo inválidos.', 'type': 'error'})
        return

    # Server-side size guard (~5 MB after base64 decode)
    if len(file_data) > MAX_FILE_B64_SIZE:
        emit('command_response', {'message': 'Arquivo muito grande. Máximo 5 MB.', 'type': 'error'})
        return

    if file_type not in ('image', 'file'):
        file_type = 'file'

    msg = {
        'username': username,
        'message': f'📎 Enviou um arquivo: {file_name}',
        'timestamp': datetime.now().isoformat(),
        'color': user_data['color'],
        'id': next_message_id(room),
        'type': 'file',
        'file': {'name': file_name, 'data': file_data, 'type': file_type},
    }

    rooms[room].append(msg)
    if len(rooms[room]) > MAX_HISTORY:
        rooms[room].pop(0)

    emit('message', msg, room=room)


@socketio.on('typing')
def handle_typing(data):
    if request.sid not in connected_users:
        return
    ud = connected_users[request.sid]
    emit('user_typing', {
        'username': ud['username'],
        'is_typing': bool(data.get('is_typing', False)),
    }, room=ud['room'], include_self=False)


@socketio.on('change_room')
def handle_change_room(data):
    if request.sid not in connected_users:
        return

    new_room = sanitize_text(data.get('room', 'geral'))
    if not ROOM_RE.match(new_room):
        emit('command_response', {'message': 'Nome de sala inválido.', 'type': 'error'})
        return

    ud = connected_users[request.sid]
    old_room = ud['room']
    username = ud['username']

    if old_room == new_room:
        return

    if new_room not in rooms:
        rooms[new_room] = []

    leave_room(old_room)
    emit('user_left', {
        'username': username,
        'users_online': len(users_in_room(old_room)) - 1,
        'timestamp': datetime.now().isoformat(),
    }, room=old_room)

    ud['room'] = new_room
    join_room(new_room)

    emit('message_history', rooms[new_room])
    emit('room_changed', {'room': new_room})
    # Broadcast updated room list so all clients know about newly created rooms
    emit('rooms_list', list(rooms.keys()), broadcast=True)
    emit('user_joined', {
        'username': username,
        'color': ud['color'],
        'users_online': len(users_in_room(new_room)),
        'timestamp': datetime.now().isoformat(),
    }, room=new_room)

    logger.info('%s mudou de %s para %s', username, old_room, new_room)


@socketio.on('edit_message')
def handle_edit_message(data):
    if request.sid not in connected_users:
        return

    ud = connected_users[request.sid]
    room = ud['room']
    username = ud['username']
    message_id = data.get('message_id')
    new_text = sanitize_text(data.get('new_text', ''))

    if not new_text or message_id is None:
        return

    # Search by id (not list index) so history trimming does not break edits
    for msg in rooms.get(room, []):
        if msg.get('id') == message_id and msg.get('username') == username:
            msg['message'] = new_text
            msg['edited'] = True
            msg['edited_at'] = datetime.now().isoformat()
            emit('message_edited', {
                'message_id': message_id,
                'new_text': new_text,
                'edited': True,
            }, room=room)
            logger.info('%s editou mensagem %s', username, message_id)
            return


@socketio.on('delete_message')
def handle_delete_message(data):
    if request.sid not in connected_users:
        return

    ud = connected_users[request.sid]
    room = ud['room']
    username = ud['username']
    message_id = data.get('message_id')

    if message_id is None:
        return

    # Search by id (not list index)
    for msg in rooms.get(room, []):
        if msg.get('id') == message_id and msg.get('username') == username:
            msg['message'] = '[Mensagem deletada]'
            msg['deleted'] = True
            msg['deleted_at'] = datetime.now().isoformat()
            emit('message_deleted', {
                'message_id': message_id,
                'deleted': True,
            }, room=room)
            logger.info('%s deletou mensagem %s', username, message_id)
            return


if __name__ == '__main__':
    debug = os.environ.get('FLASK_DEBUG', 'false').lower() == 'true'
    port = int(os.environ.get('PORT', 5000))
    socketio.run(app, host='0.0.0.0', port=port, debug=debug, allow_unsafe_werkzeug=debug)
