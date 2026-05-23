"use client";

import {
  useRef,
  useState,
  useCallback,
  useEffect,
  Children,
  type ReactNode,
  type CSSProperties,
} from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import styles from "./Slider.module.scss";

interface Props {
  children: ReactNode;
  gap?: string;
  /** CSS-класс, добавляемый к каждому слайду (для задания ширины снаружи). */
  slideClassName?: string;
  className?: string;
  dotsClassName?: string;
  prevLabel?: string;
  nextLabel?: string;
}

export function Slider({
  children,
  gap = "1.25rem",
  slideClassName,
  className,
  dotsClassName,
  prevLabel = "Предыдущий",
  nextLabel = "Следующий",
}: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [visibleCount, setVisibleCount] = useState(1);

  const slides = Children.toArray(children);
  const total = slides.length;

  useEffect(() => {
    const update = () => {
      const track = trackRef.current;
      if (!track || !track.children[0]) return;
      const trackW = track.getBoundingClientRect().width;
      const slideW = (track.children[0] as HTMLElement).getBoundingClientRect().width;
      if (slideW === 0) return;
      setVisibleCount(Math.max(1, Math.round(trackW / slideW)));
    };

    update();
    const ro = new ResizeObserver(update);
    if (trackRef.current) ro.observe(trackRef.current);
    return () => ro.disconnect();
  }, []);

  const dotCount = Math.max(1, total - visibleCount + 1);

  const scrollToIndex = useCallback((index: number) => {
    const track = trackRef.current;
    if (!track) return;
    const card = track.children[index] as HTMLElement | undefined;
    if (!card) return;
    track.scrollTo({ left: card.offsetLeft, behavior: "smooth" });
    setActiveIndex(index);
  }, []);

  const handleScroll = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    let minDist = Infinity;
    let closest = 0;
    Array.from(track.children).forEach((child, i) => {
      const dist = Math.abs((child as HTMLElement).offsetLeft - track.scrollLeft);
      if (dist < minDist) {
        minDist = dist;
        closest = i;
      }
    });
    setActiveIndex(closest);
  }, []);

  const trackStyle: CSSProperties = { gap };

  return (
    <div className={`${styles.root}${className ? ` ${className}` : ""}`}>
      <button
        className={`${styles.arrow} ${styles["arrow--prev"]}`}
        onClick={() => scrollToIndex(Math.max(0, activeIndex - 1))}
        disabled={activeIndex === 0}
        aria-label={prevLabel}
      >
        <ChevronLeft size={22} strokeWidth={2} />
      </button>

      <div
        ref={trackRef}
        className={styles.track}
        style={trackStyle}
        onScroll={handleScroll}
      >
        {slides.map((slide, i) => (
          <div
            key={i}
            className={`${styles.slide}${slideClassName ? ` ${slideClassName}` : ""}`}
          >
            {slide}
          </div>
        ))}
      </div>

      <button
        className={`${styles.arrow} ${styles["arrow--next"]}`}
        onClick={() => scrollToIndex(Math.min(total - 1, activeIndex + 1))}
        disabled={activeIndex >= dotCount - 1}
        aria-label={nextLabel}
      >
        <ChevronRight size={22} strokeWidth={2} />
      </button>

      {dotCount > 1 && (
        <div
          className={`${styles.dots}${dotsClassName ? ` ${dotsClassName}` : ""}`}
          role="tablist"
          aria-label="Навигация по слайдам"
        >
          {Array.from({ length: dotCount }, (_, i) => (
            <button
              key={i}
              role="tab"
              aria-selected={i === activeIndex}
              aria-label={`Слайд ${i + 1}`}
              className={`${styles.dot} ${i === activeIndex ? styles["dot--active"] : ""}`}
              onClick={() => scrollToIndex(i)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
