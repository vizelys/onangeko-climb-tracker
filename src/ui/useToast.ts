import { useCallback, useEffect, useRef, useState } from 'react';

export const TOAST_MS = 1800;

/** One line of confirmation text that clears itself after 1.8s. */
export function useToast(): [string | null, (msg: string) => void] {
  const [msg, setMsg] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const show = useCallback((m: string) => {
    window.clearTimeout(timer.current);
    setMsg(m);
    timer.current = window.setTimeout(() => setMsg(null), TOAST_MS);
  }, []);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return [msg, show];
}
