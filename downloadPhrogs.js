import axios from "axios";
import fs from "fs-extra";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

// INSERT YOUR PEXELS API KEY HERE
const PEXELS_API_KEY = process.env.PEXELS_API_KEY; 

// How many frog images you want to download
const DOWNLOAD_COUNT = 200;

// Folder where images will be saved
const SAVE_FOLDER = "./phrogs";

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

async function downloadFrogs() {
  await fs.ensureDir(SAVE_FOLDER);

  console.log(`Downloading ${DOWNLOAD_COUNT} frog images...`);

  let page = 1;
  let downloaded = 0;

  while (downloaded < DOWNLOAD_COUNT) {
    const res = await axios.get("https://api.pexels.com/v1/search", {
      params: {
        query: "frog",
        per_page: 80,  // max allowed
        page
      },
      headers: {
        Authorization: PEXELS_API_KEY
      }
    });

    const photos = res.data.photos;

    if (!photos.length) {
      console.log("No more photos available.");
      break;
    }

    for (const photo of photos) {
      if (downloaded >= DOWNLOAD_COUNT) break;

      const url = photo.src.large2x; // High-quality download
      const filename = `frog_${photo.id}.jpg`;
      const filepath = path.join(SAVE_FOLDER, filename);

      try {
        await downloadImage(url, filepath);
        console.log(`Downloaded: ${filename}`);
        downloaded++;
      } catch (err) {
        console.log("Error downloading image:", err.message);
      }
    }

    page++;
  }

  console.log("Done! All frog images downloaded 🐸💚");
}

downloadFrogs();

