export const ROLES = {
  ADMIN: "Admin",
  HEAD_MINISTRY: "Head Ministry",
  REGIONAL_PIC: "Regional PIC",
  SPV: "SPV",
  MEMBER: "Member",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export function canAccess(
  userRole: string | null | undefined,
  allowedRoles: Role[],
): boolean {
  if (!userRole) return false;
  if (userRole === ROLES.ADMIN) return true;
  return allowedRoles.includes(userRole as Role);
}
