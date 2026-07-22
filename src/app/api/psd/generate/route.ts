import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import { readPsd, initializeCanvas, Layer } from "ag-psd";
import { createCanvas, Image } from "canvas";
import { getTemplateById, getTemplatePsdPath } from "@/lib/psd-store";

export const runtime = "nodejs";

// Initialize canvas adapter for Node environment with factory functions
try {
  initializeCanvas(
    (width: number, height: number) => createCanvas(width, height) as any,
    () => new Image() as any
  );
} catch (e) {
  console.log("Canvas initialization note:", e);
}

function updateTextLayers(
  layers: Layer[] = [],
  fieldValuesMap: Map<string, string>
): void {
  if (!Array.isArray(layers)) return;
  for (const layer of layers) {
    if (!layer) continue;
    if (layer.name) {
      const cleanName = layer.name.trim().toLowerCase();
      if (fieldValuesMap.has(cleanName)) {
        const newText = fieldValuesMap.get(cleanName)!;
        if (layer.text) {
          layer.text.text = newText;
        }
      }
    }
    if (layer.children && Array.isArray(layer.children)) {
      updateTextLayers(layer.children, fieldValuesMap);
    }
  }
}

function drawTextLayersRecursive(ctx: any, layer: Layer) {
  if (layer.hidden) return;

  const opacity = layer.opacity !== undefined ? layer.opacity : 1;
  ctx.save();
  ctx.globalAlpha *= opacity;

  // If bitmap canvas exists on layer, draw it
  if (layer.canvas && !layer.text) {
    try {
      const x = layer.left || 0;
      const y = layer.top || 0;
      ctx.drawImage(layer.canvas as any, x, y);
    } catch (err) {
      console.warn("Layer canvas draw note:", err);
    }
  }

  // If text layer, draw updated text string
  if (layer.text) {
    try {
      const textStr = layer.text.text || "";
      const style = layer.text.style || {};
      const fontSize = Math.max(12, Math.round(style.fontSize || 24));
      const fontName = style.font?.name || "Arial, sans-serif";
      const color: any = style.fillColor || { r: 255, g: 255, b: 255, a: 1 };

      ctx.font = `${fontSize}px "${fontName}", sans-serif`;
      ctx.fillStyle = `rgba(${color.r ?? 255}, ${color.g ?? 255}, ${color.b ?? 255}, ${color.a ?? 1})`;
      ctx.textBaseline = "top";

      const x = layer.left || 0;
      const y = layer.top || 0;

      ctx.fillText(textStr, x, y);
    } catch (err) {
      console.warn("Text layer draw note:", err);
    }
  }

  // Draw child layers recursively
  if (layer.children && Array.isArray(layer.children)) {
    for (const child of layer.children) {
      drawTextLayersRecursive(ctx, child);
    }
  }

  ctx.restore();
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
    const uint8Array = new Uint8Array(
      psdBuffer.buffer,
      psdBuffer.byteOffset,
      psdBuffer.byteLength
    );

    let psd: any;
    try {
      // Read PSD with skipLayerImageData: true to avoid mask crashes, while keeping composite image
      psd = readPsd(uint8Array, {
        skipLayerImageData: true,
        skipThumbnail: true,
      });
    } catch (e1) {
      console.warn("PSD read composite attempt fallback:", e1);
      psd = readPsd(uint8Array, {
        skipLayerImageData: true,
        skipCompositeImageData: true,
        skipThumbnail: true,
      });
    }

    console.log("PSD Parsed Info:", {
      width: psd.width,
      height: psd.height,
      hasPsdCanvas: !!psd.canvas,
      childrenCount: psd.children?.length || 0,
    });

    // Map field values case-insensitively
    const fieldValuesMap = new Map<string, string>();
    for (const [key, val] of Object.entries(fieldValues)) {
      fieldValuesMap.set(key.trim().toLowerCase(), String(val));
    }

    // Update text in matching text layers
    updateTextLayers(psd.children || [], fieldValuesMap);

    const width = psd.width || 1200;
    const height = psd.height || 800;
    const finalCanvas = createCanvas(width, height);
    const ctx = finalCanvas.getContext("2d");

    // Draw background composite canvas if present
    if (psd.canvas) {
      ctx.drawImage(psd.canvas as any, 0, 0);
    } else {
      // Clean background fallback
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
    }

    // Draw text layers over the canvas
    if (psd.children && Array.isArray(psd.children)) {
      for (const layer of psd.children) {
        drawTextLayersRecursive(ctx, layer);
      }
    }

    const isJpg = format.toLowerCase() === "jpg" || format.toLowerCase() === "jpeg";

    if (isJpg) {
      const jpgCanvas = createCanvas(width, height);
      const jpgCtx = jpgCanvas.getContext("2d");
      jpgCtx.fillStyle = "#ffffff";
      jpgCtx.fillRect(0, 0, width, height);
      jpgCtx.drawImage(finalCanvas, 0, 0);
      const mimeType = "image/jpeg";
      const imageBuffer = jpgCanvas.toBuffer(mimeType);
      const base64Data = imageBuffer.toString("base64");
      const dataUrl = `data:${mimeType};base64,${base64Data}`;

      return NextResponse.json({
        success: true,
        dataUrl,
        format: "jpg",
        filename: `${template.id}-generated.jpg`,
      });
    } else {
      const mimeType = "image/png";
      const imageBuffer = finalCanvas.toBuffer(mimeType);
      const base64Data = imageBuffer.toString("base64");
      const dataUrl = `data:${mimeType};base64,${base64Data}`;

      return NextResponse.json({
        success: true,
        dataUrl,
        format: "png",
        filename: `${template.id}-generated.png`,
      });
    }
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
