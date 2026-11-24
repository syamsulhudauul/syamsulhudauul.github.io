import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { config, higgsfield } from "@higgsfield/client/v2";

const credentials = process.env.HF_CREDENTIALS;
if (!credentials) {
  console.error("HF_CREDENTIALS is missing. Set it in the ignored .env.local file.");
  process.exit(1);
}

config({ credentials });

const result = await higgsfield.subscribe(
  "bytedance/seedance-2.5/text-to-video",
  {
    input: {
      prompt: "A cinematic scene at sunset",
      duration: 5,
      resolution: "720p",
      aspect_ratio: "16:9",
    },
    withPolling: true,
  },
);

if (result.status === "completed") {
  if (!result.video?.url) {
    console.error("Generation completed but returned no video URL.");
    process.exit(1);
  }
  console.log(result.video.url);
} else {
  console.error(`Generation ended with status: ${result.status}`);
  process.exit(1);
}
