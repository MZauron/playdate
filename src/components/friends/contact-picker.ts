// The Contact Picker API (Android Chrome; not iPhone, Q15). Not in TypeScript's DOM types, so only what we use is declared here.
type PickedContact = { name?: string[]; tel?: string[] };
type ContactsManager = { select(properties: ("name" | "tel")[], options?: { multiple?: boolean }): Promise<PickedContact[]> };

export function contactsManager(): ContactsManager | null {
  if (typeof navigator === "undefined" || typeof window === "undefined") return null;
  const contacts = (navigator as Navigator & { contacts?: ContactsManager }).contacts;
  return contacts && "ContactsManager" in window ? contacts : null;
}

/** Opens the phone's contact picker for ONE contact and returns only what the parent chose; null when they close it. */
export async function pickContact(): Promise<{ name: string; phone: string } | null> {
  const manager = contactsManager();
  if (!manager) return null;
  try {
    const [contact] = await manager.select(["name", "tel"], { multiple: false });
    if (!contact) return null;
    return { name: contact.name?.[0]?.trim() ?? "", phone: contact.tel?.[0]?.trim() ?? "" };
  } catch {
    return null; // closed without choosing, or not allowed
  }
}
