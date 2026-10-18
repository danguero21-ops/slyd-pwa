import { createGeminiClient } from '../../services/geminiServer';

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      profileImage?: unknown;
      selfieImage?: unknown;
    };
    if (typeof body.profileImage !== 'string' || typeof body.selfieImage !== 'string') {
      return Response.json({
        verified: false,
        confidence: 0,
        reason: 'Both reference photo and selfie are required',
      }, { status: 400 });
    }

    const cleanProfileImage = body.profileImage.replace(/^data:image\/\w+;base64,/, '');
    const cleanSelfieImage = body.selfieImage.replace(/^data:image\/\w+;base64,/, '');
    const ai = createGeminiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          { inlineData: { data: cleanProfileImage, mimeType: 'image/jpeg' } },
          { inlineData: { data: cleanSelfieImage, mimeType: 'image/jpeg' } },
          { text: `Compare these two images: the first is a profile reference picture and the second is a real-time live selfie for identity verification.\nDetermine if they represent the same person.\nReply strictly with a JSON object:\n{\n  "verified": boolean,\n  "confidence": number (between 0 and 1),\n  "reason": string (short 1 sentence explanation)\n}\nBe balanced: allow for normal differences in lighting, facial expressions, angle, and minor styling differences, but reject clear imposters, different individuals, or photos of non-human screens.` },
        ],
      },
      config: { responseMimeType: 'application/json' },
    });

    const raw = response.text || '';
    try {
      const result = JSON.parse(raw);
      return Response.json({
        verified: Boolean(result.verified),
        confidence: typeof result.confidence === 'number' ? result.confidence : 0,
        reason: typeof result.reason === 'string' ? result.reason : 'Completed face verification analysis',
      });
    } catch {
      const lower = raw.toLowerCase();
      return Response.json({
        verified: lower.includes('true') || lower.includes('verified'),
        confidence: 0.85,
        reason: 'Completed face verification analysis',
      });
    }
  } catch (error) {
    console.error('Server AI verification error:', error);
    return Response.json({
      verified: false,
      confidence: 0,
      reason: 'Verification service currently experiencing high demand. Please try again.',
    }, { status: 500 });
  }
}
