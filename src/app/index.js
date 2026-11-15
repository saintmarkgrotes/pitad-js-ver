import { Redirect } from 'expo-router';
import { useAuthStore } from '../store/authStore';

export default function Entry() {
  const session = useAuthStore((state) => state.session);
  return <Redirect href={session ? '/home' : '/welcome'} />;
}
