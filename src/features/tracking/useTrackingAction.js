import { useRef, useState } from 'react';

export function useTrackingAction() {
  const lock = useRef(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  async function run(action) {
    if (lock.current) return;
    lock.current = true; setLoading(true); setError('');
    try { await action(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to complete this recording action. Please try again.'); }
    finally { lock.current = false; setLoading(false); }
  }
  return { loading, error, run };
}
