export interface GeminiResult {
  text: string;
}

export interface VerificationResult {
  verified: boolean;
  confidence: number;
  reason: string;
}

/**
 * Request AI chat response proxied via secure backend route.
 * Keeps the Gemini credential safely protected on the server.
 */
export const getGeminiResponse = async (
  userPrompt: string, 
  profileName: string, 
  profileBio: string
): Promise<GeminiResult> => {
  try {
    const res = await fetch("/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: userPrompt,
        profileName,
        profileBio
      })
    });

    if (!res.ok) {
      throw new Error(`Server returned ${res.status}`);
    }

    const data = await res.json();
    return {
      text: data.text || "Hey! Just saw your message. How are you?",
    };
  } catch (error) {
    console.error("Proxied Gemini Chat Error:", error);
    return { 
      text: "Hey! Just saw your message. How are you?"
    };
  }
};

/**
 * Request smart icebreakers proxied via secure backend route.
 */
export const getIcebreakers = async (
  profileName: string,
  profileBio: string,
  interests: string[]
): Promise<string[]> => {
  try {
    const res = await fetch("/api/ai/icebreakers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        profileName,
        profileBio,
        interests
      })
    });

    if (!res.ok) {
      throw new Error(`Server returned ${res.status}`);
    }

    const data = await res.json();
    return data.icebreakers || [
      `Hey ${profileName}, how's your day going?`,
      `Saw your profile and wanted to say hi!`,
      `Hey! What are you up to?`
    ];
  } catch (error) {
    console.error("Proxied Icebreaker Error:", error);
    return [
      `Hey ${profileName}, how's your day going?`,
      `Saw your profile and wanted to say hi!`,
      `Hey! What are you up to?`
    ];
  }
};

/**
 * Request biometric face verification proxied via secure backend route.
 */
export const verifyIdentity = async (
  profileImageBase64: string, 
  selfieImageBase64: string
): Promise<VerificationResult> => {
  try {
    const res = await fetch("/api/ai/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        profileImage: profileImageBase64,
        selfieImage: selfieImageBase64
      })
    });

    if (!res.ok) {
      throw new Error(`Server verification returned ${res.status}`);
    }

    const data = await res.json();
    return {
      verified: Boolean(data.verified),
      confidence: typeof data.confidence === "number" ? data.confidence : 0,
      reason: data.reason || "Identity verification completed."
    };
  } catch (error) {
    console.error("Proxied Verification Error:", error);
    return { 
      verified: false, 
      confidence: 0, 
      reason: "Verification service temporarily unavailable. Please try again." 
    };
  }
};
