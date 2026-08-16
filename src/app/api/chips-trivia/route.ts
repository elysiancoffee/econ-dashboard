import { NextRequest, NextResponse } from "next/server";
import {
  getTriviaStoreData,
  saveTriviaStoreData,
  TriviaItem,
} from "@/lib/trivia-store";

export const runtime = "nodejs";

// Standard CORS headers allowing requests from external sites (e.g. elysiancoffee.github.io)
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-api-key",
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
};

// Handle Preflight CORS requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const isDownload = searchParams.get("download") === "true";
    const format = searchParams.get("format");
    const isManageMode = searchParams.get("manage") === "true";
    const { visibilityFreq, trivia } = getTriviaStoreData();

    // Direct JSON file download for admin export
    if (isDownload) {
      const jsonContent = JSON.stringify({ visibilityFreq, trivia }, null, 2);
      return new NextResponse(jsonContent, {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": 'attachment; filename="chips-trivia.json"',
        },
      });
    }

    // Extract questions/riddles list
    const riddles = trivia
      .map((item) => item.question?.trim())
      .filter(Boolean);

    // If client asks for flat array format directly
    if (format === "array" || format === "riddles") {
      return NextResponse.json(riddles, {
        status: 200,
        headers: corsHeaders,
      });
    }

    // If in management mode (used by the admin page), include answers.
    // Otherwise, for public API access, EXCLUDE all answers to prevent cheating.
    if (isManageMode) {
      return NextResponse.json(
        {
          success: true,
          visibilityFreq,
          count: trivia.length,
          trivia,
        },
        {
          status: 200,
          headers: corsHeaders,
        }
      );
    }

    // PUBLIC API RESPONSE: Questions / Riddles only (NO ANSWERS) + dynamic visibilityFreq
    const publicTrivia = trivia.map((t) => ({
      id: t.id,
      question: t.question,
    }));

    return NextResponse.json(
      {
        success: true,
        visibilityFreq, // Dynamic frequency for randomBAC.js
        count: riddles.length,
        riddles, // Array of strings: ["Question 1", "Question 2", ...]
        trivia: publicTrivia, // Objects with id and question ONLY
      },
      {
        status: 200,
        headers: corsHeaders,
      }
    );
  } catch (error) {
    console.error("Failed to fetch trivia:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch trivia list." },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let triviaData: any[] = [];
    let visibilityFreq = 1;

    if (Array.isArray(body)) {
      triviaData = body;
    } else if (body && typeof body === "object") {
      if (Array.isArray(body.trivia)) {
        triviaData = body.trivia;
      } else if (Array.isArray(body.riddles)) {
        triviaData = body.riddles.map((q: string, i: number) => ({
          id: String(i + 1),
          question: q,
          answer: "",
        }));
      }

      if (typeof body.visibilityFreq === "number" && body.visibilityFreq >= 0) {
        visibilityFreq = body.visibilityFreq;
      }
    } else {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid payload format. Expected an array or { visibilityFreq, trivia } object.",
        },
        { status: 400, headers: corsHeaders }
      );
    }

    // Format and sanitize items
    const sanitized: TriviaItem[] = triviaData
      .filter((item) => item && (item.question || item.answer))
      .map((item, index) => ({
        id: String(item.id || index + 1),
        question: typeof item.question === "string" ? item.question.trim() : "",
        answer: typeof item.answer === "string" ? item.answer.trim() : "",
      }));

    saveTriviaStoreData({
      visibilityFreq,
      trivia: sanitized,
    });

    return NextResponse.json(
      {
        success: true,
        message: `Successfully saved ${sanitized.length} trivia items (Visibility Frequency: ${visibilityFreq}).`,
        visibilityFreq,
        count: sanitized.length,
      },
      {
        status: 200,
        headers: corsHeaders,
      }
    );
  } catch (error) {
    console.error("Failed to save trivia:", error);
    return NextResponse.json(
      { success: false, message: "Failed to save trivia list." },
      { status: 500, headers: corsHeaders }
    );
  }
}
