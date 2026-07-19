import { type GetSeatCounterDataInput } from "@/actions/dashboard";

export const dashboardKeys = {
  all: ["dashboard"] as const,
  filterOptions: () => [...dashboardKeys.all, "filterOptions"] as const,
  seatCounter: (filters: GetSeatCounterDataInput) =>
    [...dashboardKeys.all, "seatCounter", filters] as const,
};
