import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          success: false,
          message: "No image was provided.",
        },
        { status: 400 }
      );
    }

    // Only allow images
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        {
          success: false,
          message: "Only image files are allowed.",
        },
        { status: 400 }
      );
    }

    // Maximum file size: 5 MB
    const MAX_SIZE = 5 * 1024 * 1024;

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        {
          success: false,
          message: "Image must be smaller than 5 MB.",
        },
        { status: 400 }
      );
    }

    const token = process.env.GITHUB_TOKEN;
    const owner = process.env.GITHUB_OWNER;
    const repo = process.env.GITHUB_REPO;

    if (!token || !owner || !repo) {
      return NextResponse.json(
        {
          success: false,
          message: "GitHub upload is not configured.",
        },
        { status: 500 }
      );
    }

    // Extract original filename stem and extension without adding random IDs/timestamps
    const lastDotIndex = file.name.lastIndexOf(".");
    const extension = lastDotIndex !== -1 ? file.name.substring(lastDotIndex + 1).toLowerCase() : "png";
    const rawStem = lastDotIndex !== -1 ? file.name.substring(0, lastDotIndex) : file.name;

    const cleanStem = rawStem
      .trim()
      .replace(/[^a-zA-Z0-9-_]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    const filename = `${cleanStem || "image"}.${extension}`;
    const path = `uploads/${filename}`;

    // Check if an image with the exact same name AND extension already exists
    const checkResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
        cache: "no-store",
      }
    );

    if (checkResponse.ok) {
      return NextResponse.json(
        {
          success: false,
          message: `An image named "${filename}" already exists. Please rename your file or delete the existing image first.`,
        },
        { status: 409 }
      );
    }

    // Convert image to Base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const content = buffer.toString("base64");

    const githubResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
      {
        method: "PUT",

        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          message: `Upload ${filename}`,
          content,
        }),
      }
    );

    const githubResult = await githubResponse.json();

    if (!githubResponse.ok) {
      console.error("GitHub upload error:", githubResult);

      return NextResponse.json(
        {
          success: false,
          message:
            githubResult.message ||
            "GitHub rejected the upload.",
        },
        { status: githubResponse.status }
      );
    }

    const imageUrl =
      `https://${owner}.github.io/uploads/${filename}`;

    return NextResponse.json({
      success: true,
      filename,
      path,
      url: imageUrl,
    });
  } catch (error) {
    console.error("Upload error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to upload image.",
      },
      { status: 500 }
    );
  }
}