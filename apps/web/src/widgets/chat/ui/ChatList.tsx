'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { useAuthStore } from '../../../shared/store/auth.store';
import { useRouter } from '../../../navigation';
import { api } from '../../../shared/lib/api';
import { Link } from '../../../navigation';
import styles from './ChatList.module.scss';

interface Props { locale: string }

export function ChatList({ locale }: Props) {
  const t = useTranslations('chat');
  const { user } = useAuthStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const providerId = searchParams.get('providerId');
  const listingId  = searchParams.get('listingId');

  // Auto-create chat when redirected from listing detail
  useEffect(() => {
    if (!user || !providerId) return;
    api.post('/chats', {
      providerId: Number(providerId),
      ...(listingId ? { listingId: Number(listingId) } : {}),
    }).then(r => {
      router.replace(`/chats/${r.data.id}`);
    }).catch(() => {});
}, [user, providerId, listingId, router]);

  const { data: chats = [], isLoading } = useQuery({
    queryKey: ['chats'],
    queryFn: () => api.get('/chats').then(r => r.data),
    enabled: !!user,
  });

  if (!user) {
    return (
      <div className={styles.page}>
        <p className={styles.empty}><Link href="/login">Sign in to view messages</Link></p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.header__title}>{t('title') || 'Messages'}</h1>
      </div>

      {isLoading && <p className={styles.empty}>Loading...</p>}

      {!isLoading && !chats.length && (
        <div className={styles.empty__box}>
          <span>💬</span>
          <p>{t('noChats')}</p>
        </div>
      )}

      <div className={styles.list}>
        {chats.map((chat: any) => {
          const lastMsg = chat.messages?.[0];
          const isOwnUser = user.role === 'USER';
          // From user's POV: the other party is the provider; from provider's POV: it's the user
          const otherName = isOwnUser
            ? (chat.provider?.name ?? 'Provider')
            : (chat.user?.name ?? chat.user?.email ?? 'User');
          const otherAvatar = isOwnUser ? chat.provider?.avatarUrl : chat.user?.avatarUrl;
          const initials = otherName[0]?.toUpperCase() ?? '?';

          return (
            <Link key={chat.id} href={`/chats/${chat.id}`} className={styles.item}>
              <div className={styles.item__avatar}>
                {otherAvatar
                  ? <img src={otherAvatar} alt={otherName} />
                  : <span>{initials}</span>
                }
              </div>
              <div className={styles.item__body}>
                <div className={styles.item__top}>
                  <span className={styles.item__name}>{otherName}</span>
                  {lastMsg && (
                    <span className={styles.item__time}>
                      {new Date(lastMsg.createdAt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
                {chat.listing && (
                  <p className={styles.item__listing}>🏠 {chat.listing.title}</p>
                )}
                {lastMsg && (
                  <p className={styles.item__preview}>
                    {lastMsg.senderId === Number(user.id) ? 'You: ' : ''}{lastMsg.text}
                  </p>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
