import React, { useState, useEffect, useRef, useCallback } from 'react';
import io from 'socket.io-client';
import toast from 'react-hot-toast';

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


const THEMES = {
    default: { name: 'Padrão', primary: '#667eea', secondary: '#764ba2' },
    ocean: { name: 'Oceano', primary: '#2196F3', secondary: '#00BCD4' },
    forest: { name: 'Floresta', primary: '#4CAF50', secondary: '#8BC34A' },
    sunset: { name: 'Pôr do Sol', primary: '#FF5722', secondary: '#FF9800' },
    purple: { name: 'Roxo Espaço', primary: '#9C27B0', secondary: '#E91E63' },
    amoled: { name: 'AMOLED', primary: '#BB86FC', secondary: '#03DAC6' }
};

// Utilidades
const MAX_MESSAGES_DISPLAY = 500; // Limitar mensagens para performance

const Chat = () => {
    const [username, setUsername] = useState('');
    const [joined, setJoined] = useState(false);
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState([]);
    const [roomMessages, setRoomMessages] = useState({}); // Cache de mensagens por sala
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
    const [activeMessageMenu, setActiveMessageMenu] = useState(null); // ID da mensagem com menu ativo
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [isSendingFile, setIsSendingFile] = useState(false);
    const messagesEndRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const audioRef = useRef(null);
    const fileInputRef = useRef(null);
    const messageInputRef = useRef(null);
    const messagesContainerRef = useRef(null);
    const dropZoneRef = useRef(null);
    const settingsPanelRef = useRef(null);
    const usersListPanelRef = useRef(null);
    const emojiPickerRef = useRef(null);
    // Ref to always hold latest messages without stale-closure issues
    const messagesRef = useRef([]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleScroll = (e) => {
        const element = e.target;
        const isNearBottom = element.scrollHeight - element.scrollTop - element.clientHeight < 100;
        setShowScrollButton(!isNearBottom);
    };

    useEffect(() => {
        messagesRef.current = messages;
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

    const playNotificationSound = useCallback(() => {
        if (soundEnabled && audioRef.current) {
            audioRef.current.play().catch(() => {});
        }
    }, [soundEnabled]);

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

    const showNotification = useCallback((title, body) => {
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
    }, [notificationsEnabled]);

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
            // Limitar mensagens para performance
            const limitedHistory = history.slice(-MAX_MESSAGES_DISPLAY);
            setMessages(limitedHistory);
            setIsLoadingHistory(false);
        });

        // Receber nova mensagem
        socket.on('message', (msg) => {
            console.log('Mensagem recebida:', msg);
            setMessages((prev) => {
                // Limitar mensagens mantidas em memória
                const updated = [...prev, msg].slice(-MAX_MESSAGES_DISPLAY);
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
            // Use messagesRef to avoid stale-closure reading old messages state
            setRoomMessages(prev => ({
                ...prev,
                [currentRoom]: messagesRef.current
            }));
            setCurrentRoom(data.room);
            setMessages([]);
        });

        // Erros do servidor (ex: username em uso)
        socket.on('error', (data) => {
            toast.error(data.message || 'Erro de conexão');
            setJoined(false);
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
            socket.off('error');
        };
    }, [username, soundEnabled, notificationsEnabled, currentRoom, playNotificationSound, showNotification]);

    const handleJoin = (e) => {
        e.preventDefault();
        const trimmedUsername = username.trim();
        
        // Validações
        if (!trimmedUsername) {
            toast.error('Por favor, digite um nome de usuário');
            return;
        }
        
        if (trimmedUsername.length < 2) {
            toast.error('Nome de usuário deve ter pelo menos 2 caracteres');
            return;
        }
        
        if (trimmedUsername.length > 20) {
            toast.error('Nome de usuário deve ter no máximo 20 caracteres');
            return;
        }
        
        if (!/^[a-zA-Z0-9_áéíóúãõâêôçÁÉÍÓÚÃÕÂÊÔÇ]+$/.test(trimmedUsername)) {
            toast.error('Nome de usuário só pode conter letras, números e underscore');
            return;
        }
        
        console.log('Entrando na sala:', currentRoom, 'como:', trimmedUsername);
        setIsLoadingHistory(true);
        socket.emit('join', { username: trimmedUsername, room: currentRoom });
        setJoined(true);
        
        // Remover loading após receber histórico
        setTimeout(() => setIsLoadingHistory(false), 2000);
    };

    // Debounced typing indicator
    const handleTyping = () => {
        // Debounced typing indicator
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }
        
        socket.emit('typing', { is_typing: true });
        
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
        if (lastWord && lastWord.startsWith('@') && lastWord.length > 1) {
            const searchTerm = lastWord.substring(1).toLowerCase();
            const suggestions = onlineUsers
                .map(u => typeof u === 'string' ? u : (u.username || ''))
                .filter(user => 
                    user && user.toLowerCase().startsWith(searchTerm) && user !== username
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
                toast.success(`Sala #${newRoom} criada!`);
            } else {
                toast.error('Esta sala já existe!');
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
            toast.error('Arquivo muito grande! Máximo 5 MB');
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        setIsSendingFile(true);
        const reader = new FileReader();
        
        reader.onload = () => {
            const fileData = reader.result;
            const fileType = file.type.startsWith('image/') ? 'image' : 'file';
            
            socket.emit('upload_file', {
                file: fileData,
                filename: file.name,
                type: fileType,
            });
            
            if (fileInputRef.current) fileInputRef.current.value = '';
            toast.success(`📎 ${file.name} enviado!`);
            setTimeout(() => setIsSendingFile(false), 1000);
        };
        
        reader.onerror = () => {
            toast.error('Erro ao ler o arquivo. Tente novamente.');
            setIsSendingFile(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
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
        toast((t) => (
            <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                Deletar esta mensagem?
                <button
                    style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer' }}
                    onClick={() => { socket.emit('delete_message', { message_id: messageId }); toast.dismiss(t.id); }}
                >
                    Deletar
                </button>
                <button
                    style={{ background: '#e2e8f0', border: 'none', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer' }}
                    onClick={() => toast.dismiss(t.id)}
                >
                    Cancelar
                </button>
            </span>
        ), { duration: 7000, icon: '🗑️' });
    };

    const copyMessage = (text) => {
        navigator.clipboard.writeText(text)
            .then(() => toast.success('Mensagem copiada!'))
            .catch(() => toast.error('Não foi possível copiar.'));
    };

    const isMentioned = (text) => {
        if (!text || !username) return false;
        return text.includes(`@${username}`);
    };

    // Escape HTML to prevent XSS before applying markdown transforms
    const escapeHtml = (raw) => {
        return raw
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    };

    // Text formatting functions — always escape first, then apply markdown
    const formatText = (text) => {
        if (!text) return text;

        // Escape raw HTML to prevent XSS
        text = escapeHtml(text);

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
    const changeTheme = useCallback((newTheme) => {
        setTheme(newTheme);
        localStorage.setItem('chatTheme', newTheme);
        document.body.dataset.theme = newTheme === 'default' ? '' : newTheme;
    }, []);

    useEffect(() => {
        changeTheme(theme);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Detectar clique fora dos painéis para fechar
    useEffect(() => {
        const handleClickOutside = (event) => {
            // Fechar menu de ações de mensagem ao clicar fora
            if (activeMessageMenu !== null) {
                const clickedMessage = event.target.closest('.message');
                if (!clickedMessage || clickedMessage.dataset.messageId !== String(activeMessageMenu)) {
                    setActiveMessageMenu(null);
                }
            }

            // Fechar painel de configurações
            if (settingsPanelRef.current && !settingsPanelRef.current.contains(event.target)) {
                const settingsBtn = event.target.closest('.settings-btn');
                if (!settingsBtn && showSettings) {
                    setShowSettings(false);
                }
            }

            // Fechar lista de usuários
            if (usersListPanelRef.current && !usersListPanelRef.current.contains(event.target)) {
                const onlineUsersBtn = event.target.closest('.online-users');
                if (!onlineUsersBtn && showUsersList) {
                    setShowUsersList(false);
                }
            }

            // Fechar emoji picker
            if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
                const emojiBtn = event.target.closest('.emoji-btn');
                if (!emojiBtn && showEmojiPicker) {
                    setShowEmojiPicker(false);
                }
            }
        };

        const handleEscapeKey = (event) => {
            if (event.key === 'Escape') {
                setShowSettings(false);
                setShowUsersList(false);
                setShowEmojiPicker(false);
                setShowSearch(false);
                setShowPinned(false);
                setActiveMessageMenu(null);
                setMobileMenuOpen(false);
            }
        };

        // Adicionar listener apenas se algum painel estiver aberto
        if (showSettings || showUsersList || showEmojiPicker || activeMessageMenu !== null) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        
        document.addEventListener('keydown', handleEscapeKey);
        
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscapeKey);
        };
    }, [showSettings, showUsersList, showEmojiPicker, activeMessageMenu]);

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
                toast.error('Arquivo muito grande! Máximo 5 MB');
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
        if (!query || !query.trim()) {
            setSearchResults([]);
            return;
        }

        const results = messages.filter(msg => 
            msg && msg.message && msg.message.toLowerCase().includes(query.toLowerCase())
        );
        setSearchResults(results);
    };

    const clearSearch = () => {
        setSearchQuery('');
        setSearchResults([]);
        setShowSearch(false);
    };

    // Apply theme to body
    React.useEffect(() => {
        document.body.dataset.theme = theme === 'default' ? '' : theme;
        if (darkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [theme, darkMode]);

    if (!joined) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-surface p-4">
                <div className="bg-theme border border-theme rounded-2xl shadow-2xl w-full max-w-sm p-8 animate-[fadeInUp_.3s_ease_both]">
                    <h1 className="text-2xl font-bold text-theme mb-1">💬 Chat em Tempo Real</h1>
                    <p className="text-muted text-sm mb-6">Entre com seu nome para começar</p>

                    <form onSubmit={handleJoin} className="flex flex-col gap-4">
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Digite seu nome..."
                            className="w-full px-4 py-3 rounded-xl border border-theme bg-surface text-theme text-sm focus-primary placeholder:text-muted transition-colors"
                            maxLength={20}
                            autoFocus
                        />
                        <div>
                            <label className="block text-xs font-medium text-muted mb-1.5">Escolha uma sala:</label>
                            <select
                                value={currentRoom}
                                onChange={(e) => setCurrentRoom(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-theme bg-surface text-theme text-sm focus-primary transition-colors"
                            >
                                {availableRooms.map(room => (
                                    <option key={room} value={room}>{room}</option>
                                ))}
                            </select>
                        </div>
                        <button
                            type="submit"
                            className="w-full py-3 bg-primary text-white rounded-xl font-semibold text-sm hover:bg-primary-dark active:scale-[.98] transition-all disabled:opacity-50"
                        >
                            Entrar no Chat
                        </button>
                    </form>

                    <button
                        onClick={() => setDarkMode(!darkMode)}
                        className="mt-4 w-full py-2.5 text-sm text-muted bg-surface border border-theme rounded-xl hover:bg-theme transition-colors"
                    >
                        {darkMode ? '☀️ Modo Claro' : '🌙 Modo Escuro'}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-theme text-theme overflow-hidden">
            {/* Loading overlay */}
            {isLoadingHistory && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999]">
                    <div className="loading-spinner" />
                </div>
            )}

            {/* Audio */}
            <audio ref={audioRef} src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZjjkHF2W+7NuVPwwPUqrl7qtiGwQ4kdTxzHksBSV4yPDgkj4IFV6w5NqGHgwOUqvl7qtiGwQ4kdTxzHksBSV4yPDgkj4IFV6w5NqGHgwOUqvl7qtiGwQ4kdTxzHksBSV4yPDgkj4IFV6w5NqGHgwOUqvl7qtiGwQ4kdTxzHksBSV4yPDgkj4IFV6w5NqGHgwOUqvl7qtiGwQ4kdTxzHksBSV4yPDgkj4IFV6w5NqGHgwOUqvl7qtiGwQ4kdTxzHksBSV4yPDgkj4IFV6w5NqGHgwOUqvl7qtiGwQ4kdTxzHksBSV4yPDgkj4IFV6w5NqGHgwOUqvl7qtiGwQ4kdTxzHksBSV4yPDgkj4IFV6w5NqGHgwOUqvl7qtiGwQ4kdTxzHksBSV4yPDgkj4IFV6w5NqGHgwOUqvl7qtiGwQ4kdTxzHksBSV4yPDgkj4IFV6w5NqGHgwOUqvl7qtiGwQ4kdTxzHksBSV4yPDgkj4IFV6w5NqGHgwOUqvl7qtiGwQ4kdTxzHksBSV4yPDgkj4IFV6w5NqGHgwOUqvl7qtiGwQ4kdTxzHksBSV4yPDgkj4IFV6w5NqGHgwOUqvl7qtiGwQ4kdTxzHksBSV4yPDgkj4IFV6w5NqGHgwOUqvl7qtiGwQ4kdTxzHksBSV4yPDgkj4IFV6w5NqGHgwOUqvl7qtiGwQ4kdTxzHksBSV4yPDgkj4IFV6w5NqGHgwOUqvl7qtiGwQ4kdTxzHksBSV4yPDgkj4IFV6w5NqGHgwOUqvl7qtiGwQ4kdTxzHksBSV4yPDgkj4IFV6w5NqGHgwOUqvl7qtiGwQ4kdTxzHksBSV4yPDgkj4IFV6w5NqGHgwOUqvl7qtiGwQ4kdTxzHksBSV4yPDgkj4IFV6w5NqGHgwOUqvl7qtiGwQ4kdTxzHksBSV4yPDgkj4IFV6w5NqGHgwOUqvl7qtiGw==" preload="auto" />

            {/* ── HEADER ─────────────────────────── */}
            <header className="flex items-center justify-between px-4 py-3 bg-theme border-b border-theme sticky top-0 z-50 shadow-sm shrink-0">
                <div className="min-w-0">
                    <h1 className="text-lg font-bold leading-none">💬 Chat em Tempo Real</h1>
                    <p className="text-xs text-muted mt-0.5 truncate">
                        Conectado como: <strong className="font-semibold text-theme">{username}</strong>
                        <span className="ml-1.5 inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-primary text-white">#{currentRoom}</span>
                        {connectionStatus !== 'connected' && (
                            <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${connectionStatus === 'connecting' ? 'bg-amber-500 text-white' : 'bg-red-500 text-white'}`}>
                                {connectionStatus === 'connecting' ? '🔄 Conectando...' : '⚠️ Desconectado'}
                            </span>
                        )}
                    </p>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                    <button
                        onClick={() => setShowSearch(!showSearch)}
                        className="h-9 w-9 flex items-center justify-center rounded-lg border border-theme bg-surface hover:bg-theme transition-colors text-base"
                        title="Pesquisar mensagens"
                    >🔍</button>
                    <button
                        onClick={() => setShowUsersList(!showUsersList)}
                        className="h-9 flex items-center gap-1.5 px-3 rounded-lg border border-theme bg-surface hover:bg-theme transition-colors text-xs font-medium"
                    >
                        <span className={`w-2 h-2 rounded-full ${connectionStatus === 'connected' ? 'bg-green-500' : 'bg-slate-400'}`} />
                        {onlineUsers.length} online
                    </button>
                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        className="settings-btn h-9 w-9 flex items-center justify-center rounded-lg border border-theme bg-surface hover:bg-theme transition-colors text-base"
                    >⚙️</button>
                </div>
            </header>

            {/* ── SEARCH BAR ─────────────────────── */}
            {showSearch && (
                <div className="flex gap-2 px-4 py-2 bg-surface border-b border-theme items-center shrink-0">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                        placeholder="Pesquisar mensagens..."
                        className="flex-1 px-3 py-2 text-sm rounded-lg border border-theme bg-theme text-theme focus-primary placeholder:text-muted transition-colors"
                        autoFocus
                    />
                    <button onClick={clearSearch} className="h-9 px-3 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors">✗</button>
                    {searchResults.length > 0 && (
                        <span className="h-9 flex items-center px-3 rounded-lg bg-primary text-white text-xs font-semibold">
                            {searchResults.length} resultado{searchResults.length !== 1 ? 's' : ''}
                        </span>
                    )}
                </div>
            )}

            {/* ── PINNED BANNER ──────────────────── */}
            {showPinned && pinnedMessages.length > 0 && (
                <div className="px-4 py-3 bg-amber-50 border-b border-amber-300 text-amber-900 dark:bg-amber-950 dark:border-amber-700 dark:text-amber-200 shrink-0">
                    <div className="flex items-center justify-between mb-2 font-semibold text-sm">
                        <span>📌 Mensagens Fixadas ({pinnedMessages.length})</span>
                        <button onClick={() => setShowPinned(false)} className="text-lg leading-none opacity-60 hover:opacity-100">✗</button>
                    </div>
                    <div className="flex flex-col gap-1.5">
                        {pinnedMessages.map(msg => (
                            <div key={msg.id} className="flex items-center gap-2 px-2 py-1.5 bg-white/50 dark:bg-black/20 rounded-lg text-xs">
                                <span className="font-semibold">{msg.username}:</span>
                                <span className="flex-1 truncate">{msg.message.substring(0, 50)}{msg.message.length > 50 ? '...' : ''}</span>
                                <button onClick={() => togglePin(msg)} className="opacity-60 hover:opacity-100">✗</button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── USERS MODAL ────────────────────── */}
            {showUsersList && (
                <div className="fixed inset-0 bg-black/40 z-[1000] flex justify-end" onClick={() => setShowUsersList(false)}>
                    <div
                        ref={usersListPanelRef}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full max-w-xs h-full bg-theme border-l border-theme flex flex-col p-5 overflow-y-auto animate-[slideInRight_.22s_ease_both]"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-base font-semibold">Usuários Online ({onlineUsers.length})</h3>
                            <button onClick={() => setShowUsersList(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface transition-colors text-muted">✗</button>
                        </div>
                        <div className="flex flex-col gap-2 flex-1">
                            {onlineUsers.map((user, idx) => (
                                <div key={idx} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-surface">
                                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0" style={{backgroundColor: user.color}}>
                                        {user.username.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-semibold truncate">{user.username}</div>
                                        <div className="text-xs text-muted">
                                            {user.status === 'online' ? '🟢' : user.status === 'ausente' ? '🟡' : '🔴'} {user.status}
                                        </div>
                                    </div>
                                    {user.username !== username && (
                                        <button
                                            onClick={() => sendDM(user.username)}
                                            className="w-8 h-8 flex items-center justify-center rounded-lg border border-theme hover:bg-primary hover:border-primary hover:text-white transition-all"
                                        >💬</button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ── SETTINGS PANEL ─────────────────── */}
            {showSettings && (
                <div
                    ref={settingsPanelRef}
                    className="fixed top-14 right-4 w-[300px] bg-theme border border-theme rounded-2xl shadow-2xl p-4 z-[1000] animate-[fadeInUp_.2s_ease_both]"
                >
                    {[
                        { label: '🔔 Notificações Sonoras', checked: soundEnabled, onChange: (v) => setSoundEnabled(v) },
                        { label: darkMode ? '☀️ Modo Claro' : '🌙 Modo Escuro', checked: darkMode, onChange: (v) => setDarkMode(v) },
                        { label: '🔔 Notificações Desktop', checked: notificationsEnabled, onChange: (v) => { if (v) requestNotificationPermission(); else setNotificationsEnabled(false); } },
                    ].map(({ label, checked, onChange }) => (
                        <label key={label} className="flex items-center gap-3 py-3 border-b border-theme cursor-pointer text-sm">
                            <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="w-4 h-4 accent-[var(--tw-primary)]" />
                            {label}
                        </label>
                    ))}
                    <div className="py-3 border-b border-theme">
                        <span className="text-sm font-medium">🎨 Tema</span>
                        <div className="grid grid-cols-6 gap-2 mt-2">
                            {Object.keys(THEMES).map(themeName => (
                                <button
                                    key={themeName}
                                    onClick={() => changeTheme(themeName)}
                                    title={THEMES[themeName].name}
                                    className={`w-full aspect-square rounded-lg transition-all hover:scale-110 flex items-center justify-center text-white text-sm font-bold ${theme === themeName ? 'ring-2 ring-white ring-offset-2 scale-110' : ''}`}
                                    style={{ backgroundColor: THEMES[themeName].primary }}
                                >
                                    {theme === themeName ? '✓' : ''}
                                </button>
                            ))}
                        </div>
                        <p className="text-xs text-muted mt-2 text-center">{THEMES[theme].name}</p>
                    </div>
                    <div className="flex flex-col gap-2 pt-3">
                        <button onClick={() => setShowPinned(!showPinned)} className="w-full py-2 text-sm bg-surface border border-theme rounded-xl hover:bg-theme transition-colors">
                            📌 {showPinned ? 'Ocultar' : 'Ver'} Mensagens Fixadas
                        </button>
                        <button onClick={() => socket.emit('message', { message: '/help' })} className="w-full py-2 text-sm bg-surface border border-theme rounded-xl hover:bg-theme transition-colors">
                            ❓ Ver Comandos
                        </button>
                    </div>
                </div>
            )}

            {/* ── CHAT LAYOUT ────────────────────── */}
            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar */}
                <aside className={`${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 fixed md:relative top-0 left-0 h-full z-[999] w-60 bg-surface border-r border-theme flex flex-col transition-transform duration-300 ease-in-out shrink-0`}>
                    <div className="px-4 pt-4 pb-2 text-xs font-semibold text-muted uppercase tracking-wider">Salas</div>
                    <div className="flex-1 overflow-y-auto">
                        {availableRooms.map(room => (
                            <button
                                key={room}
                                onClick={() => { changeRoom(room); setMobileMenuOpen(false); }}
                                className={`w-full flex items-center justify-between px-4 py-2.5 text-sm text-left border-l-2 transition-colors ${room === currentRoom ? 'border-primary bg-theme font-semibold text-primary' : 'border-transparent hover:bg-theme text-theme'}`}
                            >
                                <span># {room}</span>
                                {unreadCounts[room] > 0 && (
                                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500 text-white">
                                        {unreadCounts[room]}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                    <div className="p-3">
                        <button onClick={createNewRoom} className="w-full py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors">
                            ➕ Nova Sala
                        </button>
                    </div>
                </aside>

                {/* Mobile sidebar toggle */}
                <button
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    className="md:hidden fixed bottom-24 left-4 z-[998] w-11 h-11 bg-primary text-white rounded-full shadow-lg flex items-center justify-center text-lg"
                >
                    {mobileMenuOpen ? '✕' : '☰'}
                </button>

                {/* Messages area */}
                <main
                    className="flex-1 flex flex-col overflow-hidden relative"
                    ref={dropZoneRef}
                    onDragEnter={handleDragEnter}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                >
                    {/* Drag overlay */}
                    {isDragging && (
                        <div className="absolute inset-0 bg-primary/90 flex items-center justify-center z-50">
                            <div className="text-center text-white">
                                <div className="text-6xl mb-4">📎</div>
                                <div className="text-xl font-semibold">Solte o arquivo aqui</div>
                                <div className="text-sm opacity-80 mt-1">máximo 5MB</div>
                            </div>
                        </div>
                    )}

                    {/* Messages list */}
                    <div className="flex-1 overflow-y-auto px-4 py-5 space-y-1" ref={messagesContainerRef} onScroll={handleScroll}>
                        {messages.map((msg, index) => {
                            if (msg.type === 'system') {
                                return (
                                    <div key={index} className="flex justify-center my-3">
                                        <span className="px-4 py-1.5 text-xs text-muted bg-surface rounded-full border border-theme">{msg.message}</span>
                                    </div>
                                );
                            }
                            if (msg.type === 'command') {
                                return (
                                    <div key={index} className="my-3 p-3 bg-surface border border-theme rounded-xl">
                                        <pre className="text-xs text-theme font-mono whitespace-pre-wrap break-words">{msg.message}</pre>
                                    </div>
                                );
                            }
                            if (msg.type === 'action') {
                                return (
                                    <div key={index} className="my-2 px-3 py-1 italic text-sm text-muted">
                                        <span style={{color: msg.color}}>{msg.username}</span> {msg.message}
                                    </div>
                                );
                            }
                            if (msg.type === 'dm') {
                                return (
                                    <div key={index} className="flex gap-3 items-start px-3 py-2.5 my-2 bg-surface border-l-2 border-primary rounded-xl">
                                        <span className="flex items-center px-2 py-0.5 bg-primary text-white rounded-lg text-[11px] font-bold shrink-0 mt-0.5">💬 DM</span>
                                        <div className="flex-1 min-w-0 text-sm">
                                            <strong style={{color: msg.color}}>{msg.from === username ? `Você → ${msg.to}` : `${msg.from} → Você`}</strong>
                                            <div className="mt-0.5">{msg.message}</div>
                                            <span className="text-[11px] text-muted mt-0.5 block">{formatTime(msg.timestamp)}</span>
                                        </div>
                                    </div>
                                );
                            }
                            if (msg.type === 'file') {
                                return (
                                    <div key={msg.id || index} className={`flex gap-3 mb-2 ${msg.username === username ? 'flex-row-reverse' : ''}`}>
                                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0 mt-0.5" style={{backgroundColor: msg.color}}>
                                            {msg.username.charAt(0).toUpperCase()}
                                        </div>
                                        <div className={`flex flex-col ${msg.username === username ? 'items-end' : 'items-start'} min-w-0 max-w-[80%]`}>
                                            <div className="flex items-baseline gap-2 mb-1">
                                                <span className="text-xs font-semibold" style={{color: msg.color}}>{msg.username}</span>
                                                <span className="text-[11px] text-muted">{formatTime(msg.timestamp)}</span>
                                            </div>
                                            <div className="text-sm">{msg.message}</div>
                                            {msg.file && msg.file.type === 'image' && (
                                                <img src={msg.file.data} alt={msg.file.name} className="max-w-[280px] max-h-[280px] rounded-xl mt-2" />
                                            )}
                                            {msg.file && msg.file.type === 'file' && (
                                                <a href={msg.file.data} download={msg.file.name} className="inline-flex items-center gap-2 mt-2 px-3 py-2 text-xs bg-surface border border-theme rounded-lg text-primary hover:border-primary transition-colors">
                                                    📎 {msg.file.name}
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                );
                            }

                            const isOwn = msg.username === username;
                            const mentioned = isMentioned(msg.message);
                            return (
                                <div
                                    key={msg.id || index}
                                    className={`group flex gap-3 mb-1 ${isOwn ? 'flex-row-reverse' : ''} ${mentioned ? 'bg-amber-50 dark:bg-amber-950/30 border-l-2 border-amber-400 px-2 rounded-md' : ''}`}
                                    onClick={() => setActiveMessageMenu(activeMessageMenu === msg.id ? null : msg.id)}
                                >
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0 mt-0.5" style={{backgroundColor: msg.color}}>
                                        {msg.username.charAt(0).toUpperCase()}
                                    </div>
                                    <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} min-w-0 max-w-[75%]`}>
                                        <div className="flex items-baseline gap-2 mb-0.5">
                                            <span className="text-xs font-semibold" style={{color: msg.color}}>{msg.username}</span>
                                            <span className="text-[11px] text-muted">{formatTime(msg.timestamp)}</span>
                                        </div>
                                        {msg.replyTo && (
                                            <div className="flex gap-2 mb-1 px-2 py-1.5 bg-surface border-l-2 border-primary rounded-lg text-xs max-w-full">
                                                <span className="font-semibold text-muted">{msg.replyTo.username}</span>
                                                <span className="text-muted truncate">{msg.replyTo.message}</span>
                                            </div>
                                        )}
                                        {editingMessageId === msg.id ? (
                                            <div className="flex gap-2 items-center w-full">
                                                <input
                                                    type="text"
                                                    value={editingText}
                                                    onChange={(e) => setEditingText(e.target.value)}
                                                    className="flex-1 px-3 py-1.5 text-sm border border-theme rounded-lg bg-surface text-theme focus-primary"
                                                    autoFocus
                                                    onKeyDown={(e) => { if (e.key === 'Enter') saveEditMessage(msg.id); if (e.key === 'Escape') cancelEdit(); }}
                                                />
                                                <button onClick={() => saveEditMessage(msg.id)} className="px-2.5 py-1.5 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600">✓</button>
                                                <button onClick={cancelEdit} className="px-2.5 py-1.5 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600">✗</button>
                                            </div>
                                        ) : (
                                            <>
                                                {isOwn ? (
                                                    <div className="px-3.5 py-2 bg-primary text-white rounded-2xl rounded-tr-sm text-sm leading-relaxed break-words max-w-full"
                                                         dangerouslySetInnerHTML={{ __html: formatText(msg.message) }} />
                                                ) : (
                                                    <div className="px-3.5 py-2 bg-surface rounded-2xl rounded-tl-sm text-sm leading-relaxed break-words max-w-full border border-theme"
                                                         dangerouslySetInnerHTML={{ __html: formatText(msg.message) }} />
                                                )}
                                                {detectLinks(msg.message).map((link, li) => (
                                                    <a key={li} href={link} target="_blank" rel="noopener noreferrer"
                                                        className="flex items-center gap-1.5 mt-1 text-xs text-primary bg-surface border border-theme px-2 py-1.5 rounded-lg hover:border-primary transition-colors break-all max-w-full">
                                                        🔗 {link.length > 50 ? link.substring(0, 50) + '…' : link}
                                                    </a>
                                                ))}
                                                {msg.edited && <span className="text-[10px] text-muted mt-0.5">(editado)</span>}
                                            </>
                                        )}
                                        <div className={`flex gap-1 mt-1 transition-opacity ${activeMessageMenu === msg.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                            {[
                                                { icon: pinnedMessages.some(p => p.id === msg.id) ? '📌' : '📍', action: () => togglePin(msg), title: 'Fixar' },
                                                { icon: '↩️', action: () => startReply(msg), title: 'Responder' },
                                                { icon: '📋', action: () => copyMessage(msg.message), title: 'Copiar' },
                                            ].map(({ icon, action, title }) => (
                                                <button key={title} onClick={action} title={title}
                                                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-surface border border-theme hover:bg-theme text-xs transition-colors">
                                                    {icon}
                                                </button>
                                            ))}
                                            {isOwn && editingMessageId !== msg.id && msg.type !== 'system' && (
                                                <>
                                                    <button onClick={() => startEditMessage(msg)} title="Editar"
                                                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-surface border border-theme hover:bg-amber-100 dark:hover:bg-amber-900 text-xs transition-colors">✏️</button>
                                                    <button onClick={() => deleteMessage(msg.id)} title="Deletar"
                                                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-surface border border-theme hover:bg-red-100 dark:hover:bg-red-900 text-xs transition-colors">🗑️</button>
                                                </>
                                            )}
                                        </div>
                                        {reactions[msg.id] && Object.keys(reactions[msg.id]).length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {Object.entries(reactions[msg.id]).map(([emoji, users]) => (
                                                    <button key={emoji} onClick={() => addReaction(msg.id, emoji)} title={users.join(', ')}
                                                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-colors ${users.includes(username) ? 'bg-primary text-white border-primary' : 'bg-surface border-theme hover:bg-theme'}`}>
                                                        {emoji} {users.length}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                        <div className={`flex gap-1 mt-0.5 transition-opacity ${activeMessageMenu === msg.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                            {['❤️', '👍', '😂', '😮', '😢', '😡'].map(emoji => (
                                                <button key={emoji} onClick={() => quickReaction(msg.id, emoji)}
                                                    className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-surface hover:scale-125 text-sm transition-all">
                                                    {emoji}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        {typingUsers.length > 0 && (
                            <div className="flex items-center gap-2 px-2 py-2 text-xs text-muted">
                                <div className="flex gap-1">
                                    <span className="w-1.5 h-1.5 bg-muted rounded-full typing-dot" />
                                    <span className="w-1.5 h-1.5 bg-muted rounded-full typing-dot" />
                                    <span className="w-1.5 h-1.5 bg-muted rounded-full typing-dot" />
                                </div>
                                {typingUsers.join(', ')} {typingUsers.length === 1 ? 'está' : 'estão'} digitando…
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Scroll to bottom */}
                    {showScrollButton && (
                        <button onClick={scrollToBottom}
                            className="absolute bottom-24 right-5 w-10 h-10 bg-primary text-white rounded-full shadow-lg flex items-center justify-center text-lg hover:-translate-y-0.5 hover:shadow-xl transition-all z-10">
                            ⬇️
                        </button>
                    )}

                    {/* Reply bar */}
                    {replyTo && (
                        <div className="px-4 py-2 bg-surface border-t border-theme shrink-0">
                            <div className="flex items-center justify-between px-3 py-2 bg-theme border-l-2 border-primary rounded-xl">
                                <div>
                                    <div className="text-xs font-semibold text-primary mb-0.5">Respondendo a {replyTo.username}</div>
                                    <div className="text-xs text-muted truncate max-w-xs">{replyTo.message.substring(0, 60)}…</div>
                                </div>
                                <button onClick={cancelReply} className="w-6 h-6 flex items-center justify-center rounded text-muted hover:text-theme">✗</button>
                            </div>
                        </div>
                    )}

                    {/* Format toolbar */}
                    {showFormatToolbar && (
                        <div className="flex gap-1 px-4 py-2 bg-surface border-t border-theme shrink-0 overflow-x-auto">
                            {[
                                { label: 'B', format: 'bold', title: 'Negrito', cls: 'font-bold' },
                                { label: 'I', format: 'italic', title: 'Itálico', cls: 'italic' },
                                { label: 'S', format: 'strike', title: 'Tachado', cls: 'line-through' },
                                { label: '<>', format: 'code', title: 'Código', cls: 'font-mono' },
                            ].map(({ label, format, title, cls }) => (
                                <button key={format} type="button" onClick={() => insertFormatting(format)} title={title}
                                    className={`px-2.5 py-1.5 text-sm bg-theme border border-theme rounded-lg hover:bg-surface transition-colors ${cls}`}>
                                    {label}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Emoji picker */}
                    {showEmojiPicker && (
                        <div ref={emojiPickerRef}
                            className="absolute bottom-20 left-4 bg-theme border border-theme rounded-2xl p-3 grid grid-cols-8 gap-1 shadow-2xl z-50 max-w-[min(300px,calc(100vw-2rem))]">
                            {EMOJI_LIST.map(emoji => (
                                <button key={emoji} onClick={() => addEmoji(emoji)}
                                    className="p-1.5 text-xl rounded-lg hover:bg-surface transition-colors">
                                    {emoji}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Mention suggestions */}
                    {showMentions && (
                        <div className="absolute bottom-20 left-4 bg-theme border border-theme rounded-xl shadow-xl z-50 max-w-[260px] max-h-[180px] overflow-y-auto">
                            {mentionSuggestions.map(user => (
                                <button key={user} onClick={() => insertMention(user)}
                                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-surface transition-colors">
                                    @{user}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Message form */}
                    <form onSubmit={sendMessage} className="flex items-end gap-2 px-4 py-3 bg-theme border-t border-theme shrink-0">
                        <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} accept="image/*,application/pdf,.doc,.docx,.txt" />
                        <button type="button" onClick={() => setShowFormatToolbar(!showFormatToolbar)} title="Formatação"
                            className={`w-10 h-10 shrink-0 flex items-center justify-center rounded-xl border transition-colors text-base ${showFormatToolbar ? 'bg-primary border-primary text-white' : 'bg-surface border-theme hover:bg-theme'}`}>
                            🎨
                        </button>
                        <button type="button" onClick={() => fileInputRef.current.click()} disabled={isSendingFile} title="Enviar arquivo"
                            className="w-10 h-10 shrink-0 flex items-center justify-center rounded-xl border border-theme bg-surface hover:bg-theme transition-colors text-base disabled:opacity-50">
                            {isSendingFile ? '⏳' : '📎'}
                        </button>
                        <button type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                            className="emoji-btn w-10 h-10 shrink-0 flex items-center justify-center rounded-xl border border-theme bg-surface hover:bg-theme transition-colors text-base">
                            😀
                        </button>
                        <textarea
                            ref={messageInputRef}
                            value={message}
                            onChange={handleInputChange}
                            onKeyDown={handleKeyDown}
                            placeholder="Mensagem… (Enter envia, Shift+Enter nova linha)"
                            className="flex-1 px-3 py-2.5 text-sm bg-surface border border-theme rounded-xl resize-none min-h-[40px] max-h-[120px] focus-primary text-theme placeholder:text-muted transition-colors"
                            rows={1}
                            autoComplete="off"
                        />
                        <button type="submit" disabled={isSending}
                            className={`h-10 px-4 shrink-0 bg-primary text-white font-semibold text-sm rounded-xl hover:bg-primary-dark active:scale-95 transition-all disabled:opacity-50 ${isSending ? 'opacity-60' : ''}`}>
                            {isSending ? '⏳' : '📨'}
                        </button>
                    </form>
                </main>
            </div>
        </div>
    );
};

export default Chat;
