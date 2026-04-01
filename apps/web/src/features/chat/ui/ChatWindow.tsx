'use client';

import { useTranslations } from 'next-intl';
import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { io, Socket } from 'socket.io-client';
import { api } from '../../../shared/lib/api';
import { useAuthStore } from '../../../shared/store/auth.store';
import styles from './ChatWindow.module.scss';

interface Props {
  chatId: string;
}

export function ChatWindow({ chatId }: Props) {
  const t = useTranslations('chat');
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const socketRef = useRef<Socket | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: messagesData } = useQuery({
    queryKey: ['messages', chatId],
    queryFn: () =>
      api.get(`/chats/${chatId}/messages`).then((r) => r.data),
  });

  useEffect(() => {
    const socket = io(`${process.env.NEXT_PUBLIC_WS_URL}/chat`, {
      auth: { token: accessToken },
    });
    socketRef.current = socket;

    socket.emit('chat:join', chatId);

    socket.on('message:new', (msg) => {
      queryClient.setQueryData(['messages', chatId], (old: any) => ({
        ...old,
        data: [...(old?.data || []), msg],
      }));
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    });

    socket.on('typing:indicator', ({ userId, isTyping: typing }: any) => {
      setTypingUsers((prev) =>
        typing ? [...prev.filter((u) => u !== userId), userId] : prev.filter((u) => u !== userId),
      );
    });

    return () => {
      socket.emit('chat:leave', chatId);
      socket.disconnect();
    };
  }, [chatId, accessToken]);

  const sendMutation = useMutation({
    mutationFn: (text: string) =>
      socketRef.current?.emit('message:send', { chatId, text }) as any,
  });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    sendMutation.mutate(message);
    setMessage('');
    socketRef.current?.emit('typing:stop', chatId);
  };

  const handleTyping = (value: string) => {
    setMessage(value);
    if (!isTyping) {
      setIsTyping(true);
      socketRef.current?.emit('typing:start', chatId);
    }
  };

  const messages = messagesData?.data || [];

  return (
    <div className={styles.chat}>
      <div className={styles.chat__messages}>
        {messages.map((msg: any) => (
          <div
            key={msg.id}
            className={`${styles.chat__message} ${msg.senderId === user?.id ? styles['chat__message--own'] : ''}`}
          >
            <span className={styles.chat__message__author}>{msg.sender?.name}</span>
            <p className={styles.chat__message__text}>{msg.text}</p>
          </div>
        ))}
        {typingUsers.length > 0 && (
          <p className={styles.chat__typing}>{t('typing', { name: '...' })}</p>
        )}
        <div ref={bottomRef} />
      </div>

      <form className={styles.chat__input} onSubmit={handleSend}>
        <input
          type="text"
          placeholder={t('placeholder')}
          value={message}
          onChange={(e) => handleTyping(e.target.value)}
        />
        <button type="submit">{t('sendMessage')}</button>
      </form>
    </div>
  );
}
