import { createGeminiClient } from '../../services/geminiServer';

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as {
    profileName?: unknown;
    profileBio?: unknown;
    interests?: unknown;
  };
  const profileName = typeof body.profileName === 'string' ? body.profileName : 'there';
  const profileBio = typeof body.profileBio === 'string' ? body.profileBio : '';
  const interests = Array.isArray(body.interests)
    ? body.interests.filter((item): item is string => typeof item === 'string')
    : [];
  const fallback = [
    `Hey ${profileName}, how's your day going?`,
    'Saw your profile and wanted to say hi!',
    'Hey! What are you up to today?',
  ];

  try {
    const ai = createGeminiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Generate 3 short, catchy icebreaker messages for a user named ${profileName}.\nThe messages should be based on their bio: "${profileBio}" and interests: ${interests.join(', ')}.\nKeep them very short (one sentence), casual, and direct.\nReturn only the 3 messages separated by new lines, no extra numbering or quotes.`,
      config: { temperature: 0.9 },
    });
    const icebreakers = (response.text || '')
      .split('\n')
      .map(line => line.trim().replace(/^["'\d.\-\s]+/, '').replace(/["']+$/, '').trim())
      .filter(Boolean)
      .slice(0, 3);
    return Response.json({ icebreakers: icebreakers.length ? icebreakers : fallback });
  } catch (error) {
    console.error('Server icebreakers error:', error);
    return Response.json({ icebreakers: fallback });
  }
}
