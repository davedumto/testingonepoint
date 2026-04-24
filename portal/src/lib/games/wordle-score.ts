export type LetterState = 'correct' | 'present' | 'absent';

// Standard Wordle coloring rules, accounting for repeated letters. Returns
// a length-5 array of states aligned with the guess characters.
export function scoreGuess(secret: string, guess: string): LetterState[] {
  const S = secret.toUpperCase();
  const G = guess.toUpperCase();
  const result: LetterState[] = ['absent', 'absent', 'absent', 'absent', 'absent'];
  const used = [false, false, false, false, false];

  // First pass: exact matches.
  for (let i = 0; i < 5; i++) {
    if (G[i] === S[i]) {
      result[i] = 'correct';
      used[i] = true;
    }
  }
  // Second pass: present-but-wrong-spot, respecting already-consumed letters.
  for (let i = 0; i < 5; i++) {
    if (result[i] === 'correct') continue;
    for (let j = 0; j < 5; j++) {
      if (!used[j] && G[i] === S[j]) {
        result[i] = 'present';
        used[j] = true;
        break;
      }
    }
  }
  return result;
}

// Points awarded when the player solves the puzzle, scaled by how few
// guesses they used. Consistent with other games' "higher is better" model.
export function pointsForGuesses(guesses: number): number {
  if (guesses <= 0) return 0;
  if (guesses >= 7) return 0;
  // 1 -> 60, 2 -> 50, 3 -> 40, 4 -> 30, 5 -> 20, 6 -> 10.
  return Math.max(0, 70 - guesses * 10);
}
