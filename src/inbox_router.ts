import { z } from "zod";
import { sendTeamEmail, type SendEmailInput, type SentEmail } from "./infrai_email.js";

export const contactSchema = z.object({
  submissionId: z.string().uuid(),
  name: z.string().trim().min(1).max(100),
  email: z.string().email(),
  organization: z.string().trim().min(1).max(160),
  topic: z.enum(["course_delivery", "learner_deadline", "educator_reporting"]),
  message: z.string().trim().min(10).max(3000),
  learnerDeadline: z.string().date().optional(),
}).strict();

export type ContactSubmission = z.infer<typeof contactSchema>;
export type InboxRoute = "course-delivery" | "learner-deadline" | "educator-reporting";

export function chooseInboxRoute(
  submission: ContactSubmission,
  today = new Date(),
): InboxRoute {
  if (submission.learnerDeadline) {
    const deadline = new Date(`${submission.learnerDeadline}T00:00:00Z`);
    const daysRemaining = Math.ceil((deadline.getTime() - today.getTime()) / 86_400_000);
    if (daysRemaining >= 0 && daysRemaining <= 7) return "learner-deadline";
  }
  if (submission.topic === "educator_reporting") return "educator-reporting";
  return "course-delivery";
}

export function buildInboxEmail(
  submission: ContactSubmission,
  teamInbox: string,
  today = new Date(),
): SendEmailInput & { route: InboxRoute } {
  const route = chooseInboxRoute(submission, today);
  const deadline = submission.learnerDeadline ?? "not supplied";
  return {
    route,
    to: teamInbox,
    subject: `[${route}] ${submission.organization}: ${submission.name}`,
    body: [
      `Contact: ${submission.name} <${submission.email}>`,
      `Organization: ${submission.organization}`,
      `Learner deadline: ${deadline}`,
      "",
      submission.message,
    ].join("\n"),
  };
}

export async function routeContact(
  submission: ContactSubmission,
  teamInbox: string,
  today = new Date(),
  sender: (input: SendEmailInput, key: string) => Promise<SentEmail> = sendTeamEmail,
) {
  const { route, ...email } = buildInboxEmail(submission, teamInbox, today);
  const sent = await sender(email, `contact-${submission.submissionId}`);
  return { route, message_id: sent.message_id };
}
