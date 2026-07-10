// Describes the complete data of the event.
// TODO: Also add Volunteer data to merge into this structure.

export interface EventDetail {
  id: number;
  name: string;
  date: string;
  location: string;

  areas: EventArea[];
  users: EventAssignedUser[];

  allUsers: EventUser[];

  csrf: string;
}

export interface EventArea {
  id: number;
  name: string;

  blocks: EventBlock[];
}

export interface EventBlock {
  id: number;
  name: string;
  row: number;
  column: number;
  userIds: number[];
  chairs: number[][];
}

export interface EventUser {
  id: number;
  fullName: string;
  email: string;
}

export interface EventAssignedUser {
  id: number;
  fullName: string;
  email: string;
  assignedBlockIds: number[];
  taskIds?: number[];
}
