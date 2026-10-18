import { GoogleGenAI } from "@google/genai";

let aiClient: GoogleGenAI | null = null;
function getAI() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY || "";
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { prompt, profileName, profileBio } = req.body || {};
    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction: `You are simulating a conversation on a social networking app named Slyd. 
You are acting as ${profileName || "a friendly user"}. Your bio is: "${profileBio || "Just exploring"}". 
Keep responses short, casual, and friendly. 
Use texting slang appropriately but don't overdo it. 
Max 2 sentences per reply.`,
        temperature: 0.8
      }
    });

    const text = response.text || "Hey! Just caught your message. How are you doing?";
    return res.status(200).json({ text });
  } catch (err: any) {
    console.error("Server AI chat error:", err);
    return res.status(200).json({
      text: "Hey! Just caught your message. How are you doing?"
    });
  }
}
