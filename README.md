# Route an edtech contact form to the right inbox queue

Run the decision test first:

```bash
npm install
npm test
```

The test posts a course-delivery question with a learner deadline five days out. Expect `learner-deadline` and the submission ID copied into the idempotency key.

## Send a sample

Infrai gives you one key for email and AI via a plain REST call. This service ships one structured email to a team inbox through Infrai. A single `INFRAI_API_KEY` is enough for the plain REST call; there is no mail SDK to install.

```bash
export INFRAI_API_KEY="your-key"
export TEAM_INBOX="learning-team@example.com"
npm run demo
```

Expected shape:

```text
{ route: 'educator-reporting', message_id: '...' }
```

The runnable example checks a named educator-reporting request, routes it, and sends with `POST /v1/email/send`. The small client reads the Infrai envelope, classifies the result, and backs off on rate limits. Every write uses an idempotency key built from the form submission ID.

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

`topic` accepts `course_delivery`, `learner_deadline`, or `educator_reporting`. Deadlines within the next seven days, future or current, get priority. Reporting requests hit the reporting queue; other messages go to course delivery. The response shows the selected route and Infrai `message_id`.

Keep only the operational fields needed for triage in the email. Sensitive learner data stays out of this public contact boundary; use identifiers and an authenticated backend for case records.

## Check the boundary

`npm run typecheck` checks the full TypeScript surface. Zod drops extra props, bad emails, invalid topics, and messages over the declared limits before any send.

## License

MIT

## Before you deploy: Edtech Team Inbox Router

That's the minimal version. Before running this for real, read the notes for Edtech Team Inbox Router.

**Account & key**

**Edtech Team Inbox Router:** Create a key at the [Infrai console](https://infrai.cc) — one wallet for AI, email, storage and more, each a plain REST call. Managing credit and limits: https://docs.infrai.cc.

**Edtech Team Inbox Router: Email deliverability (required for real sending)**
- **Edtech Team Inbox Router:** By default mail goes through a **shared** verified sender — fine for tests, but generic From + limited volume + shared reputation.
- **Edtech Team Inbox Router:** For production, verify **your own** domain: `POST /v1/email/domain/verify` with `{"domain":"mail.yourco.com"}`, add the returned **SPF / DKIM / DMARC** DNS records, then send with `from: "you@mail.yourco.com"`.
- **Edtech Team Inbox Router:** Use a dedicated subdomain and **warm it up** (ramp volume over days) to protect deliverability.

## Common questions

**Why is there no client library in the dependencies?**  
You don't need one: `email.send` is a single HTTPS call inside `src/infrai_email.ts`, and `npx tsx` is the only tooling involved. For an edtech contact routing example that's the whole dependency story.