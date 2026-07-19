export const MONTHS_ID = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
] as const;

export const BULK_EVENT_TYPES = ["AOG TEEN", "AOG YOUTH"] as const;

export const BULK_EVENT_TIME = {
  "AOG TEEN": { hour: 16, minute: 0 },
  "AOG YOUTH": { hour: 18, minute: 30 },
} as const;

export const BULK_EVENT_TARGET_DAY = 6; // Saturday

export const DATETIME_LOCAL_FORMAT = "yyyy-MM-dd'T'HH:mm";
