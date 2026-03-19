import { NextResponse } from "next/server";
import { z } from "zod";

const WaitlistSchema = z.object({ email: z.string().email().max(254) });

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = WaitlistSchema.safeParse(body);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? "Invalid email";
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    // Structured for future backend: wire to Buttondown, Resend, etc.
    // For now, accept and return success. No persistence.
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400 }
    );
  }
}
