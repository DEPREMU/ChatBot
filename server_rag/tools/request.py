import requests
import os
import json

BASE_URL = "https://api.fda.gov/drug/label.json"
OUTPUT_DIR = "medications_markdown"
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


def fetch_medicines():
    print("Fetching data from OpenFDA...")
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    skip = 0
    num_written = 0

    while True:
        params = {"limit": MAX_RESULTS, "skip": skip}

        response = requests.get(BASE_URL, params=params)
        response.raise_for_status()

        results = response.json().get("results", [])
        if not results:
            print("No more medications found.")
            break

        for i, entry in enumerate(results):
            markdown = format_markdown(entry)
            name = entry.get("openfda", {}).get("brand_name", ["Not Recognized"])[0]
            if name == "Not Recognized":
                continue

            safe_name = name.replace(" ", "_").replace("/", "-")
            md_filename = f"{OUTPUT_DIR}/{safe_name}.md"
            json_filename = f"{OUTPUT_DIR}/{safe_name}.json"

            with open(md_filename, "w", encoding="utf-8") as f:
                f.write(markdown["text"])
            with open(json_filename, "w", encoding="utf-8") as f:
                json.dump(markdown["json"], f, ensure_ascii=False, indent=4)

            num_written += 1
            print(f"✅ Saved: {md_filename}")

        skip += MAX_RESULTS

    print(f"All medications have been saved. Total written: {num_written}")


if __name__ == "__main__":
    fetch_medicines()
