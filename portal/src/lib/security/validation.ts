/**
 * Zod Input Validation Schemas
 *
 * PURPOSE: Server-side validation for every API input. No unvalidated user input reaches the database.
 *
 * WHY ZOD: Type-safe validation that integrates with TypeScript. Prevents injection, type confusion, and overflow.
 */

import { z } from 'zod';

// ── Auth schemas ──
export const loginSchema = z.object({
  email: z.string().email('Invalid email address').max(255).toLowerCase().trim(),
  password: z.string().min(1, 'Password is required').max(128),
});

export const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100).trim(),
  email: z.string().email('Invalid email address').max(255).toLowerCase().trim(),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email').max(255).toLowerCase().trim(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1).max(256),
  password: z.string().min(8).max(128),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(8).max(128),
});

export const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).trim(),
  email: z.string().email().max(255).toLowerCase().trim(),
});

// ── 2FA schemas ──
export const totpVerifySchema = z.object({
  token: z.string().length(6, 'TOTP must be 6 digits').regex(/^\d{6}$/, 'TOTP must be numeric'),
});

// ── Cart schemas ──
export const cartAddSchema = z.object({
  productName: z.string().min(1).max(100).trim(),
  productCategory: z.string().min(1).max(50).trim(),
});

// ── Access request schemas ──
export const accessRequestSchema = z.object({
  provider: z.enum(['ghl', 'canva', 'lastpass', 'microsoft']),
  reason: z.string().max(500).optional(),
});

export const accessReviewSchema = z.object({
  requestId: z.string().min(1).max(50),
  action: z.enum(['approve', 'deny']),
});

// ── Time tracking schemas ──
export const clockOutSchema = z.object({
  logoutType: z.enum(['manual', 'auto', 'shift_end', 'session_expired']).optional().default('manual'),
});

export const extraHoursSchema = z.object({
  requestedDate: z.string().min(1),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  hoursRequested: z.number().min(0.5).max(24),
  reason: z.string().min(5, 'Reason must be at least 5 characters').max(500),
});

// ── Book call schemas ──
export const bookCallSchema = z.object({
  topic: z.string().min(1).max(200).trim(),
  preferredDate: z.string().min(1),
  preferredTime: z.string().min(1),
  phone: z.string().min(7).max(20).trim(),
  notes: z.string().max(1000).optional(),
});

// ── Form schemas ──
export const formSubmitSchema = z.object({
  quoteId: z.string().max(50).optional(),
  productName: z.string().min(1).max(100),
  productCategory: z.string().min(1).max(50),
  formData: z.record(z.string(), z.unknown()).optional(),
  submit: z.boolean().optional(),
});

// ── CSV import schema ──
export const csvImportSchema = z.object({
  csvData: z.string().min(10, 'CSV data too short').max(5000000, 'CSV data too large (5MB max)'),
});

// ── Admin login schema ──
export const adminLoginSchema = z.object({
  email: z.string().email().max(255).toLowerCase().trim(),
  password: z.string().min(1).max(128),
});

/**
 * Validate and parse input, returning typed data or throwing.
 * Use in API routes: const data = validateInput(schema, await req.json());
 */
export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}

/**
 * Safe validate — returns result object instead of throwing.
 */
export function safeValidate<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);
  if (result.success) return { success: true, data: result.data };
  return { success: false, error: result.error.message };
}
