import "server-only";

import { createGoogleGenerativeAI } from "@ai-sdk/google";

const defaultModelName = "gemini-2.5-flash";

const apiKey = process.env.GEMINI_API_KEY?.trim();

if (!apiKey) {
  throw new Error("GEMINI_API_KEY não foi definida. Configure-a no ambiente do servidor.");
}

export const aiModelName = process.env.AI_MODEL?.trim() || defaultModelName;

export const gemini = createGoogleGenerativeAI({
  apiKey,
});

export const geminiModel = gemini(aiModelName);
