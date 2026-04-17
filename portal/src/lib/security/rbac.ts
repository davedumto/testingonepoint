/**
 * Role-Based Access Control (RBAC)
 *
 * PURPOSE: Enforces three-tier access: employee, admin, super-admin.
 * - Employee: own data only
 * - Admin: employee data, access requests, time tracking — no system config
 * - Super-admin: everything including role assignments and system config
 *
 * WHY: Principle of least privilege. Each role only gets what it needs.
 */

export type Role = 'employee' | 'admin' | 'super-admin';

export const PERMISSIONS = {
  // Employee permissions
  'own.data.read': ['employee', 'admin', 'super-admin'],
  'own.data.write': ['employee', 'admin', 'super-admin'],
  'own.cart.manage': ['employee', 'admin', 'super-admin'],
  'own.forms.manage': ['employee', 'admin', 'super-admin'],
  'own.time.manage': ['employee', 'admin', 'super-admin'],
  'access.request': ['employee', 'admin', 'super-admin'],

  // Admin permissions
  'users.read': ['admin', 'super-admin'],
  'users.manage': ['admin', 'super-admin'],
  'access.approve': ['admin', 'super-admin'],
  'time.admin': ['admin', 'super-admin'],
  'audit.read': ['admin', 'super-admin'],
  'policies.import': ['admin', 'super-admin'],

  // Super-admin permissions
  'system.config': ['super-admin'],
  'roles.assign': ['super-admin'],
  'audit.export': ['super-admin'],
  'encryption.manage': ['super-admin'],
} as const;

export type Permission = keyof typeof PERMISSIONS;

export function hasPermission(role: Role, permission: Permission): boolean {
  const allowed = PERMISSIONS[permission];
  return (allowed as readonly string[]).includes(role);
}

export function requireRole(userRole: Role, minimumRole: Role): boolean {
  const hierarchy: Role[] = ['employee', 'admin', 'super-admin'];
  return hierarchy.indexOf(userRole) >= hierarchy.indexOf(minimumRole);
}

export function canAccessUserData(requestorId: string, targetUserId: string, requestorRole: Role): boolean {
  // Employees can only access their own data
  if (requestorRole === 'employee') return requestorId === targetUserId;
  // Admins and super-admins can access any employee data
  return true;
}
