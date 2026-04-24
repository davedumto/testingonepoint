// Pool of five-letter solutions for the daily word puzzle. Every employee
// sees the same word on the same UTC day and it stays the same until
// midnight UTC. All entries must be exactly 5 letters, common English,
// no proper nouns or plurals.

export const WORD_POOL = [
  // Insurance / business flavoured
  'CLAIM', 'AGENT', 'QUOTE', 'BROAD', 'VALUE',
  'TERMS', 'TRUST', 'GROUP', 'LIMIT', 'GRANT',
  // Everyday nouns and verbs
  'HOUSE', 'DRIVE', 'HAPPY', 'CLOUD', 'BRAVE',
  'CHAIR', 'DREAM', 'EARTH', 'FIGHT', 'GRAIN',
  'HEART', 'IVORY', 'JOINT', 'KNIFE', 'LEMON',
  'MUSIC', 'NOBLE', 'OCEAN', 'PLANT', 'QUILT',
  'RIVER', 'SMART', 'TIGER', 'UNDER', 'VIVID',
  'WATER', 'YOUTH', 'ZEBRA', 'ALARM', 'BLUSH',
  'CANDY', 'DAIRY', 'EAGLE', 'FLAME', 'GRAVY',
  'HORSE', 'INBOX', 'JELLY', 'KAYAK', 'LEVEL',
  'MANGO', 'NORTH', 'OPERA', 'PEACH', 'QUIET',
  'ROYAL', 'SHARP', 'TRAIN', 'UNITY', 'VOICE',
  'WHEAT', 'EXTRA', 'YACHT', 'ZESTY', 'ABOUT',
  'ADULT', 'ALOUD', 'AWARD', 'BEACH', 'BROWN',
  'CABIN', 'CHAIN', 'CHILD', 'CLEAN', 'COAST',
  'CRISP', 'CURVE', 'DANCE', 'DEPTH', 'EQUAL',
  'FRESH', 'GIANT', 'GLOVE', 'GRACE', 'HOBBY',
  'IDEAL', 'JUICE', 'KNOTS', 'LIGHT', 'LUNCH',
  'MAGIC', 'METAL', 'MINOR', 'MOUNT', 'NAVAL',
  'ONSET', 'PIANO', 'POWER', 'PRISM', 'QUICK',
  'RAPID', 'RELAX', 'ROBIN', 'SALAD', 'SMILE',
  'SOLID', 'SPARK', 'STEEL', 'STONE', 'SWIFT',
  'TABLE', 'THEME', 'TRACK', 'UNION', 'VISIT',
  'WORLD', 'ZONAL',
];

// Deterministic "word of the day" — same UTC date always resolves to the
// same index. Hashed lightly so consecutive days don't march through the
// list in order.
export function wordForDate(d: Date = new Date()): { word: string; dateKey: string } {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  const dateKey = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  const epochDay = Math.floor(Date.UTC(y, m - 1, day) / (24 * 60 * 60 * 1000));
  const index = Math.abs((epochDay * 2654435761) % WORD_POOL.length);
  const word = WORD_POOL[index];

  return { word, dateKey };
}
