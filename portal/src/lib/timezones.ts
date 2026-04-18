/**
 * Allowed IANA timezone strings.
 * Extend this list as the agency grows to other regions.
 */
export const ALLOWED_TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'Africa/Lagos',
  'Europe/London',
  'UTC',
] as const;

export type AllowedTimezone = typeof ALLOWED_TIMEZONES[number];

export const DEFAULT_TIMEZONE: AllowedTimezone = 'America/New_York';

export function isValidTimezone(tz: string): tz is AllowedTimezone {
  return ALLOWED_TIMEZONES.includes(tz as AllowedTimezone);
}
