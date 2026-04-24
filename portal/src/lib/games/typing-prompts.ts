// Short, clean prompts for the typing speed test. Aim for 30-60 seconds of
// typing; keep them positive and on-brand. No proper nouns that might have
// disputed capitalization, no numbers (simpler to score).

export const TYPING_PROMPTS: string[] = [
  'A good insurance policy is more than paperwork. It is a promise that when something unexpected happens, you will not have to face it alone. The best agents take the time to understand what you actually need, and they explain coverage in plain language so you can make the right call for your family or your business.',
  'The best teams share small wins often. When a colleague closes a tough policy, land a great review, or solves a client problem at midnight, that moment belongs to everyone. A quick thank you, a fast note, a quiet high five in the hallway, these are the things that make the week feel lighter and the mission feel shared.',
  'Trust is the currency of this industry. Clients come to us because they want someone to be in their corner on their worst day. Every call, every form, every follow up is a chance to show that we keep our word. Slow and steady builds a book of business that compounds year after year.',
  'The fastest typists are not the ones who rush. They rely on rhythm, quiet hands, and short breaks between sentences. Keep your wrists relaxed. Let your eyes stay on the text, not the keys. Small steady improvements beat short bursts of speed, and accuracy will always carry you further than raw pace.',
  'Every policy starts as a blank page. We listen first, ask careful questions, and then design coverage that matches the life in front of us. A young family needs different protection than a small business owner. A renter needs different peace of mind than a homeowner. The craft is in the fit.',
];

// Picks a deterministic prompt for a given session id so refreshes don't
// let a player re-roll for a shorter text. We stamp a session id on the
// start response and re-derive the prompt from it at submit time.
export function promptForIndex(index: number): string {
  return TYPING_PROMPTS[index % TYPING_PROMPTS.length];
}
