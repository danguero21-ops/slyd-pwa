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
    const { profileName, profileBio, interests } = req.body || {};
    const ai = getAI();

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Generate 3 short, catchy icebreaker messages for a user named ${profileName || "a match"}. 
The messages should be based on their bio: "${profileBio || ""}" and interests: ${(interests || []).join(", ")}.
Keep them very short (one sentence), casual, and direct. 
Return only the 3 messages separated by new lines, no extra numbering or quotes.`,
      config: {
        temperature: 0.9
      }
    });

    const text = response.text || "";
    const icebreakers = text
      .split("\n")
      .map((line: string) =>
        line
          .trim()
          .replace(/^["'\d\.\-\s]+/, "")
          .replace(/["']+$/, "")
          .trim()
      )
      .filter((line: string) => line.length > 0)
      .slice(0, 3);

    return res.status(200).json({
      icebreakers:
        icebreakers.length > 0
          ? icebreakers
          : [
              `Hey ${profileName || "there"}, how's your day going?`,
              "Saw your profile and wanted to say hi!",
              "Hey! What are you up to today?"
            ]
    });
  } catch (err: any) {
    console.error("Server icebreakers error:", err);
    return res.status(200).json({
      icebreakers: [
        `Hey ${req.body?.profileName || "there"}, how's your day going?`,
        "Saw your profile and wanted to say hi!",
        "Hey! What are you up to today?"
      ]
    });
  }
}
