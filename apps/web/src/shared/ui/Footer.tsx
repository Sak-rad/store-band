import { Link } from "../../navigation";
import styles from "./Footer.module.scss";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={styles.footer__inner}>
        <div className={styles.footer__logo}>
          <svg width="22" height="22" viewBox="0 0 28 28" fill="none">
            <circle cx="14" cy="14" r="14" fill="#1C4532" />
            <path
              d="M8 14.5C8 11.5 10.5 8 14 8C17.5 8 20 11.5 20 14.5C20 17 17 21 14 22C11 21 8 17 8 14.5Z"
              fill="white"
              opacity="0.9"
            />
            <circle cx="14" cy="14" r="3" fill="#E8603A" />
          </svg>
          <span>Meriloz</span>
        </div>
        <p className={styles.footer__copy}>© {year} Meriloz</p>
        <nav className={styles.footer__nav}>
          <Link href="/listings">Listings</Link>
          <Link href="/en/register">Join as provider</Link>
        </nav>
      </div>
    </footer>
  );
}
