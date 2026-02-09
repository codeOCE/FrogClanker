import { pipeline } from "@xenova/transformers";
import fs from "fs-extra";
import path from "path";
import { Jimp } from "jimp";

const PHROG_FOLDER = "./phrogs";
const METADATA_FILE = "./phrog_metadata.json";
const MODEL_NAME = "Xenova/vit-base-patch16-224";

async function runAIIdentification() {
    console.log("🚀 Initializing local AI model (this may take a moment on first run)...");
    const classifier = await pipeline("image-classification", MODEL_NAME);
    console.log("✅ Model loaded!");

    if (!(await fs.pathExists(METADATA_FILE))) {
        console.error("❌ ERROR: phrog_metadata.json not found.");
        return;
    }

    const metadata = await fs.readJson(METADATA_FILE);

    // Auto-discover files in folder
    const files = (await fs.readdir(PHROG_FOLDER)).filter(file =>
        /\.(png|jpe?g|gif|webp)$/i.test(file)
    );

    console.log(`📂 Found ${files.length} images in folder.`);

    for (const file of files) {
        const idMatch = file.match(/frog_(\d+)\./);
        if (idMatch) {
            const id = idMatch[1];
            if (!metadata[id]) {
                metadata[id] = {
                    id: parseInt(id),
                    description: "Auto-discovered frog image",
                    ai_processed: false,
                    scientific_name: "Anura"
                };
            }
        }
    }

    const ids = Object.keys(metadata);
    // Filter for frogs that need processing
    const targetIds = ids.filter(id => {
        const data = metadata[id];
        return !data.ai_processed || data.description === "Auto-discovered frog image";
    });

    console.log(`🔎 Local AI Identification: ${targetIds.length} frogs to process.`);

    for (let i = 0; i < targetIds.length; i++) {
        const id = targetIds[i];
        const data = metadata[id];
        const imagePath = path.join(PHROG_FOLDER, `frog_${id}.jpg`);

        if (!(await fs.pathExists(imagePath))) {
            continue;
        }

        console.log(`[${i + 1}/${targetIds.length}] Identifying frog ${id}...`);

        try {
            // Read image and convert to a format Transformers.js likes (URL or path works if sharp/jimp isn't available, but let's try direct path first)
            const output = await classifier(imagePath);

            if (output && output.length > 0) {
                const topResult = output[0];
                console.log(`   ✅ Identified as: ${topResult.label} (${(topResult.score * 100).toFixed(1)}%)`);

                metadata[id] = {
                    ...data,
                    ai_species: topResult.label,
                    ai_processed: true
                };

                // Save every 10 for safety
                if (i % 10 === 0) {
                    await fs.writeJson(METADATA_FILE, metadata, { spaces: 2 });
                }
            }
        } catch (err) {
            console.error(`   ❌ Error processing ID ${id}:`, err.message);
        }
    }

    await fs.writeJson(METADATA_FILE, metadata, { spaces: 2 });
    console.log("✅ Local AI Identification complete!");
}

runAIIdentification();
