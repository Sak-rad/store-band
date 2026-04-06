'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import styles from './PhotoSlider.module.scss';

interface Props {
  photos: Array<{ url: string; thumbUrl?: string }>;
  className?: string;
  priority?: boolean;
  overlapped?: boolean;
}

export function PhotoSlider({ photos, className, priority, overlapped }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState(0);

  const scrollTo = useCallback((index: number) => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollTo({ left: index * track.offsetWidth, behavior: 'smooth' });
    setCurrent(index);
  }, []);

  // Sync dot indicator with native scroll (touch swipe)
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const onScroll = () => {
      const idx = Math.round(track.scrollLeft / track.offsetWidth);
      setCurrent(idx);
    };
    track.addEventListener('scroll', onScroll, { passive: true });
    return () => track.removeEventListener('scroll', onScroll);
  }, []);

  if (!photos.length) return null;

  return (
    <div className={[styles.slider, overlapped && styles['slider--overlapped'], className].filter(Boolean).join(' ')}>
      <div ref={trackRef} className={styles.slider__track}>
        {photos.map((p, i) => (
          <div key={i} className={styles.slider__slide}>
            <Image
              src={p.url}
              alt=""
              fill
              sizes="(max-width: 768px) 100vw, 560px"
              style={{ objectFit: 'cover' }}
              priority={priority && i === 0}
            />
          </div>
        ))}
      </div>

      {/* Arrow buttons (desktop) */}
      {photos.length > 1 && (
        <>
          {current > 0 && (
            <button
              className={`${styles.slider__arrow} ${styles['slider__arrow--prev']}`}
              onClick={() => scrollTo(current - 1)}
              aria-label="Previous photo"
            >
              ‹
            </button>
          )}
          {current < photos.length - 1 && (
            <button
              className={`${styles.slider__arrow} ${styles['slider__arrow--next']}`}
              onClick={() => scrollTo(current + 1)}
              aria-label="Next photo"
            >
              ›
            </button>
          )}
        </>
      )}

      {/* Dot indicators */}
      {photos.length > 1 && (
        <div className={styles.slider__dots}>
          {photos.map((_, i) => (
            <button
              key={i}
              className={`${styles.slider__dot} ${i === current ? styles['slider__dot--active'] : ''}`}
              onClick={() => scrollTo(i)}
              aria-label={`Photo ${i + 1}`}
            />
          ))}
        </div>
      )}

      {/* Counter badge */}
      <span className={styles.slider__counter}>
        {current + 1} / {photos.length}
      </span>
    </div>
  );
}
