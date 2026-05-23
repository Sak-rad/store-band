"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { LoginForm } from "../../features/auth/ui/LoginForm";
import { RegisterForm } from "../../features/auth/ui/RegisterForm";
import { useAuthModalStore } from "../store/auth-modal.store";
import styles from "./AuthModal.module.scss";

export function AuthModal() {
  const t = useTranslations("auth");
  const { open, tab, setTab, close } = useAuthModalStore();
  const dialogRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, close]);

  // Lock body scroll while open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Focus the dialog on open
  useEffect(() => {
    if (open) dialogRef.current?.focus();
  }, [open]);

  if (!open) return null;

  return (
    <div
      className={styles.overlay}
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        ref={dialogRef}
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-label={tab === "login" ? t("loginTitle") : t("registerTitle")}
        tabIndex={-1}
      >
        {/* Header */}
        <div className={styles.modal__header}>
          <div className={styles.modal__tabs}>
            <button
              className={`${styles.modal__tab} ${tab === "login" ? styles["modal__tab--active"] : ""}`}
              onClick={() => setTab("login")}
            >
              {t("loginTitle")}
            </button>
            <button
              className={`${styles.modal__tab} ${tab === "register" ? styles["modal__tab--active"] : ""}`}
              onClick={() => setTab("register")}
            >
              {t("registerTitle")}
            </button>
          </div>
          <button
            className={styles.modal__close}
            onClick={close}
            aria-label="Close"
          >
            <X size={20} strokeWidth={2} />
          </button>
        </div>

        {/* Subtitle */}
        <p className={styles.modal__sub}>
          {tab === "login" ? (
            <>
              {t("noAccount")}{" "}
              <button
                className={styles.modal__switch}
                onClick={() => setTab("register")}
              >
                {t("registerBtn")}
              </button>
            </>
          ) : (
            <>
              {t("hasAccount")}{" "}
              <button
                className={styles.modal__switch}
                onClick={() => setTab("login")}
              >
                {t("loginBtn")}
              </button>
            </>
          )}
        </p>

        {/* Form */}
        <div className={styles.modal__body}>
          {tab === "login" ? (
            <LoginForm onSuccess={close} />
          ) : (
            <RegisterForm onSuccess={close} />
          )}
        </div>
      </div>
    </div>
  );
}
