// All dashboard time displays are formatted in Eastern Time (America/New_York).
// OnePoint is headquartered in Alpharetta GA; employees outside the US (e.g.
// Nigeria) should still see EST so schedules read consistently.
const EST = 'America/New_York';

function toDate(input: string | number | Date): Date {
  return input instanceof Date ? input : new Date(input);
}

export function formatDate(input: string | number | Date, opts: Intl.DateTimeFormatOptions = {}): string {
  return toDate(input).toLocaleDateString('en-US', {
    timeZone: EST,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...opts,
  });
}

export function formatTime(input: string | number | Date, opts: Intl.DateTimeFormatOptions = {}): string {
  return toDate(input).toLocaleTimeString('en-US', {
    timeZone: EST,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    ...opts,
  });
}

export function formatDateTime(input: string | number | Date, opts: Intl.DateTimeFormatOptions = {}): string {
  return toDate(input).toLocaleString('en-US', {
    timeZone: EST,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    ...opts,
  });
}

// "APR" from a date — used for the calendar-tile headers on events.
export function formatMonthAbbrev(input: string | number | Date): string {
  return toDate(input)
    .toLocaleDateString('en-US', { timeZone: EST, month: 'short' })
    .toUpperCase();
}

// "23" — day-of-month in EST, matches the month used alongside it.
export function formatDayOfMonth(input: string | number | Date): string {
  return toDate(input).toLocaleDateString('en-US', { timeZone: EST, day: 'numeric' });
}

// Month-only human name ("April") — used on birthday cards.
export function formatMonthDay(input: string | number | Date): string {
  return toDate(input).toLocaleDateString('en-US', { timeZone: EST, month: 'long', day: 'numeric' });
}

// Clock ticker for the header location panels. Accepts override tz so the
// multi-city display on the home page keeps working for Texas / Tennessee.
export function formatClock(input: Date, tz: string = EST): string {
  return input.toLocaleTimeString('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit', hour12: true });
}
