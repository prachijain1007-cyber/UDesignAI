import "@testing-library/jest-dom/vitest";

process.env.ADMIN_JWT_SECRET ??= "test-secret-do-not-use-in-production";
process.env.OPENAI_API_KEY ??= "sk-test-key";
process.env.WHATSAPP_CLOUD_API_TOKEN ??= "test-whatsapp-token";
process.env.WHATSAPP_PHONE_NUMBER_ID ??= "test-phone-id";
process.env.WHATSAPP_APP_SECRET ??= "test-app-secret";
process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN ??= "test-verify-token";
