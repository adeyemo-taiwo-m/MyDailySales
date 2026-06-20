import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { routeMessage } from "@/lib/router";
import { sendWhatsAppMessage, normalizePhone } from "@/lib/whatsapp";

/**
 * GET — Meta calls this once when you set the webhook URL in the App Dashboard.
 * It sends hub.mode, hub.verify_token, and hub.challenge as query params.
 * Respond with the raw challenge value if the verify token matches yours.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");
  const verifyToken =
    process.env.META_VERIFY_TOKEN || process.env.META_WEBHOOK_VERIFY_TOKEN;

  if (mode === "subscribe" && token === verifyToken) {
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse("Forbidden", { status: 403 });
}

/**
 * POST — Meta calls this for every incoming message or status update.
 * We verify the payload signature, pull out any text messages, and route them.
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  if (!isValidSignature(req, rawBody)) {
    console.error("[Webhook] Invalid signature — rejecting payload");
    return new NextResponse("Invalid signature", { status: 401 });
  }

  const body = JSON.parse(rawBody);

  try {
    const entry = body.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    const messages = value?.messages;

    if (messages && messages.length > 0) {
      for (const msg of messages) {
        const from = normalizePhone(msg.from);
        const text = extractText(msg);

        if (!text) {
          // Non-text message (image, voice note, sticker, location, etc.)
          await sendWhatsAppMessage(
            from,
            `Hi! I can only read text messages.\n\nType *help* to see what I can do.`,
          );
          continue;
        }

        console.log(`[Webhook] Message from ${from}: ${text.substring(0, 50)}`);

        try {
          await routeMessage(from, text);
        } catch (err) {
          console.error(`[Webhook] Error processing message from ${from}:`, err);
        }
      }
    }
  } catch (error) {
    console.error("[Webhook] Error parsing payload:", error);
  }

  // Meta expects a fast 200 response — it will retry the webhook if you're slow
  // or return an error status, which can cause duplicate message delivery.
  return new NextResponse("OK", { status: 200 });
}

/**
 * Extract plain text from any Meta message type. Returns null for media
 * messages (image/audio/video/sticker/location) so the caller can send a
 * "text only" reply.
 */
function extractText(msg: any): string | null {
  if (msg.type === "text") return msg.text?.body || null;
  if (msg.type === "button") return msg.button?.text || null;
  if (msg.type === "interactive") {
    return (
      msg.interactive?.button_reply?.title ||
      msg.interactive?.list_reply?.title ||
      null
    );
  }
  return null;
}

/**
 * Verify the X-Hub-Signature-256 header Meta attaches to every webhook POST,
 * so random requests can't be forged to look like they came from Meta.
 */
function isValidSignature(req: NextRequest, rawBody: string): boolean {
  const signature = req.headers.get("x-hub-signature-256");
  const appSecret = process.env.META_APP_SECRET;
  if (!signature || !appSecret) return false;

  const expected =
    "sha256=" +
    crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");

  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length) return false;

  return crypto.timingSafeEqual(sigBuf, expBuf);
}
