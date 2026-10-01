const postgres = require('postgres');
const sql = postgres(process.env.DATABASE_URL);

async function main() {
  // 1. Add name_en and name_te columns to festival_branding if they don't exist
  await sql.unsafe(`
    DO $$ BEGIN
      BEGIN ALTER TABLE festival_branding ADD COLUMN name_en VARCHAR(200); EXCEPTION WHEN duplicate_column THEN NULL; END;
      BEGIN ALTER TABLE festival_branding ADD COLUMN name_te VARCHAR(200); EXCEPTION WHEN duplicate_column THEN NULL; END;
      BEGIN ALTER TABLE festival_branding ADD COLUMN tagline_en VARCHAR(300); EXCEPTION WHEN duplicate_column THEN NULL; END;
      BEGIN ALTER TABLE festival_branding ADD COLUMN tagline_te VARCHAR(300); EXCEPTION WHEN duplicate_column THEN NULL; END;
      BEGIN ALTER TABLE festival_branding ADD COLUMN site_name_en VARCHAR(100); EXCEPTION WHEN duplicate_column THEN NULL; END;
      BEGIN ALTER TABLE festival_branding ADD COLUMN site_name_te VARCHAR(100); EXCEPTION WHEN duplicate_column THEN NULL; END;
    END $$;
  `);
  console.log('Added branding columns if missing.');

  // 2. Update branding for all festivals with village name Chinnagollapalli
  const festivals = await sql`SELECT id, year FROM festivals ORDER BY year`;
  for (const f of festivals) {
    await sql`
      UPDATE festival_branding
      SET name_en = ${'Sri Vinayaka Chavithi ' + f.year},
          name_te = ${'శ్రీ వినాయక చవితి ' + f.year},
          tagline_en = 'Every rupee accounted, every devotee welcome',
          tagline_te = 'ప్రతి రూపాయి లెక్క, ప్రతి భక్తుడికి స్వాగతం',
          site_name_en = 'Chinnagollapalli Vinayaka Chavithi',
          site_name_te = 'చిన్నగొల్లపల్లి వినాయక చవితి',
          updated_at = NOW()
      WHERE festival_id = ${f.id}
    `;
  }
  console.log('Updated branding for Chinnagollapalli for all festivals.');

  // 3. Add donor_name_te column to donations if it doesn't exist
  await sql.unsafe(`
    DO $$ BEGIN
      BEGIN ALTER TABLE donations ADD COLUMN donor_name_te VARCHAR(200); EXCEPTION WHEN duplicate_column THEN NULL; END;
    END $$;
  `);
  console.log('Added donor_name_te column if missing.');

  // 4. Populate donor_name_te for existing Telugu-script names, and set English for others
  const donations = await sql`SELECT id, donor_name FROM donations`;
  for (const d of donations) {
    // Detect if the name is in Telugu script (Unicode range 0C00-0C7F)
    const isTelugu = /[\u0C00-\u0C7F]/.test(d.donor_name);
    if (isTelugu) {
      // The donor_name is already Telugu, set donor_name_te = donor_name
      await sql`UPDATE donations SET donor_name_te = ${d.donor_name} WHERE id = ${d.id}`;
    }
    // If English, leave donor_name_te NULL (display will fall back to donor_name)
  }
  console.log('Populated donor_name_te for Telugu-named donors.');

  // 5. Update admin user name to show as "Admin" in audit logs
  await sql`UPDATE users SET full_name = 'Admin' WHERE role = 'ADMIN'`;
  console.log('Updated admin display name to "Admin".');

  await sql.end();
  console.log('Migration complete!');
}

main().catch(err => { console.error(err); process.exit(1); });
