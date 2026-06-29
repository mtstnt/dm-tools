import { EventDetailsBlock } from "@/types/event";

type User = {
  id: number;
  name: string;
  email: string;
};

type Block = {
  id: number;
  name: string;
  users: User[];

  area_id: number;
  event_id: number;
  row: number;
  column: number;
  chairs_data: number[][];
  real_data: number[][];
  createdAt: string;
  updatedAt: string;

  user?: string; // handles special rows like "All Block"
};

type UserWithBlocks = User & {
  blocks: number[];
};

type NormalizedData = {
  users: UserWithBlocks[];
  blocks: EventDetailsBlock[];
};

export function normalizeBlocks(data: Block[]): NormalizedData {
  const usersMap = new Map<number, UserWithBlocks>();

  const blocks = data
    .map(({ users, ...block }) => {
      users?.forEach((user) => {
        const existing = usersMap.get(user.id);

        if (existing) {
          if (block.id !== undefined && !existing.blocks.includes(block.id)) {
            existing.blocks.push(block.id);
          }
        } else {
          usersMap.set(user.id, {
            ...user,
            blocks: block.id !== undefined ? [block.id] : [],
          });
        }
      });

      return block;
    })
    .filter((block) => block.name !== "All Block");

  return {
    users: [...usersMap.values()],
    blocks,
  };
}
