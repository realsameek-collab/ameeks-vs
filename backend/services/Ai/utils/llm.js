import { ChatGoogleGenAI } from "@langchain/google-genai";
const llm = new ChatGoogleGenAI({
  model: "gemini-2.5-flash", 
  temperature: 0,
  maxOutputTokens: 1024, 
  apiKey: process.env.GOOGLE_API_KEY, 
});
 
export default llm 

