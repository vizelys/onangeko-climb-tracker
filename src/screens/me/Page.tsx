import type { ReactNode } from 'react';
import ui from '../../ui/ui.module.css';

export function Page({ title, onBack, children }: { title: string; onBack: () => void; children: ReactNode }) {
  return (
    <div className={ui.screen}>
      <div className={ui.header}>
        <button className={ui.btnOutline} onClick={onBack}>‹ Me</button>
        <span className={ui.meta}>{title.toUpperCase()}</span>
      </div>
      <div className={ui.title} style={{ padding: '0 4px' }}>{title}</div>
      {children}
    </div>
  );
}
