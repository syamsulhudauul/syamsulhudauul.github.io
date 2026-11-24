import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { mkdir, writeFile } from "node:fs/promises";

dotenv.config({ path: ".env.local" });

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error("GEMINI_API_KEY is missing from .env.local");
}

const ai = new GoogleGenAI({ apiKey });
const candidates = [
  {
    filename: "umkm-workflow-hero.png",
    prompt: "Create an original polished editorial website hero illustration, wide landscape 3:2 composition, warm ivory background, Indonesian small business owner in a contemporary neighborhood shop reviewing a simple order workflow on a tablet, subtle friendly abstract assistant shapes, premium art direction, natural warm daylight, restrained emerald and amber palette, tactile paper and soft 3D forms, clear negative space on left for headline, no text, no logos, no fabricated metrics, no interface screenshots.",
  },
  {
    filename: "enterprise-systems-hero.png",
    prompt: "Create an original polished editorial website hero illustration, wide landscape 3:2 composition, Indonesian enterprise engineering team collaborating around a large display with abstract connected service architecture and data flows, sophisticated modern office, premium cinematic lighting, deep navy and teal with restrained amber accents, clear negative space on left for headline, no readable text, no logos, no fabricated dashboards or metrics.",
  },
];

await mkdir("assets/generated", { recursive: true });
for (const candidate of candidates) {
  const response = await ai.models.generateContent({
    model: "gemini-3.1-flash-lite-image",
    contents: candidate.prompt,
    config: { responseModalities: ["IMAGE"] },
  });
  const image = response.candidates?.[0]?.content?.parts?.find((part) => part.inlineData);
  if (!image?.inlineData?.data) {
    throw new Error(`No image returned for ${candidate.filename}`);
  }
  await writeFile(`assets/generated/${candidate.filename}`, Buffer.from(image.inlineData.data, "base64"));
  console.log(`Saved assets/generated/${candidate.filename}`);
}
