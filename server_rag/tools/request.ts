import fetch from "node-fetch";
import * as fs from "fs";
import * as path from "path";
import { log } from "console";

const BASE_URL = "https://api.fda.gov/drug/label.json";
const PATH_JSON = "./json_docs";
const OUTPUT_DIR = "./docs";
const MAX_RESULTS = 1000;

type EntryJSON = {
  name: string;
  manufacturer: string;
  active_ingredient: string;
  purpose: string;
  description: string;
  indications: string;
  warnings: string;
  contraindications: string;
  when_using: string;
  stop_use: string;
  keep_out: string;
  side_effects: string;
  dosage: string;
  storage: string;
  inactive_ingredients: string;
  questions: string;
  name_es?: string;
  name_fr?: string;
};

const cleanText = (text: string): string => {
  return text.replace(/\n/g, " ").replace(/\r/g, " ").trim();
};

const formatMarkdown = (entry: any): { text: string; json: EntryJSON } => {
  const getField = (key: string, fallback: string) =>
    cleanText((entry[key]?.[0] || fallback) as string);

  const openfda = entry.openfda || {};
  const name = openfda.brand_name?.[0] || "Name not recognized";
  const manufacturer = openfda.manufacturer_name?.[0] || "Unknown manufacturer";

  const activeIngredient = getField("active_ingredient", "Not specified");
  const purpose = getField("purpose", "Not specified");
  const description = getField("description", "No description");
  const indications = getField("indications_and_usage", "Not available.");
  const warnings = getField("warnings", "Not available.");
  const contraindications = getField("do_not_use", "Not available.");
  const whenUsing = getField("when_using", "Not available.");
  const stopUse = getField("stop_use", "Not available.");
  const keepOut = getField("keep_out_of_reach_of_children", "Not available.");
  const sideEffects = getField("adverse_reactions", "Not available.");
  const dosage = getField("dosage_and_administration", "Not available.");
  const storage = getField("storage_and_handling", "Not available.");
  const inactiveIngredients = getField("inactive_ingredient", "Not available.");
  const questions = getField("questions", "Not available.");

  const dataJson = {
    name,
    manufacturer,
    active_ingredient: activeIngredient,
    purpose,
    description,
    indications,
    warnings,
    contraindications,
    when_using: whenUsing,
    stop_use: stopUse,
    keep_out: keepOut,
    side_effects: sideEffects,
    dosage,
    storage,
    inactive_ingredients: inactiveIngredients,
    questions,
  };

  const text = `# Name of the Medicine
${name}

## Manufacturer
${manufacturer}

## Active Ingredient
${activeIngredient}

## Purpose
${purpose}

## Description
${description}

## Indications
- ${indications}

## Warnings
- ${warnings}

## Do Not Use
- ${contraindications}

## When Using
- ${whenUsing}

## Stop Use
- ${stopUse}

## Keep Out of Reach of Children
- ${keepOut}

## Side Effects
- ${sideEffects}

## Dosage Recommendations
${dosage}

## Storage and Handling
${storage}

## Inactive Ingredients
${inactiveIngredients}

## Questions or Comments
${questions}
`;

  return { text, json: dataJson };
};

const formatFromJSON = (entry: any): { text: string; json: EntryJSON } => {
  const name = entry.name || "Not Recognized";
  const manufacturer = entry.manufacturer || "Unknown Manufacturer";
  const activeIngredient = entry.active_ingredient || "Not specified";
  const purpose = entry.purpose || "Not specified";
  const description = entry.description || "No description";
  const indications = entry.indications || "Not available.";
  const warnings = entry.warnings || "Not available.";
  const contraindications = entry.contraindications || "Not available.";
  const whenUsing = entry.when_using || "Not available.";
  const stopUse = entry.stop_use || "Not available.";
  const keepOut = entry.keep_out || "Not available.";
  const sideEffects = entry.side_effects || "Not available.";
  const dosage = entry.dosage || "Not available.";
  const storage = entry.storage || "Not available.";
  const inactiveIngredients = entry.inactive_ingredients || "Not available.";
  const questions = entry.questions || "Not available.";
  const name_es = entry.name_es || "";
  const name_fr = entry.name_fr || "";

  const dataJson: EntryJSON = {
    name,
    manufacturer,
    active_ingredient: activeIngredient,
    purpose,
    description,
    indications,
    warnings,
    contraindications,
    when_using: whenUsing,
    stop_use: stopUse,
    keep_out: keepOut,
    side_effects: sideEffects,
    dosage,
    storage,
    inactive_ingredients: inactiveIngredients,
    questions,
    name_es,
    name_fr,
  };
  const text = `# Name of the Medicine
${name}
## Name (Spanish)
${name_es}
## Name (French)
${name_fr}

## Manufacturer
${manufacturer}

## Active Ingredient
${activeIngredient}

## Purpose
${purpose}

## Description
${description}

## Indications
- ${indications}

## Warnings
- ${warnings}

## Do Not Use
- ${contraindications}

## When Using
- ${whenUsing}

## Stop Use
- ${stopUse}

## Keep Out of Reach of Children
- ${keepOut}

## Side Effects
- ${sideEffects}

## Dosage Recommendations
${dosage}

## Storage and Handling
${storage}

## Inactive Ingredients
${inactiveIngredients}

## Questions or Comments
${questions}
`;

  return { text, json: dataJson };
};

const saveMeditimeMarkdown = (): void => {
  const meditimeText = `# MediTime

**Description**:  
MediTime is a medication management application that includes a smart pillbox. It helps users manage their daily medications and sends automatic reminders.

**Purpose**:  
Improve adherence to medical treatments and provide peace of mind for users and caregivers.

---

## 🔑 Main Features

### 🧠 Smart Pillbox
- A connected device synchronized with the mobile app.
- Features:
  - Automatic reminders
  - Personalized alerts
  - Real-time notifications
  - Precise control of schedules and doses

### 👤 User Management
- User roles: Caregiver, Patient
- Authentication:
  - Email/password sign-up
  - Login with registered credentials
  - Option to keep session active
  - Email verification

### 🧑‍⚕️ Patient Management
- Add new patients via form
- Patient details:
  - Name
  - Age
  - Medical conditions
  - Allergies
  - Description
- Switch between registered patients

### 💊 Medication Management
- Search medications by name
- Medication info:
  - Name
  - Dosage
  - Type (e.g., pills, mg, units)
- Schedule configuration:
  - Select specific weekdays
  - Set start time for first dose
  - Set interval between doses
  - Track medication stock
- Urgency levels: Low, Medium, High

### 💻 User Interface
- Supported languages: Spanish, English
- Navigation:
  - Home screen: general info and message carousel
  - Dashboard: greeting and patient overview
  - Medication management screen
  - Patient profile view
- Responsive design for phones, tablets, and web

### 🔔 Notifications
- Reminders for timely medication intake
- Requests permission to send alerts

---

## 🔄 User Flow

### First-Time Use
1. Register account
2. Verify email
3. Login
4. Set language
5. Add first patient
6. Set up first medication

### Daily Use
1. Login
2. Select patient
3. Review scheduled times
4. Receive notifications
5. Confirm medication intake

---

## ✅ Benefits

- Accurate medication control
- Fewer dosage errors
- Better treatment adherence
- Peace of mind for caregivers
- Centralized management of multiple patients
- Personalized automatic reminders

---

## 🎯 Target Audience

- Elderly users taking multiple medications
- Patient caregivers
- Family members responsible for medical care
- Individuals with chronic medical conditions
`;

  const filePath = path.join(OUTPUT_DIR, "meditime.md");
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(filePath, meditimeText, { encoding: "utf-8" });
  console.log(`📘 MediTime markdown saved at: ${filePath}`);
};

const fetchMedicines = async (): Promise<void> => {
  console.log("Fetching data from OpenFDA...");
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  saveMeditimeMarkdown();

  let skip = 0;
  let numWritten = 0;

  while (true) {
    const url = `${BASE_URL}?limit=${MAX_RESULTS}&skip=${skip}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const json = await response.json();
    const results = json.results || [];
    if (results.length === 0) {
      console.log("No more medications found.");
      break;
    }

    for (const entry of results) {
      const markdown = formatMarkdown(entry);
      const name = entry.openfda?.brand_name?.[0] || "Not Recognized";
      if (name === "Not Recognized") continue;

      const safeName = name.replace(/ /g, "_").replace(/\//g, "-");
      const mdFilename = path.join(OUTPUT_DIR, `${safeName}.md`);
      const jsonFilename = path.join(OUTPUT_DIR, `${safeName}.json`);

      fs.writeFileSync(mdFilename, markdown.text, { encoding: "utf-8" });
      fs.writeFileSync(jsonFilename, JSON.stringify(markdown.json, null, 4), {
        encoding: "utf-8",
      });

      numWritten++;
      console.log(`✅ Saved: ${mdFilename}`);
    }

    skip += MAX_RESULTS;
  }

  console.log(`All medications have been saved. Total written: ${numWritten}`);
};

const writeFromJSON = (): void => {
  const jsonPath = [PATH_JSON, "medications.json"].join("/");
  const json = JSON.parse(fs.readFileSync(jsonPath, "utf-8") || "{}");
  const entries = json
    .map((entry: any) => formatFromJSON(entry))
    .filter((entry: any) => entry.text && entry.json);

  saveMeditimeMarkdown();

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  console.log(`Output directory: ${OUTPUT_DIR}`, entries[0]);
  entries.forEach((entry: any) => {
    const mdFilename = path.join(
      OUTPUT_DIR,
      `${
        entry.json.name.replace(/ /g, "_").replace(/\//g, "-") ||
        "Not_Recognized"
      }.md`
    );
    fs.writeFileSync(mdFilename, entry.text, { encoding: "utf-8" });
  });
};

// fetchMedicines().catch((err) => console.error("Error fetching data:", err));
writeFromJSON();
