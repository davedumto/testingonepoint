// Clears all games data for a fresh leaderboard start. Wipes scores,
// seasons, and live Tic-Tac-Toe rooms. Leaves the trivia question bank
// intact — that's content, not user data.
//
// Run with:
//   node --env-file=.env.local scripts/clear-games.mjs
//   node --env-file=.env.local scripts/clear-games.mjs --keep-trivia-questions  (default)
//   node --env-file=.env.local scripts/clear-games.mjs --also-trivia-questions  (nukes bank too)

import mongoose from 'mongoose';

if (!process.env.MONGODB_URI) {
  console.error('❌ MONGODB_URI missing.');
  process.exit(1);
}

const alsoTrivia = process.argv.includes('--also-trivia-questions');

async function run() {
  console.log('→ Connecting to Mongo…');
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  const COLLECTIONS = [
    'gamescores',
    'leaderboardseasons',
    'tictactoegames',
  ];
  if (alsoTrivia) COLLECTIONS.push('triviaquestions');

  for (const name of COLLECTIONS) {
    const exists = await db.listCollections({ name }).toArray();
    if (!exists.length) {
      console.log(`   skip  ${name}  (collection does not exist)`);
      continue;
    }
    const before = await db.collection(name).countDocuments({});
    const result = await db.collection(name).deleteMany({});
    console.log(`   clear ${name.padEnd(22)} ${before} docs → ${result.deletedCount} deleted`);
  }

  if (!alsoTrivia) {
    const triviaCount = await db.collection('triviaquestions').countDocuments({}).catch(() => 0);
    console.log(`\n   kept  triviaquestions       ${triviaCount} questions (pass --also-trivia-questions to nuke)`);
  }

  console.log('\n=== DONE ===');
  console.log('Next steps:');
  console.log('  1. In the admin portal, Games → start a new season.');
  console.log('  2. If you wiped trivia questions, click "Seed starter 60" on the admin Games page.');

  await mongoose.disconnect();
}

run().catch(err => {
  console.error('❌ Script failed:', err);
  process.exit(1);
});
