import { useRef, useState } from 'react';
import { authErrorMessage } from '../features/authentication/errors';

export function useAsyncAction() {
  const locked = useRef(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  async function run(action) {
    if (locked.current) return;
    locked.current = true;
    setLoading(true);
    setError('');
    try { await action(); } catch (reason) { setError(authErrorMessage(reason)); }
    finally { locked.current = false; setLoading(false); }
  }
  return { loading, error, run, setError };
}
