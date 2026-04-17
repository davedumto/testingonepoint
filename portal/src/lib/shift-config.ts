// Shift configuration — defines work hours and auto-logout rules

export const SHIFT_CONFIG = {
  // Standard shift hours (24h format, EST)
  startHour: 9,  // 9 AM
  endHour: 17,   // 5 PM

  // Auto-logout grace period after shift ends (minutes)
  gracePeriod: 15,

  // Max session duration (hours) — force logout after this even during shift
  maxSessionHours: 10,

  // Weekend days (0=Sunday, 6=Saturday)
  weekendDays: [0, 6],
};

export function isWithinShift(): boolean {
  const now = new Date();
  const hour = now.getHours();
  return hour >= SHIFT_CONFIG.startHour && hour < SHIFT_CONFIG.endHour;
}

export function isWeekend(): boolean {
  const day = new Date().getDay();
  return SHIFT_CONFIG.weekendDays.includes(day);
}

export function getShiftEndTime(): Date {
  const now = new Date();
  const end = new Date(now);
  end.setHours(SHIFT_CONFIG.endHour, SHIFT_CONFIG.gracePeriod, 0, 0);
  return end;
}

export function getMinutesUntilShiftEnd(): number {
  const now = new Date();
  const end = getShiftEndTime();
  return Math.max(0, Math.floor((end.getTime() - now.getTime()) / 60000));
}

// Security flags
export function checkSecurityFlags(loginTime: Date, ipAddress?: string): { flagged: boolean; reason?: string } {
  const hour = loginTime.getHours();
  const day = loginTime.getDay();

  // Flag: login outside business hours (before 7 AM or after 10 PM)
  if (hour < 7 || hour >= 22) {
    return { flagged: true, reason: 'Login outside business hours (before 7 AM or after 10 PM)' };
  }

  // Flag: weekend login without approved extra hours
  if (SHIFT_CONFIG.weekendDays.includes(day)) {
    return { flagged: true, reason: 'Weekend login — verify extra hours approval' };
  }

  return { flagged: false };
}

export function calculateDuration(loginAt: Date, logoutAt: Date): number {
  return Math.round((logoutAt.getTime() - loginAt.getTime()) / 60000); // minutes
}
