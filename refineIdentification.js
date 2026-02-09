import axios from "axios";
import fs from "fs-extra";

const METADATA_FILE = "./phrog_metadata.json";
const SPECIES_DB = "./frog_species.json";

async function refineIdentification() {
    const metadata = await fs.readJson(METADATA_FILE);
    const speciesDb = await fs.readJson(SPECIES_DB);

    const ids = Object.keys(metadata);
    // Filter for frogs that need processing or are still generic "Anura"
    const targetIds = ids.filter(id => {
        const data = metadata[id];
        return !data.scientific_name || data.scientific_name.includes("Anura") || data.scientific_name === "Not a Frog";
    });
    console.log(`🔎 Refining identification for ${targetIds.length} entries...`);

    for (let i = 0; i < targetIds.length; i++) {
        const id = targetIds[i];
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
        if (!matched && (data.scientific_name === "Anura" || !data.scientific_name || data.scientific_name.includes("Anura"))) {
            // Pick keywords that are NOT generic
            const genericWords = ["a", "the", "in", "on", "of", "with", "shot", "macro", "vibrant", "photo", "frog", "rests", "sitting", "nature", "nature's", "close-up", "highlighting", "intricate", "vivid", "bokeh", "blurred", "beautiful", "fresh"];
            const rawKeywords = searchStr.split(/[\s,]+/).filter(w => !genericWords.includes(w) && w.length > 2);

            // Try different query combinations
            const queryCandidates = [
                rawKeywords.slice(0, 3).join(" ") + " frog",
                rawKeywords.slice(0, 2).join(" "),
            ].filter(q => q.trim().length > 4);

            if (queryCandidates.length > 0) {
                const query = queryCandidates[0];
                try {
                    console.log(`[${i + 1}/${targetIds.length}] Querying iNaturalist for: "${query}"...`);
                    const res = await axios.get(`https://api.inaturalist.org/v1/taxa?q=${encodeURIComponent(query)}&rank=species&limit=1`);

                    if (res.data.results && res.data.results.length > 0) {
                        const top = res.data.results[0];
                        data.scientific_name = top.name;
                        data.common_name = top.preferred_common_name || top.name;
                        data.facts = [
                            `Commonly known as the ${data.common_name}, this species is a fascinating example of amphibian biology.`,
                            `Identified as ${top.name}, these frogs are uniquely adapted to their environment.`,
                            `The ${data.common_name} is one of the many incredible species found in the wild.`
                        ];
                        console.log(`   ✅ Matched to: ${top.name} (${data.common_name})`);
                        matched = true;
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
