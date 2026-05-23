"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link } from "../../navigation";
import { LanguageSwitcher } from "../../features/language-switcher/ui/LanguageSwitcher";
import { useAuthStore } from "../store/auth.store";
import { useCurrencyStore } from "../store/currency.store";
import { useAuthModalStore } from "../store/auth-modal.store";
import { api } from "../lib/api";
import { useRouter } from "../../navigation";
import styles from "./Header.module.scss";
import { ROUTES } from "../constants";

export function Header() {
  const t = useTranslations("nav");
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const displayCurrency = useCurrencyStore((s) => s.displayCurrency);
  const toggle = useCurrencyStore((s) => s.toggle);
  const openLogin = useAuthModalStore((s) => s.openLogin);
  const openRegister = useAuthModalStore((s) => s.openRegister);

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {}
    logout();
    router.push("/");
    setMenuOpen(false);
  };

  return (
    <header
      className={`${styles.header} ${scrolled ? styles["header--scrolled"] : ""}`}
    >
      <div className={styles.header__inner}>
        {/* Logo */}
        <Link href="/" className={styles.header__logo}>
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <circle cx="14" cy="14" r="14" fill="#1C4532" />
            <path
              d="M8 14.5C8 11.5 10.5 8 14 8C17.5 8 20 11.5 20 14.5C20 17 17 21 14 22C11 21 8 17 8 14.5Z"
              fill="white"
              opacity="0.9"
            />
            <circle cx="14" cy="14" r="3" fill="#E8603A" />
          </svg>
          <span>Meriloz</span>
        </Link>

        {/* Desktop Nav */}
        <nav className={styles.header__nav}>
          <Link href="/listings" className={styles.header__nav__link}>
            {t("listings")}
          </Link>
          {user && (
            <>
              <Link href="/chats" className={styles.header__nav__link}>
                {t("chats")}
              </Link>
              <Link href="/bookings" className={styles.header__nav__link}>
                {t("bookings")}
              </Link>
            </>
          )}
        </nav>

        {/* Right side */}
        <div className={styles.header__right}>
          {/* Currency toggle */}
          <button
            className={styles.header__currency}
            onClick={toggle}
            title="Switch currency"
          >
            {displayCurrency === "USD" ? "$ USD" : "₽ RUB"}
          </button>

          <LanguageSwitcher />

          {user ? (
            <div className={styles.header__user}>
              <button
                className={styles.header__user__btn}
                onClick={() => setMenuOpen((v) => !v)}
              >
                <span className={styles.header__avatar}>
                  {user.name?.[0]?.toUpperCase() ?? user.email[0].toUpperCase()}
                </span>
                <span className={styles.header__user__name}>
                  {user.name ?? user.email.split("@")[0]}
                </span>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M4 6L8 10L12 6"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

              {menuOpen && (
                <>
                  <div
                    className={styles.header__backdrop}
                    onClick={() => setMenuOpen(false)}
                  />
                  <div className={styles.header__dropdown}>
                    <Link
                      href="/bookings"
                      className={styles.header__dropdown__item}
                      onClick={() => setMenuOpen(false)}
                    >
                      {t("bookings")}
                    </Link>
                    <hr className={styles.header__dropdown__divider} />
                    <Link
                      href={ROUTES.PROFILE}
                      className={styles.header__dropdown__item}
                      onClick={() => setMenuOpen(false)}
                    >
                      {t("profile")}
                    </Link>
                    <hr className={styles.header__dropdown__divider} />
                    <button
                      className={styles.header__dropdown__item}
                      onClick={handleLogout}
                    >
                      {t("logout")}
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className={styles.header__auth}>
              <button className={styles.header__signin} onClick={openLogin}>
                {t("login")}
              </button>
              <button
                className={styles.header__register}
                onClick={openRegister}
              >
                {t("register")}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
