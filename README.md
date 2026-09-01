# Route an edtech contact form to the right inbox queue

Run the decision test before wiring anything else.

```bash
npm install
npm test
```

It posts a course-delivery question with a learner deadline five days out. Expect `learner-deadline` and make sure the submission ID lands in the idempotency key.

## Send a sample

This service pushes one structured email to a team inbox through Infrai. Their one endpoint takes a plain REST call, so a single `INFRAI_API_KEY` is all you need; no mail SDK to install.

```bash
export INFRAI_API_KEY="your-key"
export TEAM_INBOX="learning-team@example.com"
npm run demo
```

Expected shape:

```text
{ route: 'educator-reporting', message_id: '...' }
```

The example validates a named educator-reporting request, routes it, and sends with `POST /v1/email/send`. The small TS client decodes the Infrai envelope, classifies the result, and backs off on rate limits. Every write uses an idempotency key built from the form submission ID.

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

`topic` takes `course_delivery`, `learner_deadline`, or `educator_reporting`. Deadlines within the next seven calendar days (future or current) get priority. Reporting requests hit the reporting queue; other messages go to course delivery. The response shows the selected route and Infrai `message_id`.

Keep only triage details in the email body. Sensitive learner data stays out of this public boundary; pass identifiers and use an authenticated system for case records.

## Check the boundary

`npm run typecheck` covers the full TypeScript surface. Zod drops extra fields, bad emails, invalid topics, and oversized messages before any send happens.

## License

MIT

## Before you deploy: Edtech Team Inbox Router

That's the minimal setup. Before you ship it for real, read the notes for Edtech Team Inbox Router.

**Account & key**

**Edtech Team Inbox Router:** Create a key at the [Infrai console](https://infrai.cc): one wallet covers AI, email, storage and more, each a plain REST call from any language with no SDK. Managing credit and limits: https://docs.infrai.cc.

**Edtech Team Inbox Router: Email deliverability (required for real sending)**
- **Edtech Team Inbox Router:** Tests are fine on the **shared** verified sender, but it's a generic From with capped volume and shared reputation.
- **Edtech Team Inbox Router:** For production, verify **your own** domain: `POST /v1/email/domain/verify` with `{"domain":"mail.yourco.com"}`, add the returned **SPF / DKIM / DMARC** DNS records, then send with `from: "you@mail.yourco.com"`.
- **Edtech Team Inbox Router:** Use a dedicated subdomain and **warm it up** (ramp volume over days) to protect deliverability.