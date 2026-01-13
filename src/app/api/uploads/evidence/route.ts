// src/app/api/uploads/evidence/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { withError } from "@/server/utils/withError";
import { requireAuth } from "@/server/guards/auth";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "evidence");
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

/**
 * POST /api/uploads/evidence
 * Sube una imagen de evidencia y devuelve la URL.
 * Body: FormData con campo 'file'
 */
export const POST = withError(async (req: NextRequest) => {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.res;

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
        return NextResponse.json({ error: "No se proporcionó archivo" }, { status: 400 });
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json(
            { error: "Tipo de archivo no permitido. Solo se aceptan imágenes." },
            { status: 400 }
        );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
            { error: "El archivo es demasiado grande. Máximo 10MB." },
            { status: 400 }
        );
    }

    // Ensure upload directory exists
    if (!existsSync(UPLOAD_DIR)) {
        await mkdir(UPLOAD_DIR, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const ext = path.extname(file.name) || ".jpg";
    const filename = `${timestamp}_${randomStr}${ext}`;
    const filepath = path.join(UPLOAD_DIR, filename);

    // Write file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filepath, buffer);

    // Return public URL
    const url = `/uploads/evidence/${filename}`;

    return NextResponse.json({
        success: true,
        url,
        filename: file.name,
        size: file.size,
        mime: file.type,
    });
});

/**
 * DELETE /api/uploads/evidence
 * Elimina una imagen de evidencia.
 * Body: { url: string }
 */
export const DELETE = withError(async (req: NextRequest) => {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.res;

    const body = await req.json();
    const { url } = body as { url?: string };

    if (!url || !url.startsWith("/uploads/evidence/")) {
        return NextResponse.json({ error: "URL inválida" }, { status: 400 });
    }

    const filename = path.basename(url);
    const filepath = path.join(UPLOAD_DIR, filename);

    // Security check - prevent path traversal
    if (!filepath.startsWith(UPLOAD_DIR)) {
        return NextResponse.json({ error: "Ruta no permitida" }, { status: 403 });
    }

    const { unlink } = await import("fs/promises");
    try {
        await unlink(filepath);
    } catch {
        // File may not exist, that's ok
    }

    return NextResponse.json({ success: true });
});
