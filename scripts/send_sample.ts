import { randomUUID } from "node:crypto";
import { contactSchema, routeContact } from "../src/inbox_router.js";

const teamInbox = process.env.TEAM_INBOX;
if (!teamInbox) throw new Error("TEAM_INBOX is required");

const submission = contactSchema.parse({
  submissionId: randomUUID(),
  name: "Mina Patel",
  email: "mina@example.edu",
  organization: "Northfield Learning",
  topic: "educator_reporting",
  message: "We need a weekly completion report for our teaching staff.",
});

console.log(await routeContact(submission, teamInbox));
