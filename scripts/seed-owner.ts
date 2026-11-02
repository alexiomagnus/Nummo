// Explicit local emulator provisioning, including Auth-real/Firestore-local installations.
const [project, uid] = process.argv.slice(2);
const port = Number(process.env.FIRESTORE_PORT ?? 8180);
if (!project || !/^[a-z0-9-]+$/.test(project) || !uid || uid.length > 128 || !Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('Uso: npm run emulators:seed:owner -- ID_PROGETTO UID (solo localhost, FIRESTORE_PORT opzionale).');
}
const response = await fetch(`http://127.0.0.1:${port}/v1/projects/${project}/databases/(default)/documents/config/owner`, {
  method: 'PATCH', headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
  body: JSON.stringify({ fields: { uid: { stringValue: uid } } }),
});
if (!response.ok) throw new Error(`Configurazione emulatore fallita: ${response.status}`);
console.log('Proprietario impostato esclusivamente nell’emulatore localhost.');
