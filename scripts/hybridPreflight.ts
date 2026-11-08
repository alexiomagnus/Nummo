import { createConnection } from 'node:net';
import { parseEndpoint, type Endpoint } from '../src/services/backendConfig.ts';

// Only a reachability check: project, owner and Rules are still verified by Firestore.
export function probeEndpoint({ host, port }: Endpoint): Promise<void> {
  return new Promise((resolve, reject) => {
    const socket = createConnection({ host, port });
    const finish = (error?: Error) => {
      socket.destroy();
      if (error) reject(error); else resolve();
    };
    socket.setTimeout(1500, () => finish(new Error('Timeout connessione locale.')));
    socket.once('error', finish);
    socket.once('connect', () => finish());
  });
}

export async function checkHybridEndpoint(value: string | undefined, probe = probeEndpoint): Promise<void> {
  const endpoint = hybridEndpoint(value);
  try {
    await probe(endpoint);
  } catch {
    throw new Error(`Firestore locale non raggiungibile su ${endpoint.host}:${endpoint.port}.\n`
      + 'Avvia npm run dev per avviare o riutilizzare Firestore ed Expo.\n'
      + 'Per la gestione manuale: npm run emulators:personal -- --project ID_PROGETTO.\n'
      + 'Usa lo stesso progetto di .env.local e verifica config/owner nell’emulatore.');
  }
}

export function hybridEndpoint(value: string | undefined): Endpoint {
  const endpoint = parseEndpoint(value || '127.0.0.1:8180');
  if (!endpoint || !['127.0.0.1', 'localhost'].includes(endpoint.host)) {
    throw new Error('EXPO_PUBLIC_FIRESTORE_EMULATOR deve indicare localhost:porta o 127.0.0.1:porta.');
  }
  return endpoint;
}
