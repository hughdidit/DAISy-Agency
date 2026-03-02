import { loadWebMedia } from "../web/media.js";
import { buildOutboundMediaLoadOptions } from "./load-options.js";
import { saveMediaBuffer } from "./store.js";

export async function resolveOutboundAttachmentFromUrl(
  mediaUrl: string,
  maxBytes: number,
): Promise<{ path: string; contentType?: string }> {
<<<<<<< HEAD
  const media = await loadWebMedia(mediaUrl, maxBytes);
=======
  const media = await loadWebMedia(
    mediaUrl,
    buildOutboundMediaLoadOptions({
      maxBytes,
      mediaLocalRoots: options?.localRoots,
    }),
  );
>>>>>>> e1f3ded03 (refactor: split telegram delivery and unify media/frontmatter/i18n pipelines)
  const saved = await saveMediaBuffer(
    media.buffer,
    media.contentType ?? undefined,
    "outbound",
    maxBytes,
  );
  return { path: saved.path, contentType: saved.contentType };
}
