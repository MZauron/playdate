# Rules: test cases

The cases `src/lib/rules` must pass. Each row's id is the name of exactly one test (`it("KD-03a …")`), and
`src/lib/rules/cases.test.ts` fails if a row has no test or a test id has no row. Add a row before adding a test.

Unless a case says otherwise: zone `America/Toronto` (EST, UTC−5 in November), **now = Sat 14 Nov 2026, 10:00**.
"Mon" is Mon 16 Nov 2026; "Wed" is Wed 18 Nov 2026. Slots use the Q8 default: morning 9–12, afternoon 13–16, evening 16–19.
"Set-time playdate" = collecting, `time_version` 1, Mon 10:00–12:00, link expires Tue 00:00.

Where the doc is silent, the reading used is marked *(reading)*.

## KD-01 Nothing confirms itself
| Id | Input | Expected |
| --- | --- | --- |
| KD-01a | Collecting set-time playdate, every friend answered yes | Answer rules return no status; Home shows it under Needs you, not Upcoming (only `checkConfirm` produces a final time) |

## KD-02 One time mode
| Id | Input | Expected |
| --- | --- | --- |
| KD-02a | `set_time` Mon 10–12, with leftover slots from the other option | ok; slots cleared |
| KD-02b | `availability` with Mon morning, with a leftover start and end | ok; start and end cleared |
| KD-02c | `set_time` with a start and no end | `NO_TIME` |
| KD-02d | No mode chosen | `NO_TIME` |
| KD-02e | `availability` with no slots | `NO_FREE_SLOTS` |

## KD-03 Set time
| Id | Input | Expected |
| --- | --- | --- |
| KD-03a | Mon 10:00–12:00 | ok; length 120 minutes |
| KD-03b | End equal to start | `END_BEFORE_START` |
| KD-03c | End before start | `END_BEFORE_START` |
| KD-03d | Start Sat 9:00 (before now) | `IN_PAST` |
| KD-03e | Start exactly now | `IN_PAST` |
| KD-03f | Mon 10–12, start moved to 14:00 | Mon 14–16 (length kept) |

## KD-04 Availability and picks
| Id | Input | Expected |
| --- | --- | --- |
| KD-04a | Free: Mon morning. Pick Mon 9:30–11:00 | ok |
| KD-04b | Free: Mon morning. Pick Mon 9:00–12:00 (the whole slot) | ok |
| KD-04c | Free: Mon morning and afternoon. Pick Mon 11:00–13:30 | `PICK_OUTSIDE_FREE_SLOT` (one slot only) |
| KD-04d | Free: Mon afternoon and evening (they touch at 16:00). Pick Mon 15:30–16:30 | `PICK_OUTSIDE_FREE_SLOT` |
| KD-04e | Free: Mon morning. Pick Wed 9:00–10:00 | `PICK_OUTSIDE_FREE_SLOT` |
| KD-04f | Free: Mon morning. Pick Mon 9:15–10:15 | `PICK_NOT_HALF_HOUR` |
| KD-04g | Free: Mon morning. Pick Mon 9:00–9:00 | `PICK_TOO_SHORT` |
| KD-04h | Free: Mon morning. Pick Mon 9:00–9:30 | ok (exactly 30 minutes) |
| KD-04i | Plan with a free slot today (Sat evening) | ok (today or later) |
| KD-04j | Plan with a free slot yesterday (Fri morning) | `IN_PAST` |
| KD-04k | Zone `Asia/Kolkata` (UTC+5:30). Free: Mon morning. Pick Mon 9:30–10:00 there | ok (half hours on the playdate's own clock) |
| KD-04l | Mon morning in Toronto | 14:00Z–17:00Z |

## KD-05 Message
| Id | Input | Expected |
| --- | --- | --- |
| KD-05a | Message of spaces only | `MESSAGE_REQUIRED` |
| KD-05b | 1001 characters | `MESSAGE_TOO_LONG` |
| KD-05c | `"  Park at 10?  "` | ok; the value is exactly what was typed |
| KD-05d | 1000 characters | ok |

## KD-06 Invitees and title
| Id | Input | Expected |
| --- | --- | --- |
| KD-06a | No friends | `NO_INVITEES` |
| KD-06b | Mia; friends' children Arjun | "Playdate: Mia & Arjun" (the caller passes one child per family, Q4 default) |
| KD-06c | Mia; Arjun, Lily | "Playdate: Mia, Arjun & Lily" |
| KD-06d | Mia; Arjun, Lily, Zoe | "Playdate: Mia, Arjun, Lily & Zoe" |
| KD-06e | No mode, blank message, no friends | All three errors at once: `NO_TIME`, `MESSAGE_REQUIRED`, `NO_INVITEES` |

## KD-07 Answers
| Id | Input | Expected |
| --- | --- | --- |
| KD-07a | Set-time playdate; yes | ok |
| KD-07b | Set-time playdate; no, reason busy, note "Sorry!" | ok |
| KD-07c | Set-time playdate; no without a reason | `INVALID_ANSWER` (reason). `INVALID_ANSWER` covers answers the schema would refuse anyway (KD-07c–g) *(reading)* |
| KD-07d | Set-time playdate; yes with a note | `INVALID_ANSWER` (note) |
| KD-07e | Set-time playdate; no, reason busy, note of 281 characters | `INVALID_ANSWER` (note) |
| KD-07f | Set-time playdate; pick | `INVALID_ANSWER` (kind) |
| KD-07g | Availability playdate (Mon morning free); yes | `INVALID_ANSWER` (kind) |
| KD-07h | Availability playdate (Mon morning free); pick Mon 9–10, then pick Wed 9–10 | ok, then `PICK_OUTSIDE_FREE_SLOT` |
| KD-07i | Set-time playdate; now Mon 10:00 (it starts) | `PLAYDATE_STARTED` |
| KD-07j | Set-time playdate, cancelled | `PLAYDATE_CANCELLED` |
| KD-07k | Set-time playdate; now Tue 00:00 (link expiry) | `LINK_EXPIRED` |
| KD-07l | Playdate at `time_version` 2; answer sent for version 1 | `STALE_TIME` |
| KD-07m | Confirmed set-time playdate; a friend changes to no | ok (the answer rule never touches the status) |
| KD-07n | Availability playdate confirmed for Mon 9–10; now Mon 9:00 | `PLAYDATE_STARTED` (starts = the final start; an unconfirmed availability playdate has no start, so only the link expiry stops answers) *(reading)* |
| KD-07o | Set-time playdate; no, reason busy, note of spaces only | ok; note stored as empty (null) |

## KD-08 Status per friend
| Id | Input | Expected |
| --- | --- | --- |
| KD-08a | yes / pick / no (busy) / no answer | Coming / Responded / Can't make it (busy) / Waiting |
| KD-08b | 3 invites, 2 answers | 2 of 3 answered |

## KD-09 Confirm
| Id | Input | Expected |
| --- | --- | --- |
| KD-09a | Set-time playdate; one no, one no answer | `CONFIRM_NEEDS_YES` |
| KD-09b | Set-time playdate; one yes | ok; final time Mon 10–12 |
| KD-09c | Availability playdate; nothing chosen | `CONFIRM_NEEDS_TIME` |
| KD-09d | Availability playdate; chose Dev's pick Mon 9–10 | ok; final time Mon 9–10 |
| KD-09e | Availability playdate (Mon afternoon free); organizer's own range Mon 13:00–14:30 | ok |
| KD-09f | Availability playdate (Mon morning free); organizer's own range Mon 13:00–14:00 | `PICK_OUTSIDE_FREE_SLOT` |
| KD-09g | Cancelled playdate | `PLAYDATE_CANCELLED` |

## KD-10 Edit
| Id | Input | Expected |
| --- | --- | --- |
| KD-10a | Confirmed set-time playdate; start moves to Mon 14:00 | Time change: version 2, delete every answer, clear the final time, status collecting, existing invites labelled New time |
| KD-10b | Mode switched from set time to availability | Time change |
| KD-10c | Availability playdate; a slot added | Time change |
| KD-10d | Confirmed playdate; only the message changes | Status stays confirmed, version stays, answers kept, existing invites labelled Updated |
| KD-10e | Only the place changes | Not a time change; Updated |
| KD-10f | Friends F1, F2 → F1, F3 | Add F3, remove F2; F1's invite labelled Updated; status kept |
| KD-10g | Nothing changes | No change; labels untouched |
| KD-10h | After a time change (version 2), an answer from the old link (version 1) | `STALE_TIME` |
| KD-10i | Same slots in another order | Not a time change |

## KD-11 Everyone's picks
| Id | Input | Expected |
| --- | --- | --- |
| KD-11a | Dev Mon 9–12, Maya Mon 9–12, Aisha Mon 13–14 | 1st: Mon 9–12, Dev, Maya, 2 families, Most picked. 2nd: Mon 13–14, Aisha, 1 family |
| KD-11b | Dev Mon 13–14, Maya Mon 9–10 (one each) | Mon 9–10 first (earliest) and Most picked |
| KD-11c | No picks | No groups |

## KD-12 Majority notice
| Id | Input | Expected |
| --- | --- | --- |
| KD-12a | Dev and Maya pick Mon 9–12; Aisha (text) picks Mon 13–14 | Aisha gets the notice ("the same range" = the Most picked range of KD-11) *(reading)* |
| KD-12b | As KD-12a, Aisha already got it | Nobody |
| KD-12c | One family per range | Nobody |
| KD-12d | As KD-12a but Aisha has Kindred (app) | Nobody (text friends only) |
| KD-12e | Dev, Maya and Aisha (text) all pick Mon 9–12 | Nobody |

## KD-13 Home sections
| Id | Input | Expected |
| --- | --- | --- |
| KD-13a | Collecting set-time playdate, 3 invites, 3 answers | Needs you |
| KD-13b | Collecting availability playdate, 1 pick of 3 | Needs you |
| KD-13c | Confirmed; a friend answered no after confirmation | Needs you ("changed to Can't make it" = a no answered after `confirmed_at`) *(reading)* |
| KD-13d | Confirmed, not over | Upcoming |
| KD-13e | Collecting set-time playdate, 1 of 3 answered | Waiting for answers |
| KD-13f | Confirmed, ended Fri | Not on Home |
| KD-13g | Cancelled | Not on Home |
| KD-13h | Confirmed; the only no came before confirmation | Upcoming |

## KD-14 Links
| Id | Input | Expected |
| --- | --- | --- |
| KD-14a | Set-time Mon 10–12 | Expires Tue 00:00 (end + 12 h) |
| KD-14b | Availability confirmed Mon 9–11 | Expires Mon 23:00 (final end + 12 h) |
| KD-14c | Availability not confirmed; Mon morning and Wed evening free | Expires Thu 07:00 (Wed 19:00 + 12 h) |
| KD-14d | Now = expiry, then one minute before | `LINK_EXPIRED`, then ok |
