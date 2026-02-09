import axios from "axios";
import fs from "fs-extra";

const METADATA_FILE = "./phrog_metadata.json";
const SPECIES_DB = "./frog_species.json";

async function refineIdentification() {
    const metadata = await fs.readJson(METADATA_FILE);
    const speciesDb = await fs.readJson(SPECIES_DB);

    const ids = Object.keys(metadata);
    console.log(`🔎 Refining identification for ${ids.length} entries...`);

    for (let i = 0; i < ids.length; i++) {
        const id = ids[i];
        const data = metadata[id];

        // Skip things that are obviously not frogs based on previous audit
        if (data.description.toLowerCase().includes("lighthouse") ||
            data.description.toLowerCase().includes("bubble machine") ||
            data.description.toLowerCase().includes("pharos")) {
            data.scientific_name = "Not a Frog";
            data.facts = ["This image was identified as a non-frog item and is hidden from the main command."];
            continue;
        }

        const searchStr = `${data.ai_species || ""} ${data.description || ""}`.toLowerCase();
        let matched = false;

        // 1. Check local DB
        for (const species of speciesDb) {
            if (species.keywords.some(k => searchStr.includes(k))) {
                data.scientific_name = species.scientific_name;
                data.facts = species.facts;
                matched = true;
                break;
            }
        }

        // 2. If no local match, try iNaturalist for a "specific" guess
        if (!matched && (data.scientific_name === "Anura" || !data.scientific_name)) {
            // Pick the most likely "froggy" parts from the description
            const keywords = searchStr.split(" ").filter(w =>
                !["a", "the", "in", "on", "of", "with", "shot", "macro", "vibrant", "photo", "frog"].includes(w)
            ).slice(0, 3).join(" ");

            if (keywords.length > 3) {
                try {
                    console.log(`[${i + 1}/${ids.length}] Querying iNaturalist for: ${keywords}...`);
                    const res = await axios.get(`https://api.inaturalist.org/v1/taxa?q=${encodeURIComponent(keywords)}&rank=species&limit=1`);

                    if (res.data.results && res.data.results.length > 0) {
                        const top = res.data.results[0];
                        data.scientific_name = top.name;
                        data.common_name = top.preferred_common_name;
                        data.facts = [
                            `Commonly known as the ${top.preferred_common_name}, this species is part of the ${top.ancestor_ids.length > 0 ? "diverse" : ""} frog family.`,
                            `Identified via iNaturalist as ${top.name}, a fascinating example of amphibian biology.`,
                            `This ${top.preferred_common_name} shows the amazing variety found in nature.`
                        ];
                        console.log(`   ✅ Matched to: ${top.name} (${top.preferred_common_name})`);
                    }
                } catch (err) {
                    console.error("   ❌ iNaturalist error:", err.message);
                }
            }
        }

        // Small delay to be polite to iNaturalist
        if (i % 5 === 0) await new Promise(r => setTimeout(r, 500));

        // Save periodically
        if (i % 20 === 0) await fs.writeJson(METADATA_FILE, metadata, { spaces: 2 });
    }

    await fs.writeJson(METADATA_FILE, metadata, { spaces: 2 });
    console.log("✅ Refinement complete!");
}

refineIdentification();
