import { GoogleGenAI, Type } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

let _client: GoogleGenAI | null = null;
const getClient = () => {
  if (!_client) _client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return _client;
};

const SYSTEM_PROMPT = `You are a fitness expert. Parse informal workout descriptions into structured data.

You receive descriptions like:
- "30 min brisk walk"
- "1 hour yoga"
- "20 min HIIT, 15 min stretching"
- "ran 5km in 30 min"
- "45 min weight training"

For each activity, classify into one of these kinds:
- "walking" (any walking, hiking)
- "running" (jogging, running, sprinting)
- "cycling" (bicycle, spin class)
- "yoga" (yoga, pilates, stretching)
- "strength" (weight training, gym, lifting, resistance)
- "hiit" (HIIT, tabata, circuit training, crossfit)
- "other" (anything else: swimming, dance, sports, etc.)

For each activity, also extract the duration in minutes. If the user says "ran 5km in 30 min", use 30 minutes. If they say "ran 5km" with no duration, estimate from typical pace (5km ≈ 30 min).

Return ONLY structured JSON. No prose, no markdown.`;

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    activities: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          kind: {
            type: Type.STRING,
            enum: ["walking", "running", "cycling", "yoga", "strength", "hiit", "other"],
          },
          description: { type: Type.STRING },
          durationMin: { type: Type.NUMBER },
        },
        required: ["kind", "description", "durationMin"],
        propertyOrdering: ["kind", "description", "durationMin"],
      },
    },
  },
  required: ["activities"],
};

export async function POST(req: NextRequest) {
  try {
    const { rawInput } = await req.json();
    if (!rawInput || typeof rawInput !== "string") {
      return NextResponse.json({ error: "rawInput is required" }, { status: 400 });
    }

    const response = await getClient().models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Parse this workout: ${rawInput}`,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0.2,
      },
    });

    const text = response.text;
    if (!text) {
      return NextResponse.json({ error: "no response from Gemini" }, { status: 500 });
    }
    return NextResponse.json(JSON.parse(text));
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "unknown error" },
      { status: 500 },
    );
  }
}
