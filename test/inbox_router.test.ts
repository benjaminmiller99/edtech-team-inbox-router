import assert from "node:assert/strict";
import test from "node:test";
import { contactSchema, routeContact } from "../src/inbox_router.js";

test("a deadline within seven days reaches the learner deadline route", async () => {
  const submission = contactSchema.parse({
    submissionId: "8e3620db-3a9b-4cee-a05b-7209d9cc3d68",
    name: "Leah Chen",
    email: "leah@example.edu",
    organization: "City Skills College",
    topic: "course_delivery",
    learnerDeadline: "2026-09-06",
    message: "Several learners need access before the assessment closes.",
  });

  let capturedSubject = "";
  const result = await routeContact(
    submission,
    "learning-team@example.com",
    new Date("2026-09-01T12:00:00Z"),
    async (email, key) => {
      capturedSubject = email.subject;
      assert.equal(key, `contact-${submission.submissionId}`);
      return { message_id: "msg_test_42" };
    },
  );

  assert.deepEqual(result, { route: "learner-deadline", message_id: "msg_test_42" });
  assert.match(capturedSubject, /^\[learner-deadline\]/);
});
