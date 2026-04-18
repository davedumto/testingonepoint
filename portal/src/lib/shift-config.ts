/**
 * Shift configuration — timezone-aware work hours and auto-logout rules.
 * All shift boundaries are computed per-employee using their IANA timezone.
 */

import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { DEFAULT_TIMEZONE } from '@/lib/timezones';

export const SHIFT_CONFIG = {
  startHour: 9,   // 9 AM in employee's timezone
  endHour: 17,    // 5 PM in employee's timezone
  gracePeriod: 15, // minutes after shift end before auto-logout
  maxSessionHours: 10,
  weekendDays: [0, 6], // Sunday, Saturday
};

/**
 * Get the current time in a specific IANA timezone.
 */
export function getNowInTimezone(timezone: string = DEFAULT_TIMEZONE): Date {
  return toZonedTime(new Date(), timezone);
}

/**
 * Check if the current UTC time falls within shift hours in the employee's timezone.
 */
export function isWithinShift(timezone: string = DEFAULT_TIMEZONE): boolean {
  const zoned = toZonedTime(new Date(), timezone);
  const hour = zoned.getHours();
  return hour >= SHIFT_CONFIG.startHour && hour < SHIFT_CONFIG.endHour;
}

/**
 * Check if the current UTC time is a weekend in the employee's timezone.
 */
export function isWeekend(timezone: string = DEFAULT_TIMEZONE): boolean {
  const zoned = toZonedTime(new Date(), timezone);
  return SHIFT_CONFIG.weekendDays.includes(zoned.getDay());
}

/**
 * Get the shift end time as a UTC Date for a specific timezone.
 * Example: 5:15 PM America/New_York during EDT = 9:15 PM UTC.
 */
export function getShiftEndUTC(timezone: string = DEFAULT_TIMEZONE): Date {
  const zoned = toZonedTime(new Date(), timezone);
  zoned.setHours(SHIFT_CONFIG.endHour, SHIFT_CONFIG.gracePeriod, 0, 0);
  // Convert the zoned shift-end back to a real UTC timestamp
  return fromZonedTime(zoned, timezone);
}

/**
 * Get minutes until shift end for an employee.
 */
export function getMinutesUntilShiftEnd(timezone: string = DEFAULT_TIMEZONE): number {
  const shiftEndUTC = getShiftEndUTC(timezone);
  return Math.max(0, Math.floor((shiftEndUTC.getTime() - Date.now()) / 60000));
}

/**
 * Check if the current UTC time has passed shift end + grace in the employee's timezone.
 */
export function isPastShiftEnd(timezone: string = DEFAULT_TIMEZONE): boolean {
  const shiftEndUTC = getShiftEndUTC(timezone);
  return Date.now() > shiftEndUTC.getTime();
}

/**
 * Security flags — checks login time against employee's timezone.
 */
export function checkSecurityFlags(loginTimeUTC: Date, timezone: string = DEFAULT_TIMEZONE): { flagged: boolean; reason?: string } {
  const zoned = toZonedTime(loginTimeUTC, timezone);
  const hour = zoned.getHours();
  const day = zoned.getDay();

  // Flag: login outside business hours (before 7 AM or after 10 PM in employee TZ)
  if (hour < 7 || hour >= 22) {
    return { flagged: true, reason: `Login outside business hours (${hour}:00 ${timezone})` };
  }

  // Flag: weekend login
  if (SHIFT_CONFIG.weekendDays.includes(day)) {
    return { flagged: true, reason: `Weekend login in ${timezone}` };
  }

  return { flagged: false };
}

/**
 * Calculate duration between two UTC timestamps in minutes.
 */
export function calculateDuration(loginAt: Date, logoutAt: Date): number {
  return Math.round((logoutAt.getTime() - loginAt.getTime()) / 60000);
}
