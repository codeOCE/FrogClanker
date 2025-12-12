import fs from "fs";
import path from "path";
import sharp from "sharp";

const BASE_DIR = "./frogquiz";
const VALID_EXT = new Set([".png", ".jpg", ".jpeg", ".webp", ".avif"]);

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function getExistingMaxIndex(folder) {
  if (!fs.existsSync(folder)) return 0;

  const files = fs.readdirSync(folder);
  let max = 0;

  for (const file of files) {
    const match = file.match(/^img(\d+)\.jpg$/i);
    if (match) {
      const n = parseInt(match[1], 10);
      if (n > max) max = n;
    }
  }
  return max;
}

function listConvertibleImages(folder) {
  return fs.readdirSync(folder).filter(f => {
    const ext = path.extname(f).toLowerCase();
    if (!VALID_EXT.has(ext)) return false;
    // Skip already-normalized files
    return !/^img\d+\.jpg$/i.test(f);
  });
}

async function convertToJpg(inputPath, outputPath) {
  await sharp(inputPath, { failOnError: false })
    .jpeg({ quality: 90 })
    .toFile(outputPath);
}

(async () => {
  if (!fs.existsSync(BASE_DIR)) {
    console.error("❌ frogquiz folder not found");
    process.exit(1);
  }

  const speciesFolders = fs
    .readdirSync(BASE_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  let totalConverted = 0;
  const failures = [];

  for (const species of speciesFolders) {
    const speciesPath = path.join(BASE_DIR, species);

    const files = listConvertibleImages(speciesPath);
    if (files.length === 0) {
      console.log(`↪ ${species}: nothing new to normalize`);
      continue;
    }

    let index = getExistingMaxIndex(speciesPath) + 1;

    console.log(`🐸 ${species}: converting ${files.length} images (starting at img${index}.jpg)`);

    for (const file of files) {
      const inputPath = path.join(speciesPath, file);
      const outputName = `img${index}.jpg`;
      const outputPath = path.join(speciesPath, outputName);

      try {
        await convertToJpg(inputPath, outputPath);
        console.log(`  ✔ ${file} → ${outputName}`);
        index++;
        totalConverted++;
      } catch (err) {
        console.error(`  ❌ FAILED ${file}: ${err.message}`);
        failures.push({ species, file, error: err.message });
      }
    }
  }

  console.log(`\n✅ Done! Converted ${totalConverted} new images.`);
  if (failures.length) {
    fs.writeFileSync(
      "./frogquiz/_conversion_failures.json",
      JSON.stringify(failures, null, 2)
    );
    console.log(`⚠️  Some files failed. See frogquiz/_conversion_failures.json`);
  }
})();
