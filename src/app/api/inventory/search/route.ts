import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

interface HexRpgSearchEntry {
  category?: string;
  label?: string;
  username?: string;
  view_more_link?: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const term = searchParams.get("term") || searchParams.get("q") || "";

    if (!term.trim()) {
      return NextResponse.json({ items: [] });
    }

    const apiUrl = `https://www.hexrpg.com/ajax/topbar/search.php?search=items&term=${encodeURIComponent(
      term.trim()
    )}`;

    const res = await fetch(apiUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "application/json, text/javascript, */*; q=0.01",
        Referer: "https://www.hexrpg.com/",
      },
      next: { revalidate: 60 }, // Cache search queries for 60s
    });

    if (!res.ok) {
      console.error(`HexRPG search error: ${res.status} ${res.statusText}`);
      return NextResponse.json({ items: [] });
    }

    const data: HexRpgSearchEntry[] = await res.json();

    if (!Array.isArray(data)) {
      return NextResponse.json({ items: [] });
    }

    // Filter ONLY items: category must be "Items:" (or start with "item") and label must be present
    const seen = new Set<string>();
    const items: string[] = [];

    for (const entry of data) {
      if (
        entry.category &&
        entry.category.toLowerCase().startsWith("item") &&
        entry.label
      ) {
        const cleaned = entry.label.trim();
        if (cleaned && !seen.has(cleaned.toLowerCase())) {
          seen.add(cleaned.toLowerCase());
          items.push(cleaned);
        }
      }
    }

    return NextResponse.json({ items });
  } catch (error) {
    console.error("Failed to fetch HexRPG items:", error);
    return NextResponse.json({ items: [], error: "Failed to fetch items" }, { status: 500 });
  }
}
