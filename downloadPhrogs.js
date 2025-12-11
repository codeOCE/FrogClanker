import axios from "axios";
import fs from "fs-extra";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

// Load Pexels API key
const PEXELS_API_KEY = process.env.PEXELS_API_KEY;
if (!PEXELS_API_KEY) {
  console.error("❌ ERROR: Missing PEXELS_API_KEY in .env");
  process.exit(1);
}

const DOWNLOAD_COUNT = 50;        // How many new frogs to download
const SAVE_FOLDER = "./phrogs";   // Save location
const TRACKER_FILE = "./downloaded.json";

// --------------------------------------
// Load or create download tracker
// --------------------------------------
function loadTracker() {
  try {
    return JSON.parse(fs.readFileSync(TRACKER_FILE, "utf8"));
  } catch {
    return { ids: [] };
  }
}

function saveTracker(tracker) {
  fs.writeFileSync(TRACKER_FILE, JSON.stringify(tracker, null, 2));
}

const tracker = loadTracker();

// --------------------------------------
// Download image helper
// --------------------------------------
async function downloadImage(url, filepath) {
  const response = await axios({
    url,
    method: "GET",
    responseType: "stream"
  });

  await new Promise((resolve, reject) => {
    response.data
      .pipe(fs.createWriteStream(filepath))
      .on("finish", resolve)
      .on("error", reject);
  });
}

// --------------------------------------
// Main function
// --------------------------------------
async function downloadFrogs() {
  await fs.ensureDir(SAVE_FOLDER);

  console.log(`🐸 Downloading up to ${DOWNLOAD_COUNT} NEW frog images...`);
  console.log(`📦 Already have ${tracker.ids.length} saved.\n`);

  let newDownloads = 0;
  let page = 1;

  while (newDownloads < DOWNLOAD_COUNT) {
    console.log(`🔎 Searching Pexels page ${page}...`);

    const res = await axios.get("https://api.pexels.com/v1/search", {
      params: {
        query: "frog",
        per_page: 80,
        page
      },
      headers: {
        Authorization: PEXELS_API_KEY
      }
    });

    const photos = res.data.photos;
    if (!photos.length) break;

    for (const photo of photos) {
      if (newDownloads >= DOWNLOAD_COUNT) break;

      const id = photo.id;

      // SKIP if we already downloaded this frog
      if (tracker.ids.includes(id)) {
        console.log(`⏭️ Skipping existing frog ${id}`);
        continue;
      }

      const url = photo.src.large2x;
      const filename = `frog_${id}.jpg`;
      const filepath = path.join(SAVE_FOLDER, filename);

      try {
        await downloadImage(url, filepath);
        tracker.ids.push(id);
        newDownloads++;

        console.log(`✔ Downloaded NEW frog: ${filename}`);
      } catch (err) {
        console.log(`❌ Error downloading ${id}: ${err.message}`);
      }
    }

    page++;
    if (page > 50) break; // failsafe to avoid infinite loops
  }

  saveTracker(tracker);

  console.log(`\n🎉 Done! Downloaded ${newDownloads} new frogs.`);
  console.log(`📊 Total frogs stored: ${tracker.ids.length}`);
}

downloadFrogs();
