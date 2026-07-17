const GRAPH_API_VERSION = "v21.0";

function getConfig() {
  const token = process.env.WHATSAPP_CLOUD_API_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) {
    throw new Error("WhatsApp Cloud API is not configured (missing token or phone number id)");
  }
  return { token, phoneNumberId };
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callGraphAPI(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const { token, phoneNumberId } = getConfig();
  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages`;

  const maxAttempts = 3;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        return (await response.json()) as Record<string, unknown>;
      }

      // Don't retry client errors (bad request, invalid token, etc.)
      if (response.status >= 400 && response.status < 500) {
        const errorBody = await response.text();
        throw new Error(`WhatsApp API client error ${response.status}: ${errorBody}`);
      }

      lastError = new Error(`WhatsApp API server error ${response.status}`);
    } catch (error) {
      lastError = error;
    }

    if (attempt < maxAttempts) {
      await sleep(500 * 2 ** (attempt - 1));
    }
  }

  throw lastError instanceof Error ? lastError : new Error("WhatsApp API request failed");
}

export async function sendWhatsAppTextMessage(
  to: string,
  body: string
): Promise<{ messageId: string }> {
  const result = await callGraphAPI({
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body, preview_url: false },
  });

  const messages = result.messages as Array<{ id: string }> | undefined;
  const messageId = messages?.[0]?.id;
  if (!messageId) throw new Error("WhatsApp API response did not include a message id");

  return { messageId };
}

export async function markWhatsAppMessageAsRead(messageId: string): Promise<void> {
  await callGraphAPI({
    messaging_product: "whatsapp",
    status: "read",
    message_id: messageId,
  });
}
