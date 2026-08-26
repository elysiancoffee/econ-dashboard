import { NextRequest, NextResponse } from "next/server";
import { dbFetchBlackArchive, dbSaveBlackArchive } from "@/lib/actions";
import { DEFAULT_BLACK_ARCHIVE, BlackArchiveData } from "@/lib/black-archive-data";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const simulateError = searchParams.get("simulate_error") === "true";
  const simulate500 = searchParams.get("simulate_500") === "true";

  // Simulate a hard 500 error if requested
  if (simulate500) {
    return NextResponse.json(
      { error: "Simulated 500 Internal Server Error" },
      {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }

  try {
    // Simulate a database exception/failure
    if (simulateError) {
      throw new Error("Simulated Database Connection Failure!");
    }

    const dbData = await dbFetchBlackArchive();
    const data: BlackArchiveData = dbData?.tiers?.length ? dbData : DEFAULT_BLACK_ARCHIVE;

    return NextResponse.json(data, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        "X-Data-Source": dbData?.tiers?.length ? "database" : "default-snapshot",
      },
    });
  } catch (error) {
    console.warn("API /api/black-archive caught error -> serving fallback cache:", error);

    // Fail-safe: Returns the pre-bundled snapshot fallback with 200 OK
    return NextResponse.json(
      {
        ...DEFAULT_BLACK_ARCHIVE,
        _fallback: true,
        _fallbackReason: error instanceof Error ? error.message : "Database Error",
      },
      {
        status: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
          "X-Data-Source": "fallback-cache",
        },
      }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body || !Array.isArray(body.tiers)) {
      return NextResponse.json({ error: "Invalid payload format" }, { status: 400 });
    }

    const payload: BlackArchiveData = {
      title: body.title || "Booth items",
      subtitle: body.subtitle || "",
      tiers: body.tiers,
      updatedAt: new Date().toISOString(),
    };

    const res = await dbSaveBlackArchive(payload);
    if (!res.success) {
      return NextResponse.json({ error: res.error || "Failed to save" }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: payload });
  } catch (error) {
    console.error("API /api/black-archive POST error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
