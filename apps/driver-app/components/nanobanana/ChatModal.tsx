import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { supabase } from '../../lib/supabase';
import { NanoTheme } from '../../constants/nanobanana';
import { X, Send } from 'lucide-react-native';

interface Message {
    id: string;
    sender_id: string;
    content: string;
    created_at: string;
}

interface ChatModalProps {
    visible: boolean;
    onClose: () => void;
    orderId: string;
    userName: string; // Name of the person being chatted with (Customer)
}

export default function ChatModal({ visible, onClose, orderId, userName }: ChatModalProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);
    const flatListRef = useRef<FlatList>(null);

    useEffect(() => {
        if (visible && orderId) {
            setupChat();
        }
    }, [visible, orderId]);

    async function setupChat() {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        setUserId(session.user.id);

        // Fetch existing messages
        const { data, error } = await supabase
            .from('messages')
            .select('*')
            .eq('order_id', orderId)
            .order('created_at', { ascending: true });

        if (!error && data) setMessages(data);
        setLoading(false);

        // Realtime Subscription
        const channel = supabase.channel(`chat:${orderId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `order_id=eq.${orderId}`
            }, (payload) => {
                setMessages(prev => [...prev, payload.new as Message]);
                // Scroll to bottom
                setTimeout(() => flatListRef.current?.scrollToEnd(), 100);
            })
            .subscribe();

        return () => { supabase.removeChannel(channel) };
    }

    async function sendMessage() {
        if (!newMessage.trim() || !userId) return;

        const msgContent = newMessage.trim();
        setNewMessage('');

        // Optimistic UI update - add message immediately
        const tempId = `temp-${Date.now()}`;
        const optimisticMessage: Message = {
            id: tempId,
            sender_id: userId,
            content: msgContent,
            created_at: new Date().toISOString()
        };
        setMessages(prev => [...prev, optimisticMessage]);
        setTimeout(() => flatListRef.current?.scrollToEnd(), 100);

        console.log('Sending message:', msgContent, 'for order:', orderId);

        const { data, error } = await supabase
            .from('messages')
            .insert({
                order_id: orderId,
                sender_id: userId,
                content: msgContent
            })
            .select()
            .single();

        if (error) {
            console.error('Error sending message:', error);
            // Remove optimistic message on error
            setMessages(prev => prev.filter(m => m.id !== tempId));
        } else {
            console.log('Message sent successfully:', data);
            // Replace optimistic message with real one
            setMessages(prev => prev.map(m => m.id === tempId ? data : m));
        }
    }

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Chat with {userName}</Text>
                    <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                        <X size={24} color={NanoTheme.colors.text} />
                    </TouchableOpacity>
                </View>

                {/* Messages List */}
                {loading ? (
                    <View style={styles.loader}>
                        <ActivityIndicator color={NanoTheme.colors.primary} />
                    </View>
                ) : (
                    <FlatList
                        ref={flatListRef}
                        data={messages}
                        style={{ flex: 1 }}
                        keyExtractor={item => item.id}
                        contentContainerStyle={styles.listContent}
                        ListEmptyComponent={() => (
                            <View style={{ alignItems: 'center', marginTop: 50 }}>
                                <Text style={{ color: '#666' }}>No messages yet.</Text>
                                <Text style={{ color: '#444', fontSize: 10 }}>Order ID: {orderId.slice(0, 8)}...</Text>
                            </View>
                        )}
                        renderItem={({ item }) => {
                            const isMe = item.sender_id === userId;
                            return (
                                <View style={[
                                    styles.messageBubble,
                                    isMe ? styles.myMessage : styles.theirMessage
                                ]}>
                                    <Text style={[
                                        styles.messageText,
                                        isMe ? styles.myMessageText : styles.theirMessageText
                                    ]}>{item.content}</Text>
                                </View>
                            );
                        }}
                        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
                    />
                )}

                {/* Input Area */}
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
                >
                    <View style={styles.inputContainer}>
                        <TextInput
                            style={styles.input}
                            placeholder="Type a message..."
                            placeholderTextColor="#666"
                            value={newMessage}
                            onChangeText={setNewMessage}
                            returnKeyType="send"
                            onSubmitEditing={sendMessage}
                        />
                        <TouchableOpacity
                            style={[styles.sendBtn, !newMessage.trim() && styles.sendBtnDisabled]}
                            onPress={sendMessage}
                            disabled={!newMessage.trim()}
                        >
                            <Send size={20} color="black" />
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: NanoTheme.colors.background,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderColor: '#333',
        backgroundColor: NanoTheme.colors.backgroundAlt,
    },
    headerTitle: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    closeBtn: {
        padding: 4,
    },
    loader: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        padding: 16,
        paddingBottom: 24,
    },
    messageBubble: {
        maxWidth: '80%',
        padding: 12,
        borderRadius: 16,
        marginBottom: 8,
    },
    myMessage: {
        alignSelf: 'flex-end',
        backgroundColor: NanoTheme.colors.primary,
        borderBottomRightRadius: 2,
    },
    theirMessage: {
        alignSelf: 'flex-start',
        backgroundColor: '#333',
        borderBottomLeftRadius: 2,
    },
    messageText: {
        fontSize: 16,
    },
    myMessageText: {
        color: 'black',
        fontWeight: '500',
    },
    theirMessageText: {
        color: 'white',
    },
    inputContainer: {
        flexDirection: 'row',
        padding: 12,
        borderTopWidth: 1,
        borderColor: '#333',
        backgroundColor: NanoTheme.colors.backgroundAlt,
        alignItems: 'center',
        gap: 12,
        paddingBottom: Platform.OS === 'ios' ? 40 : 12,
    },
    input: {
        flex: 1,
        backgroundColor: '#222',
        borderRadius: 24,
        paddingHorizontal: 16,
        paddingVertical: 10,
        color: 'white',
        fontSize: 16,
    },
    sendBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: NanoTheme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendBtnDisabled: {
        backgroundColor: '#444',
    }
});
