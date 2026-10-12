import { useCallback, useEffect, useState } from 'react';
import { secondsLeft } from '../utils/auth-flow';

/** Cuenta regresiva en segundos (para «Reenviar código»). Empieza en `initial` al montar. */
export function useCountdown(initial: number) {
  const [until, setUntil] = useState(() => Date.now() + initial * 1000);
  const [seconds, setSeconds] = useState(initial);

  useEffect(() => {
    setSeconds(secondsLeft(until, Date.now()));
    const id = setInterval(() => {
      const left = secondsLeft(until, Date.now());
      setSeconds(left);
      if (left <= 0) clearInterval(id);
    }, 500);
    return () => clearInterval(id);
  }, [until]);

  const restart = useCallback(() => setUntil(Date.now() + initial * 1000), [initial]);
  return { seconds, restart };
}
