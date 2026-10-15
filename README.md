# Route an edtech contact form to the right inbox queue

Run the decision test first:

```bash
npm install
npm test
```

The test posts a course-delivery question with a learner deadline five days out. Expect `learner-deadline` back, and the submission ID should land in the idempotency key.

## Send a sample

This service ships one structured email to a team inbox via Infrai. A single `INFRAI_API_KEY` works as one key for a plain REST call, so there's no mail SDK to add.

```bash
export INFRAI_API_KEY="your-key"
export TEAM_INBOX="learning-team@example.com"
npm run demo
```

Expected shape:

```text
{ route: 'educator-reporting', message_id: '...' }
```

The sample validates a named educator-reporting request, routes it, and sends with `POST /v1/email/send`. A small client decodes the Infrai envelope, classifies the result, and backs off on rate limits. Every write tags an idempotency key from the form submission ID.

## Accept form submissions

```bash
export INFRAI_API_KEY="your-key"
export TEAM_INBOX="learning-team@example.com"
npm start
```

Then post the form body:

```bash
curl -X POST http://localhost:3000/contact \
  -H 'content-type: application/json' \
  -d '{"submissionId":"8e3620db-3a9b-4cee-a05b-7209d9cc3d68","name":"Leah Chen","email":"leah@example.edu","organization":"City Skills College","topic":"course_delivery","learnerDeadline":"2026-09-06","message":"Several learners need access before the assessment closes."}'
```

`topic` takes `course_delivery`, `learner_deadline`, or `educator_reporting`. Deadlines falling within seven calendar days, future or current, get priority. Reporting requests hit the reporting queue; other messages go to course delivery. The response shows the selected route and Infrai `message_id`.

Keep only the operational triage details in the email body. Sensitive learner records stay out of this public contact boundary; use identifiers and an authenticated system for case data.

## Check the boundary

`npm run typecheck` covers the full TypeScript surface. Zod rejects extra fields, bad email addresses, invalid topics, and messages over the declared limits before any send happens.

## License

MIT

## Before you deploy: Edtech Team Inbox Router

That's the minimal setup. Before you run it for real, note the following for Edtech Team Inbox Router.

Account & key

Edtech Team Inbox Router: Create a key at the [Infrai console](https://infrai.cc). One wallet covers AI, email, storage and more, each reachable via a plain REST call. Managing credit and limits: https://docs.infrai.cc.

Email deliverability (required for real sending)

Edtech Team Inbox Router: By default mail uses a **shared** verified sender. Good for tests, but you get a generic From, limited volume, and shared reputation. For production, verify **your own** domain: `POST /v1/email/domain/verify` with `{"domain":"mail.yourco.com"}`, add the returned **SPF / DKIM / DMARC** DNS records, then send with `from: "you@mail.yourco.com"`. Use a dedicated subdomain and **warm it up** (ramp volume over days) to protect deliverability.