import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import { readPsd, renderPsd, Layer } from "ag-psd";
import { createCanvas, Image } from "canvas";
import { initializeCanvas } from "ag-psd/node";
import { getTemplateById, getTemplatePsdPath } from "@/lib/psd-store";

export const runtime = "nodejs";

// Initialize canvas adapter for Node environment
try {
  initializeCanvas(createCanvas as any, Image as any);
} catch (e) {
  console.log("Canvas initialization note:", e);
}

function updateTextLayers(
  layers: Layer[] = [],
  fieldValuesMap: Map<string, string>
): void {
  for (const layer of layers) {
    if (layer.name) {
      const cleanName = layer.name.trim().toLowerCase();
      if (fieldValuesMap.has(cleanName)) {
        const newText = fieldValuesMap.get(cleanName)!;
        if (layer.text) {
          layer.text.text = newText;
        }
      }
    }
    if (layer.children && layer.children.length > 0) {
      updateTextLayers(layer.children, fieldValuesMap);
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { templateId, fieldValues, format = "png" } = body;

    if (!templateId || !fieldValues) {
      return NextResponse.json(
        {
          success: false,
          message: "Template ID and field values are required.",
        },
        { status: 400 }
      );
    }

    const template = getTemplateById(templateId);
    if (!template) {
      return NextResponse.json(
        {
          success: false,
          message: "PSD Template not found.",
        },
        { status: 404 }
      );
    }

    const psdPath = getTemplatePsdPath(template.psdFileName);
    if (!fs.existsSync(psdPath)) {
      return NextResponse.json(
        {
          success: false,
          message: "PSD source file is missing.",
        },
        { status: 404 }
      );
    }

    const psdBuffer = fs.readFileSync(psdPath);
    const psd = readPsd(psdBuffer, { skipThumbnail: true });

    // Map field values case-insensitively
    const fieldValuesMap = new Map<string, string>();
    for (const [key, val] of Object.entries(fieldValues)) {
      fieldValuesMap.set(key.trim().toLowerCase(), String(val));
    }

    // Replace text in matching layers while preserving font, size, alignment, tracking & color
    updateTextLayers(psd.children, fieldValuesMap);

    // Render composite PSD image using Canvas
    const canvas = renderPsd(psd);

    const isJpg = format.toLowerCase() === "jpg" || format.toLowerCase() === "jpeg";
    const mimeType = isJpg ? "image/jpeg" : "image/png";
    const imageBuffer = canvas.toBuffer(mimeType as any);

    const base64Data = imageBuffer.toString("base64");
    const dataUrl = `data:${mimeType};base64,${base64Data}`;

    return NextResponse.json({
      success: true,
      dataUrl,
      format: isJpg ? "jpg" : "png",
      filename: `${template.id}-generated.${isJpg ? "jpg" : "png"}`,
    });
  } catch (error) {
    console.error("PSD generation error:", error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to generate image from PSD template.",
      },
      { status: 500 }
    );
  }
}
