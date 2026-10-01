const postgres = require('postgres');
const sql = postgres(process.env.DATABASE_URL);

async function main() {
  const b = await sql`SELECT * FROM festival_branding`;
  console.log('Branding:', JSON.stringify(b, null, 2));

  const cols = await sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'festival_branding'`;
  console.log('\nBranding columns:', cols.map(c => c.column_name + ':' + c.data_type));

  const u = await sql`SELECT id, full_name, role, phone FROM users WHERE is_active = true`;
  console.log('\nUsers:', JSON.stringify(u, null, 2));

  const d = await sql`SELECT id, donor_name FROM donations ORDER BY donation_date DESC LIMIT 20`;
  console.log('\nDonations:', JSON.stringify(d, null, 2));

  await sql.end();
}

main().catch(err => { console.error(err); process.exit(1); });
