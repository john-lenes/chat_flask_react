import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import './Chat.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
console.log('🔌 Conectando ao backend:', BACKEND_URL);

const socket = io(BACKEND_URL, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 10,
    timeout: 20000
});

// Logs de conexão
socket.on('connect', () => {
    console.log('✅ Conectado ao servidor Socket.IO');
});

socket.on('connect_error', (error) => {
    console.error('❌ Erro de conexão:', error.message);
});

socket.on('disconnect', (reason) => {
    console.log('🔌 Desconectado:', reason);
});

const EMOJI_LIST = ['😀', '😂', '❤️', '👍', '🎉', '🔥', '⭐', '💯', '🚀', '👏', '🤔', '😎', '🥳', '💪', '🙌'];
const REACTION_EMOJIS = ['👍', '❤️', '😂', '🎉', '😮', '😢'];

const Chat = () => {
    const [username, setUsername] = useState('');
    const [joined, setJoined] = useState(false);
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState([]);
    const [roomMessages, setRoomMessages] = useState({}); // Cache de mensagens por sala
    const [usersOnline, setUsersOnline] = useState(0);
    const [typingUsers, setTypingUsers] = useState([]);
    const [currentRoom, setCurrentRoom] = useState('geral');
    const [availableRooms, setAvailableRooms] = useState(['geral']);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [darkMode, setDarkMode] = useState(false);
    const [soundEnabled, setSoundEnabled] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [showUsersList, setShowUsersList] = useState(false);
    const [reactions, setReactions] = useState({});
    const [notificationsEnabled, setNotificationsEnabled] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState('connecting'); // 'connecting', 'connected', 'disconnected'
    const [editingMessageId, setEditingMessageId] = useState(null);
    const [editingText, setEditingText] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [showScrollButton, setShowScrollButton] = useState(false);
    const [mentionSuggestions, setMentionSuggestions] = useState([]);
    const [showMentions, setShowMentions] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [replyTo, setReplyTo] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [showSearch, setShowSearch] = useState(false);
    const [searchResults, setSearchResults] = useState([]);
    const [theme, setTheme] = useState(localStorage.getItem('chatTheme') || 'default');
    const [unreadCounts, setUnreadCounts] = useState({});
    const [pinnedMessages, setPinnedMessages] = useState([]);
    const [showPinned, setShowPinned] = useState(false);
    const [showFormatToolbar, setShowFormatToolbar] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const messagesEndRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const audioRef = useRef(null);
    const fileInputRef = useRef(null);
    const messageInputRef = useRef(null);
    const messagesContainerRef = useRef(null);
    const dropZoneRef = useRef(null);

    const THEMES = {
        default: { name: 'Padrão', primary: '#667eea', secondary: '#764ba2' },
        ocean: { name: 'Oceano', primary: '#2196F3', secondary: '#00BCD4' },
        forest: { name: 'Floresta', primary: '#4CAF50', secondary: '#8BC34A' },
        sunset: { name: 'Pôr do Sol', primary: '#FF5722', secondary: '#FF9800' },
        purple: { name: 'Roxo Espaço', primary: '#9C27B0', secondary: '#E91E63' },
        amoled: { name: 'AMOLED', primary: '#BB86FC', secondary: '#03DAC6' }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleScroll = (e) => {
        const element = e.target;
        const isNearBottom = element.scrollHeight - element.scrollTop - element.clientHeight < 100;
        setShowScrollButton(!isNearBottom);
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Carregar mensagens do cache quando mudar de sala
    useEffect(() => {
        if (roomMessages[currentRoom] && roomMessages[currentRoom].length > 0) {
            console.log('Carregando mensagens do cache para sala:', currentRoom);
            setMessages(roomMessages[currentRoom]);
        }
    }, [currentRoom, roomMessages]);

    useEffect(() => {
        if (darkMode) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
    }, [darkMode]);

    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (joined && messages.length > 0) {
                e.preventDefault();
                e.returnValue = 'Você tem certeza que deseja sair do chat?';
                return e.returnValue;
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [joined, messages]);

    const playNotificationSound = () => {
        if (soundEnabled && audioRef.current) {
            audioRef.current.play().catch(() => {});
        }
    };

    const requestNotificationPermission = () => {
        if (typeof window !== 'undefined' && 'Notification' in window) {
            try {
                if (Notification.permission === 'default') {
                    Notification.requestPermission().then(permission => {
                        setNotificationsEnabled(permission === 'granted');
                    }).catch(err => {
                        console.log('Notificações não suportadas:', err);
                        setNotificationsEnabled(false);
                    });
                } else if (Notification.permission === 'granted') {
                    setNotificationsEnabled(true);
                }
            } catch (error) {
                console.log('Erro ao solicitar permissão de notificação:', error);
                setNotificationsEnabled(false);
            }
        } else {
            console.log('API de Notificações não disponível neste navegador');
            setNotificationsEnabled(false);
        }
    };

    const showNotification = (title, body) => {
        if (typeof window !== 'undefined' && 'Notification' in window && notificationsEnabled && document.hidden) {
            try {
                new Notification(title, {
                    body: body,
                    icon: '💬',
                    tag: 'chat-notification'
                });
            } catch (error) {
                console.log('Erro ao mostrar notificação:', error);
            }
        }
    };

    useEffect(() => {
        requestNotificationPermission();

        // Monitorar status de conexão
        const handleConnect = () => {
            console.log('✅ Socket conectado');
            setConnectionStatus('connected');
        };

        const handleDisconnect = () => {
            console.log('⚠️ Socket desconectado');
            setConnectionStatus('disconnected');
        };

        const handleConnectError = (error) => {
            console.error('❌ Erro de conexão:', error);
            setConnectionStatus('disconnected');
        };

        socket.on('connect', handleConnect);
        socket.on('disconnect', handleDisconnect);
        socket.on('connect_error', handleConnectError);

        // Verificar status inicial
        if (socket.connected) {
            setConnectionStatus('connected');
        }

        return () => {
            socket.off('connect', handleConnect);
            socket.off('disconnect', handleDisconnect);
            socket.off('connect_error', handleConnectError);
        };
    }, []);

    useEffect(() => {
        // Receber histórico de mensagens
        socket.on('message_history', (history) => {
            setMessages(history);
        });

        // Receber nova mensagem
        socket.on('message', (msg) => {
            console.log('Mensagem recebida:', msg);
            setMessages((prev) => {
                const updated = [...prev, msg];
                // Atualizar cache da sala atual
                setRoomMessages(cache => ({
                    ...cache,
                    [currentRoom]: updated
                }));
                return updated;
            });
            
            // Incrementar contador de não lidas se não estiver na sala
            if (msg.room && msg.room !== currentRoom && msg.username !== username) {
                setUnreadCounts(prev => ({
                    ...prev,
                    [msg.room]: (prev[msg.room] || 0) + 1
                }));
            }
            
            if (msg.username !== username) {
                playNotificationSound();
                showNotification('Nova mensagem', `${msg.username}: ${msg.message}`);
            }
        });

        // Mensagem privada
        socket.on('private_message', (dm) => {
            setMessages((prev) => {
                const updated = [...prev, dm];
                setRoomMessages(cache => ({
                    ...cache,
                    [currentRoom]: updated
                }));
                return updated;
            });
            playNotificationSound();
            showNotification(`Mensagem privada de ${dm.from}`, dm.message);
        });

        // Lista de usuários
        socket.on('users_list', (users) => {
            setOnlineUsers(users);
        });

        // Reação atualizada
        socket.on('reaction_updated', (data) => {
            setReactions(prev => ({
                ...prev,
                [data.message_id]: data.reactions
            }));
        });

        // Usuário entrou
        socket.on('user_joined', (data) => {
            setUsersOnline(data.users_online);
            setMessages((prev) => {
                const updated = [...prev, {
                    type: 'system',
                    message: `${data.username} entrou no chat`,
                    timestamp: data.timestamp
                }];
                setRoomMessages(cache => ({
                    ...cache,
                    [currentRoom]: updated
                }));
                return updated;
            });
            playNotificationSound();
        });

        // Usuário saiu
        socket.on('user_left', (data) => {
            setUsersOnline(data.users_online);
            setMessages((prev) => {
                const updated = [...prev, {
                    type: 'system',
                    message: `${data.username} saiu do chat`,
                    timestamp: data.timestamp
                }];
                setRoomMessages(cache => ({
                    ...cache,
                    [currentRoom]: updated
                }));
                return updated;
            });
        });

        // Indicador de digitação
        socket.on('user_typing', (data) => {
            if (data.is_typing) {
                setTypingUsers((prev) => [...new Set([...prev, data.username])]);
            } else {
                setTypingUsers((prev) => prev.filter(u => u !== data.username));
            }
        });

        // Lista de salas
        socket.on('rooms_list', (rooms) => {
            setAvailableRooms(rooms);
        });

        // Mudança de sala
        socket.on('room_changed', (data) => {
            console.log('Sala alterada para:', data.room);
            // Salvar mensagens da sala atual antes de mudar
            setRoomMessages(prev => ({
                ...prev,
                [currentRoom]: messages
            }));
            
            setCurrentRoom(data.room);
            
            // Carregar mensagens da nova sala do cache (se existirem)
            setMessages([]); // Limpa temporariamente
        });

        // Receber histórico quando entrar em sala
        socket.on('message_history', (history) => {
            console.log('Histórico recebido:', history.length, 'mensagens');
            // Se temos cache, mesclar com o histórico do servidor
            setRoomMessages(prev => {
                const cachedMessages = prev[currentRoom] || [];
                // Usar histórico do servidor se for mais recente/completo
                const finalMessages = history.length > 0 ? history : cachedMessages;
                return {
                    ...prev,
                    [currentRoom]: finalMessages
                };
            });
            setMessages(history);
        });

        // Resposta de comando
        socket.on('command_response', (data) => {
            setMessages((prev) => {
                const updated = [...prev, {
                    type: 'command',
                    message: data.message,
                    commandType: data.type,
                    timestamp: new Date().toISOString()
                }];
                setRoomMessages(cache => ({
                    ...cache,
                    [currentRoom]: updated
                }));
                return updated;
            });
        });

        // Limpar mensagens
        socket.on('clear_messages', () => {
            setMessages([]);
            // Limpar cache da sala atual
            setRoomMessages(cache => ({
                ...cache,
                [currentRoom]: []
            }));
        });

        // Mensagem editada
        socket.on('message_edited', (data) => {
            setMessages((prev) => {
                const updated = prev.map((msg, idx) => 
                    idx === data.message_id 
                        ? { ...msg, message: data.new_text, edited: data.edited } 
                        : msg
                );
                setRoomMessages(cache => ({
                    ...cache,
                    [currentRoom]: updated
                }));
                return updated;
            });
        });

        // Mensagem deletada
        socket.on('message_deleted', (data) => {
            setMessages((prev) => {
                const updated = prev.map((msg, idx) => 
                    idx === data.message_id 
                        ? { ...msg, message: '[Mensagem deletada]', deleted: data.deleted } 
                        : msg
                );
                setRoomMessages(cache => ({
                    ...cache,
                    [currentRoom]: updated
                }));
                return updated;
            });
        });

        return () => {
            socket.off('message_history');
            socket.off('message');
            socket.off('user_joined');
            socket.off('user_left');
            socket.off('user_typing');
            socket.off('rooms_list');
            socket.off('room_changed');
            socket.off('command_response');
            socket.off('clear_messages');
            socket.off('private_message');
            socket.off('users_list');
            socket.off('reaction_updated');
            socket.off('message_edited');
            socket.off('message_deleted');
        };
    }, [username, soundEnabled, notificationsEnabled, currentRoom]);

    const handleJoin = (e) => {
        e.preventDefault();
        if (username.trim()) {
            console.log('Entrando na sala:', currentRoom, 'como:', username.trim());
            socket.emit('join', { username: username.trim(), room: currentRoom });
            setJoined(true);
        }
    };

    const handleTyping = () => {
        socket.emit('typing', { is_typing: true });
        
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }
        
        typingTimeoutRef.current = setTimeout(() => {
            socket.emit('typing', { is_typing: false });
        }, 1000);
    };

    const sendMessage = (e) => {
        e.preventDefault();
        if (message.trim() && !isSending) {
            console.log('Enviando mensagem:', message.trim());
            setIsSending(true);
            
            const messageData = {
                message: message.trim(),
                replyTo: replyTo ? {
                    id: replyTo.id,
                    username: replyTo.username,
                    message: replyTo.message.substring(0, 50) // Preview
                } : null
            };
            
            socket.emit('message', messageData);
            socket.emit('typing', { is_typing: false });
            setMessage('');
            setShowEmojiPicker(false);
            setReplyTo(null);
            setTimeout(() => setIsSending(false), 500);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage(e);
        }
        // Shift + Enter will naturally create a new line in textarea
    };

    const handleInputChange = (e) => {
        const value = e.target.value;
        setMessage(value);
        handleTyping();

        // Auto-resize textarea
        if (messageInputRef.current) {
            messageInputRef.current.style.height = 'auto';
            messageInputRef.current.style.height = Math.min(messageInputRef.current.scrollHeight, 120) + 'px';
        }

        // Check for @ mentions
        const lastWord = value.split(/\s/).pop();
        if (lastWord.startsWith('@') && lastWord.length > 1) {
            const searchTerm = lastWord.substring(1).toLowerCase();
            const suggestions = onlineUsers.filter(user => 
                user.toLowerCase().startsWith(searchTerm) && user !== username
            );
            setMentionSuggestions(suggestions);
            setShowMentions(suggestions.length > 0);
        } else {
            setShowMentions(false);
        }
    };

    const insertMention = (user) => {
        const words = message.split(/\s/);
        words[words.length - 1] = `@${user} `;
        setMessage(words.join(' '));
        setShowMentions(false);
        messageInputRef.current?.focus();
    };

    const addEmoji = (emoji) => {
        setMessage(prev => prev + emoji);
        setShowEmojiPicker(false);
    };

    const changeRoom = (newRoom) => {
        if (newRoom !== currentRoom) {
            socket.emit('change_room', { room: newRoom });
            // Marcar sala como lida ao entrar
            markRoomAsRead(newRoom);
        }
    };

    const createNewRoom = () => {
        const roomName = prompt('Digite o nome da nova sala:');
        if (roomName && roomName.trim()) {
            const newRoom = roomName.trim().toLowerCase().replace(/\s+/g, '-');
            if (!availableRooms.includes(newRoom)) {
                setAvailableRooms(prev => [...prev, newRoom]);
                changeRoom(newRoom);
            } else {
                alert('Esta sala já existe!');
            }
        }
    };

    const formatTime = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    };

    const addReaction = (messageId, emoji) => {
        socket.emit('add_reaction', { message_id: messageId, emoji });
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            alert('Arquivo muito grande! Máximo 5MB');
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            const fileData = reader.result;
            const fileType = file.type.startsWith('image/') ? 'image' : 'file';
            
            socket.emit('upload_file', {
                file: fileData,
                filename: file.name,
                type: fileType
            });
        };
        reader.readAsDataURL(file);
    };

    const sendDM = (targetUser) => {
        const msg = prompt(`Enviar mensagem privada para ${targetUser}:`);
        if (msg && msg.trim()) {
            socket.emit('message', { message: `/dm @${targetUser} ${msg.trim()}` });
        }
    };

    const startEditMessage = (msg) => {
        if (msg.username === username && msg.type !== 'system' && msg.type !== 'command') {
            setEditingMessageId(msg.id);
            setEditingText(msg.message);
        }
    };

    const saveEditMessage = (messageId) => {
        if (editingText.trim()) {
            socket.emit('edit_message', { message_id: messageId, new_text: editingText.trim() });
            setEditingMessageId(null);
            setEditingText('');
        }
    };

    const cancelEdit = () => {
        setEditingMessageId(null);
        setEditingText('');
    };

    const deleteMessage = (messageId) => {
        if (window.confirm('Deseja deletar esta mensagem?')) {
            socket.emit('delete_message', { message_id: messageId });
        }
    };

    const copyMessage = (text) => {
        navigator.clipboard.writeText(text).then(() => {
            // Visual feedback
            const notification = document.createElement('div');
            notification.className = 'copy-notification';
            notification.textContent = '✓ Copiado!';
            document.body.appendChild(notification);
            setTimeout(() => notification.remove(), 2000);
        }).catch(err => {
            console.error('Erro ao copiar:', err);
        });
    };

    const isMentioned = (text) => {
        if (!text || !username) return false;
        return text.includes(`@${username}`);
    };

    // Text formatting functions
    const formatText = (text) => {
        if (!text) return text;
        
        // Bold: **text** or __text__
        text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        text = text.replace(/__(.*?)__/g, '<strong>$1</strong>');
        
        // Italic: *text* or _text_
        text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
        text = text.replace(/_(.*?)_/g, '<em>$1</em>');
        
        // Code: `text`
        text = text.replace(/`(.*?)`/g, '<code>$1</code>');
        
        // Strike: ~~text~~
        text = text.replace(/~~(.*?)~~/g, '<del>$1</del>');
        
        return text;
    };

    const insertFormatting = (format) => {
        const textarea = messageInputRef.current;
        if (!textarea) return;
        
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = message.substring(start, end);
        
        let formattedText = '';
        switch(format) {
            case 'bold':
                formattedText = `**${selectedText || 'texto'}**`;
                break;
            case 'italic':
                formattedText = `*${selectedText || 'texto'}*`;
                break;
            case 'code':
                formattedText = `\`${selectedText || 'código'}\``;
                break;
            case 'strike':
                formattedText = `~~${selectedText || 'texto'}~~`;
                break;
            default:
                return;
        }
        
        const newMessage = message.substring(0, start) + formattedText + message.substring(end);
        setMessage(newMessage);
        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + formattedText.length, start + formattedText.length);
        }, 0);
    };

    // Theme management
    const changeTheme = (newTheme) => {
        setTheme(newTheme);
        localStorage.setItem('chatTheme', newTheme);
        document.documentElement.style.setProperty('--theme-primary', THEMES[newTheme].primary);
        document.documentElement.style.setProperty('--theme-secondary', THEMES[newTheme].secondary);
    };

    useEffect(() => {
        changeTheme(theme);
    }, []);

    // Unread counter
    const markRoomAsRead = (room) => {
        setUnreadCounts(prev => ({ ...prev, [room]: 0 }));
    };

    useEffect(() => {
        if (joined && currentRoom) {
            markRoomAsRead(currentRoom);
        }
    }, [currentRoom, messages, joined]);

    // Pin/Unpin messages
    const togglePin = (msg) => {
        const isPinned = pinnedMessages.some(p => p.id === msg.id);
        if (isPinned) {
            setPinnedMessages(prev => prev.filter(p => p.id !== msg.id));
        } else {
            setPinnedMessages(prev => [...prev, msg]);
        }
    };

    // Quick reaction
    const quickReaction = (messageId, emoji) => {
        addReaction(messageId, emoji);
    };

    // Link preview
    const detectLinks = (text) => {
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        return text.match(urlRegex) || [];
    };

    const renderMessageWithLinks = (msg) => {
        const links = detectLinks(msg.message);
        if (links.length === 0) {
            return <div className="message-text" dangerouslySetInnerHTML={{ __html: formatText(msg.message) }} />;
        }

        return (
            <>
                <div className="message-text" dangerouslySetInnerHTML={{ __html: formatText(msg.message) }} />
                {links.map((link, index) => (
                    <div key={index} className="link-preview-card">
                        <a href={link} target="_blank" rel="noopener noreferrer" className="link-preview-url">
                            🔗 {link.length > 50 ? link.substring(0, 50) + '...' : link}
                        </a>
                    </div>
                ))}
            </>
        );
    };

    // Drag and Drop handlers
    const handleDragEnter = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.target === dropZoneRef.current) {
            setIsDragging(false);
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const files = e.dataTransfer.files;
        if (files && files[0]) {
            const file = files[0];
            if (file.size > 5 * 1024 * 1024) {
                alert('Arquivo muito grande! Máximo 5MB');
                return;
            }

            const reader = new FileReader();
            reader.onload = () => {
                const fileData = reader.result;
                const fileType = file.type.startsWith('image/') ? 'image' : 'file';
                
                socket.emit('upload_file', {
                    file: fileData,
                    filename: file.name,
                    type: fileType
                });
            };
            reader.readAsDataURL(file);
        }
    };

    // Reply handlers
    const startReply = (msg) => {
        setReplyTo(msg);
        messageInputRef.current?.focus();
    };

    const cancelReply = () => {
        setReplyTo(null);
    };

    // Search handlers
    const handleSearch = (query) => {
        setSearchQuery(query);
        if (!query.trim()) {
            setSearchResults([]);
            return;
        }

        const results = messages.filter(msg => 
            msg.message && msg.message.toLowerCase().includes(query.toLowerCase())
        );
        setSearchResults(results);
    };

    const scrollToMessage = (index) => {
        const messageElements = messagesContainerRef.current?.children;
        if (messageElements && messageElements[index]) {
            messageElements[index].scrollIntoView({ behavior: 'smooth', block: 'center' });
            messageElements[index].classList.add('highlight-flash');
            setTimeout(() => messageElements[index].classList.remove('highlight-flash'), 2000);
        }
    };

    const clearSearch = () => {
        setSearchQuery('');
        setSearchResults([]);
        setShowSearch(false);
    };

    // Apply theme to body
    React.useEffect(() => {
        document.body.className = `theme-${theme}`;
    }, [theme]);

    if (!joined) {
        return (
            <div className={`chat-container ${darkMode ? 'dark-mode' : ''}`}>
                <div className="join-screen">
                    <div className="join-box">
                        <h1>💬 Chat em Tempo Real</h1>
                        <p>Entre com seu nome para começar</p>
                        <form onSubmit={handleJoin}>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Digite seu nome..."
                                className="username-input"
                                maxLength={20}
                                autoFocus
                            />
                            <div className="room-selector">
                                <label>Escolha uma sala:</label>
                                <select value={currentRoom} onChange={(e) => setCurrentRoom(e.target.value)}>
                                    {availableRooms.map(room => (
                                        <option key={room} value={room}>{room}</option>
                                    ))}
                                </select>
                            </div>
                            <button type="submit" className="join-button">
                                Entrar no Chat
                            </button>
                        </form>
                        <div className="theme-toggle" onClick={() => setDarkMode(!darkMode)}>
                            {darkMode ? '☀️' : '🌙'} {darkMode ? 'Modo Claro' : 'Modo Escuro'}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`chat-container ${darkMode ? 'dark-mode' : ''}`}>
            <audio ref={audioRef} src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZjjkHF2W+7NuVPwwPUqrl7qtiGwQ4kdTxzHksBSV4yPDgkj4IFV6w5NqGHgwOUqvl7qtiGwQ4kdTxzHksBSV4yPDgkj4IFV6w5NqGHgwOUqvl7qtiGwQ4kdTxzHksBSV4yPDgkj4IFV6w5NqGHgwOUqvl7qtiGwQ4kdTxzHksBSV4yPDgkj4IFV6w5NqGHgwOUqvl7qtiGwQ4kdTxzHksBSV4yPDgkj4IFV6w5NqGHgwOUqvl7qtiGwQ4kdTxzHksBSV4yPDgkj4IFV6w5NqGHgwOUqvl7qtiGwQ4kdTxzHksBSV4yPDgkj4IFV6w5NqGHgwOUqvl7qtiGwQ4kdTxzHksBSV4yPDgkj4IFV6w5NqGHgwOUqvl7qtiGwQ4kdTxzHksBSV4yPDgkj4IFV6w5NqGHgwOUqvl7qtiGwQ4kdTxzHksBSV4yPDgkj4IFV6w5NqGHgwOUqvl7qtiGwQ4kdTxzHksBSV4yPDgkj4IFV6w5NqGHgwOUqvl7qtiGwQ4kdTxzHksBSV4yPDgkj4IFV6w5NqGHgwOUqvl7qtiGwQ4kdTxzHksBSV4yPDgkj4IFV6w5NqGHgwOUqvl7qtiGwQ4kdTxzHksBSV4yPDgkj4IFV6w5NqGHgwOUqvl7qtiGwQ4kdTxzHksBSV4yPDgkj4IFV6w5NqGHgwOUqvl7qtiGwQ4kdTxzHksBSV4yPDgkj4IFV6w5NqGHgwOUqvl7qtiGwQ4kdTxzHksBSV4yPDgkj4IFV6w5NqGHgwOUqvl7qtiGwQ4kdTxzHksBSV4yPDgkj4IFV6w5NqGHgwOUqvl7qtiGwQ4kdTxzHksBSV4yPDgkj4IFV6w5NqGHgwOUqvl7qtiGw==" preload="auto" />
            
            <div className="chat-header">
                <div>
                    <h1>💬 Chat em Tempo Real</h1>
                    <p className="user-info">
                        Conectado como: <strong>{username}</strong>
                        <span className="room-badge">#{currentRoom}</span>
                        {connectionStatus !== 'connected' && (
                            <span className={`connection-status status-${connectionStatus}`}>
                                {connectionStatus === 'connecting' ? '🔄 Conectando...' : '⚠️ Desconectado'}
                            </span>
                        )}
                    </p>
                </div>
                <div className="header-actions">
                    <button className="search-btn" onClick={() => setShowSearch(!showSearch)} title="Pesquisar mensagens">
                        🔍
                    </button>
                    <div className="online-users" onClick={() => setShowUsersList(!showUsersList)}>
                        <span className={`online-dot ${connectionStatus === 'connected' ? 'connected' : ''}`}></span>
                        {onlineUsers.length} online
                    </div>
                    <button className="settings-btn" onClick={() => setShowSettings(!showSettings)}>
                        ⚙️
                    </button>
                </div>
            </div>

            {showSearch && (
                <div className="search-bar">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                        placeholder="Pesquisar mensagens..."
                        className="search-input"
                        autoFocus
                    />
                    <button className="clear-search-btn" onClick={clearSearch}>✗</button>
                    {searchResults.length > 0 && (
                        <div className="search-results-count">
                            {searchResults.length} resultado{searchResults.length !== 1 ? 's' : ''}
                        </div>
                    )}
                </div>
            )}

            {showPinned && pinnedMessages.length > 0 && (
                <div className="pinned-banner">
                    <div className="pinned-header">
                        <span>📌 Mensagens Fixadas ({pinnedMessages.length})</span>
                        <button onClick={() => setShowPinned(false)}>✗</button>
                    </div>
                    <div className="pinned-list">
                        {pinnedMessages.map(msg => (
                            <div key={msg.id} className="pinned-item">
                                <span className="pinned-user">{msg.username}:</span>
                                <span className="pinned-text">{msg.message.substring(0, 50)}{msg.message.length > 50 ? '...' : ''}</span>
                                <button onClick={() => togglePin(msg)} className="unpin-btn" title="Desafixar">✗</button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {showUsersList && (
                <div className="users-modal" onClick={() => setShowUsersList(false)}>
                    <div className="users-modal-content" onClick={(e) => e.stopPropagation()}>
                        <h3>Usuários Online ({onlineUsers.length})</h3>
                        <div className="users-list">
                            {onlineUsers.map((user, idx) => (
                                <div key={idx} className="user-item">
                                    <div className="user-avatar" style={{backgroundColor: user.color}}>
                                        {user.username.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="user-details">
                                        <span className="user-name">{user.username}</span>
                                        <span className={`user-status status-${user.status}`}>
                                            {user.status === 'online' ? '🟢' : user.status === 'ausente' ? '🟡' : '🔴'} {user.status}
                                        </span>
                                    </div>
                                    {user.username !== username && (
                                        <button 
                                            className="dm-btn-small"
                                            onClick={() => sendDM(user.username)}
                                        >
                                            💬
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                        <button onClick={() => setShowUsersList(false)}>Fechar</button>
                    </div>
                </div>
            )}

            {showSettings && (
                <div className="settings-panel">
                    <div className="setting-item">
                        <label>
                            <input
                                type="checkbox"
                                checked={soundEnabled}
                                onChange={(e) => setSoundEnabled(e.target.checked)}
                            />
                            🔔 Notificações Sonoras
                        </label>
                    </div>
                    <div className="setting-item">
                        <label>
                            <input
                                type="checkbox"
                                checked={darkMode}
                                onChange={(e) => setDarkMode(e.target.checked)}
                            />
                            {darkMode ? '☀️' : '🌙'} Modo {darkMode ? 'Claro' : 'Escuro'}
                        </label>
                    </div>
                    <div className="setting-item">
                        <label>🎨 Tema:</label>
                        <div className="theme-selector">
                            {Object.keys(THEMES).map(themeName => (
                                <button
                                    key={themeName}
                                    className={`theme-option ${theme === themeName ? 'active' : ''}`}
                                    onClick={() => changeTheme(themeName)}
                                    title={THEMES[themeName].name}
                                    style={{
                                        backgroundColor: THEMES[themeName].primary,
                                        border: theme === themeName ? '3px solid #fff' : '2px solid transparent'
                                    }}
                                >
                                    {themeName === theme && '✓'}
                                </button>
                            ))}
                        </div>
                        <div className="theme-name">{THEMES[theme].name}</div>
                    </div>
                    <div className="setting-item">
                        <label>
                            <input
                                type="checkbox"
                                checked={notificationsEnabled}
                                onChange={(e) => {
                                    if (e.target.checked) {
                                        requestNotificationPermission();
                                    } else {
                                        setNotificationsEnabled(false);
                                    }
                                }}
                            />
                            🔔 Notificações Desktop
                        </label>
                    </div>
                    <div className="setting-item">
                        <button onClick={() => setShowPinned(!showPinned)}>
                            📌 {showPinned ? 'Ocultar' : 'Ver'} Mensagens Fixadas
                        </button>
                    </div>
                    <div className="setting-item">
                        <button onClick={() => socket.emit('message', { message: '/help' })}>
                            ❓ Ver Comandos
                        </button>
                    </div>
                </div>
            )}

            <div className="chat-layout">
                <div className={`rooms-sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}>
                    <h3>Salas</h3>
                    <div className="rooms-list">
                        {availableRooms.map(room => (
                            <div
                                key={room}
                                className={`room-item ${room === currentRoom ? 'active' : ''}`}
                                onClick={() => {
                                    changeRoom(room);
                                    setMobileMenuOpen(false);
                                }}
                            >
                                # {room}
                                {unreadCounts[room] > 0 && (
                                    <span className="unread-badge">{unreadCounts[room]}</span>
                                )}
                            </div>
                        ))}
                    </div>
                    <button className="create-room-btn" onClick={createNewRoom}>
                        ➕ Nova Sala
                    </button>
                </div>

                <button 
                    className="mobile-menu-toggle"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    style={{ display: 'none' }}
                >
                    {mobileMenuOpen ? '✕' : '☰'}
                </button>

                <div className="messages-area"
                    ref={dropZoneRef}
                    onDragEnter={handleDragEnter}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                >
                    {isDragging && (
                        <div className="drop-overlay">
                            <div className="drop-message">
                                <div className="drop-icon">📎</div>
                                <div>Solte o arquivo aqui para enviar</div>
                                <div className="drop-hint">(máximo 5MB)</div>
                            </div>
                        </div>
                    )}
                    <div className="messages-container" ref={messagesContainerRef} onScroll={handleScroll}>
                        {messages.map((msg, index) => {
                            if (msg.type === 'system') {
                                return (
                                    <div key={index} className="system-message">
                                        <span>{msg.message}</span>
                                    </div>
                                );
                            }
                            if (msg.type === 'command') {
                                return (
                                    <div key={index} className={`command-message ${msg.commandType}`}>
                                        <pre>{msg.message}</pre>
                                    </div>
                                );
                            }
                            if (msg.type === 'action') {
                                return (
                                    <div key={index} className="action-message">
                                        <span style={{color: msg.color}}>{msg.username}</span> {msg.message}
                                    </div>
                                );
                            }
                            if (msg.type === 'dm') {
                                return (
                                    <div key={index} className="dm-message">
                                        <div className="dm-badge">💬 DM</div>
                                        <div className="dm-content">
                                            <strong style={{color: msg.color}}>
                                                {msg.from === username ? `Você → ${msg.to}` : `${msg.from} → Você`}
                                            </strong>
                                            <div>{msg.message}</div>
                                            <span className="message-time">{formatTime(msg.timestamp)}</span>
                                        </div>
                                    </div>
                                );
                            }
                            if (msg.type === 'file') {
                                return (
                                    <div key={msg.id || index} className={`message ${msg.username === username ? 'own-message' : ''}`}>
                                        <div className="message-avatar" style={{backgroundColor: msg.color}}>
                                            {msg.username.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="message-content">
                                            <div className="message-header">
                                                <span className="message-username" style={{color: msg.color}}>
                                                    {msg.username}
                                                </span>
                                                <span className="message-time">{formatTime(msg.timestamp)}</span>
                                            </div>
                                            <div className="message-text">{msg.message}</div>
                                            {msg.file && msg.file.type === 'image' && (
                                                <img 
                                                    src={msg.file.data} 
                                                    alt={msg.file.name}
                                                    style={{maxWidth: '300px', maxHeight: '300px', borderRadius: '8px', marginTop: '8px'}}
                                                />
                                            )}
                                            {msg.file && msg.file.type === 'file' && (
                                                <a href={msg.file.data} download={msg.file.name} className="file-download">
                                                    📎 {msg.file.name}
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                );
                            }
                            return (
                                <div key={msg.id || index} className={`message ${msg.username === username ? 'own-message' : ''} ${isMentioned(msg.message) ? 'mentioned' : ''}`}>
                                    <div className="message-avatar" style={{backgroundColor: msg.color}}>
                                        {msg.username.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="message-content">
                                        <div className="message-header">
                                            <span className="message-username" style={{color: msg.color}}>
                                                {msg.username}
                                            </span>
                                            <span className="message-time" title={new Date(msg.timestamp).toLocaleString('pt-BR')}>
                                                {formatTime(msg.timestamp)}
                                            </span>
                                        </div>
                                        {msg.replyTo && (
                                            <div className="reply-preview">
                                                <div className="reply-bar"></div>
                                                <div className="reply-content">
                                                    <span className="reply-username">{msg.replyTo.username}</span>
                                                    <span className="reply-text">{msg.replyTo.message}</span>
                                                </div>
                                            </div>
                                        )}
                                        {editingMessageId === msg.id ? (
                                            <div className="message-edit-container">
                                                <input
                                                    type="text"
                                                    value={editingText}
                                                    onChange={(e) => setEditingText(e.target.value)}
                                                    className="edit-input"
                                                    autoFocus
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') saveEditMessage(msg.id);
                                                        if (e.key === 'Escape') cancelEdit();
                                                    }}
                                                />
                                                <div className="edit-buttons">
                                                    <button onClick={() => saveEditMessage(msg.id)} className="btn-save">✓</button>
                                                    <button onClick={cancelEdit} className="btn-cancel">✗</button>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                {renderMessageWithLinks(msg)}
                                                {msg.edited && <span className="edited-badge"> (editado)</span>}
                                            </>
                                        )}
                                        <div className="message-actions">
                                            <button onClick={() => togglePin(msg)} title={pinnedMessages.some(p => p.id === msg.id) ? 'Desafixar' : 'Fixar mensagem'}>
                                                {pinnedMessages.some(p => p.id === msg.id) ? '📌' : '📍'}
                                            </button>
                                            <button 
                                                className="action-btn reply-btn" 
                                                onClick={() => startReply(msg)}
                                                title="Responder"
                                            >
                                                ↩️
                                            </button>
                                            <button 
                                                className="action-btn copy-btn" 
                                                onClick={() => copyMessage(msg.message)}
                                                title="Copiar mensagem"
                                            >
                                                📋
                                            </button>
                                            {msg.username === username && editingMessageId !== msg.id && msg.type !== 'system' && (
                                                <>
                                                    <button 
                                                        className="action-btn edit-btn" 
                                                        onClick={() => startEditMessage(msg)}
                                                        title="Editar mensagem"
                                                    >
                                                        ✏️
                                                    </button>
                                                    <button 
                                                        className="action-btn delete-btn" 
                                                        onClick={() => deleteMessage(msg.id)}
                                                        title="Deletar mensagem"
                                                    >
                                                        🗑️
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                        <div className="message-reactions">
                                            {reactions[msg.id] && Object.entries(reactions[msg.id]).map(([emoji, users]) => (
                                                <button
                                                    key={emoji}
                                                    className={`reaction ${users.includes(username) ? 'active' : ''}`}
                                                    onClick={() => addReaction(msg.id, emoji)}
                                                    title={users.join(', ')}
                                                >
                                                    {emoji} {users.length}
                                                </button>
                                            ))}
                                            <div className="quick-reactions">
                                                {['❤️', '👍', '😂', '😮', '😢', '😡'].map(emoji => (
                                                    <button
                                                        key={emoji}
                                                        onClick={() => quickReaction(msg.id, emoji)}
                                                        className="quick-reaction-btn"
                                                        title={`Reagir com ${emoji}`}
                                                    >
                                                        {emoji}
                                                    </button>
                                                ))}
                                            </div>
                                            <div className="add-reaction">
                                                {REACTION_EMOJIS.map(emoji => (
                                                    <button
                                                        key={emoji}
                                                        onClick={() => addReaction(msg.id, emoji)}
                                                        className="reaction-option"
                                                    >
                                                        {emoji}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        {typingUsers.length > 0 && (
                            <div className="typing-indicator">
                                <div className="typing-dots">
                                    <span></span>
                                    <span></span>
                                    <span></span>
                                </div>
                                <span>{typingUsers.join(', ')} {typingUsers.length === 1 ? 'está' : 'estão'} digitando...</span>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {showScrollButton && (
                        <button className="scroll-to-bottom" onClick={scrollToBottom} title="Rolar para baixo">
                            ⬇️
                        </button>
                    )}

                    {replyTo && (
                        <div className="reply-bar-container">
                            <div className="reply-bar-content">
                                <div className="reply-bar-left">
                                    <span className="reply-bar-label">Respondendo a {replyTo.username}</span>
                                    <span className="reply-bar-text">{replyTo.message.substring(0, 50)}...</span>
                                </div>
                                <button className="reply-bar-close" onClick={cancelReply}>✗</button>
                            </div>
                        </div>
                    )}

                    <form onSubmit={sendMessage} className="message-form">
                        {showFormatToolbar && (
                            <div className="format-toolbar">
                                <button type="button" onClick={() => insertFormatting('**', '**')} className="format-btn" title="Negrito">
                                    <strong>B</strong>
                                </button>
                                <button type="button" onClick={() => insertFormatting('*', '*')} className="format-btn" title="Itálico">
                                    <em>I</em>
                                </button>
                                <button type="button" onClick={() => insertFormatting('~~', '~~')} className="format-btn" title="Tachado">
                                    <del>S</del>
                                </button>
                                <button type="button" onClick={() => insertFormatting('`', '`')} className="format-btn" title="Código">
                                    {'<>'}
                                </button>
                            </div>
                        )}
                        <input 
                            type="file" 
                            ref={fileInputRef}
                            style={{display: 'none'}}
                            onChange={handleFileUpload}
                            accept="image/*,application/pdf,.doc,.docx,.txt"
                        />
                        <button
                            type="button"
                            className="format-toggle-btn"
                            onClick={() => setShowFormatToolbar(!showFormatToolbar)}
                            title="Ferramentas de formatação"
                        >
                            🎨
                        </button>
                        <button
                            type="button"
                            className="file-btn"
                            onClick={() => fileInputRef.current.click()}
                            title="Enviar arquivo (máx 5MB)"
                        >
                            📎
                        </button>
                        <button
                            type="button"
                            className="emoji-btn"
                            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        >
                            😀
                        </button>
                        {showEmojiPicker && (
                            <div className="emoji-picker">
                                {EMOJI_LIST.map(emoji => (
                                    <span key={emoji} onClick={() => addEmoji(emoji)}>
                                        {emoji}
                                    </span>
                                ))}
                            </div>
                        )}
                        {showMentions && (
                            <div className="mention-suggestions">
                                {mentionSuggestions.map(user => (
                                    <div 
                                        key={user} 
                                        className="mention-item"
                                        onClick={() => insertMention(user)}
                                    >
                                        @{user}
                                    </div>
                                ))}
                            </div>
                        )}
                        <textarea
                            ref={messageInputRef}
                            value={message}
                            onChange={handleInputChange}
                            onKeyDown={handleKeyDown}
                            placeholder="Digite sua mensagem... (Enter para enviar, Shift+Enter para nova linha)"
                            className="message-input"
                            autoComplete="off"
                            rows={1}
                        />
                        <button 
                            type="submit" 
                            className={`send-button ${isSending ? 'sending' : ''}`}
                            disabled={isSending}
                        >
                            {isSending ? '⏳' : '📨'} Enviar
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Chat;
