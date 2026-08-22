import { createServer } from "node:http";
import { ZodError } from "zod";
import { InfraiError } from "./infrai_email.js";
import { contactSchema, routeContact } from "./inbox_router.js";

const teamInbox = process.env.TEAM_INBOX;
if (!teamInbox) throw new Error("TEAM_INBOX is required");

const port = Number(process.env.PORT ?? 3000);

const server = createServer(async (request, response) => {
  if (request.method !== "POST" || request.url !== "/contact") {
    response.writeHead(404, { "content-type": "application/json" });
    response.end(JSON.stringify({ error: "Route not found" }));
    return;
  }

  try {
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    const submission = contactSchema.parse(JSON.parse(Buffer.concat(chunks).toString("utf8")));
    const result = await routeContact(submission, teamInbox);
    response.writeHead(202, { "content-type": "application/json" });
    response.end(JSON.stringify(result));
  } catch (error) {
    if (error instanceof ZodError || error instanceof SyntaxError) {
      response.writeHead(400, { "content-type": "application/json" });
      response.end(JSON.stringify({ error: "Invalid contact submission" }));
      return;
    }
    if (error instanceof InfraiError) {
      const status = error.status >= 400 && error.status < 500 ? error.status : 502;
      response.writeHead(status, { "content-type": "application/json" });
      response.end(JSON.stringify({ error: error.code, message: error.message }));
      return;
    }
    response.writeHead(500, { "content-type": "application/json" });
    response.end(JSON.stringify({ error: "Contact intake failed" }));
  }
});

server.listen(port, () => {
  console.log(`Contact intake listening on http://localhost:${port}`);
});
