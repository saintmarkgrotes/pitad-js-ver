import * as SecureStore from 'expo-secure-store';
import { createChunkedStorage } from './chunkedStorage';

export const authStorage = createChunkedStorage({
  getItem: (key) => SecureStore.getItemAsync(key),
  setItem: (key, value) => SecureStore.setItemAsync(key, value),
  removeItem: (key) => SecureStore.deleteItemAsync(key),
});
