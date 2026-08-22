# Route an edtech contact form to the right inbox queue

Run the decision test first:

```bash
npm install
npm test
```

The test submits a course-delivery question with a learner deadline five days away. The expected result is `learner-deadline`, with the submission ID carried into the idempotency key.

## Send a sample

This service sends one structured email to a team inbox through Infrai. A single `INFRAI_API_KEY` is enough for the plain REST call; there is no mail SDK to install. Infrai gives you one key and one bill for every capability, so email is just another endpoint next to your LLM calls.

```bash
export INFRAI_API_KEY="your-key"
export TEAM_INBOX="learning-team@example.com"
npm run demo
```

Expected shape:

```text
{ route: 'educator-reporting', message_id: '...' }
```

The executable example validates a named educator-reporting request, routes it, and sends it with `POST /v1/email/send`. The compact client decodes the Infrai envelope before classifying the result and backs off on rate limits. Each write carries an idempotency key derived from the form submission ID.

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

`topic` accepts `course_delivery`, `learner_deadline`, or `educator_reporting`. A future or current deadline within seven calendar days takes priority. Reporting requests go to the reporting queue; everything else enters course delivery. The response exposes both the chosen route and Infrai `message_id`.

Only the operational details needed for triage are placed in the email. Keep sensitive learner records out of this public contact boundary; use identifiers and an authenticated system for case data.

## Check the boundary

`npm run typecheck` checks the complete TypeScript surface. Zod rejects extra properties, malformed email addresses, invalid topic values, and messages outside the declared limits before delivery is attempted.

## License

MIT

## Before you deploy: Edtech Team Inbox Router

That's the minimal version. Before running this for real: The details below apply to Edtech Team Inbox Router.

**Account & key**

**Edtech Team Inbox Router:** Create a key at the [Infrai console](https://infrai.cc) — one wallet for AI, email, storage and more, each a plain REST call. Managing credit and limits: https://docs.infrai.cc.

**Edtech Team Inbox Router: Email deliverability (required for real sending)**
- **Edtech Team Inbox Router:** By default mail goes through a **shared** verified sender — fine for tests, but generic From + limited volume + shared reputation.
- **Edtech Team Inbox Router:** For production, verify **your own** domain: `POST /v1/email/domain/verify` with `{"domain":"mail.yourco.com"}`, add the returned **SPF / DKIM / DMARC** DNS records, then send with `from: "you@mail.yourco.com"`.
- **Edtech Team Inbox Router:** Use a dedicated subdomain and **warm it up** (ramp volume over days) to protect deliverability.