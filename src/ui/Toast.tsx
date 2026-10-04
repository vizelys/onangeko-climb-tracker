import s from './Toast.module.css';

export function Toast({ msg }: { msg: string | null }) {
  if (!msg) return null;
  return (
    <div className={s.toast} role="status">
      {msg}
    </div>
  );
}
