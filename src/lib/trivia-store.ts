import fs from "fs";
import path from "path";

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

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(TRIVIA_FILE)) {
    fs.writeFileSync(
      TRIVIA_FILE,
      JSON.stringify(DEFAULT_STORE_DATA, null, 2),
      "utf-8"
    );
  }
}

export function getTriviaStoreData(): TriviaStoreData {
  ensureDataFile();
  try {
    const raw = fs.readFileSync(TRIVIA_FILE, "utf-8");
    const parsed = JSON.parse(raw);

    // Support object structure { visibilityFreq: 1, trivia: [...] }
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const visibilityFreq =
        typeof parsed.visibilityFreq === "number" && parsed.visibilityFreq >= 0
          ? parsed.visibilityFreq
          : 1;
      const trivia = Array.isArray(parsed.trivia) ? parsed.trivia : DEFAULT_SAMPLE_TRIVIA;
      return { visibilityFreq, trivia };
    }

    // Support legacy array structure [...]
    if (Array.isArray(parsed)) {
      return {
        visibilityFreq: 1,
        trivia: parsed.length > 0 ? parsed : DEFAULT_SAMPLE_TRIVIA,
      };
    }

    return DEFAULT_STORE_DATA;
  } catch (error) {
    console.error("Error reading chips-trivia.json:", error);
    return DEFAULT_STORE_DATA;
  }
}

export function getTriviaList(): TriviaItem[] {
  return getTriviaStoreData().trivia;
}

export function saveTriviaStoreData(data: TriviaStoreData): void {
  ensureDataFile();
  fs.writeFileSync(TRIVIA_FILE, JSON.stringify(data, null, 2), "utf-8");
}

export function saveTriviaList(trivia: TriviaItem[], visibilityFreq = 1): void {
  saveTriviaStoreData({ visibilityFreq, trivia });
}
