#!/usr/bin/env node
/**
 * Downloads Hebrew fonts for video subtitle rendering.
 * Runs during `npm run build` (postinstall) so fonts are
 * bundled with the Vercel deployment.
 */
const fs = require("fs");
const path = require("path");
const https = require("https");

const FONT_DIR = path.join(__dirname, "..", "public", "fonts");

const FONTS = [
  {
    filename: "Heebo-Bold.ttf",
    urls: [
      "https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/heebo/static/Heebo-Bold.ttf",
      "https://raw.githubusercontent.com/google/fonts/main/ofl/heebo/static/Heebo-Bold.ttf",
      "https://fonts.gstatic.com/s/heebo/v26/NGS6v5_NC0k9P9H0TbFhsqMA.ttf",
    ],
  },
];

function download(url) {
  return new Promise((resolve, reject) => {
    const request = (u, redirects = 0) => {
      if (redirects > 5) return reject(new Error("Too many redirects"));
      https
        .get(u, { timeout: 15000 }, (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            return request(res.headers.location, redirects + 1);
          }
          if (res.statusCode !== 200) {
            res.resume();
            return reject(new Error(`HTTP ${res.statusCode}`));
          }
          const chunks = [];
          res.on("data", (c) => chunks.push(c));
          res.on("end", () => resolve(Buffer.concat(chunks)));
          res.on("error", reject);
        })
        .on("error", reject);
    };
    request(url);
  });
}

async function main() {
  fs.mkdirSync(FONT_DIR, { recursive: true });

  for (const font of FONTS) {
    const dest = path.join(FONT_DIR, font.filename);

    // Skip if already downloaded
    if (fs.existsSync(dest) && fs.statSync(dest).size > 5000) {
      console.log(`[fonts] ${font.filename} already exists (${fs.statSync(dest).size} bytes)`);
      continue;
    }

    let downloaded = false;
    for (const url of font.urls) {
      try {
        console.log(`[fonts] Downloading ${font.filename} from ${new URL(url).hostname}...`);
        const buf = await download(url);
        if (buf.length < 5000) {
          console.warn(`[fonts] File too small (${buf.length} bytes), trying next URL...`);
          continue;
        }
        fs.writeFileSync(dest, buf);
        console.log(`[fonts] OK: ${font.filename} (${buf.length} bytes)`);
        downloaded = true;
        break;
      } catch (e) {
        console.warn(`[fonts] Failed from ${new URL(url).hostname}: ${e.message}`);
      }
    }

    if (!downloaded) {
      console.error(`[fonts] WARNING: Could not download ${font.filename} from any source`);
    }
  }
}

main().catch((e) => {
  console.error("[fonts] Script error:", e.message);
  // Don't fail the build if fonts can't be downloaded
  process.exit(0);
});
