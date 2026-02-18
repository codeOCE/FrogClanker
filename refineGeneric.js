import fs from "fs-extra";

const METADATA_FILE = "./phrog_metadata.json";

async function refineGeneric() {
    const metadata = await fs.readJson(METADATA_FILE);
    let fixedCount = 0;
    let purgedCount = 0;

    for (const [id, data] of Object.entries(metadata)) {
        const desc = (data.description || "").toLowerCase();
        const ai = (data.ai_species || "").toLowerCase();
        const hasC = data.common_name || (data.scientific_name && data.scientific_name.includes("("));

        if (!hasC) {
            // 1. Not a Frog (Non-frog subjects)
            if (desc.includes("lighthouse") ||
                desc.includes("penguin") ||
                desc.includes("gecko") ||
                desc.includes("chameleon") ||
                desc.includes("alligator") ||
                desc.includes("crocodile") ||
                desc.includes("turtle") ||
                desc.includes("tortoise") ||
                desc.includes("snake") ||
                desc.includes("iguana") ||
                ai.includes("lighthouse") ||
                ai.includes("alligator") ||
                ai.includes("crocodile") ||
                ai.includes("turtle") ||
                ai.includes("tortoise") ||
                ai.includes("snake") ||
                ai.includes("iguana") ||
                ai.includes("gecko") ||
                ai.includes("chameleon")) {

                data.scientific_name = "Not a Frog";
                data.common_name = "Not a Frog";
                data.facts = ["This image was identified as a non-frog item and is hidden from the main command."];
                purgedCount++;
                continue;
            }

            // 2. Specific Real Frogs
            if (desc.includes("coqui")) {
                data.common_name = "Common Coqui";
                data.scientific_name = "Eleutherodactylus coqui";
                data.facts = [
                    "Native to Puerto Rico, the Coqui's call (ko-kee!) can reach levels over 90 decibels.",
                    "Unlike many frogs, they do not have a tadpole stage; instead, tiny frogs hatch directly from eggs.",
                    "The male Coqui is the one that calls to defend territory and attract mates."
                ];
                fixedCount++;
                continue;
            }
            if (desc.includes("waldkirch") || desc.includes("germany")) {
                data.common_name = "Common Water Frog";
                data.scientific_name = "Pelophylax kl. esculentus";
                data.facts = [
                    "This is a fertile hybrid species found across Europe.",
                    "They spend most of their time in or near water to keep their skin moist.",
                    "They are known for their loud croaking and large vocal sacs."
                ];
                fixedCount++;
                continue;
            }
            if (desc.includes("guasuca") || desc.includes("colombia") || desc.includes("lichen")) {
                data.common_name = "Lichen-mimic Rain Frog";
                data.scientific_name = "Pristimantis lichenoides";
                data.facts = [
                    "They have evolved incredible camouflage to look exactly like colorful moss and lichen.",
                    "They are endemic to the cloud forests of the Andes in Colombia.",
                    "Like all Pristimantis, they undergo direct development, bypassing the tadpole stage entirely."
                ];
                fixedCount++;
                continue;
            }

            // 3. Artistic/Artificial Frogs
            if (desc.includes("graffiti")) {
                data.common_name = "Artistic Frog (Graffiti)";
                data.scientific_name = "Anura (Artistic)";
                data.facts = ["Frogs are popular subjects in street art, symbolizing transformation and nature in urban environments."];
                fixedCount++;
                continue;
            }
            if (desc.includes("figurine") || desc.includes("ceramic")) {
                data.common_name = "Ceramic Frog";
                data.scientific_name = "Anura (Decorative)";
                data.facts = ["Many cultures believe that frog figurines bring good luck and prosperity to a home."];
                fixedCount++;
                continue;
            }
            if (desc.includes("plush") || desc.includes("toy")) {
                data.common_name = "Plush Phrog";
                data.scientific_name = "Anura (Soft)";
                data.facts = ["Soft and squishy, this phrog doesn't need a swamp, just a cozy bed."];
                fixedCount++;
                continue;
            }
            if (desc.includes("bubble machine")) {
                data.common_name = "Froggy Bubble Machine";
                data.scientific_name = "Anura (Mechanical)";
                data.facts = ["This mechanical frog breathes bubbles instead of flies!"];
                fixedCount++;
                continue;
            }

            // 4. General Environmental Deductions (if still Anura)
            if (data.scientific_name === "Anura") {
                if (desc.includes("pond") || desc.includes("water") || desc.includes("swim")) {
                    data.common_name = "Aquatic Frog";
                    data.scientific_name = "Anura (Aquatic)";
                    data.facts = ["This mystery frog spends its life in the water, perfect for staying hydrated and catching bugs."];
                    fixedCount++;
                } else if (desc.includes("tree") || desc.includes("leaf") || desc.includes("branch")) {
                    data.common_name = "Tree Frog";
                    data.scientific_name = "Anura (Arboreal)";
                    data.facts = ["With its sticky toe pads, this frog is a master of the canopy."];
                    fixedCount++;
                } else {
                    // Final "More Real" names for generic ones
                    data.common_name = "Mystery Phrog";
                    data.scientific_name = "Anura (Unidentified species)";
                    data.facts = ["Even our frog experts are scratching their heads at this one! It's definitely a phrog, but its specific species is a secret."];
                    fixedCount++;
                }
            }
        }
    }

    await fs.writeJson(METADATA_FILE, metadata, { spaces: 2 });
    console.log(`✅ Refinement complete! Fixed ${fixedCount} entries. Purged ${purgedCount} non-frogs.`);
}

refineGeneric();
