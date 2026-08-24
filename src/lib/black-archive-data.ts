export interface ArchiveItem {
  id: string;
  name: string;
  price: string;
  stock: string;
  imageUrl?: string;
  description?: string;
}

export interface ArchiveTier {
  id: string;
  name: string;
  headerBg?: string;
  headerTextColor?: string;
  note?: string;
  items: ArchiveItem[];
}

export interface BlackArchiveData {
  title: string;
  subtitle?: string;
  tiers: ArchiveTier[];
  updatedAt?: string;
}

export const DEFAULT_BLACK_ARCHIVE: BlackArchiveData = {
  title: "Booth items",
  subtitle: "Official Black Chips redemption booth and prizes archive.",
  tiers: [
    {
      id: "tier-1",
      name: "TIER 1: IMPERIUM TIER",
      headerBg: "#8a4242",
      headerTextColor: "#ffffff",
      note: "",
      items: [
        {
          id: "t1-item-1",
          name: "Undecided Prize",
          price: "??? Chips",
          stock: "???",
          imageUrl: "",
        },
        {
          id: "t1-item-2",
          name: "Undecided Prize",
          price: "??? Chips",
          stock: "???",
          imageUrl: "",
        },
      ],
    },
    {
      id: "tier-2",
      name: "TIER 2: PLATINUM TIER - HOGWARTS PROFESSORS",
      headerBg: "#8a4242",
      headerTextColor: "#ffffff",
      note: "*Tier 2 changes every 3 months based on a theme. Suggest a theme here if you'd like.",
      items: [
        {
          id: "t2-item-1",
          name: "Dumbledore's Large Silver Cracker",
          price: "200 Chips",
          stock: "1",
          imageUrl: "https://i.imgur.com/rQ0Y0b0.png",
        },
        {
          id: "t2-item-2",
          name: "Alastor Moody Portrait",
          price: "500 Chips",
          stock: "1",
          imageUrl: "https://i.imgur.com/3Z8j8Yd.png",
        },
        {
          id: "t2-item-3",
          name: "Lockhart's Signature",
          price: "300 Chips",
          stock: "1",
          imageUrl: "https://i.imgur.com/wVfR9Qx.png",
        },
        {
          id: "t2-item-4",
          name: "Professor Quirrell Portrait",
          price: "350 Chips",
          stock: "1",
          imageUrl: "https://i.imgur.com/8QzXkPq.png",
        },
      ],
    },
    {
      id: "tier-3",
      name: "TIER 3: DIAMOND TIER",
      headerBg: "#8a4242",
      headerTextColor: "#ffffff",
      note: "",
      items: [
        {
          id: "t3-item-1",
          name: "Common Welsh Green Egg",
          price: "900 Chips",
          stock: "1",
          imageUrl: "https://i.imgur.com/5lV5KkZ.png",
        },
        {
          id: "t3-item-2",
          name: "Hagrid's Photo with his Dad",
          price: "900 Chips",
          stock: "1",
          imageUrl: "https://i.imgur.com/qL5Xb8D.png",
        },
        {
          id: "t3-item-3",
          name: "Animal Model - Basilisk",
          price: "900 Chips",
          stock: "1",
          imageUrl: "https://i.imgur.com/b9L5X5z.png",
        },
        {
          id: "t3-item-4",
          name: "Damaged Vanishing Cabinet",
          price: "850 Chips",
          stock: "1",
          imageUrl: "https://i.imgur.com/Xk5L9Qx.png",
        },
      ],
    },
    {
      id: "tier-4",
      name: "TIER 4: SAPPHIRE TIER",
      headerBg: "#8a4242",
      headerTextColor: "#ffffff",
      note: "",
      items: [
        {
          id: "t4-item-1",
          name: "Sirius' Motorcycle Poster",
          price: "650 Chips",
          stock: "1",
          imageUrl: "https://i.imgur.com/m5L9XkQ.png",
        },
        {
          id: "t4-item-2",
          name: "Christmas Badger Plushie",
          price: "600 Chips",
          stock: "1",
          imageUrl: "https://i.imgur.com/P5L9XkZ.png",
        },
        {
          id: "t4-item-3",
          name: "Seamus' Chess Pieces",
          price: "450 Chips",
          stock: "1",
          imageUrl: "https://i.imgur.com/8Q5XkPz.png",
        },
        {
          id: "t4-item-4",
          name: "Unicorn Horn",
          price: "400 Chips",
          stock: "1",
          imageUrl: "https://i.imgur.com/7L5Xb8D.png",
        },
        {
          id: "t4-item-5",
          name: "Train",
          price: "400 Chips",
          stock: "1",
          imageUrl: "https://i.imgur.com/3L5Xb8D.png",
        },
        {
          id: "t4-item-6",
          name: "Grindelwald's Charivari",
          price: "400 Chips",
          stock: "1",
          imageUrl: "https://i.imgur.com/2L5Xb8D.png",
        },
        {
          id: "t4-item-7",
          name: "Dumbledore's Magnifying Glass",
          price: "400 Chips",
          stock: "1",
          imageUrl: "https://i.imgur.com/1L5Xb8D.png",
        },
        {
          id: "t4-item-8",
          name: "Gold Swan Charm",
          price: "200 Chips",
          stock: "1",
          imageUrl: "https://i.imgur.com/0L5Xb8D.png",
        },
      ],
    },
    {
      id: "tier-5",
      name: "TIER 5: BLACK TIER",
      headerBg: "#8a4242",
      headerTextColor: "#ffffff",
      note: "",
      items: [
        {
          id: "t5-item-1",
          name: "Chocolate Mint Mocktail",
          price: "170 Chips",
          stock: "1",
          imageUrl: "https://i.imgur.com/9L5Xb8D.png",
        },
        {
          id: "t5-item-2",
          name: "Jammie Dodgers Charm",
          price: "150 Chips",
          stock: "3",
          imageUrl: "https://i.imgur.com/4L5Xb8D.png",
        },
        {
          id: "t5-item-3",
          name: "Hagrid's Bowl of Peas",
          price: "90 Chips",
          stock: "1",
          imageUrl: "https://i.imgur.com/6L5Xb8D.png",
        },
        {
          id: "t5-item-4",
          name: "Mulled Wine",
          price: "90 Chips",
          stock: "1",
          imageUrl: "https://i.imgur.com/8L5Xb8D.png",
        },
        {
          id: "t5-item-5",
          name: "Dark Mark Clacker",
          price: "75 Chips",
          stock: "1",
          imageUrl: "https://i.imgur.com/5Xk9LQz.png",
        },
        {
          id: "t5-item-6",
          name: "Winter Mandrake - Pink",
          price: "70 Chips",
          stock: "1",
          imageUrl: "https://i.imgur.com/8Xk9LQz.png",
        },
        {
          id: "t5-item-7",
          name: "Paulopabita's Fishy Green Ale",
          price: "60 Chips",
          stock: "1",
          imageUrl: "https://i.imgur.com/7Xk9LQz.png",
        },
        {
          id: "t5-item-8",
          name: "Dudley's VCR",
          price: "50 Chips",
          stock: "1",
          imageUrl: "https://i.imgur.com/6Xk9LQz.png",
        },
        {
          id: "t5-item-9",
          name: "Custom Post Decor*",
          price: "25 Chips",
          stock: "Unlimited",
          imageUrl: "https://i.imgur.com/3Xk9LQz.png",
        },
        {
          id: "t5-item-10",
          name: "Custom Avatar - Username**",
          price: "10 Chips",
          stock: "Unlimited",
          imageUrl: "https://i.imgur.com/3Xk9LQz.png",
        },
      ],
    },
  ],
};

export const ARCHIVE_STORAGE_KEY = "econ_black_archive_v1";

export function loadLocalBlackArchive(): BlackArchiveData {
  if (typeof window === "undefined") return DEFAULT_BLACK_ARCHIVE;
  try {
    const raw = localStorage.getItem(ARCHIVE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.tiers?.length > 0) return parsed;
    }
  } catch (err) {
    console.error("Failed to load local black archive cache:", err);
  }
  return DEFAULT_BLACK_ARCHIVE;
}

export function saveLocalBlackArchive(data: BlackArchiveData) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ARCHIVE_STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error("Failed to save local black archive cache:", err);
  }
}
