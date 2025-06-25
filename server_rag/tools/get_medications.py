import requests
import os
import json
import time
import re

BASE_URL = "https://api.fda.gov/drug/label.json"
OUTPUT_DIR = "docs"
OUTPUT_DIR_JSON = "json_docs"
MAX_RESULTS = 1000


def clean_text(text):
    return text.replace("\n", " ").replace("\r", " ").strip()


def format_markdown(entry):
    name = entry.get("openfda", {}).get("brand_name", ["Name not recognized"])[0]
    manufacturer = entry.get("openfda", {}).get(
        "manufacturer_name", ["Unknown manufacturer"]
    )[0]
    active_ingredient = entry.get("active_ingredient", ["Not specified"])[0]
    purpose = entry.get("purpose", ["Not specified"])[0]
    description = (
        clean_text(entry.get("description", ["No description"])[0])
        if "description" in entry
        else ""
    )
    indications = clean_text(entry.get("indications_and_usage", ["Not available."])[0])
    warnings = clean_text(entry.get("warnings", ["Not available."])[0])
    contraindications = clean_text(entry.get("do_not_use", ["Not available."])[0])
    when_using = clean_text(entry.get("when_using", ["Not available."])[0])
    stop_use = clean_text(entry.get("stop_use", ["Not available."])[0])
    keep_out = clean_text(
        entry.get("keep_out_of_reach_of_children", ["Not available."])[0]
    )
    side_effects = (
        clean_text(entry.get("adverse_reactions", ["Not available."])[0])
        if "adverse_reactions" in entry
        else ""
    )
    dosage = clean_text(entry.get("dosage_and_administration", ["Not available."])[0])
    storage = clean_text(entry.get("storage_and_handling", ["Not available."])[0])
    inactive_ingredients = clean_text(
        entry.get("inactive_ingredient", ["Not available."])[0]
    )
    questions = clean_text(entry.get("questions", ["Not available."])[0])

    data_json = {
        "name": name,
        "manufacturer": manufacturer,
        "active_ingredient": active_ingredient,
        "purpose": purpose,
        "description": description,
        "indications": indications,
        "warnings": warnings,
        "contraindications": contraindications,
        "when_using": when_using,
        "stop_use": stop_use,
        "keep_out": keep_out,
        "side_effects": side_effects,
        "dosage": dosage,
        "storage": storage,
        "inactive_ingredients": inactive_ingredients,
        "questions": questions,
    }

    text = f"""# Name of the Medicine
{name}

## Manufacturer
{manufacturer}

## Active Ingredient
{active_ingredient}

## Purpose
{purpose}

## Description
{description}

## Indications
- {indications}

## Warnings
- {warnings}

## Do Not Use
- {contraindications}

## When Using
- {when_using}

## Stop Use
- {stop_use}

## Keep Out of Reach of Children
- {keep_out}

## Side Effects
- {side_effects}

## Dosage Recommendations
{dosage}

## Storage and Handling
{storage}

## Inactive Ingredients
{inactive_ingredients}

## Questions or Comments
{questions}
"""

    return {"text": text, "json": data_json}


def sanitize_filename(name: str) -> str:
    """Sanitiza el nombre para usarlo como nombre de archivo seguro."""
    return re.sub(r"[^a-zA-Z0-9_\-]", "_", name.strip())


def fetch_medicines():
    print("Fetching data from OpenFDA...")

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    os.makedirs(OUTPUT_DIR_JSON, exist_ok=True)

    # Skip anterior
    skip = 0
    names = set()
    skip_file = os.path.join(OUTPUT_DIR_JSON, "skip.json")

    if os.path.exists(skip_file):
        with open(skip_file, "r", encoding="utf-8") as f:
            skip_data = json.load(f)
            skip = skip_data.get("skip", 0)
    else:
        print("No skip file found, starting from the beginning.")

    existing_files = {
        f.replace(".md", "").replace("_", " ").replace("-", "/").lower()
        for f in os.listdir(OUTPUT_DIR)
        if f.endswith(".md")
    }

    medications_dict = {}
    numErrors = 0

    while True:
        try:
            print(f"Fetching medications with skip={skip}...")
            time.sleep(1 * (numErrors + 1))
            params = {"limit": MAX_RESULTS, "skip": skip}

            response = requests.get(BASE_URL, params=params)
            response.raise_for_status()

            results = response.json().get("results", [])
            if not results:
                print("No more medications found.")
                break

            for entry in results:
                markdown = format_markdown(entry)
                name = entry.get("openfda", {}).get("brand_name", ["Not Recognized"])[0]
                if name == "Not Recognized":
                    continue

                name_lower = name.lower()
                if (
                    name_lower in names
                    or name_lower in existing_files
                    or name in medications_dict
                ):
                    print(f"Skipping duplicate or existing name: {name}")
                    continue

                safe_name = sanitize_filename(name)
                md_filename = os.path.join(OUTPUT_DIR, f"{safe_name}.md")

                if os.path.exists(md_filename):
                    print(f"File already exists for {name}: {md_filename}")
                    continue

                # Guardar markdown
                with open(md_filename, "w", encoding="utf-8") as f:
                    f.write(markdown["text"])

                medications_dict[name] = markdown["json"]
                names.add(name_lower)

        except Exception as e:
            if numErrors > 5:
                print("Too many errors, stopping the process.")
                break
            print(f"Error processing entry: {e}")
            numErrors += 1
            continue

        skip += MAX_RESULTS
        with open(skip_file, "w", encoding="utf-8") as f:
            json.dump({"skip": skip}, f)

        print(f"Batch completed. Total new written: {len(names)}")

    if not medications_dict:
        print("No new medications were written. Exiting.")
        return

    # Guardar el archivo final
    with open(f"{OUTPUT_DIR_JSON}/medications.json", "w", encoding="utf-8") as f:
        json.dump(medications_dict, f, indent=4, ensure_ascii=False)

    print(f"✅ Finalizado. Total de medicamentos guardados: {len(medications_dict)}")


def write_from_json():
    medications_file = f"{OUTPUT_DIR_JSON}/medications.json"
    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR, exist_ok=True)
    if not os.path.exists(medications_file):
        print(f"File {medications_file} does not exist.")
        return

    with open(medications_file, "r", encoding="utf-8") as f:
        data = json.load(f)

    for item in data:
        name = item.get("name", "Unknown")
        name_es = item.get("name_es", "Unknown")
        name_fr = item.get("name_fr", "Unknown")
        md_filename = f"{OUTPUT_DIR}/{name.replace(' ', '_').replace('/', '-')}.md"
        if os.path.exists(md_filename):
            continue
        with open(md_filename, "w", encoding="utf-8") as f:
            text = f"""# Name of the Medicine
en: {name}
es: {name_es}
fr: {name_fr}

## Manufacturer
{item["manufacturer"]}

## Active Ingredient
{item["active_ingredient"]}

## Purpose
{item["purpose"]}

## Description
{item["description"]}

## Indications
- {item["indications"]}

## Warnings
- {item["warnings"]}

## Do Not Use
- {item["contraindications"]}

## When Using
- {item["when_using"]}

## Stop Use
- {item["stop_use"]}

## Keep Out of Reach of Children
- {item["keep_out"]}

## Side Effects
- {item["side_effects"]}

## Dosage Recommendations
{item["dosage"]}

## Storage and Handling
{item["storage"]}

## Inactive Ingredients
{item["inactive_ingredients"]}

## Questions or Comments
{item["questions"]}
"""
            f.write(text)

    print(f"All medications have been written to {OUTPUT_DIR}.")


if __name__ == "__main__":
    # fetch_medicines()
    write_from_json()
