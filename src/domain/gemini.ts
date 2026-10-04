import type { KcalRange } from '../db/types';

/**
 * Optional meal estimate via the Gemini API free tier (SPEC §11). The key is
 * the user's own, stored on-device, sent only to Google. Always returns a range.
 */
export interface MealEstimate extends KcalRange {
  components: string[];
}

const PROMPT = `You estimate calories for one meal for a climber's food log.
Return a realistic kcal RANGE (low and high), never a single number. The range
should reflect genuine uncertainty in portion size — typically ±15–25%.
List the main components in a few words each. No advice, no judgement.`;

export async function estimateMeal(opts: {
  key: string;
  model: string;
  text?: string;
  imageJpegBase64?: string;
}): Promise<MealEstimate> {
  const parts: unknown[] = [{ text: `${PROMPT}\n\nMeal: ${opts.text?.trim() || '(see photo)'}` }];
  if (opts.imageJpegBase64) parts.push({ inline_data: { mime_type: 'image/jpeg', data: opts.imageJpegBase64 } });

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(opts.model)}:generateContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': opts.key },
      body: JSON.stringify({
        contents: [{ role: 'user', parts }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              low: { type: 'INTEGER' },
              high: { type: 'INTEGER' },
              components: { type: 'ARRAY', items: { type: 'STRING' } },
            },
            required: ['low', 'high', 'components'],
          },
        },
      }),
    },
  );
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 160)}`);
  const json: unknown = await res.json();
  return parseEstimate(json);
}

export function parseEstimate(json: unknown): MealEstimate {
  const text = (json as { candidates?: { content?: { parts?: { text?: string }[] } }[] })?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('No estimate in response');
  const o = JSON.parse(text) as { low?: unknown; high?: unknown; components?: unknown };
  const low = Number(o.low);
  const high = Number(o.high);
  if (!Number.isFinite(low) || !Number.isFinite(high) || low <= 0) throw new Error('Unreadable estimate');
  const lo = Math.round(Math.min(low, high));
  let hi = Math.round(Math.max(low, high));
  // A range, never a point value.
  if (hi === lo) hi = Math.round(lo * 1.2);
  const components = Array.isArray(o.components) ? o.components.map(String).slice(0, 8) : [];
  return { low: lo, high: hi, components };
}

/** Downscale a photo to a small JPEG before sending. */
export async function fileToJpegBase64(file: File, maxSide = 768): Promise<string> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext('2d')?.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  const url = canvas.toDataURL('image/jpeg', 0.8);
  return url.slice(url.indexOf(',') + 1);
}
