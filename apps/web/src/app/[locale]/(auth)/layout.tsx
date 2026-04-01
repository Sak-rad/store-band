import { Link } from '../../../navigation';
import styles from './auth.layout.module.scss';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.layout}>
      <div className={styles.layout__top}>
        <Link href="/" className={styles.layout__logo}>
          <svg width="24" height="24" viewBox="0 0 28 28" fill="none">
            <circle cx="14" cy="14" r="14" fill="#0EA5E9"/>
            <path d="M8 14.5C8 11.5 10.5 8 14 8C17.5 8 20 11.5 20 14.5C20 17 17 21 14 22C11 21 8 17 8 14.5Z" fill="white" opacity="0.9"/>
            <circle cx="14" cy="14" r="3" fill="#0EA5E9"/>
          </svg>
          Relocate
        </Link>
      </div>
      <main className={styles.layout__main}>
        <div className={styles.layout__card}>
          {children}
        </div>
      </main>
    </div>
  );
}
