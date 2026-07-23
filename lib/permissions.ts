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

export const EVENT_VISIBILITY_SCOPES = [
  "all",
  "region",
  "team",
  "region_spv",
  "all_spv_pic",
  "all_pic",
] as const;

export type EventVisibilityScope = (typeof EVENT_VISIBILITY_SCOPES)[number];

export const EVENT_VISIBILITY_SCOPE_LABELS: Record<EventVisibilityScope, string> = {
  all: "Everyone (ALL)",
  region: "Specific Region",
  team: "Specific Team",
  region_spv: "SPV Only (Region)",
  all_spv_pic: "All SPV & PIC",
  all_pic: "All PIC",
};

export function getCreatableEventVisibilityScopes(
  role: string | null | undefined,
): EventVisibilityScope[] {
  switch (role) {
    case ROLES.ADMIN:
      return [...EVENT_VISIBILITY_SCOPES];
    case ROLES.HEAD_MINISTRY:
      return ["all", "region", "all_spv_pic", "all_pic"];
    case ROLES.REGIONAL_PIC:
      return ["all", "region", "region_spv", "all_spv_pic", "all_pic"];
    case ROLES.SPV:
      return ["team", "region", "region_spv"];
    default:
      return [];
  }
}

export function isEventRegionChoiceLocked(role: string | null | undefined): boolean {
  return role === ROLES.REGIONAL_PIC || role === ROLES.SPV;
}

export function isEventTeamChoiceLocked(role: string | null | undefined): boolean {
  return role === ROLES.SPV;
}

export function canEventVisibilityScopePickMultipleRegions(
  role: string | null | undefined,
): boolean {
  return role === ROLES.ADMIN || role === ROLES.HEAD_MINISTRY;
}
