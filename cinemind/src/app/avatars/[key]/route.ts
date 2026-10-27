import { getAvatarByKey } from "@/lib/avatars/repository";

// Serves processed profile pictures. Keys are random and change on every upload, so a
// response never changes and can be cached for a long time.
export async function GET(_req: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  if (!/^[A-Za-z0-9_-]{22}$/.test(key)) return new Response("Not found", { status: 404 });
  const avatar = await getAvatarByKey(key);
  if (!avatar) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(avatar.image), {
    headers: {
      "Content-Type": avatar.content_type,
      "Content-Length": String(avatar.image.byteLength),
      "Cache-Control": "public, max-age=31536000, immutable",
      "Last-Modified": avatar.updated_at.toUTCString(),
      // Only ever an image: never sniffed as something else, never able to run anything
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}
