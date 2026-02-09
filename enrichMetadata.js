import fs from "fs-extra";

const METADATA_FILE = "./phrog_metadata.json";
const ENRICHED_FILE = "./phrog_metadata.json";

const SPECIES_MAPPING = [
    {
        keywords: ["blue dart frog", "blue poison dart frog", "azureus"],
        scientific_name: "Dendrobates tinctorius 'Azureus'",
        facts: [
            "Their bright blue skin serves as a warning to predators that they are highly toxic.",
            "The poison in their skin comes from the specific insects they eat in the wild. In captivity, they lose their toxicity.",
            "Each frog has a unique pattern of black spots, similar to human fingerprints.",
            "They have excellent eyesight, allowing them to spot tiny movements even in low light.",
            "Indigenous people sometimes used their toxins for blowgun darts."
        ]
    },
    {
        keywords: ["red-eyed tree frog", "red eyed tree frog", "agalychnis"],
        scientific_name: "Agalychnis callidryas",
        facts: [
            "Their striking red eyes are used for 'startle coloration' to confuse predators while the frog escapes.",
            "They are nocturnal, spending their days hidden on the underside of leaves to avoid the sun.",
            "They have suction-pad-like toes that emit a wet mucus, allowing them to climb almost any surface.",
            "They blink their large eyes to help push insects down their throats while eating.",
            "Males will shake their bodies to create vibrations, signaling to other males that a leaf is taken."
        ]
    },
    {
        keywords: ["green tree frog", "hyla cinerea"],
        scientific_name: "Hyla cinerea",
        facts: [
            "Common in the southeastern US, they are often found near porch lights hunting for insects.",
            "They are known for their distinctive bird-like barking call.",
            "They can change their color slightly from bright green to dull brown to match their surroundings.",
            "They have large, sticky toe pads that make them expert climbers in trees and on buildings."
        ]
    },
    {
        keywords: ["grey tree frog", "gray tree frog", "hyla versicolor"],
        scientific_name: "Hyla versicolor",
        facts: [
            "They are masters of camouflage, able to change their color from grey to green to match the bark they sit on.",
            "They produce a natural glycerol 'antifreeze' that allows them to survive being partially frozen in winter.",
            "Unlike many frogs, they prefer to breed in temporary forest pools where there are no fish to eat their eggs.",
            "Their skin has a slightly 'warty' texture for a tree frog, helping them blend in with lichen."
        ]
    },
    {
        keywords: ["american bullfrog", "bullfrog", "lithobates catesbeianus"],
        scientific_name: "Lithobates catesbeianus",
        facts: [
            "They are apex predators in ponds and have been known to eat snakes, fish, and even small birds!",
            "Adults can grow up to 8 inches long and weigh over a pound.",
            "Their deep 'jug-o-rum' call can be heard from over a mile away.",
            "Bullfrog tadpoles can take up to two years to transform into adult frogs.",
            "They are the largest true frog species in North America."
        ]
    },
    {
        keywords: ["african bullfrog", "pixie frog"],
        scientific_name: "Pyxicephalus adspersus",
        facts: [
            "It is one of the largest frogs in the world; males can be as big as a dinner plate.",
            "Unlike most frogs, the male stays to guard its tadpoles against predators.",
            "They have tooth-like projections called odontodes on their lower jaw to help grip large prey.",
            "They can survive for months underground in a cocoon made of dead skin during dry seasons."
        ]
    },
    {
        keywords: ["tomato frog"],
        scientific_name: "Dyscophus antongilii",
        facts: [
            "When threatened, they inflate their bodies to look like a giant, unswallowable tomato.",
            "They can secrete a sticky, white glue-like substance from their skin that can numb a predator's mouth.",
            "They are native exclusively to the island of Madagascar.",
            "Females are much brighter and larger than the males."
        ]
    },
    {
        keywords: ["glass frog", "centrolenidae"],
        scientific_name: "Centrolenidae",
        facts: [
            "Their underside skin is completely translucent, making their beating heart and organs visible.",
            "They can hide their red blood cells in their liver while sleeping to become even more transparent.",
            "They are primarily nocturnal and live in trees near fast-flowing mountain streams.",
            "Males aggressively guard their eggs, sometimes fighting off wasps and other predators."
        ]
    },
    {
        keywords: ["mossy frog", "vietnamese mossy frog"],
        scientific_name: "Theloderma corticale",
        facts: [
            "They are masters of camouflage, perfectly resembling a clump of moss or lichen.",
            "When frightened, they curl into a ball and 'play dead' to look like a mossy stone.",
            "They can throw their voice, making their call sound like it's coming from several feet away.",
            "They live in flooded caves and on the banks of mountain streams."
        ]
    },
    {
        keywords: ["pacman frog", "horned frog", "ceratophrys"],
        scientific_name: "Ceratophrys",
        facts: [
            "They are nicknamed 'Pacman frogs' because of their round shape and enormous mouth.",
            "They are 'sit-and-wait' predators, burying themselves in the dirt until prey walks by.",
            "They have a very powerful bite and will try to eat anything that fits in their mouth.",
            "In the wild, they have been known to eat other frogs, rodents, and even small birds."
        ]
    },
    {
        keywords: ["leopard frog", "lithobates pipiens"],
        scientific_name: "Lithobates pipiens",
        facts: [
            "They are named for the distinctive dark spots that resemble a leopard's coat.",
            "They can jump high into the air and emit a startling 'scream' to scare off predators.",
            "They are excellent indicators of environmental health because of their permeable skin.",
            "They spend much of their time in wet meadows and fields, far from open water."
        ]
    },
    {
        keywords: ["wood frog", "lithobates sylvaticus"],
        scientific_name: "Lithobates sylvaticus",
        facts: [
            "They are the only frogs found north of the Arctic Circle.",
            "They can survive being frozen solid during winter; they simply thaw out in the spring!",
            "They produce a natural 'antifreeze' (glucose) to prevent ice from damaging their cells.",
            "Their mating call sounds more like a quacking duck than a typical frog croak."
        ]
    },
    {
        keywords: ["strawberry poison dart", "blue jeans frog"],
        scientific_name: "Oophaga pomilio",
        facts: [
            "The mother carries each tadpole individually on her back to a water-filled bromeliad leaf.",
            "The mother feeds her tadpoles unfertilized eggs until they are ready to transform.",
            "Their bright colors warn predators of the toxins they carry in their skin.",
            "They are often called 'Blue Jeans' frogs because of their red bodies and blue legs."
        ]
    },
    {
        keywords: ["common frog", "european common frog", "rana temporaria"],
        scientific_name: "Rana temporaria",
        facts: [
            "They are one of the most widespread frogs in Europe and can adapt to almost any habitat with water.",
            "During winter, they may hibernate at the bottom of ponds, breathing entirely through their skin.",
            "They have a distinctive dark patch or 'mask' behind their eyes.",
            "They can breathe through both their lungs and their skin!"
        ]
    },
    {
        keywords: ["toad", "bufo"],
        scientific_name: "Bufo bufo (Common Toad)",
        facts: [
            "Contrary to myth, you cannot get warts from touching a toad.",
            "Toads have dry, bumpy skin and shorter legs than most typical frogs.",
            "They have large parotoid glands behind their eyes that produce defensive toxins.",
            "Most toads are primarily land-dwellers and only return to water to breed."
        ]
    },
    {
        keywords: ["leopard frog", "lithobates pipiens"],
        scientific_name: "Lithobates pipiens (Leopard Frog)",
        facts: [
            "They are named for the dark spots that dot their back and legs.",
            "Northern leopard frogs can jump up to 3 feet in a single bound.",
            "They are often used in high school biology classes for dissection.",
            "They live in a variety of habitats, including meadows and lakes."
        ]
    },
    {
        keywords: ["spring peeper", "pseudacris crucifer"],
        scientific_name: "Pseudacris crucifer (Spring Peeper)",
        facts: [
            "They are tiny tree frogs known for their loud, high-pitched peeping call in early spring.",
            "Adults are only about 1 inch long.",
            "They have a dark 'X' mark on their backs.",
            "They can survive freezing temperatures by producing a glucose 'antifreeze'."
        ]
    },
    {
        keywords: ["wood frog"],
        scientific_name: "Lithobates sylvaticus (Wood Frog)",
        facts: [
            "They are the only frogs found north of the Arctic Circle.",
            "They can survive being frozen solid during winter!",
            "They produce a natural 'antifreeze' (glucose) to prevent ice from damaging their cells.",
            "Their mating call sounds more like a quacking duck than a typical frog croak."
        ]
    },
    {
        keywords: ["pickerel frog"],
        scientific_name: "Lithobates palustris (Pickerel Frog)",
        facts: [
            "They are the only poisonous frog native to the United States.",
            "Their skin secretions can be toxic to other frogs and small mammals.",
            "They have two rows of square-shaped spots on their backs.",
            "They are often found in cool, clear water like spring-fed streams."
        ]
    }
];

const DEDUCTION_MAPPING = [
    {
        type: "Aquatic Frog",
        keywords: ["pond", "water", "lily pad", "submerged", "lake", "river", "swim"],
        scientific_name: "Anura (Aquatic)",
        facts: [
            "Aquatic frogs often have powerful back legs and webbed feet to help them propel through water.",
            "Many pond frogs can stay underwater for long periods by absorbing oxygen through their skin.",
            "Their eyes and nostrils are often on the very top of their heads so they can see and breathe while mostly submerged.",
            "They spend their lives near water to keep their skin moist and to provide a safe place for their eggs."
        ]
    },
    {
        type: "Tree Frog",
        keywords: ["tree", "leaf", "branch", "climb", "height", "greenery"],
        scientific_name: "Anura (Arboreal)",
        facts: [
            "Tree frogs have specialized toe pads that act like suction cups, allowing them to climb vertical surfaces—even glass!",
            "Most tree frogs are small and lightweight, evolved for life high above the forest floor.",
            "Many tree frogs can change their color to blend in with the leaves or bark they are resting on.",
            "They often lay their eggs on leaves overhanging water, so the tadpoles fall directly into the water when they hatch."
        ]
    },
    {
        type: "Terrestrial Frog / Toad",
        keywords: ["moss", "dirt", "ground", "forest floor", "rock", "stone", "brown", "bumpy", "texture"],
        scientific_name: "Anura (Terrestrial)",
        facts: [
            "Terrestrial frogs and toads usually have thicker, tougher skin to help them retain moisture while far from water.",
            "They are often masters of camouflage, matching the colors of the dirt, rocks, or dead leaves where they live.",
            "Many land-dwelling frogs burrow into the ground during the day to stay cool and damp.",
            "Some terrestrial species can travel long distances away from water, only returning to ponds during the breeding season."
        ]
    }
];

const GENERAL_FACTS = [
    "Frogs absorb water through their skin, so they don't actually need to drink like humans do!",
    "A group of frogs is called an 'army'.",
    "Some frogs can jump over 20 times their body length in a single bound.",
    "Frogs use their eyes to help them swallow—they pull their eyes down into their head to push food down.",
    "Frogs can be found on every continent on Earth except for Antarctica.",
    "The world's smallest frog is less than 1 cm long, about the size of a housefly.",
    "Frog skin is often slimy to keep it moist, which helps them breathe through their skin."
];

async function enrichMetadata() {
    if (!(await fs.pathExists(METADATA_FILE))) {
        console.error("❌ ERROR: phrog_metadata.json not found.");
        return;
    }

    const metadata = await fs.readJson(METADATA_FILE);
    const enriched = {};

    for (const [id, data] of Object.entries(metadata)) {
        let info = null;

        // SKIP if we already have a specific name (not generic Anura)
        if (data.scientific_name && !data.scientific_name.includes("Anura") && data.scientific_name !== "Not a Frog") {
            enriched[id] = data;
            continue;
        }

        const searchStr = `${data.ai_species || ""} ${data.description || ""}`.toLowerCase();

        // 1. Try exact species match
        for (const mapping of SPECIES_MAPPING) {
            if (mapping.keywords.some(k => searchStr.includes(k))) {
                info = {
                    scientific_name: mapping.scientific_name,
                    facts: mapping.facts
                };
                break;
            }
        }

        // 2. Try deduction based on environment
        if (!info) {
            for (const deduction of DEDUCTION_MAPPING) {
                if (deduction.keywords.some(k => searchStr.includes(k))) {
                    info = {
                        scientific_name: deduction.scientific_name,
                        facts: deduction.facts
                    };
                    break;
                }
            }
        }

        // 3. Fallback to general
        if (!info) {
            info = {
                scientific_name: "Anura",
                facts: GENERAL_FACTS
            };
        }

        enriched[id] = {
            ...data,
            ...info
        };
    }

    await fs.writeJson(ENRICHED_FILE, enriched, { spaces: 2 });
    console.log(`✅ Enrichment complete. Saved to ${ENRICHED_FILE}`);
}

enrichMetadata();
