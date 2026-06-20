const META_API_VERSION = "v20.0";
const META_API_URL = `https://graph.facebook.com/${META_API_VERSION}/${process.env.META_PHONE_NUMBER_ID}/messages`;

/**
 * Send a WhatsApp text message via the Meta Cloud API.
 *
 * Phone format: Meta sends/expects numbers as E.164 digits with no leading "+",
 * e.g. "2348012345678". Incoming webhook payloads use the same format, so no
 * JID-style conversion is needed anywhere in the app.
 */
export async function sendWhatsAppMessage(
  to: string,
  message: string,
): Promise<void> {
  try {
    const res = await fetch(META_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.META_WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: message, preview_url: false },
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error(
        `Meta API error (${res.status}) sending to ${to}:`,
        errBody,
      );
      throw new Error(`Meta API responded with ${res.status}`);
    }
  } catch (error) {
    console.error(`Failed to send message to ${to}:`, error);
    throw error;
  }
}

// Format naira amounts: 14500 → "₦14,500"
export function formatNaira(amount: number): string {
  return `₦${amount.toLocaleString("en-NG")}`;
}

/**
 * Convert a Nigerian number to E.164 format (no leading +) for storage.
 * "08012345678" → "2348012345678"
 * "2348012345678" → "2348012345678" (already correct)
 */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("0")) return "234" + digits.slice(1);
  if (digits.startsWith("234")) return digits;
  return digits;
}
