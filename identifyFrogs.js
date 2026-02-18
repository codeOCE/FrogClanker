import axios from "axios";
import fs from "fs-extra";
import dotenv from "dotenv";

dotenv.config();

const PEXELS_API_KEY = process.env.PEXELS_API_KEY;
if (!PEXELS_API_KEY) {
  console.error("❌ ERROR: Missing PEXELS_API_KEY in .env");
  process.exit(1);
}

const TRACKER_FILE = "./downloaded.json";
const METADATA_FILE = "./phrog_metadata.json";

async function identifyFrogs() {
  let tracker;
  try {
    tracker = await fs.readJson(TRACKER_FILE);
  } catch (err) {
    console.error("❌ ERROR: Could not read downloaded.json");
    return;
  }

  let metadata = {};
  if (await fs.pathExists(METADATA_FILE)) {
    metadata = await fs.readJson(METADATA_FILE);
  }

  console.log(`🔎 Identifying ${tracker.ids.length} frogs...`);

  for (const id of tracker.ids) {
    if (metadata[id]) {
      // Skip already identified frogs
      continue;
    }

    console.log(`Fetching metadata for photo ID: ${id}`);
    try {
      const res = await axios.get(`https://api.pexels.com/v1/photos/${id}`, {
        headers: {
          Authorization: PEXELS_API_KEY
        }
      });

      const photo = res.data;
      metadata[id] = {
        id: photo.id,
        description: photo.alt || "A beautiful frog",
        url: photo.url,
        photographer: photo.photographer
      };

      // Save every 20 to be safe
      if (Object.keys(metadata).length % 20 === 0) {
        await fs.writeJson(METADATA_FILE, metadata, { spaces: 2 });
      }

      // Reduce sleep time for faster processing (Pexels allows 200 requests/min)
      await new Promise(r => setTimeout(r, 100));

    } catch (err) {
      console.error(`❌ Error fetching ${id}: ${err.message}`);
    }
  }

  await fs.writeJson(METADATA_FILE, metadata, { spaces: 2 });
  console.log(`✅ Identification complete. Metadata saved to ${METADATA_FILE}`);
}

identifyFrogs();
