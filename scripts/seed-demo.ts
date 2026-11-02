// Emulator-only bootstrap. Never accepts a real project or non-loopback host.
const port = Number(process.env.FIRESTORE_PORT ?? 8180);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Porta non valida.');
const response = await fetch(`http://127.0.0.1:${port}/v1/projects/demo-nummo/databases/(default)/documents/config/owner`, {
  method: 'PATCH', headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
  body: JSON.stringify({ fields: { uid: { stringValue: 'demo-owner' } } }),
});
if (!response.ok) throw new Error(`Inizializzazione demo fallita: ${response.status}`);
console.log('Proprietario demo configurato (solo emulatore demo-nummo).');
