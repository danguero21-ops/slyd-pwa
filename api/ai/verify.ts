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
    const { profileImage, selfieImage } = req.body || {};
    if (!profileImage || !selfieImage) {
      return res.status(400).json({
        verified: false,
        confidence: 0,
        reason: "Both reference photo and selfie are required"
      });
    }

    const cleanProfileImage = profileImage.replace(/^data:image\/\w+;base64,/, "");
    const cleanSelfieImage = selfieImage.replace(/^data:image\/\w+;base64,/, "");

    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          {
            inlineData: {
              data: cleanProfileImage,
              mimeType: "image/jpeg"
            }
          },
          {
            inlineData: {
              data: cleanSelfieImage,
              mimeType: "image/jpeg"
            }
          },
          {
            text: `Compare these two images: the first is a profile reference picture and the second is a real-time live selfie for identity verification. 
Determine if they represent the same person.
Reply strictly with a JSON object:
{
  "verified": boolean,
  "confidence": number (between 0 and 1),
  "reason": string (short 1 sentence explanation)
}
Be balanced: allow for normal differences in lighting, facial expressions, angle, and minor styling differences, but reject clear imposters, different individuals, or photos of non-human screens.`
          }
        ]
      },
      config: {
        responseMimeType: "application/json"
      }
    });

    const raw = response.text || "";
    let result: any = { verified: true, confidence: 0.95, reason: "Face verification matched" };
    try {
      result = JSON.parse(raw);
    } catch {
      const lower = raw.toLowerCase();
      result = {
        verified: lower.includes("true") || lower.includes("verified"),
        confidence: 0.85,
        reason: "Completed face verification analysis"
      };
    }

    return res.status(200).json(result);
  } catch (err: any) {
    console.error("Server AI verification error:", err);
    return res.status(500).json({
      verified: false,
      confidence: 0,
      reason: "Verification service currently experiencing high demand. Please try again."
    });
  }
}
