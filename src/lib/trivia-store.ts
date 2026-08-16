import fs from "fs";
import path from "path";
import { db } from "@/lib/db/client";
import * as schema from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

export interface TriviaItem {
  id: string;
  question: string;
  answer: string;
}

export interface TriviaStoreData {
  visibilityFreq: number;
  trivia: TriviaItem[];
}

const DATA_DIR = path.join(process.cwd(), "data");
const TRIVIA_FILE = path.join(DATA_DIR, "chips-trivia.json");

export const DEFAULT_SAMPLE_TRIVIA: TriviaItem[] = [
  {
    id: "1",
    question: "Which position has the most power in our ECON Family?",
    answer: "Boss",
  },
  {
    id: "2",
    question: "What position did Harry play on the Gryffindor Quidditch team?",
    answer: "Seeker",
  },
  {
    id: "3",
    question: "What did Dumbledore leave to Hermione in his will?",
    answer: "The Tales of Beedle the Bard",
  },
  {
    id: "4",
    question: "What does the word Omertà refer to in Mafia culture?",
    answer: "Code of silence",
  },
  {
    id: "5",
    question: "Who was known as The Teflon Don because charges against him never stuck?",
    answer: "John Gotti",
  },
  {
    id: "6",
    question: "What is the Mafia term for a boss of bosses?",
    answer: "Capo di tutti capi",
  },
  {
    id: "7",
    question: "Which vault number held the Philosopher’s Stone at Gringotts?",
    answer: "Vault 713",
  },
  {
    id: "8",
    question: "Who founded the “Commission” (La Commissione) to organize the American Mafia families?",
    answer: "Charles \"Lucky\" Luciano",
  },
  {
    id: "9",
    question: "What is the name of the incentive that mainly powers our ECON Pricing Sheet Database?",
    answer: "Black Chips",
  },
  {
    id: "10",
    question: "According to our La Nostra Omertá, are you allowed to make game threads inside the club?",
    answer: "No",
  },
];

const DEFAULT_STORE_DATA: TriviaStoreData = {
  visibilityFreq: 1,
  trivia: DEFAULT_SAMPLE_TRIVIA,
};

// In-memory fallback if both DB and filesystem are restricted
let inMemoryStore: TriviaStoreData | null = null;
let tableInitialized = false;

async function ensureDbTable() {
  if (tableInitialized) return;
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "chips_trivia" (
        "id" text PRIMARY KEY NOT NULL,
        "visibility_freq" integer DEFAULT 1 NOT NULL,
        "trivia" jsonb NOT NULL,
        "updated_at" text NOT NULL
      );
    `);
    tableInitialized = true;
  } catch (err) {
    console.warn("Could not auto-create chips_trivia table:", err);
  }
}

function readFromFile(): TriviaStoreData {
  try {
    if (fs.existsSync(TRIVIA_FILE)) {
      const raw = fs.readFileSync(TRIVIA_FILE, "utf-8");
      const parsed = JSON.parse(raw);

      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        const visibilityFreq =
          typeof parsed.visibilityFreq === "number" && parsed.visibilityFreq >= 0
            ? parsed.visibilityFreq
            : 1;
        const trivia = Array.isArray(parsed.trivia) ? parsed.trivia : DEFAULT_SAMPLE_TRIVIA;
        return { visibilityFreq, trivia };
      }

      if (Array.isArray(parsed)) {
        return {
          visibilityFreq: 1,
          trivia: parsed.length > 0 ? parsed : DEFAULT_SAMPLE_TRIVIA,
        };
      }
    }
  } catch (err) {
    console.warn("File read note:", err);
  }
  return inMemoryStore || DEFAULT_STORE_DATA;
}

function writeToFile(data: TriviaStoreData) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(TRIVIA_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch {
    // Expected on Vercel serverless read-only filesystem; handled gracefully
  }
}

export async function getTriviaStoreData(): Promise<TriviaStoreData> {
  // 1. Try PostgreSQL Database first (Persistent on Vercel)
  try {
    await ensureDbTable();
    const rows = await db
      .select()
      .from(schema.chipsTrivia)
      .where(eq(schema.chipsTrivia.id, "main"))
      .limit(1);

    if (rows.length > 0) {
      const row = rows[0];
      const visibilityFreq = typeof row.visibilityFreq === "number" ? row.visibilityFreq : 1;
      const trivia = Array.isArray(row.trivia) ? (row.trivia as unknown as TriviaItem[]) : DEFAULT_SAMPLE_TRIVIA;
      inMemoryStore = { visibilityFreq, trivia };
      return { visibilityFreq, trivia };
    }
  } catch (dbErr) {
    console.warn("DB fetch fallback to file/memory:", dbErr);
  }

  // 2. Fallback to file/memory
  return readFromFile();
}

export async function saveTriviaStoreData(data: TriviaStoreData): Promise<void> {
  inMemoryStore = data;

  // 1. Save to PostgreSQL Database (Primary persistent storage for Vercel)
  try {
    await ensureDbTable();
    await db
      .insert(schema.chipsTrivia)
      .values({
        id: "main",
        visibilityFreq: data.visibilityFreq,
        trivia: data.trivia,
        updatedAt: new Date().toISOString(),
      })
      .onConflictDoUpdate({
        target: schema.chipsTrivia.id,
        set: {
          visibilityFreq: data.visibilityFreq,
          trivia: data.trivia,
          updatedAt: new Date().toISOString(),
        },
      });
  } catch (dbErr) {
    console.error("DB save error:", dbErr);
  }

  // 2. Also try saving to local filesystem if writable (e.g. in local development)
  writeToFile(data);
}

export async function getTriviaList(): Promise<TriviaItem[]> {
  const data = await getTriviaStoreData();
  return data.trivia;
}

export async function saveTriviaList(trivia: TriviaItem[], visibilityFreq = 1): Promise<void> {
  await saveTriviaStoreData({ visibilityFreq, trivia });
}
