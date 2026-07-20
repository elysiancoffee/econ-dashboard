import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    const token = process.env.GITHUB_TOKEN;
    const owner = process.env.GITHUB_OWNER;
    const repo = process.env.GITHUB_REPO;

    if (!token || !owner || !repo) {
      return NextResponse.json(
        {
          success: false,
          message: "GitHub integration is not configured.",
        },
        { status: 500 }
      );
    }

    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/uploads`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },

        // Always fetch the latest directory contents
        cache: "no-store",
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("GitHub API error:", data);

      return NextResponse.json(
        {
          success: false,
          message:
            data.message ||
            "Failed to retrieve images from GitHub.",
        },
        { status: response.status }
      );
    }

    if (!Array.isArray(data)) {
      return NextResponse.json(
        {
          success: false,
          message: "Unexpected response from GitHub.",
        },
        { status: 500 }
      );
    }

    // File extensions we consider images
    const imageExtensions = [
      ".png",
      ".jpg",
      ".jpeg",
      ".gif",
      ".webp",
      ".svg",
    ];

    const images = data
      .filter((file) => {
        if (file.type !== "file") {
          return false;
        }

        const name = file.name.toLowerCase();

        return imageExtensions.some((extension) =>
          name.endsWith(extension)
        );
      })
      .map((file) => ({
        name: file.name,

        path: file.path,

        // Direct GitHub Pages URL
        url: `https://${owner}.github.io/uploads/${encodeURIComponent(
          file.name
        )}`,

        // Useful if you ever want to access the raw GitHub file
        downloadUrl: file.download_url,

        sha: file.sha,
        size: file.size,
      }));

    return NextResponse.json({
      success: true,
      count: images.length,
      images,
    });
  } catch (error) {
    console.error("Image gallery API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to retrieve images.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const token = process.env.GITHUB_TOKEN;
    const owner = process.env.GITHUB_OWNER;
    const repo = process.env.GITHUB_REPO;

    if (!token || !owner || !repo) {
      return NextResponse.json(
        {
          success: false,
          message: "GitHub integration is not configured.",
        },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { path, sha, role } = body;

    const userRole = request.headers.get("x-user-role") || role;

    if (userRole !== "Boss") {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized. Only Bosses can delete images.",
        },
        { status: 403 }
      );
    }

    if (!path || !sha) {
      return NextResponse.json(
        {
          success: false,
          message: "Path and sha are required to delete a file.",
        },
        { status: 400 }
      );
    }

    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: `Delete ${path}`,
          sha,
        }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      console.error("GitHub delete error:", result);
      return NextResponse.json(
        {
          success: false,
          message: result.message || "Failed to delete file from GitHub.",
        },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Image deleted successfully.",
    });
  } catch (error) {
    console.error("Delete image error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to delete image.",
      },
      { status: 500 }
    );
  }
}
