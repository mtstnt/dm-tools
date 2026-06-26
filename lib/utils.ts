import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const normalize = (text: string): string => text.replace(/\s+/g, " ").trim()

export function parseEventTitle(title: string) {
  const parts = normalize(title)
    .split("/")
    .map((v) => v.trim())

  return {
    date: parts[0] ?? null,
    name: parts[1] ?? null,
    time:
      parts.length >= 3 && /^\d{1,2}:\d{2}$/.test(parts[2]) ? parts[2] : null,
  }
}
