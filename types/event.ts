export interface EventDetailsArea {
  id: string;
  name: string;
  editUrl: string;
}

export interface EventDetailsUser {
  id: number;
  name: string;
  email: string | null;
  blocks: number[];
}

export interface EventDetailsBlock {
  area_id: number;
  event_id: number;
  id: number;
  name: string;
  row: number;
  column: number;
  chairs_data: number[][];
  real_data: number[][];
  createdAt: string; // ISO datetime
  updatedAt: string; // ISO datetime
}

export type EventDetailsAllUser = {
  id: number;
  fullName: string;
  email: string | null;
};

export type EventDetailsEvent = {
  name: string;
  date: string;
  location: string;
}

export interface EventDetailsData {
  allUsers: EventDetailsAllUser[];
  assignedUserIds: number[];
  event: EventDetailsEvent;
  users: EventDetailsUser[];
  areas: EventDetailsArea[];
  blocks: EventDetailsBlock[];
  csrf: string | null;
}
