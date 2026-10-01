const postgres = require('postgres');
const sql = postgres(process.env.DATABASE_URL);

async function main() {
  const [fest] = await sql`SELECT id FROM festivals WHERE year = 2026`;
  const [admin] = await sql`SELECT id FROM users WHERE role = 'ADMIN'`;
  
  const mp1 = 'a1111111-1111-4111-8111-111111111111';
  const mp2 = 'a2222222-2222-4222-8222-222222222222';
  const mp3 = 'a3333333-3333-4333-8333-333333333333';

  await sql`
    INSERT INTO memory_posts (
      id, festival_id, title_en, title_te, caption_en, caption_te,
      visibility, display_order, is_featured, is_active, created_by, created_at, updated_at
    ) VALUES 
    (
      ${mp1}, ${fest.id}, 'Maha Harathi & Prathishta', 'మహా హారతి మరియు వినాయక ప్రతిష్ట',
      'Opening day puja and grand maha harathi conducted with entire village participation.',
      'మొదటి రోజు పూజ మరియు గ్రామం అంతా కలిసి జరిపిన ప్రతిష్టా మహోత్సవం.',
      'PUBLIC', 1, true, true, ${admin.id}, NOW(), NOW()
    ),
    (
      ${mp2}, ${fest.id}, 'Grand Laddu Auction Moment', 'మహా లడ్డు వేలం పాట విజేత క్షణాలు',
      'Spirited bidding for the sacred Vinayaka laddu won by Sri Srinivas Naidu garu.',
      'గ్రామస్తుల ఉత్సాహం మధ్య శ్రీనివాస్ నాయుడు గారు లడ్డు వేలం కైవసం చేసుకున్నారు.',
      'PUBLIC', 2, true, true, ${admin.id}, NOW(), NOW()
    ),
    (
      ${mp3}, ${fest.id}, 'Visarjan Shobha Yatra', 'గణేష్ నిమజ్జన శోభాయాత్ర',
      'Colorful musical procession and joyful visarjan celebration through all village streets.',
      'గ్రామ వీధుల్లో ఘనంగా జరిగిన వినాయక నిమజ్జన శోభాయాత్ర.',
      'PUBLIC', 3, true, true, ${admin.id}, NOW(), NOW()
    )
    ON CONFLICT (id) DO NOTHING
  `;

  await sql`
    INSERT INTO media (
      id, festival_id, memory_post_id, filename, storage_path,
      public_url, mime_type, file_size_bytes, width_px, height_px, visibility, is_active, uploaded_by, created_at
    ) VALUES 
    (
      'b1111111-1111-4111-8111-111111111111', ${fest.id}, ${mp1}, 'idol-2026.jpg',
      'gallery/idol-2026.jpg', 'idol-2026', 'image/jpeg', 206697, 1200, 900, 'PUBLIC', true, ${admin.id}, NOW()
    ),
    (
      'b2222222-2222-4222-8222-222222222222', ${fest.id}, ${mp2}, 'gallery-laddu.jpg',
      'gallery/gallery-laddu.jpg', 'gallery-laddu', 'image/jpeg', 136735, 1200, 900, 'PUBLIC', true, ${admin.id}, NOW()
    ),
    (
      'b3333333-3333-4333-8333-333333333333', ${fest.id}, ${mp3}, 'gallery-procession.jpg',
      'gallery/gallery-procession.jpg', 'gallery-procession', 'image/jpeg', 209365, 1200, 900, 'PUBLIC', true, ${admin.id}, NOW()
    )
    ON CONFLICT (id) DO NOTHING
  `;

  console.log('Successfully seeded memories and media into Supabase!');
  await sql.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
