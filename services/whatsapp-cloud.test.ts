import { describe, expect, it, vi, beforeEach } from "vitest";
import { sendWhatsAppTextMessage } from "./whatsapp-cloud";

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as Response;
}

describe("sendWhatsAppTextMessage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv("WHATSAPP_CLOUD_API_TOKEN", "test-token");
    vi.stubEnv("WHATSAPP_PHONE_NUMBER_ID", "test-phone-id");
    vi.stubGlobal("fetch", vi.fn());
    vi.useFakeTimers();
  });

  it("sends the message and returns the WhatsApp message id on success", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, { messages: [{ id: "wamid.abc" }] }));

    const result = await sendWhatsAppTextMessage("15550123456", "Hello!");

    expect(result).toEqual({ messageId: "wamid.abc" });
    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toContain("test-phone-id/messages");
    expect(JSON.parse(init!.body as string)).toEqual({
      messaging_product: "whatsapp",
      to: "15550123456",
      type: "text",
      text: { body: "Hello!", preview_url: false },
    });
  });

  it("retries on a 500 server error and succeeds once the API recovers", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse(500, { error: "temporary" }))
      .mockResolvedValueOnce(jsonResponse(200, { messages: [{ id: "wamid.retry" }] }));

    const promise = sendWhatsAppTextMessage("15550123456", "Hello!");
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toEqual({ messageId: "wamid.retry" });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("gives up after 3 attempts if the server keeps failing", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(503, { error: "down" }));

    const promise = sendWhatsAppTextMessage("15550123456", "Hello!");
    const expectation = expect(promise).rejects.toThrow(/server error 503/);
    await vi.runAllTimersAsync();
    await expectation;

    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it("does not retry a 4xx client error (e.g. invalid recipient)", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(400, { error: "invalid phone number" }));

    const promise = sendWhatsAppTextMessage("not-a-number", "Hello!");
    const expectation = expect(promise).rejects.toThrow(/client error 400/);
    await vi.runAllTimersAsync();
    await expectation;

    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("throws clearly if WhatsApp credentials are not configured", async () => {
    vi.stubEnv("WHATSAPP_CLOUD_API_TOKEN", "");
    await expect(sendWhatsAppTextMessage("15550123456", "Hello!")).rejects.toThrow(
      /not configured/
    );
    expect(fetch).not.toHaveBeenCalled();
  });
});
