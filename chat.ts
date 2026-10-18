import { createGeminiClient } from '../../services/geminiServer';

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      prompt?: unknown;
      profileName?: unknown;
      profileBio?: unknown;
    };
    if (typeof body.prompt !== 'string' || !body.prompt.trim()) {
      return Response.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const ai = createGeminiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: body.prompt,
      config: {
        systemInstruction: `You are simulating a conversation on a social networking app named Slyd.\nYou are acting as ${typeof body.profileName === 'string' ? body.profileName : 'a friendly user'}. Your bio is: "${typeof body.profileBio === 'string' ? body.profileBio : 'Just exploring'}".\nKeep responses short, casual, and friendly.\nUse texting slang appropriately but don't overdo it.\nMax 2 sentences per reply.`,
        temperature: 0.8,
      },
    });

    return Response.json({ text: response.text || 'Hey! Just caught your message. How are you doing?' });
  } catch (error) {
    console.error('Server AI chat error:', error);
    return Response.json({ text: 'Hey! Just caught your message. How are you doing?' });
  }
}
