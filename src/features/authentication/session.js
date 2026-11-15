// Subscribe before hydration. A newer sign-in/sign-out event must win over a
// slower initial disk read. Keep callbacks synchronous to avoid auth-lock waits.
export function observeSession(auth, onSession, onError) {
  let alive = true;
  let revision = 0;
  const { data } = auth.onAuthStateChange((_event, session) => {
    revision += 1;
    if (alive) onSession(session);
  });
  const initialRevision = revision;
  auth.getSession().then(({ data: result, error }) => {
    if (!alive || revision !== initialRevision) return;
    if (error) onError(error);
    else onSession(result.session);
  }).catch((error) => { if (alive && revision === initialRevision) onError(error); });
  return () => { alive = false; data.subscription.unsubscribe(); };
}
