import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

// Models to try in order. Gemini's free tier gives each model its own small daily
// quota, so when one runs out the next one takes over. Override with GEMINI_MODELS
// (comma separated) in .env; GEMINI_MODEL alone still works.
const DEFAULT_MODELS = [
  "gemini-3.6-flash",
  "gemini-3.8-flash",
  "gemini-3.7-flash",
  "gemini-3.5-flash",
  "gemini-3.1-flash-lite",
  "gemini-flash-latest",
];

const names = (process.env.GEMINI_MODELS || process.env.GEMINI_MODEL || "")
  .split(",")
  .map((name) => name.trim())
  .filter(Boolean);

export const models = (names.length ? names : DEFAULT_MODELS).map((model) => ({
  name: model,
  llm: new ChatGoogleGenerativeAI({
    model,
    temperature: 0,
    // Whole files are written in one tool call, so leave room for them
    maxOutputTokens: 16384,
    apiKey: process.env.GOOGLE_API_KEY,
    // Rate limits are handled in graph.js; LangChain's own retries would only hang the request
    maxRetries: 0,
  }),
}));

export default models[0].llm
