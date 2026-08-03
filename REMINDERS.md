# Automatic event reminders

Registrants are emailed on a countdown to the event start:

| Milestone | Firestore key |
| --- | --- |
| 3 days before | `3d` |
| 24 hours before | `24h` |
| 3 hours before | `3h` |
| 1 hour before | `1h` |
| 5 minutes before | `5m` |

Each reminder repeats the access code and/or joining link, so an attendee never has
to dig out the original confirmation.

## What gets a reminder

An event is included when **all** of the following hold:

- its status is `published` (drafts, testing and closed events are skipped),
- it has a start time,
- "Send automatic reminder emails" is ticked in the event builder
  (`remindersEnabled` — events created before this feature existed are opted in).

Within an event, every registration with an email address is mailed, except test
submissions (`isTest`).

## How it runs

`GET|POST /api/cron/reminders` performs one sweep. Cloud Scheduler calls it on a
short interval; the endpoint itself decides what, if anything, is due.

Each sweep:

1. loads published events and resolves each start time in the event's own timezone
   (`timezone`, default `Africa/Lagos`) — a start stored as `2026-03-04T09:30` means
   09:30 in Lagos, not on the server;
2. picks the **most urgent milestone whose moment has passed** — so a late run, an
   outage, or an event created inside the window sends one accurate reminder rather
   than replaying every earlier one;
3. claims that milestone by creating `events/{eventId}/reminders/{key}` — `create()`
   fails if the document exists, so a milestone is mailed exactly once even if two
   sweeps overlap or the scheduler retries;
4. mails registrants in batches of 5, then records the outcome on the claim document
   and writes a `reminder_sent` entry to `activityLogs`.

Nothing is sent inside the final minute before the start: a mail that late cannot
arrive in time to be useful.

The subject and heading are worded from the **actual** time remaining ("starts in
3 days", "starts in 8 minutes"), not from the milestone name, so a sweep that runs a
few minutes late never states the wrong countdown.

## Setup

### 1. Secret

`CRON_SECRET` is a shared secret the scheduler presents. Both `setup-secrets.ps1`
and `setup-secrets.sh` generate and store one, and print it. To create it by hand:

```bash
gcloud secrets create CRON_SECRET --data-file=- --replication-policy=automatic \
  --project=cfg-event-regportal <<< "$(openssl rand -hex 24)"
```

It is already declared in `apphosting.yaml`, so the next deploy picks it up. Without
it the endpoint answers `503` and sends nothing.

For local development, put it in `.env.local`:

```
CRON_SECRET=any-value-you-like
```

### 2. Scheduler job

```bash
gcloud services enable cloudscheduler.googleapis.com --project=cfg-event-regportal

gcloud scheduler jobs create http event-reminders \
  --project=cfg-event-regportal \
  --location=europe-west1 \
  --schedule="*/2 * * * *" \
  --time-zone="Africa/Lagos" \
  --uri="https://<your-app-hosting-domain>/api/cron/reminders" \
  --http-method=GET \
  --headers="X-Cron-Secret=<the CRON_SECRET value>" \
  --attempt-deadline=300s
```

The interval is the resolution of the schedule: at `*/2` the 5-minute reminder lands
within two minutes of the mark. A longer interval is cheaper (the backend runs at
`minInstances: 0`, so each call may cold-start an instance) but blunts the tightest
milestones — at `*/10` the 5-minute reminder can arrive as the event begins.

To change the cadence later:

```bash
gcloud scheduler jobs update http event-reminders \
  --location=europe-west1 --schedule="*/5 * * * *" --project=cfg-event-regportal
```

### 3. Verify

```bash
curl -i -H "X-Cron-Secret: <secret>" https://<domain>/api/cron/reminders
```

A healthy sweep returns `{"ok":true,"checked":N,"dispatched":[...],"skipped":[...]}`.
`dispatched` is empty when nothing is due — that is the normal answer most of the time.

## Operating notes

- **Changing a start time** does not un-send reminders already mailed. Milestones that
  have not yet been claimed are re-timed against the new start automatically. To make
  an already-sent milestone eligible again, delete its document under
  `events/{eventId}/reminders/`.
- **Turning reminders off** mid-flight: untick the box in the event builder. Milestones
  not yet claimed stop; ones already sent stay sent.
- **Auditing**: every send is in the admin Activity Log as `reminder_sent`, with per-run
  counts on `events/{eventId}/reminders/{key}` (`recipients`, `sent`, `failed`).
- **Failures**: a `500` from the endpoint tells Cloud Scheduler to retry, which is safe —
  claimed milestones are never mailed twice. A milestone whose sweep crashes mid-send
  stays claimed with `status: "sending"`; delete that document to allow a re-send.
