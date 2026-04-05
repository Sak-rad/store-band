'use client';

import styles from './Checkbox.module.scss';

interface Props {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: React.ReactNode;
  hint?: string;
  disabled?: boolean;
}

export function Checkbox({ checked, onChange, label, hint, disabled }: Props) {
  return (
    <label className={`${styles.checkbox} ${disabled ? styles['checkbox--disabled'] : ''}`}>
      <input
        type="checkbox"
        className={styles.checkbox__input}
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        disabled={disabled}
      />
      <span className={`${styles.checkbox__box} ${checked ? styles['checkbox__box--checked'] : ''}`}>
        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
          <path d="M1 4L3.5 6.5L9 1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className={styles.checkbox__content}>
        <span className={styles.checkbox__label}>{label}</span>
        {hint && <span className={styles.checkbox__hint}>{hint}</span>}
      </span>
    </label>
  );
}
