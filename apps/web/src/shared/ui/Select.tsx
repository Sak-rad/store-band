'use client';

import { useState, useEffect, useRef } from 'react';
import styles from './Select.module.scss';

export interface SelectOption {
  value: string;
  label: string;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  emptyLabel?: string;
  disabled?: boolean;
  error?: boolean;
}

export function Select({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  searchable = false,
  searchPlaceholder = 'Search...',
  emptyLabel = 'Nothing found',
  disabled = false,
  error = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const selected = options.find(o => o.value === value);

  const filtered = searchable
    ? options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()))
    : options;

  useEffect(() => {
    if (!open) setSearch('');
  }, [open]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div
      ref={ref}
      className={[
        styles.select,
        open    ? styles['select--open']     : '',
        disabled ? styles['select--disabled'] : '',
        error   ? styles['select--error']    : '',
      ].filter(Boolean).join(' ')}
    >
      <button
        type="button"
        disabled={disabled}
        className={styles.select__trigger}
        onClick={() => !disabled && setOpen(v => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={`${styles.select__value} ${!selected ? styles['select__value--placeholder'] : ''}`}>
          {selected ? selected.label : placeholder}
        </span>
        <svg
          className={`${styles.select__chevron} ${open ? styles['select__chevron--up'] : ''}`}
          width="12" height="8" viewBox="0 0 12 8" fill="none"
        >
          <path d="M1 1L6 7L11 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <div className={styles.select__dropdown} role="listbox">
          {searchable && (
            <div className={styles.select__search}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className={styles.select__search__icon}>
                <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.3"/>
                <path d="M9.5 9.5L12.5 12.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
              <input
                autoFocus
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
                className={styles.select__search__input}
              />
            </div>
          )}

          <ul className={styles.select__list}>
            {/* Clear option when something selected */}
            {value && placeholder && (
              <li
                role="option"
                className={`${styles.select__option} ${styles['select__option--clear']}`}
                onClick={() => { onChange(''); setOpen(false); }}
              >
                {placeholder}
              </li>
            )}

            {filtered.length === 0 ? (
              <li className={styles.select__empty}>{emptyLabel}</li>
            ) : (
              filtered.map(o => (
                <li
                  key={o.value}
                  role="option"
                  aria-selected={o.value === value}
                  className={`${styles.select__option} ${o.value === value ? styles['select__option--active'] : ''}`}
                  onClick={() => { onChange(o.value); setOpen(false); }}
                >
                  {o.value === value && (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={styles.select__option__check}>
                      <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                  {o.label}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
