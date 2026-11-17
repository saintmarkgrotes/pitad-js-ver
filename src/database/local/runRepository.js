import { openDatabaseAsync } from 'expo-sqlite';
import { createRunRepository } from './repositoryCore';

export const runRepository = createRunRepository(() => openDatabaseAsync('pitad-recording.db', { useNewConnection: true }));
