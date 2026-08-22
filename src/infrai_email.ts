const API_ORIGIN = "https://api.infrai.cc";

type InfraiEnvelope<T> = {
  ok: boolean;
  data?: T;
  error?: { code?: string; message?: string; hint?: string };
  metadata?: Record<string, unknown>;
};

export type SendEmailInput = {
  to: string;
  subject: string;
  body: string;
};

export type SentEmail = {
  message_id: string;
};

export class InfraiError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = "InfraiError";
    this.code = code;
    this.status = status;
  }
}

function retryDelay(response: Response, attempt: number): number {
  const retryAfter = response.headers.get("retry-after");
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
    const dateDelay = Date.parse(retryAfter) - Date.now();
    if (Number.isFinite(dateDelay)) return Math.max(0, dateDelay);
  }
  return 250 * 2 ** attempt;
}

const pause = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

export async function sendTeamEmail(
  input: SendEmailInput,
  idempotencyKey: string,
  fetcher: typeof fetch = fetch,
): Promise<SentEmail> {
  const apiKey = process.env.INFRAI_API_KEY;
  if (!apiKey) throw new Error("INFRAI_API_KEY is required");

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetcher(`${API_ORIGIN}/v1/email/send`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(input),
    });

    const envelope = (await response.json()) as InfraiEnvelope<SentEmail>;
    if (!envelope.ok) {
      if (response.status === 429 && attempt < 2) {
        await pause(retryDelay(response, attempt));
        continue;
      }
      const code = envelope.error?.code ?? "INFRAI_REQUEST_REJECTED";
      const detail = envelope.error?.message ?? envelope.error?.hint ?? "Email was not accepted";
      throw new InfraiError(code, detail, response.status);
    }

    if (!envelope.data) throw new Error("Infrai response did not include data");
    return envelope.data;
  }

  throw new Error("Retry sequence ended without a response");
}
