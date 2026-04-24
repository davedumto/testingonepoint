// Starter trivia bank. Used by the seed script and as a fallback pool when
// the DB is empty. Each question: { question, options (exactly 4),
// correctIndex (0-3), category }.

export type SeedCategory = 'insurance' | 'general' | 'company' | 'pop';

export interface SeedQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  category: SeedCategory;
}

export const TRIVIA_SEED: SeedQuestion[] = [
  // ── Insurance (~25) ─────────────────────────────────────────────────────
  { question: 'What does "premium" mean in insurance?', options: ['Amount you pay the insurer', 'Amount the insurer pays out', 'Your deductible', 'A type of policy'], correctIndex: 0, category: 'insurance' },
  { question: 'A deductible is…', options: ['What the insurer keeps as profit', 'What you pay out of pocket before coverage starts', 'A discount on your premium', 'Extra coverage you can buy'], correctIndex: 1, category: 'insurance' },
  { question: 'Liability coverage in auto insurance pays for…', options: ['Repairs to your own car', 'Damage you cause to others', 'Rental car costs', 'Regular maintenance'], correctIndex: 1, category: 'insurance' },
  { question: 'Collision coverage covers damage to…', options: ['Others\' property', 'Your car from a collision', 'Medical bills only', 'Stolen items only'], correctIndex: 1, category: 'insurance' },
  { question: 'Comprehensive auto coverage pays for…', options: ['Only collisions', 'Theft, hail, vandalism, and other non-collision events', 'Other drivers\' cars', 'Roadside assistance only'], correctIndex: 1, category: 'insurance' },
  { question: 'What is PIP in auto insurance?', options: ['Private Insurance Provider', 'Personal Injury Protection', 'Policy Identification Plan', 'Primary Insurance Plan'], correctIndex: 1, category: 'insurance' },
  { question: 'A "whole life" insurance policy…', options: ['Lasts for a set term', 'Covers you for your entire life and builds cash value', 'Is only for business owners', 'Only pays in the event of accident'], correctIndex: 1, category: 'insurance' },
  { question: 'Term life insurance…', options: ['Lasts until you die regardless of when', 'Covers a fixed period like 10, 20, or 30 years', 'Only pays if you cancel it', 'Automatically becomes whole life'], correctIndex: 1, category: 'insurance' },
  { question: 'An HSA-compatible health plan must have a…', options: ['Low deductible', 'High deductible', 'Zero copay', 'No network restrictions'], correctIndex: 1, category: 'insurance' },
  { question: 'What does ACA stand for in health insurance?', options: ['American Coverage Act', 'Affordable Care Act', 'Auto Coverage Alliance', 'Annual Coverage Adjustment'], correctIndex: 1, category: 'insurance' },
  { question: 'Which policy usually covers floods?', options: ['Standard homeowners', 'Standard renters', 'Separate flood insurance (often NFIP)', 'Auto policy'], correctIndex: 2, category: 'insurance' },
  { question: 'An umbrella policy provides…', options: ['Weather-only coverage', 'Extra liability above your other policies\' limits', 'Discounts on multiple policies', 'Disability income'], correctIndex: 1, category: 'insurance' },
  { question: 'Workers\' compensation is primarily for…', options: ['Injuries to employees on the job', 'Damage to company property', 'General business liability', 'Employer lawsuits by clients'], correctIndex: 0, category: 'insurance' },
  { question: 'What does BOP usually stand for in small-business insurance?', options: ['Basic Owner Plan', 'Business Owners Policy', 'Business Operating Premium', 'Bundled Office Policy'], correctIndex: 1, category: 'insurance' },
  { question: 'A copay is…', options: ['The fixed amount you pay for a covered service', 'The total yearly cost of coverage', 'Something only Medicare uses', 'Paid only for hospital stays'], correctIndex: 0, category: 'insurance' },
  { question: 'Out-of-pocket maximum means…', options: ['The most you\'ll pay in a plan year before the insurer covers 100%', 'Your monthly premium', 'The insurer\'s policy limit', 'Your deductible amount'], correctIndex: 0, category: 'insurance' },
  { question: 'An insurance "rider" is…', options: ['Someone who rides with you', 'An add-on that modifies or adds coverage to a policy', 'An annual report', 'A state regulation'], correctIndex: 1, category: 'insurance' },
  { question: 'Which does renters insurance typically NOT cover by default?', options: ['Theft of personal items', 'Personal liability', 'The structure of the building', 'Temporary living expenses after a covered loss'], correctIndex: 2, category: 'insurance' },
  { question: 'A beneficiary is…', options: ['The person who pays the premium', 'The person or entity that receives a policy payout', 'The insurance agent', 'The insurer\'s bank'], correctIndex: 1, category: 'insurance' },
  { question: 'UM/UIM coverage protects you from…', options: ['Unexpected premium hikes', 'Uninsured or underinsured motorists', 'Unauthorized policy changes', 'Uncovered medical bills'], correctIndex: 1, category: 'insurance' },
  { question: 'A disability income policy pays when you…', options: ['Retire', 'Cannot work due to injury or illness', 'Buy a new home', 'Lose your job'], correctIndex: 1, category: 'insurance' },
  { question: 'Which is usually required by law if you own a car and drive it on public roads?', options: ['Collision coverage', 'Liability coverage', 'Comprehensive coverage', 'Gap coverage'], correctIndex: 1, category: 'insurance' },
  { question: 'An "occurrence" policy covers claims based on…', options: ['When the claim is filed', 'When the incident happened', 'When the policy was purchased', 'When the premium was paid'], correctIndex: 1, category: 'insurance' },
  { question: 'Which of these is NOT typically covered by auto insurance?', options: ['Accident damage', 'Stolen vehicle', 'Routine oil changes', 'Broken windshield'], correctIndex: 2, category: 'insurance' },
  { question: 'Term "indemnity" in insurance refers to…', options: ['Restoring the insured to their pre-loss financial position', 'A tax break', 'A type of fraud', 'A discount'], correctIndex: 0, category: 'insurance' },

  // ── General knowledge (~20) ─────────────────────────────────────────────
  { question: 'What is the capital of Australia?', options: ['Sydney', 'Canberra', 'Melbourne', 'Brisbane'], correctIndex: 1, category: 'general' },
  { question: 'How many continents are there?', options: ['5', '6', '7', '8'], correctIndex: 2, category: 'general' },
  { question: 'Which planet is known as the Red Planet?', options: ['Venus', 'Mars', 'Jupiter', 'Mercury'], correctIndex: 1, category: 'general' },
  { question: 'Which element has the chemical symbol "Au"?', options: ['Silver', 'Aluminum', 'Gold', 'Argon'], correctIndex: 2, category: 'general' },
  { question: 'In what year did humans first land on the Moon?', options: ['1965', '1969', '1972', '1981'], correctIndex: 1, category: 'general' },
  { question: 'Which is the longest river in the world?', options: ['Amazon', 'Nile', 'Yangtze', 'Mississippi'], correctIndex: 1, category: 'general' },
  { question: 'Who painted the Mona Lisa?', options: ['Michelangelo', 'Raphael', 'Leonardo da Vinci', 'Donatello'], correctIndex: 2, category: 'general' },
  { question: 'How many U.S. states are there?', options: ['48', '49', '50', '52'], correctIndex: 2, category: 'general' },
  { question: 'What is the smallest unit of data storage called?', options: ['Bit', 'Byte', 'Kilobyte', 'Nibble'], correctIndex: 0, category: 'general' },
  { question: 'What language has the most native speakers?', options: ['English', 'Spanish', 'Mandarin Chinese', 'Hindi'], correctIndex: 2, category: 'general' },
  { question: 'Which organ pumps blood through the body?', options: ['Liver', 'Heart', 'Lungs', 'Kidney'], correctIndex: 1, category: 'general' },
  { question: 'What does CPU stand for?', options: ['Central Processing Unit', 'Computer Personal Unit', 'Core Program Utility', 'Central Program Update'], correctIndex: 0, category: 'general' },
  { question: 'Which ocean is the largest?', options: ['Atlantic', 'Indian', 'Arctic', 'Pacific'], correctIndex: 3, category: 'general' },
  { question: 'The Great Wall is in which country?', options: ['Japan', 'China', 'India', 'Mongolia'], correctIndex: 1, category: 'general' },
  { question: 'In what decade was the World Wide Web invented?', options: ['1970s', '1980s', '1990s', '2000s'], correctIndex: 1, category: 'general' },
  { question: 'Which gas do plants absorb for photosynthesis?', options: ['Oxygen', 'Nitrogen', 'Carbon dioxide', 'Hydrogen'], correctIndex: 2, category: 'general' },
  { question: 'What currency is used in Japan?', options: ['Won', 'Yuan', 'Yen', 'Ringgit'], correctIndex: 2, category: 'general' },
  { question: 'Who wrote the play "Romeo and Juliet"?', options: ['Christopher Marlowe', 'William Shakespeare', 'Geoffrey Chaucer', 'John Milton'], correctIndex: 1, category: 'general' },
  { question: 'Which vitamin does sunlight help the body produce?', options: ['Vitamin A', 'Vitamin B12', 'Vitamin C', 'Vitamin D'], correctIndex: 3, category: 'general' },
  { question: 'What do you call a baby kangaroo?', options: ['Pup', 'Joey', 'Calf', 'Kid'], correctIndex: 1, category: 'general' },

  // ── Pop culture / business (~15) ────────────────────────────────────────
  { question: 'Who founded Microsoft with Paul Allen?', options: ['Steve Jobs', 'Bill Gates', 'Mark Zuckerberg', 'Jeff Bezos'], correctIndex: 1, category: 'pop' },
  { question: 'Which company\'s logo features a bitten apple?', options: ['Samsung', 'Google', 'Apple', 'Microsoft'], correctIndex: 2, category: 'pop' },
  { question: 'In what year was the iPhone first released?', options: ['2005', '2007', '2009', '2011'], correctIndex: 1, category: 'pop' },
  { question: 'Who is the CEO of Tesla and SpaceX?', options: ['Jeff Bezos', 'Elon Musk', 'Tim Cook', 'Sundar Pichai'], correctIndex: 1, category: 'pop' },
  { question: 'Which streaming service produced "Stranger Things"?', options: ['HBO Max', 'Netflix', 'Amazon Prime', 'Disney+'], correctIndex: 1, category: 'pop' },
  { question: 'What country is Toyota originally from?', options: ['Japan', 'Germany', 'South Korea', 'USA'], correctIndex: 0, category: 'pop' },
  { question: 'What does "CEO" stand for?', options: ['Chief Engineering Officer', 'Chief Executive Officer', 'Certified Executive Operator', 'Central Executive Officer'], correctIndex: 1, category: 'pop' },
  { question: 'Which social network was founded at Harvard in 2004?', options: ['Twitter', 'Facebook', 'LinkedIn', 'MySpace'], correctIndex: 1, category: 'pop' },
  { question: 'What is the highest-grossing film of all time (worldwide)?', options: ['Avatar', 'Titanic', 'Avengers: Endgame', 'Star Wars: The Force Awakens'], correctIndex: 0, category: 'pop' },
  { question: 'Which stock exchange is based in New York?', options: ['LSE', 'NYSE', 'TSX', 'SIX'], correctIndex: 1, category: 'pop' },
  { question: 'Which search engine is owned by Alphabet?', options: ['Bing', 'Google', 'DuckDuckGo', 'Yahoo'], correctIndex: 1, category: 'pop' },
  { question: 'What does GDP stand for?', options: ['Gross Domestic Product', 'General Debt Policy', 'Global Distribution Plan', 'Growth & Development Plan'], correctIndex: 0, category: 'pop' },
  { question: 'Which coffee chain uses a green mermaid logo?', options: ['Dunkin\'', 'Starbucks', 'Peet\'s', 'Costa'], correctIndex: 1, category: 'pop' },
  { question: 'What is the most popular sport in the world by number of fans?', options: ['Basketball', 'Cricket', 'Soccer (football)', 'Tennis'], correctIndex: 2, category: 'pop' },
  { question: 'Which company owns Instagram and WhatsApp?', options: ['Alphabet', 'Meta', 'Tencent', 'ByteDance'], correctIndex: 1, category: 'pop' },
];
