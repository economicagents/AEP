export async function verifyTurnstileToken(
  secret: string,
  token: string
): Promise<boolean> {
  const body = new URLSearchParams();
  body.set("secret", secret);
  body.set("response", token);
  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    signal: AbortSignal.timeout(15_000),
  });
  const data = (await res.json()) as { success?: boolean };
  return data.success === true;
}
