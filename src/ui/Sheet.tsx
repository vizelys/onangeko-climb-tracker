import { useRef, type ReactNode } from 'react';
import s from './Sheet.module.css';

/** Bottom sheet. Tap the scrim or swipe down to close. */
export function Sheet({ onClose, children, label }: { onClose: () => void; children: ReactNode; label?: string }) {
  const startY = useRef<number | null>(null);
  return (
    <div className={s.scrim} onClick={onClose}>
      <div
        className={s.sheet}
        role="dialog"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => {
          startY.current = e.touches[0].clientY;
        }}
        onTouchEnd={(e) => {
          const y0 = startY.current;
          startY.current = null;
          const el = e.currentTarget;
          if (y0 !== null && el.scrollTop <= 0 && e.changedTouches[0].clientY - y0 > 80) onClose();
        }}
      >
        <div className={s.grabber} />
        {label && <div className={s.label}>{label}</div>}
        {children}
      </div>
    </div>
  );
}
