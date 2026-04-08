'use client';

import { useTranslations } from 'next-intl';
import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { io, Socket } from 'socket.io-client';
import { api } from '../../../shared/lib/api';
import { useAuthStore } from '../../../shared/store/auth.store';
import styles from './ChatWindow.module.scss';

interface Props { chatId: string }

interface ReplyTo { id: number; text: string; senderName: string }

const IMG_PREFIX = '__img:';

function isImageMsg(text: string) { return text.startsWith(IMG_PREFIX); }
function imgUrl(text: string) { return text.slice(IMG_PREFIX.length); }

function MessageBubble({
  msg,
  isOwn,
  onReply,
}: {
  msg: any;
  isOwn: boolean;
  onReply: (reply: ReplyTo) => void;
}) {
  const [hovered, setHovered] = useState(false);

  const replyPreview = msg.replyTo
    ? (isImageMsg(msg.replyTo.text) ? '🖼 Photo' : msg.replyTo.text)
    : null;

  return (
    <div
      className={`${styles.chat__msg} ${isOwn ? styles['chat__msg--own'] : ''}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Reply button on hover */}
      {hovered && (
        <button
          className={styles.chat__msg__reply_btn}
          onClick={() => onReply({
            id: msg.id,
            text: msg.text,
            senderName: msg.sender?.name ?? '...',
          })}
          title="Reply"
        >
          ↩
        </button>
      )}

      <div className={styles.chat__msg__wrap}>
        {!isOwn && (
          <span className={styles.chat__msg__author}>{msg.sender?.name}</span>
        )}

        {/* Quoted message */}
        {replyPreview && (
          <div className={styles.chat__msg__quote}>
            <span className={styles.chat__msg__quote__name}>{msg.replyTo?.sender?.name}</span>
            <span className={styles.chat__msg__quote__text}>{replyPreview}</span>
          </div>
        )}

        {/* Message body */}
        {isImageMsg(msg.text) ? (
          <img
            src={imgUrl(msg.text)}
            alt="photo"
            className={styles.chat__msg__image}
          />
        ) : (
          <p className={styles.chat__msg__text}>{msg.text}</p>
        )}

        <span className={styles.chat__msg__time}>
          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
}

export function ChatWindow({ chatId }: Props) {
  const chatIdNum = parseInt(chatId, 10);
  const t = useTranslations('chat');
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();

  const [message, setMessage]       = useState('');
  const [isTyping, setIsTyping]     = useState(false);
  const [typingUsers, setTypingUsers] = useState<number[]>([]);
  const [replyTo, setReplyTo]       = useState<ReplyTo | null>(null);
  const [uploading, setUploading]   = useState(false);

  const socketRef   = useRef<Socket | null>(null);
  const bottomRef   = useRef<HTMLDivElement>(null);
  const inputRef    = useRef<HTMLInputElement>(null);
  const fileRef     = useRef<HTMLInputElement>(null);

  const { data: chatData } = useQuery({
    queryKey: ['chat', chatIdNum],
    queryFn: () => api.get(`/chats/${chatIdNum}`).then((r) => r.data),
  });

  const { data: messagesData } = useQuery({
    queryKey: ['messages', chatIdNum],
    queryFn: () => api.get(`/chats/${chatIdNum}/messages`).then((r) => r.data),
  });

  useEffect(() => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';
    const socket = io(`${wsUrl}/chat`, { auth: { token: accessToken } });
    socketRef.current = socket;
    socket.emit('chat:join', chatIdNum);

    socket.on('message:new', (msg) => {
      queryClient.setQueryData(['messages', chatIdNum], (old: any) => ({
        ...old,
        data: [...(old?.data || []), msg],
      }));
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    });

    socket.on('typing:indicator', ({ userId, isTyping: typing }: any) => {
      setTypingUsers((prev) =>
        typing
          ? [...prev.filter((u) => u !== userId), userId]
          : prev.filter((u) => u !== userId),
      );
    });

    return () => { socket.emit('chat:leave', chatIdNum); socket.disconnect(); };
}, [chatIdNum, accessToken, queryClient]);

  // Scroll to bottom on first load
const hasMessages = (messagesData?.data?.length ?? 0) > 0;

useEffect(() => {
  if (hasMessages) {
    bottomRef.current?.scrollIntoView();
  }
}, [hasMessages]);

  const sendText = (text: string, replyToId?: number) => {
    socketRef.current?.emit('message:send', {
      chatId: chatIdNum,
      text,
      ...(replyToId ? { replyToMessageId: replyToId } : {}),
    });
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    sendText(message.trim(), replyTo?.id);
    setMessage('');
    setReplyTo(null);
    socketRef.current?.emit('typing:stop', chatIdNum);
  };

  const handleTyping = (value: string) => {
    setMessage(value);
    if (!isTyping) {
      setIsTyping(true);
      socketRef.current?.emit('typing:start', chatIdNum);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await api.post('/uploads/image', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      sendText(`${IMG_PREFIX}${res.data.url}`, replyTo?.id);
      setReplyTo(null);
    } catch {
      // silently fail
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleReply = (reply: ReplyTo) => {
    setReplyTo(reply);
    inputRef.current?.focus();
  };

  const messages = messagesData?.data || [];
  const listing = chatData?.listing;

  return (
    <div className={styles.chat}>

      {/* Messages */}
      <div className={styles.chat__messages}>

        {/* Listing card — pinned at top of messages */}
        {listing && (
          <div className={styles.chat__listing}>
            {listing.media?.[0] && (
              <img
                src={listing.media[0].thumbUrl || listing.media[0].url}
                alt=""
                className={styles.chat__listing__img}
              />
            )}
            <div className={styles.chat__listing__body}>
              <span className={styles.chat__listing__label}>Объявление</span>
              <span className={styles.chat__listing__title}>{listing.title}</span>
              <span className={styles.chat__listing__price}>
                {listing.priceOnRequest ? 'По договорённости' : `$${Number(listing.priceMin).toLocaleString()}/mo`}
              </span>
            </div>
          </div>
        )}

        {messages.map((msg: any) => (
          <MessageBubble
            key={msg.id}
            msg={msg}
            isOwn={msg.senderId === user?.id}
            onReply={handleReply}
          />
        ))}
        {typingUsers.length > 0 && (
          <p className={styles.chat__typing}>{t('typing', { name: '...' })}</p>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Reply preview bar */}
      {replyTo && (
        <div className={styles.chat__reply}>
          <div className={styles.chat__reply__body}>
            <span className={styles.chat__reply__name}>{replyTo.senderName}</span>
            <span className={styles.chat__reply__text}>
              {isImageMsg(replyTo.text) ? '🖼 Photo' : replyTo.text}
            </span>
          </div>
          <button
            className={styles.chat__reply__close}
            onClick={() => setReplyTo(null)}
            type="button"
          >
            ✕
          </button>
        </div>
      )}

      {/* Input area */}
      <form className={styles.chat__input} onSubmit={handleSend}>
        {/* Image upload */}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          id="chat-file"
          className={styles.chat__input__file}
          onChange={handleFileChange}
        />
        <label
          htmlFor="chat-file"
          className={`${styles.chat__input__attach} ${uploading ? styles['chat__input__attach--loading'] : ''}`}
          title="Attach photo"
        >
          {uploading ? (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="2" strokeDasharray="25 25" strokeLinecap="round">
                <animateTransform attributeName="transform" type="rotate" from="0 10 10" to="360 10 10" dur="0.8s" repeatCount="indefinite"/>
              </circle>
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <rect x="2" y="4" width="16" height="13" rx="2" stroke="currentColor" strokeWidth="1.5"/>
              <circle cx="10" cy="10.5" r="3" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M7 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" stroke="currentColor" strokeWidth="1.5"/>
            </svg>
          )}
        </label>

        <input
          ref={inputRef}
          type="text"
          placeholder={t('placeholder')}
          value={message}
          onChange={(e) => handleTyping(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { handleSend(e as any); } }}
        />

        <button type="submit" disabled={!message.trim() && !uploading}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M18 10L3 3l3.5 7L3 17l15-7z" fill="currentColor"/>
          </svg>
        </button>
      </form>
    </div>
  );
}
