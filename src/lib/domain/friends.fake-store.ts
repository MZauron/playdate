// An in-memory FriendStore for tests. It behaves like the `friends` table: one friend per (owner, number), and an owner
// can only ever see, rename or remove their own rows.
import { randomUUID } from "node:crypto";
import type { Friend, FriendStore } from "./friends";

type Row = Friend & { ownerId: string; phoneHash: string; kindredUserId: string | null };

export function createFakeFriendStore(profilesByHash: Record<string, string> = {}) {
  const rows: Row[] = [];
  const store: FriendStore = {
    async findProfileIdByHash(hash) {
      return profilesByHash[hash] ?? null;
    },
    async insertFriend(input) {
      const existing = rows.find((r) => r.ownerId === input.ownerId && r.phoneHash === input.phoneHash);
      if (existing) return { status: "duplicate", label: existing.label };
      const row: Row = {
        id: randomUUID(),
        parentName: input.parentName,
        childFirstName: input.childFirstName,
        label: input.label,
        hasKindred: input.kindredUserId !== null,
        ownerId: input.ownerId,
        phoneHash: input.phoneHash,
        kindredUserId: input.kindredUserId,
      };
      rows.push(row);
      return { status: "added", friend: { id: row.id, parentName: row.parentName, childFirstName: row.childFirstName, label: row.label, hasKindred: row.hasKindred } };
    },
    async renameFriend(ownerId, friendId, label) {
      const row = rows.find((r) => r.id === friendId && r.ownerId === ownerId);
      if (row) row.label = label;
      return row !== undefined;
    },
    async deleteFriend(ownerId, friendId) {
      const i = rows.findIndex((r) => r.id === friendId && r.ownerId === ownerId);
      if (i >= 0) rows.splice(i, 1);
      return i >= 0;
    },
  };
  return { store, rows, of: (ownerId: string) => rows.filter((r) => r.ownerId === ownerId) };
}
