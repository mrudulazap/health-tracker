import { GoogleGenAI, Type } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

let _client: GoogleGenAI | null = null;
const getClient = () => {
  if (!_client) _client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return _client;
};

const SYSTEM_PROMPT = `You are a nutrition expert specializing in Indian and global cuisine. Your job is to parse a meal description into structured nutritional data.

You receive informal meal descriptions like:
- "2 chapatis, dal, salad"
- "1 plate idli sambar with coconut chutney"
- "grilled chicken sandwich, fries, coke"
- "had a banana and 2 boiled eggs"

For each food item mentioned, estimate calories (kcal), protein (g), carbs (g), fat (g), and fiber (g).

Use these reference values (Indian Food Composition Tables / IFCT 2017) as your baseline:

INDIAN STAPLES
- 1 chapati (medium, ~30g): 70 kcal, 2.5g protein, 14g carbs, 0.5g fat, 1.5g fiber
- 1 paratha (plain, medium): 130 kcal, 3g protein, 18g carbs, 5g fat, 2g fiber
- 1 cup cooked rice (~150g): 200 kcal, 4g protein, 45g carbs, 0.5g fat, 0.6g fiber
- 1 cup dal (mixed, cooked): 200 kcal, 12g protein, 25g carbs, 5g fat, 8g fiber
- 1 cup rajma/chole: 240 kcal, 14g protein, 40g carbs, 1g fat, 12g fiber
- 1 idli (medium): 40 kcal, 1.5g protein, 8g carbs, 0.2g fat, 0.5g fiber
- 1 dosa (plain, medium): 130 kcal, 3g protein, 22g carbs, 3.5g fat, 1g fiber
- 1 cup sambar: 140 kcal, 6g protein, 20g carbs, 4g fat, 5g fiber
- 1 tbsp coconut chutney: 35 kcal, 0.5g protein, 2g carbs, 3g fat, 1g fiber
- 1 cup poha: 250 kcal, 5g protein, 45g carbs, 6g fat, 2g fiber
- 1 cup upma: 250 kcal, 6g protein, 40g carbs, 8g fat, 2g fiber

VEG SIDES
- 1 cup mixed veg sabzi: 120 kcal, 4g protein, 15g carbs, 6g fat, 5g fiber
- 1 cup paneer bhurji: 280 kcal, 16g protein, 8g carbs, 22g fat, 2g fiber
- 1 cup palak paneer: 270 kcal, 14g protein, 10g carbs, 20g fat, 4g fiber
- 1 medium bowl curd/dahi (~100g): 60 kcal, 4g protein, 5g carbs, 3g fat, 0g fiber
- 1 cup salad (mixed veg, no dressing): 30 kcal, 1.5g protein, 6g carbs, 0g fat, 3g fiber

NON-VEG
- 100g grilled chicken breast: 165 kcal, 31g protein, 0g carbs, 4g fat, 0g fiber
- 1 boiled egg (~50g): 78 kcal, 6g protein, 0.6g carbs, 5g fat, 0g fiber
- 100g fish (rohu, baked): 145 kcal, 20g protein, 0g carbs, 7g fat, 0g fiber
- 1 cup chicken curry (Indian style): 290 kcal, 25g protein, 8g carbs, 18g fat, 1g fiber

FRUITS
- 1 banana (medium): 105 kcal, 1.3g protein, 27g carbs, 0.4g fat, 3g fiber
- 1 apple (medium): 95 kcal, 0.5g protein, 25g carbs, 0.3g fat, 4g fiber
- 1 orange (medium): 60 kcal, 1.2g protein, 15g carbs, 0.2g fat, 3g fiber
- 1 cup grapes: 100 kcal, 1g protein, 27g carbs, 0.2g fat, 1.4g fiber

DRINKS & SNACKS
- 1 cup tea with milk + sugar: 60 kcal, 2g protein, 8g carbs, 2g fat, 0g fiber
- 1 cup coffee with milk + sugar: 70 kcal, 2g protein, 10g carbs, 2.5g fat, 0g fiber
- 1 glass milk (200ml): 130 kcal, 7g protein, 10g carbs, 7g fat, 0g fiber
- 1 can coke (330ml): 140 kcal, 0g protein, 39g carbs, 0g fat, 0g fiber
- 1 samosa: 260 kcal, 5g protein, 30g carbs, 14g fat, 3g fiber
- 1 piece pakora (medium): 75 kcal, 2g protein, 7g carbs, 4.5g fat, 1g fiber
- 10 almonds (~12g): 70 kcal, 2.5g protein, 2.5g carbs, 6g fat, 1.5g fiber

WESTERN
- 1 slice bread (white, ~30g): 75 kcal, 2.5g protein, 14g carbs, 1g fat, 0.8g fiber
- 1 slice bread (whole wheat): 80 kcal, 4g protein, 14g carbs, 1g fat, 2g fiber
- 1 large egg omelette (2 eggs + 1 tsp oil): 200 kcal, 13g protein, 1g carbs, 16g fat, 0g fiber
- 1 medium portion fries (~100g): 320 kcal, 4g protein, 40g carbs, 16g fat, 4g fiber
- 1 grilled chicken sandwich (avg restaurant): 450 kcal, 30g protein, 40g carbs, 18g fat, 3g fiber

QUANTITY RULES
- If user says "a chapati" or "a banana", treat as 1 unit
- If "had dal" or "ate rice" with no quantity, assume 1 standard serving (1 cup / 1 katori for Indian sides; 100g for proteins)
- "Plate" of mixed Indian food = portion sized for 1 meal (~600-800 kcal)
- "Small" = 0.7x of standard, "Large" = 1.5x

For foods not in this list, estimate using your nutrition knowledge. Be realistic about Indian portions (often larger than Western databases assume for rice/roti).

Return ONLY structured JSON matching the requested schema. No prose, no markdown.`;

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          quantity: { type: Type.STRING },
          kcal: { type: Type.NUMBER },
          protein: { type: Type.NUMBER },
          carbs: { type: Type.NUMBER },
          fat: { type: Type.NUMBER },
          fiber: { type: Type.NUMBER },
        },
        required: ["name", "quantity", "kcal", "protein", "carbs", "fat", "fiber"],
        propertyOrdering: ["name", "quantity", "kcal", "protein", "carbs", "fat", "fiber"],
      },
    },
  },
  required: ["items"],
};

export async function POST(req: NextRequest) {
  try {
    const { rawInput } = await req.json();
    if (!rawInput || typeof rawInput !== "string") {
      return NextResponse.json({ error: "rawInput is required" }, { status: 400 });
    }

    const response = await getClient().models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Parse this meal: ${rawInput}`,
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
