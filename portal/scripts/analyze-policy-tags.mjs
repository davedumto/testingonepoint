// Analyze what's inferrable about policies from the tags alone. Counts
// existing policy docs, tallies "X client" lifecycle tags, and groups by
// likely carrier so we can see what a tag-to-policy inference would produce.

import mongoose from 'mongoose';

await mongoose.connect(process.env.MONGODB_URI);
const db = mongoose.connection.db;

const policyCount = await db.collection('policies').countDocuments({});
console.log(`\n=== Current policies in DB: ${policyCount} ===\n`);

const users = await db.collection('users').find({ role: 'client' }).toArray();
console.log(`=== Total clients: ${users.length} ===\n`);

// Count tag occurrences
const tagCounts = new Map();
const clientOnlyTags = new Map(); // tags containing "client" — proxy for active policy
for (const u of users) {
  for (const tag of u.tags || []) {
    tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    if (/client\b/i.test(tag) && !/lead\b/i.test(tag)) {
      clientOnlyTags.set(tag, (clientOnlyTags.get(tag) || 0) + 1);
    }
  }
}

console.log(`=== Top 20 tags overall ===`);
Array.from(tagCounts.entries())
  .sort((a, b) => b[1] - a[1])
  .slice(0, 20)
  .forEach(([t, n]) => console.log(`  ${n.toString().padStart(4)}×  ${t}`));

console.log(`\n=== "X client" tags (likely indicate active policy) ===`);
Array.from(clientOnlyTags.entries())
  .sort((a, b) => b[1] - a[1])
  .forEach(([t, n]) => console.log(`  ${n.toString().padStart(4)}×  ${t}`));

// How many clients have AT LEAST ONE "client" tag?
const clientsWithClientTag = users.filter(u => (u.tags || []).some(t => /client\b/i.test(t) && !/lead\b/i.test(t)));
console.log(`\n=== Clients with at least one "X client" tag: ${clientsWithClientTag.length} ===`);

await mongoose.disconnect();
