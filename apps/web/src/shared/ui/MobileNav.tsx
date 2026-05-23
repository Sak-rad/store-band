'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { Search, Heart, MessageSquare, User } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '../../navigation';
import { useAuthStore } from '../store/auth.store';
import { useAuthModalStore } from '../store/auth-modal.store';
import styles from './MobileNav.module.scss';

const NAV = [
  { key: 'listings',  Icon: Search,        href: '/listings',  auth: false },
  { key: 'favorites', Icon: Heart,         href: '/favorites', auth: true  },
  { key: 'chats',     Icon: MessageSquare, href: '/chats',     auth: true  },
  { key: 'profile',   Icon: User,          href: '/profile',   auth: true  },
] as const;

// Pages where we hide the nav entirely
const HIDDEN_ON = ['/login', '/register'];

export function MobileNav() {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);
  const pillRef = useRef<HTMLElement>(null);
  const user = useAuthStore((s) => s.user);
  const openLogin = useAuthModalStore((s) => s.openLogin);

  const activeItem = NAV.find((n) => pathname.includes(n.href)) ?? NAV[0];

  const hidden = HIDDEN_ON.some((p) => pathname.includes(p));

  // Collapse on route change
  useEffect(() => { setExpanded(false); }, [pathname]);

  // Close on outside click
  useEffect(() => {
    if (!expanded) return;
    const onDoc = (e: MouseEvent) => {
      if (!pillRef.current?.contains(e.target as Node)) setExpanded(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [expanded]);

  // Close on Escape
  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setExpanded(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [expanded]);

  if (hidden) return null;

  return (
    <nav
      ref={pillRef}
      className={`${styles.pill} ${expanded ? styles['pill--open'] : ''}`}
      aria-label="Mobile navigation"
    >
      {/* Collapsed — only active item + expand hint */}
      <button
        className={styles.pill__face}
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-label="Open navigation"
      >
        <span className={`${styles.pill__active} ${expanded ? styles['pill__active--hidden'] : ''}`}>
          <activeItem.Icon size={17} strokeWidth={2.5} />
          <span>{t(activeItem.key as 'listings' | 'favorites' | 'chats' | 'profile')}</span>
        </span>

        {/* Expanded — all items */}
        <span className={`${styles.pill__items} ${expanded ? styles['pill__items--visible'] : ''}`}>
          {NAV.map(({ key, Icon, href, auth }) => {
            const isActive = pathname.includes(href);
            return (
              <Link
                key={key}
                href={href}
                className={`${styles.pill__item} ${isActive ? styles['pill__item--active'] : ''}`}
                onClick={(e) => {
                  if (auth && !user) { e.preventDefault(); openLogin(); }
                  setExpanded(false);
                }}
                aria-label={t(key as 'listings' | 'favorites' | 'chats' | 'profile')}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon size={19} strokeWidth={isActive ? 2.5 : 1.75} />
                <span>{t(key as 'listings' | 'favorites' | 'chats' | 'profile')}</span>
              </Link>
            );
          })}
        </span>
      </button>
    </nav>
  );
}
