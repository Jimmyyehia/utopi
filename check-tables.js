const { createClient } = require('@libsql/client');
const client = createClient({ url: 'file:./dev.db' });
client.execute("SELECT name FROM sqlite_master WHERE type='table'")
  .then(r => console.log('Tables:', r.rows.map(x => x.name)))
  .catch(e => console.error('Error:', e));