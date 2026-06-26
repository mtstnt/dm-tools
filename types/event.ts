export interface EventDetailsArea {
  id: string;
  name: string;
  editUrl: string;
}

export interface EventDetailsUser {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  login_token: string | null;
  createdAt: string; // ISO datetime
  updatedAt: string; // ISO datetime
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

export interface AllBlock {
  name: "All Block";
  user: string;
}

export type EventDetailsAllUser = {
  fullName: string;
  email: string | null;
};

export type EventDetailsBlockItem = EventDetailsBlock | AllBlock;

export type EventDetailsEvent = {
  name: string;
  date: string;
}

export interface EventDetailsData {
  allUsers: EventDetailsAllUser[];
  event: EventDetailsEvent;
  users: EventDetailsUser[];
  areas: EventDetailsArea[];
  blocks: EventDetailsBlockItem[];
}
