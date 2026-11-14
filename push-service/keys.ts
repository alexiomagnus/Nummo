// Prints a new VAPID key pair for the production push service. The private key goes only into the Worker secret
// (`npx wrangler secret put VAPID_PRIVATE_KEY`); the public one into wrangler.toml and EXPO_PUBLIC_NUMMO_PUSH_KEY.
import { generateVapidKeys } from './webPush.ts';
const keys = await generateVapidKeys();
console.log(`VAPID_PUBLIC_KEY / EXPO_PUBLIC_NUMMO_PUSH_KEY = ${keys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY (segreto, non salvarlo nel repository) = ${keys.privateKey}`);
