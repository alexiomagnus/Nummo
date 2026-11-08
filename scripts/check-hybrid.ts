import { checkHybridEndpoint } from './hybridPreflight.ts';

try {
  await checkHybridEndpoint(process.env.EXPO_PUBLIC_FIRESTORE_EMULATOR);
  console.log('Endpoint Firestore locale raggiungibile (progetto e autorizzazioni da verificare nell’app).');
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Controllo Firestore locale non riuscito.');
  process.exitCode = 1;
}
