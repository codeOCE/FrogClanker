"""
frog_sorter.py
──────────────
Identifies frog photos using the iNaturalist Computer Vision API and sorts
them into folders by species. Completely free, no API key needed.

Setup:
    pip install requests pillow

Usage:
    python frog_sorter.py --input /path/to/frog/photos --output /path/to/sorted

Output structure:
    sorted/
    ├── red_eyed_tree_frog/
    │   ├── frog_001.jpg
    │   └── frog_002.jpg
    ├── american_bullfrog/
    │   └── frog_003.jpg
    └── manifest.json   ← Discord bot reads this
"""

import os
import sys
import json
import shutil
import argparse
import time
from pathlib import Path

try:
    import requests
except ImportError:
    sys.exit("Missing dependency. Run:  pip install requests pillow")

# ── Config ────────────────────────────────────────────────────────────────────

SUPPORTED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp"}

INAT_VISION_URL = "https://api.inaturalist.org/v1/computervision/score_image"

# Only accept results at or above this score (0-1). Lower = more guesses but less accurate.
MIN_SCORE = 0.10

# iNaturalist taxon ID for frogs (Anura order) — filters results to frogs only
FROG_TAXON_ID = 20979

HEADERS = {
    "User-Agent": "FrogSorterBot/1.0 (discord frog photo organiser)"
}


# ── Helpers ───────────────────────────────────────────────────────────────────

def make_folder_name(name: str) -> str:
    """Convert a species name to a safe folder name."""
    return (
        name.lower()
        .replace(" ", "_")
        .replace("-", "_")
        .replace("'", "")
        .replace("(", "")
        .replace(")", "")
        .replace("/", "_")
        .replace(".", "")
    )


def identify_frog(image_path: Path) -> dict:
    """
    Send image to iNaturalist CV API and return the top frog result.
    """
    with open(image_path, "rb") as f:
        files = {"image": (image_path.name, f, "image/jpeg")}
        params = {"taxon_id": FROG_TAXON_ID}
        response = requests.post(
            INAT_VISION_URL,
            headers=HEADERS,
            files=files,
            params=params,
            timeout=30,
        )

    response.raise_for_status()
    data = response.json()
    results = data.get("results", [])

    if not results:
        return {
            "common_name": "Unknown Frog",
            "scientific_name": "Unknown",
            "score": 0.0,
            "confidence": "low",
            "folder_name": "unknown",
        }

    top = results[0]
    taxon = top.get("taxon", {})
    score = top.get("combined_score", top.get("score", 0))

    scientific_name = taxon.get("name", "Unknown")
    common_name = (
        taxon.get("preferred_common_name")
        or taxon.get("english_common_name")
        or scientific_name
    )

    if score >= 0.6:
        confidence = "high"
    elif score >= 0.3:
        confidence = "medium"
    else:
        confidence = "low"

    if score < MIN_SCORE:
        return {
            "common_name": "Unknown Frog",
            "scientific_name": scientific_name,
            "score": round(score, 3),
            "confidence": "low",
            "folder_name": "unknown",
        }

    return {
        "common_name": common_name,
        "scientific_name": scientific_name,
        "score": round(score, 3),
        "confidence": confidence,
        "folder_name": make_folder_name(common_name),
    }


def safe_copy(src: Path, dest_dir: Path) -> Path:
    """Copy file to dest_dir, appending a counter if name already exists."""
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest = dest_dir / src.name
    counter = 1
    while dest.exists():
        dest = dest_dir / f"{src.stem}_{counter}{src.suffix}"
        counter += 1
    shutil.copy2(src, dest)
    return dest


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Sort frog photos by species using iNaturalist CV (free, no API key)"
    )
    parser.add_argument("--input",   "-i", required=True, help="Folder containing unsorted frog photos")
    parser.add_argument("--output",  "-o", required=True, help="Folder where sorted photos will go")
    parser.add_argument("--api-key", "-k", help="iNaturalist API token (from inaturalist.org/users/api_token)")
    parser.add_argument("--delay",   "-d", type=float, default=0.5, help="Seconds between requests (default: 0.5)")
    parser.add_argument("--dry-run", action="store_true", help="Identify only, don't copy files")
    args = parser.parse_args()

    # Auth
    api_key = args.api_key or os.environ.get("INAT_API_KEY")
    if not api_key:
        sys.exit(
            "iNaturalist now requires an account token.\n"
            "1. Sign up free at https://www.inaturalist.org\n"
            "2. Get your token at https://www.inaturalist.org/users/api_token\n"
            "3. Pass it with --api-key YOUR_TOKEN"
        )
    HEADERS["Authorization"] = api_key
    input_dir  = Path(args.input).resolve()
    output_dir = Path(args.output).resolve()

    if not input_dir.exists():
        sys.exit(f"Input folder not found: {input_dir}")

    images = [
        p for p in input_dir.iterdir()
        if p.is_file() and p.suffix.lower() in SUPPORTED_EXTENSIONS
    ]

    if not images:
        sys.exit(f"No supported image files found in {input_dir}")

    print(f"\n🐸  Found {len(images)} image(s) in {input_dir}")
    print(f"📁  Output folder: {output_dir}")
    if args.dry_run:
        print("🔍  DRY RUN — files will not be copied\n")

    # Resume support — load existing manifest
    manifest = {}
    manifest_path = output_dir / "manifest.json"
    if not args.dry_run and manifest_path.exists():
        with open(manifest_path) as f:
            manifest = json.load(f)
        print(f"▶️   Resuming — {len(manifest)} already done, skipping those\n")
    else:
        print()

    errors = []
    remaining = [p for p in sorted(images) if p.name not in manifest]
    skipped   = len(images) - len(remaining)

    if skipped:
        print(f"⏭️   Skipping {skipped} already-processed image(s)\n")

    for i, img_path in enumerate(remaining, 1):
        print(f"[{i}/{len(remaining)}] {img_path.name} ... ", end="", flush=True)

        try:
            result = identify_frog(img_path)

            common_name     = result["common_name"]
            scientific_name = result["scientific_name"]
            folder_name     = result["folder_name"]
            confidence      = result["confidence"]
            score           = result["score"]

            print(f"{common_name} ({scientific_name})  [{confidence} — {score:.0%}]")

            dest_path = img_path

            if not args.dry_run:
                dest_dir  = output_dir / folder_name
                dest_path = safe_copy(img_path, dest_dir)

            manifest[img_path.name] = {
                "common_name":     common_name,
                "scientific_name": scientific_name,
                "folder":          folder_name,
                "confidence":      confidence,
                "score":           score,
                "original_file":   img_path.name,
                "sorted_path":     str(dest_path.relative_to(output_dir)) if not args.dry_run else None,
            }

            # Save after every photo — no progress lost if stopped
            if not args.dry_run:
                output_dir.mkdir(parents=True, exist_ok=True)
                with open(manifest_path, "w") as f:
                    json.dump(manifest, f, indent=2)

        except requests.HTTPError as e:
            print(f"⚠️  HTTP {e.response.status_code} — {e}")
            errors.append((img_path.name, str(e)))
        except Exception as e:
            print(f"⚠️  Error — {e}")
            errors.append((img_path.name, str(e)))

        if i < len(remaining):
            time.sleep(args.delay)

    if not args.dry_run:
        print(f"\n✅  Manifest saved to {manifest_path}")
    else:
        print("\n📋  Dry-run manifest preview:")
        print(json.dumps(manifest, indent=2))

    print(f"\n── Summary ──────────────────────────────")
    print(f"  Total found : {len(images)}")
    print(f"  Skipped     : {skipped}")
    print(f"  Processed   : {len(remaining)}")
    print(f"  Succeeded   : {len(remaining) - len(errors)}")
    print(f"  Errors      : {len(errors)}")

    if errors:
        print("\n  Failed files:")
        for name, reason in errors:
            print(f"    • {name}: {reason}")

    species_found = {v["folder"] for v in manifest.values()}
    print(f"\n  Species identified: {len(species_found)}")
    for s in sorted(species_found):
        count = sum(1 for v in manifest.values() if v["folder"] == s)
        label = next((v["common_name"] for v in manifest.values() if v["folder"] == s), s)
        print(f"    🐸  {label}  ×{count}")

    print()


if __name__ == "__main__":
    main()