import fs from "fs";
import path from "path";

export interface PsdField {
  id: string;
  layerName: string;
  label: string;
  defaultValue?: string;
}

export interface PsdTemplate {
  id: string;
  title: string;
  description: string;
  psdFileName: string;
  fields: PsdField[];
  createdAt: string;
  createdBy: string;
}

const DATA_DIR = path.join(process.cwd(), "data");
const TEMPLATES_FILE = path.join(DATA_DIR, "psd-templates.json");
const PSD_FILES_DIR = path.join(DATA_DIR, "psd-templates");

function ensureDirs() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(PSD_FILES_DIR)) {
    fs.mkdirSync(PSD_FILES_DIR, { recursive: true });
  }
  if (!fs.existsSync(TEMPLATES_FILE)) {
    fs.writeFileSync(TEMPLATES_FILE, JSON.stringify([], null, 2), "utf-8");
  }
}

export function getAllTemplates(): PsdTemplate[] {
  ensureDirs();
  try {
    const raw = fs.readFileSync(TEMPLATES_FILE, "utf-8");
    return JSON.parse(raw);
  } catch (error) {
    console.error("Error reading psd-templates.json:", error);
    return [];
  }
}

export function getTemplateById(id: string): PsdTemplate | null {
  const templates = getAllTemplates();
  return templates.find((t) => t.id === id) || null;
}

export function saveTemplate(template: PsdTemplate, psdBuffer: Buffer): void {
  ensureDirs();
  const templates = getAllTemplates();

  // Save PSD file
  const psdPath = path.join(PSD_FILES_DIR, template.psdFileName);
  fs.writeFileSync(psdPath, psdBuffer);

  // Save metadata
  const existingIndex = templates.findIndex((t) => t.id === template.id);
  if (existingIndex >= 0) {
    templates[existingIndex] = template;
  } else {
    templates.push(template);
  }

  fs.writeFileSync(TEMPLATES_FILE, JSON.stringify(templates, null, 2), "utf-8");
}

export function getTemplatePsdPath(psdFileName: string): string {
  ensureDirs();
  return path.join(PSD_FILES_DIR, psdFileName);
}

export function deleteTemplate(id: string): boolean {
  ensureDirs();
  const templates = getAllTemplates();
  const template = templates.find((t) => t.id === id);
  if (!template) return false;

  // Delete PSD file
  const psdPath = path.join(PSD_FILES_DIR, template.psdFileName);
  if (fs.existsSync(psdPath)) {
    try {
      fs.unlinkSync(psdPath);
    } catch (err) {
      console.error("Failed to delete PSD file:", err);
    }
  }

  // Update metadata
  const filtered = templates.filter((t) => t.id !== id);
  fs.writeFileSync(TEMPLATES_FILE, JSON.stringify(filtered, null, 2), "utf-8");
  return true;
}
