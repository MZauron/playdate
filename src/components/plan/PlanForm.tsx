"use client";

import { useActionState, useEffect, useState, startTransition } from "react";
import { useRouter } from "next/navigation";
import { sendInviteAction, type SendInviteState } from "@/app/(app)/plan/actions";
import { sendUpdateAction } from "@/app/(app)/playdates/[id]/edit/actions";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Chip } from "@/components/Chip";
import { cx } from "@/components/cx";
import { Field } from "@/components/Field";
import { NumberedStep } from "@/components/NumberedStep";
import { AddFriendForm } from "@/components/friends/AddFriendForm";
import { AskKindred } from "@/components/places/AskKindred";
import { FindPlace } from "@/components/places/FindPlace";
import { PlaceCard } from "@/components/places/PlaceCard";
import type { Place } from "@/lib/integrations/places/types";
import type { Friend } from "@/lib/domain/friends";
import type { TimeMode } from "@/lib/rules/types";
import { enCA } from "@/lib/i18n/en-CA";
import { LeaveDialog } from "./LeaveDialog";
import { MessageField } from "./MessageField";
import { browserZone, DEFAULT_END, DEFAULT_START } from "./plan-time";
import { SentView } from "./SentView";
import { WhenStep, type WhenState } from "./WhenStep";

const t = enCA.plan;

export type SavedPlace = { name: string; address: string };

/** Edit playdate (T16): the same screen, filled in, in the playdate's own zone (KD-16), ending in Send update. */
export type EditPlaydate = {
  playdateId: string;
  zone: string;
  initial: { friendIds: string[]; mode: TimeMode; slots: string[]; day: string; start: string; end: string; place: Place | null; placeName: string; placeAddress: string; message: string };
};

/** The planning screen (T08): 1 Who's invited, 2 When, Details, Send. The server decides on Send; nothing here is trusted. */
/** T19: a new plan started from a group (its families) or from Plan again (also the same place, next week). */
export type PlanPrefill = { friendIds: string[]; day?: string; start?: string; end?: string; place?: Place | null; placeName?: string; placeAddress?: string };

export function PlanForm({
  friends,
  savedPlaces,
  favourites = [],
  firstName,
  edit,
  groups = [],
  prefill,
}: {
  friends: Friend[];
  savedPlaces: SavedPlace[];
  /** T18: the parent's hearted places, as chips under Where. */
  favourites?: Place[];
  firstName: string;
  edit?: EditPlaydate;
  groups?: { id: string; name: string; friendIds: string[] }[];
  prefill?: PlanPrefill;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState<SendInviteState, FormData>(edit ? sendUpdateAction : sendInviteAction, { errors: {} });
  const initial = edit?.initial;
  const zone = () => edit?.zone ?? browserZone();
  const leaveTo = edit ? `/playdates/${edit.playdateId}` : "/";

  const [selected, setSelected] = useState<string[]>(initial?.friendIds ?? prefill?.friendIds ?? []);
  const [addingFriend, setAddingFriend] = useState(false);
  const [when, setWhen] = useState<WhenState>(
    initial
      ? { mode: initial.mode, day: initial.day, start: initial.start || DEFAULT_START, end: initial.end || DEFAULT_END, slots: initial.slots, done: true }
      : { mode: "set_time", day: prefill?.day ?? "", start: prefill?.start || DEFAULT_START, end: prefill?.end || DEFAULT_END, slots: [], done: !!prefill?.day },
  );
  // 3 Where (T17): a place found by search. When there is one, the typed place under Details is not used.
  const [place, setPlace] = useState<Place | null>(initial?.place ?? prefill?.place ?? null);
  const [finding, setFinding] = useState<false | "search" | "ask">(false);
  const [placeName, setPlaceName] = useState(initial?.placeName ?? prefill?.placeName ?? "");
  const [placeAddress, setPlaceAddress] = useState(initial?.placeAddress ?? prefill?.placeAddress ?? "");
  const [savePlace, setSavePlace] = useState(false);
  const [yourName, setYourName] = useState(firstName);
  const [message, setMessage] = useState(initial?.message ?? "");
  const [leaving, setLeaving] = useState(false);
  // An error from the last Send goes away once the parent changes that part of the plan.
  const [edited, setEdited] = useState<{ after: SendInviteState; fields: string[] }>({ after: state, fields: [] });
  const touch = (field: string) => setEdited((e) => ({ after: state, fields: e.after === state ? [...e.fields, field] : [field] }));

  const invited = friends.filter((f) => selected.includes(f.id));
  // Two friends with the same label ("Noor's parent") would look the same: show the parent's name under those.
  const clashing = new Set(friends.map((f) => f.label).filter((label, i, all) => all.indexOf(label) !== i));
  const start = initial ?? { friendIds: [], mode: "set_time" as TimeMode, slots: [], day: "", start: when.start, end: when.end, place: null, placeName: "", placeAddress: "", message: "" };
  const dirty =
    !state.sent &&
    ([...selected].sort().join() !== [...start.friendIds].sort().join() ||
      when.day !== start.day ||
      when.mode !== start.mode ||
      [...when.slots].sort().join() !== [...start.slots].sort().join() ||
      (initial !== undefined && (when.start !== start.start || when.end !== start.end)) ||
      (place?.id ?? null) !== (start.place?.id ?? null) ||
      placeName !== start.placeName ||
      placeAddress !== start.placeAddress ||
      message !== start.message ||
      yourName !== firstName);

  // A reload or a closed tab with a plan half done asks first, like Back does.
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  if (state.sent) return <SentView texts={state.sent.texts} playdateId={state.sent.playdateId} update={state.sent.update} backTo={leaveTo} />;

  const fixed = edited.after === state ? edited.fields : [];
  const errors = Object.fromEntries(Object.entries(state.errors).filter(([field]) => !fixed.includes(field)));
  const toggle = (id: string) => {
    touch("invitees");
    setSelected((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]));
  };
  const suggestions = savedPlaces.filter((p) => p.name !== placeName && p.name.toLowerCase().startsWith(placeName.trim().toLowerCase())).slice(0, 4);

  // Select on a search or Ask Kindred result: that place goes on the plan.
  const selectButton = (found: Place) => (
    <Button
      compact
      aria-label={enCA.places.selectPlace(found.name)}
      onClick={() => {
        touch("place");
        setPlace(found);
        setFinding(false);
      }}
    >
      {enCA.places.select}
    </Button>
  );

  function send() {
    const form = new FormData();
    for (const id of selected) form.append("friendId", id);
    form.set("mode", when.mode);
    if (when.done && when.mode === "set_time") {
      form.set("day", when.day);
      form.set("startTime", when.start);
      form.set("endTime", when.end);
    }
    if (when.done && when.mode === "availability") for (const slot of when.slots) form.append("slot", slot);
    form.set("zone", zone());
    if (edit) form.set("playdateId", edit.playdateId);
    if (place) form.set("placeId", place.id);
    else {
      form.set("placeName", placeName);
      form.set("placeAddress", placeAddress);
      if (savePlace) form.set("savePlace", "1");
    }
    form.set("yourName", yourName);
    form.set("message", message);
    startTransition(() => action(form));
  }

  const appCount = invited.filter((f) => f.hasKindred).length;

  return (
    <div className="flex flex-col gap-6 pb-6">
      <header className="flex flex-col gap-1">
        <button
          type="button"
          onClick={() => (dirty ? setLeaving(true) : router.push(leaveTo))}
          className="-ml-2 flex min-h-11 w-fit items-center px-2 text-[15px] font-semibold text-primary"
        >
          ← {t.back}
        </button>
        <h1 className="text-title font-bold leading-tight">{edit ? t.editTitle : t.title}</h1>
      </header>

      <NumberedStep number={1} done={selected.length > 0} title={t.whoTitle}>
        <div className="mt-2 flex flex-col gap-3">
          {groups.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <p className="text-label font-semibold uppercase tracking-wider text-muted">{t.groupsLabel}</p>
              <div className="flex flex-wrap gap-2">
                {groups.map((g) => (
                  <Chip
                    key={g.id}
                    selected={g.friendIds.length > 0 && g.friendIds.every((id) => selected.includes(id))}
                    onClick={() => {
                      touch("invitees");
                      // A group pre-selects its families (DESIGN.md "Screens"); tapping it again leaves the selection as it is.
                      setSelected((list) => [...new Set([...list, ...g.friendIds])]);
                    }}
                  >
                    {g.name}
                  </Chip>
                ))}
              </div>
            </div>
          )}
          {friends.length === 0 ? (
            <p className="text-muted">{t.noFriends}</p>
          ) : (
            <ul aria-label={t.friendsLabel} className="flex flex-col gap-2">
              {friends.map((friend) => {
                const on = selected.includes(friend.id);
                return (
                  <li key={friend.id}>
                    <button
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggle(friend.id)}
                      className={cx(
                        "flex min-h-14 w-full items-center gap-3 rounded-card px-4 py-2 text-left shadow-card focus-visible:outline-2 focus-visible:outline-primary",
                        on ? "bg-primary-tint ring-1 ring-primary" : "bg-card",
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className={cx("flex size-6 shrink-0 items-center justify-center rounded-full text-sm font-bold", on ? "bg-primary text-white" : "ring-2 ring-black/15")}
                      >
                        {on ? "✓" : ""}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">{friend.label}</span>
                        <span className={cx("block text-[15px]", friend.hasKindred ? "text-primary" : "text-muted")}>
                          {clashing.has(friend.label) ? `${friend.parentName} · ` : ""}
                          {friend.hasKindred ? enCA.friends.hasKindred : enCA.friends.getsText}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {errors.invitees && <ErrorLine>{errors.invitees}</ErrorLine>}
          <Button type="button" compact className="w-fit" aria-expanded={addingFriend} onClick={() => setAddingFriend((open) => !open)}>
            {addingFriend ? t.closeAddFriend : t.addFriend}
          </Button>
          {addingFriend && (
            <AddFriendForm
              submitVariant="secondary"
              onAdded={(id) => {
                touch("invitees");
                setSelected((list) => (list.includes(id) ? list : [...list, id])); // a friend added here is someone to invite
              }}
            />
          )}
        </div>
      </NumberedStep>

      <NumberedStep number={2} done={when.done} title={t.whenTitle}>
        <WhenStep
          value={when}
          onChange={(value) => {
            touch("time");
            setWhen(value);
          }}
          serverError={errors.time}
          zone={edit?.zone}
        />
      </NumberedStep>

      <NumberedStep number={3} done={!!place || !!placeName.trim()} title={t.whereTitle}>
        <div className="mt-2 flex flex-col gap-3">
          {place && !finding ? (
            <PlaceCard place={place}>
              <Button compact onClick={() => setFinding("search")}>
                {enCA.places.change}
              </Button>
              <Button
                compact
                variant="destructive"
                onClick={() => {
                  touch("place");
                  setPlace(null);
                }}
              >
                {enCA.places.remove}
              </Button>
            </PlaceCard>
          ) : finding === "search" ? (
            <FindPlace action={selectButton} onClose={() => setFinding(false)} />
          ) : finding === "ask" ? (
            <AskKindred action={selectButton} onClose={() => setFinding(false)} />
          ) : (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <Button compact onClick={() => setFinding("search")}>
                {enCA.places.findPlace}
              </Button>
              <button type="button" onClick={() => setFinding("ask")} className="inline-flex min-h-11 items-center text-[15px] font-semibold text-purple">
                {enCA.places.orAsk}
              </button>
            </div>
          )}
          {!finding && favourites.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <p className="text-label font-semibold uppercase tracking-wider text-muted">{enCA.places.favouritesLabel}</p>
              <div className="flex flex-wrap gap-2">
                {favourites.map((f) => (
                  <Chip
                    key={f.id}
                    selected={place?.id === f.id}
                    onClick={() => {
                      touch("place");
                      setPlace(f);
                    }}
                  >
                    {f.name}
                  </Chip>
                ))}
              </div>
            </div>
          )}
          {errors.place && <ErrorLine>{errors.place}</ErrorLine>}
        </div>
      </NumberedStep>

      <section aria-labelledby="details-title" className="flex flex-col gap-4">
        <h2 id="details-title" className="text-lg font-semibold">
          {t.detailsTitle}
        </h2>
        {/* A typed place (name + address), only when no place was found by search (DESIGN.md "Screens"). */}
        {!place && (
          <Card className="flex flex-col gap-4">
            <div>
              <Field
                id="place-name"
                label={t.placeNameLabel}
                placeholder={t.placeNamePlaceholder}
                value={placeName}
                onChange={(e) => {
                  touch("placeName");
                  setPlaceName(e.target.value);
                }}
                error={errors.placeName}
                maxLength={80}
                autoComplete="off"
              />
              {suggestions.length > 0 && (
                <div className="mt-2">
                  <p className="mb-1.5 text-label font-semibold uppercase tracking-wider text-muted">{t.savedPlaces}</p>
                  <div className="flex flex-wrap gap-2">
                    {suggestions.map((place) => (
                      <button
                        key={place.name}
                        type="button"
                        onClick={() => {
                          touch("placeName");
                          touch("placeAddress");
                          setPlaceName(place.name);
                          setPlaceAddress(place.address);
                        }}
                        className="inline-flex min-h-11 items-center rounded-full bg-primary-tint px-4 text-[15px] font-medium text-primary"
                      >
                        {place.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <Field
              id="place-address"
              label={t.placeAddressLabel}
              value={placeAddress}
              onChange={(e) => {
                touch("placeAddress");
                setPlaceAddress(e.target.value);
              }}
              error={errors.placeAddress}
              maxLength={200}
              autoComplete="off"
            />
            <button
              type="button"
              aria-pressed={savePlace}
              onClick={() => {
                touch("placeAddress");
                setSavePlace((on) => !on);
              }}
              className={cx("flex min-h-11 w-fit items-center gap-2 text-[15px] font-semibold", savePlace ? "text-primary" : "text-ink")}
            >
              <span aria-hidden="true" className="text-xl leading-none">
                {savePlace ? "★" : "☆"}
              </span>
              {t.savePlace}
            </button>
          </Card>
        )}
        <Field
          id="your-name"
          label={t.yourNameLabel}
          hint={t.yourNameHint}
          value={yourName}
          onChange={(e) => {
            touch("yourName");
            setYourName(e.target.value);
          }}
          error={errors.yourName}
          maxLength={40}
          autoComplete="given-name"
        />
        <MessageField
          value={message}
          onChange={(value) => {
            touch("message");
            setMessage(value);
          }}
          error={errors.message}
          plan={{ friendIds: selected, day: when.done ? when.day : "", startTime: when.done ? when.start : "", endTime: when.done ? when.end : "", placeName: place?.name ?? placeName }}
        />
      </section>

      <div className="flex flex-col gap-3">
        {invited.length > 0 && <p className="text-[15px] text-muted">{t.sendLine(appCount, invited.length - appCount)}</p>}
        {errors.form ? <ErrorLine>{errors.form}</ErrorLine> : Object.keys(errors).length > 0 && <ErrorLine>{t.fixAbove}</ErrorLine>}
        <Button variant="main" fullWidth disabled={pending} onClick={send}>
          {edit ? t.sendUpdate : when.mode === "availability" ? t.shareAvailability : t.send}
        </Button>
      </div>

      {leaving && <LeaveDialog onKeep={() => setLeaving(false)} onDiscard={() => router.push(leaveTo)} />}
    </div>
  );
}

function ErrorLine({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="text-[15px] font-medium text-danger">
      {children}
    </p>
  );
}
