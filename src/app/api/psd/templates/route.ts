import { NextRequest, NextResponse } from "next/server";
import { readPsd, Layer } from "ag-psd";
import {
  getAllTemplates,
  saveTemplate,
  deleteTemplate,
  PsdTemplate,
  PsdField,
} from "@/lib/psd-store";

export const runtime = "nodejs";

function findAllLayerNames(layers: Layer[] = []): string[] {
  let names: string[] = [];
  for (const layer of layers) {
    if (layer.name) {
      names.push(layer.name.trim());
    }
    if (layer.children && layer.children.length > 0) {
      names = names.concat(findAllLayerNames(layer.children));
    }
  }
  return names;
}

export async function GET() {
  try {
    const templates = getAllTemplates();
    return NextResponse.json({
      success: true,
      templates,
    });
  } catch (error) {
    console.error("Failed to fetch templates:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch templates." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userRole = request.headers.get("x-user-role");

    if (userRole !== "Boss") {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized. Only Bosses can upload and create PSD templates.",
        },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const title = formData.get("title") as string;
    const description = (formData.get("description") as string) || "";
    const fieldsRaw = formData.get("fields") as string;
    const createdBy = (formData.get("createdBy") as string) || "Boss";

    if (!(file instanceof File) || !file.name.toLowerCase().endsWith(".psd")) {
      return NextResponse.json(
        {
          success: false,
          message: "Please upload a valid .psd file.",
        },
        { status: 400 }
      );
    }

    if (!title || !fieldsRaw) {
      return NextResponse.json(
        {
          success: false,
          message: "Title and fields configuration are required.",
        },
        { status: 400 }
      );
    }

    let fields: PsdField[] = [];
    try {
      fields = JSON.parse(fieldsRaw);
    } catch {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid fields JSON format.",
        },
        { status: 400 }
      );
    }

    if (!Array.isArray(fields) || fields.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "At least one editable field layer configuration is required.",
        },
        { status: 400 }
      );
    }

    // Read PSD buffer and parse layer structure
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let psd;
    try {
      psd = readPsd(buffer, {
        skipLayerImageData: true,
        skipCompositeImageData: true,
        skipThumbnail: true,
      });
    } catch (err) {
      console.error("PSD parsing error:", err);
      const detail = err instanceof Error ? err.message : String(err);
      return NextResponse.json(
        {
          success: false,
          message: `Could not parse PSD file structure (${detail}). Ensure it is a valid .psd document.`,
        },
        { status: 400 }
      );
    }

    // Extract all layer names recursively
    const existingLayerNames = findAllLayerNames(psd.children);

    // Verify every field's layerName exists in the PSD layer tree
    const missingFields: string[] = [];
    for (const field of fields) {
      const targetName = field.layerName.trim();
      const found = existingLayerNames.some(
        (name) => name.toLowerCase() === targetName.toLowerCase()
      );
      if (!found) {
        missingFields.push(targetName);
      }
    }

    if (missingFields.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: `Validation failed: Layer "${missingFields[0]}" was not found in the uploaded PSD file. Found layers: ${existingLayerNames.slice(0, 10).join(", ")}${existingLayerNames.length > 10 ? "..." : ""}`,
        },
        { status: 400 }
      );
    }

    // Generate slug id from title
    const id = title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-_]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") + "-" + Date.now();

    const psdFileName = `${id}.psd`;

    const template: PsdTemplate = {
      id,
      title,
      description,
      psdFileName,
      fields,
      createdAt: new Date().toISOString(),
      createdBy,
    };

    saveTemplate(template, buffer);

    return NextResponse.json({
      success: true,
      message: "PSD Template created successfully.",
      template,
    });
  } catch (error) {
    console.error("Template creation error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to create PSD template.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userRole = request.headers.get("x-user-role");

    if (userRole !== "Boss") {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized. Only Bosses can delete templates.",
        },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Template ID is required." },
        { status: 400 }
      );
    }

    const deleted = deleteTemplate(id);
    if (!deleted) {
      return NextResponse.json(
        { success: false, message: "Template not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Template deleted successfully.",
    });
  } catch (error) {
    console.error("Template delete error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to delete template." },
      { status: 500 }
    );
  }
}
