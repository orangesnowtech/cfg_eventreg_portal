import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getAdminBucket } from "@/lib/admin";
import { requireAdmin, authError } from "@/lib/server-auth";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

export async function POST(request: NextRequest) {
  let actor;
  try {
    actor = await requireAdmin(request);
  } catch (error) {
    return authError(error);
  }

  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Choose an image to upload." }, { status: 400 });
    }

    const extension = ALLOWED.get(file.type);
    if (!extension) {
      return NextResponse.json({ error: "Use a JPG, PNG, or WebP image." }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Images must be 5MB or smaller." }, { status: 400 });
    }

    const bucket = getAdminBucket();
    // A random name avoids collisions and stops one upload overwriting another.
    const objectName = `event-banners/${randomUUID()}.${extension}`;
    const target = bucket.file(objectName);

    await target.save(Buffer.from(await file.arrayBuffer()), {
      contentType: file.type,
      resumable: false,
      metadata: { cacheControl: "public, max-age=31536000", metadata: { uploadedBy: actor.email } },
    });
    await target.makePublic();

    const url = `https://storage.googleapis.com/${bucket.name}/${objectName}`;
    return NextResponse.json({ url }, { status: 201 });
  } catch (error) {
    console.error("Banner upload failed:", error);
    return NextResponse.json(
      { error: "Upload failed. Confirm Cloud Storage is enabled for this project." },
      { status: 500 }
    );
  }
}
