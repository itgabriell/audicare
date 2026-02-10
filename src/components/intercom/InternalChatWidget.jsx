import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Minimize2, User, Send, Check, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/lib/customSupabaseClient';
import { internalChatService } from '@/services/internalChatService';
import playNotificationSound from '@/utils/notificationSound';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const InternalChatWidget = () => {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [activeChatUser, setActiveChatUser] = useState(null);
    const [clinicUsers, setClinicUsers] = useState([]);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [unreadTotal, setUnreadTotal] = useState(0);
    const [unreadByUser, setUnreadByUser] = useState({});
    const messagesEndRef = useRef(null);

    // Load initial data
    useEffect(() => {
        if (user) {
            loadUsers();
            loadUnreadCounts();
            subscribeToMessages();
        }
        return () => {
            supabase.channel('internal-messages').unsubscribe();
        };
    }, [user]);

    // Scroll to bottom when messages change
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isOpen, activeChatUser]);

    // Load chat history when opening a chat
    useEffect(() => {
        if (activeChatUser) {
            loadMessages(activeChatUser.id);
            markAsRead(activeChatUser.id);
        }
    }, [activeChatUser]);

    const loadUsers = async () => {
        const users = await internalChatService.getClinicUsers();
        setClinicUsers(users.filter(u => u.id !== user?.id));
    };

    const loadUnreadCounts = async () => {
        const total = await internalChatService.getUnreadCount();
        const byUser = await internalChatService.getUnreadCountsByUser();
        setUnreadTotal(total);
        setUnreadByUser(byUser);
    };

    const loadMessages = async (partnerId) => {
        const msgs = await internalChatService.getMessages(partnerId);
        setMessages(msgs);
    };

    const markAsRead = async (partnerId) => {
        await internalChatService.markAsRead(partnerId);
        loadUnreadCounts(); // Refresh badges
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !activeChatUser) return;

        // Optimistic UI update
        const tempMsg = {
            id: 'temp-' + Date.now(),
            sender_id: user.id,
            receiver_id: activeChatUser.id,
            content: newMessage,
            created_at: new Date().toISOString()
        };
        setMessages(prev => [...prev, tempMsg]);
        setNewMessage('');

        await internalChatService.sendMessage(activeChatUser.id, tempMsg.content);
        // Real-time subscription will confirm the message, but optimistic is faster
    };

    const subscribeToMessages = () => {
        supabase
            .channel('internal-messages')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'internal_messages' }, // Listen to ALL events (INSERT, UPDATE)
                (payload) => {
                    if (payload.eventType === 'INSERT') {
                        const newMsg = payload.new;

                        // If it's a message for ME
                        if (newMsg.receiver_id === user.id) {
                            playNotificationSound();
                            loadUnreadCounts();

                            // If I'm chatting with the sender, append message and mark read
                            if (activeChatUser && activeChatUser.id === newMsg.sender_id) {
                                setMessages(prev => [...prev, newMsg]);
                                internalChatService.markAsRead(newMsg.sender_id);
                            }
                        }

                        // If it's a message sent BY ME (from another tab), append it
                        if (newMsg.sender_id === user.id && activeChatUser && activeChatUser.id === newMsg.receiver_id) {
                            setMessages(prev => {
                                if (prev.some(m => m.id === newMsg.id)) return prev;
                                const real = prev.filter(m => !m.id.startsWith('temp-'));
                                return [...real, newMsg];
                            });
                        }
                    } else if (payload.eventType === 'UPDATE') {
                        const updatedMsg = payload.new;
                        // Update message in list if exists (e.g. IS_READ changed)
                        setMessages(prev => prev.map(m => m.id === updatedMsg.id ? updatedMsg : m));
                    }
                }
            )
            .subscribe();
    };

    if (!user) return null;

    return (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">

            {/* CHAT WINDOW */}
            {isOpen && !isMinimized && (
                <div className="bg-white dark:bg-slate-950 w-80 md:w-96 h-[500px] max-h-[80vh] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-300">

                    {/* HEADER */}
                    <div className="p-3 bg-primary text-primary-foreground flex justify-between items-center shrink-0">
                        {activeChatUser ? (
                            <div className="flex items-center gap-2">
                                <Button variant="ghost" size="icon" onClick={() => setActiveChatUser(null)} className="h-6 w-6 text-white hover:bg-white/20 -ml-1">
                                    <span className="text-xs">◀</span>
                                </Button>
                                <Avatar className="h-8 w-8 border-2 border-white/20">
                                    <AvatarImage src={activeChatUser.avatar_url} />
                                    <AvatarFallback>{activeChatUser.full_name?.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="font-semibold text-sm truncate max-w-[150px]">{activeChatUser.full_name}</div>
                            </div>
                        ) : (
                            <div className="font-semibold flex items-center gap-2">
                                <MessageCircle className="h-5 w-5" />
                                Intercomunicador
                            </div>
                        )}

                        <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-white hover:bg-white/20" onClick={() => setIsMinimized(true)}>
                                <Minimize2 className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-white hover:bg-white/20" onClick={() => setIsOpen(false)}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    {/* BODY */}
                    <div className="flex-1 overflow-hidden bg-slate-50 dark:bg-slate-900/50 flex flex-col">

                        {activeChatUser ? (
                            // CONVERSATION VIEW
                            <>
                                <ScrollArea className="flex-1 p-4">
                                    <div className="space-y-3">
                                        {messages.map((msg, i) => {
                                            const isMe = msg.sender_id === user.id;
                                            return (
                                                <div key={i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                    <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm shadow-sm ${isMe
                                                        ? 'bg-primary text-primary-foreground rounded-br-none'
                                                        : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-bl-none'
                                                        }`}>
                                                        {msg.content}
                                                        <div className={`text-[10px] mt-1 flex items-center justify-end gap-1 ${isMe ? 'text-primary-foreground/70' : 'text-slate-400'}`}>
                                                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            {isMe && (
                                                                <span>
                                                                    {msg.is_read ? <CheckCheck className="h-3 w-3" /> : <Check className="h-3 w-3" />}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        <div ref={messagesEndRef} />
                                    </div>
                                </ScrollArea>

                                <form onSubmit={handleSendMessage} className="p-3 bg-white dark:bg-slate-950 border-t flex gap-2">
                                    <input
                                        className="flex-1 bg-slate-100 dark:bg-slate-900 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                        placeholder="Digite sua mensagem..."
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                    />
                                    <Button type="submit" size="icon" className="rounded-full h-9 w-9 shrink-0">
                                        <Send className="h-4 w-4" />
                                    </Button>
                                </form>
                            </>
                        ) : (
                            // USER LIST VIEW
                            <ScrollArea className="flex-1">
                                <div className="p-2 space-y-1">
                                    {clinicUsers.map(u => (
                                        <button
                                            key={u.id}
                                            onClick={() => setActiveChatUser(u)}
                                            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white dark:hover:bg-slate-800 transition-all text-left group"
                                        >
                                            <div className="relative">
                                                <Avatar>
                                                    <AvatarImage src={u.avatar_url} />
                                                    <AvatarFallback>{u.full_name?.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                                {/* Status (Mocked for now or based on recent activity if feasible) */}
                                                {/* <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-slate-50"></div> */}
                                            </div>
                                            <div className="flex-1">
                                                <div className="font-medium text-sm text-slate-900 dark:text-slate-100">{u.full_name}</div>
                                                <div className="text-xs text-slate-500 truncate">Clique para conversar</div>
                                            </div>
                                            {unreadByUser[u.id] > 0 && (
                                                <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                                                    {unreadByUser[u.id]}
                                                </span>
                                            )}
                                        </button>
                                    ))}
                                    {clinicUsers.length === 0 && (
                                        <div className="p-4 text-center text-slate-500 text-sm">
                                            Nenhum outro usuário encontrado na clínica.
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>
                        )}
                    </div>
                </div>
            )}

            {/* FAB - TOGGLE BUTTON */}
            {(!isOpen || isMinimized) && (
                <Button
                    onClick={() => { setIsOpen(true); setIsMinimized(false); }}
                    className="h-14 w-14 rounded-full shadow-xl bg-primary hover:bg-primary/90 text-white relative animate-in zoom-in duration-300"
                >
                    <MessageCircle className="h-7 w-7" />
                    {unreadTotal > 0 && (
                        <span className="absolute -top-1 -right-1 h-6 w-6 bg-red-500 text-white text-xs font-bold flex items-center justify-center rounded-full border-2 border-white dark:border-slate-950 animate-bounce">
                            {unreadTotal}
                        </span>
                    )}
                </Button>
            )}
        </div>
    );
};

export default InternalChatWidget;
