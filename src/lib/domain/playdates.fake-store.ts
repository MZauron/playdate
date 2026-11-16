// An in-memory PlaydateStore for tests. Like the database, an owner only ever finds their own friends, and every write is recorded
// exactly as the real store would receive it, so tests can check what would have been stored.
import { randomUUID } from "node:crypto";
import type { InviteeFriend, NewPlaydate, PlaydateStore } from "./playdates";

export function createFakePlaydateStore(friends: (InviteeFriend & { ownerId: string })[]) {
  const playdates: (NewPlaydate & { id: string })[] = [];
  const places: { ownerId: string; name: string; address: string }[] = [];
  const names: { ownerId: string; firstName: string }[] = [];
  const store: PlaydateStore = {
    async friendsForInvite(ownerId, ids) {
      return friends
        .filter((f) => f.ownerId === ownerId && ids.includes(f.id))
        .map((f) => ({ id: f.id, parentName: f.parentName, childFirstName: f.childFirstName, label: f.label, kindredUserId: f.kindredUserId }));
    },
    async createPlaydate(playdate) {
      const id = randomUUID();
      playdates.push({ ...playdate, id });
      return id;
    },
    async saveTypedPlace(ownerId, name, address) {
      if (!places.some((p) => p.ownerId === ownerId && p.name.toLowerCase() === name.toLowerCase())) places.push({ ownerId, name, address });
    },
    async setFirstName(ownerId, firstName) {
      names.push({ ownerId, firstName });
    },
  };
  return { store, playdates, places, names };
}
