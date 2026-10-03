import sanitizeHtml from "sanitize-html";

/**
 * Turns what the broadcast editor produced into HTML that is safe to send and
 * that mail clients will actually render.
 *
 * The editor is admin-only, but its output still leaves from the verified domain
 * to every registrant, so nothing is trusted: tags and attributes are cut down
 * to a short allow-list, and every style is written here rather than accepted
 * from the request. Mail clients ignore stylesheets, so each tag carries its
 * own inline style.
 */

/** The 600px card less its 32px padding on each side. */
export const BROADCAST_CONTENT_WIDTH = 536;

const TAG_STYLES: Record<string, string> = {
  p: "margin:0 0 14px;",
  h2: "margin:22px 0 10px;color:#092358;font-size:20px;line-height:1.3;",
  h3: "margin:18px 0 8px;color:#092358;font-size:17px;line-height:1.3;",
  ul: "margin:0 0 14px;padding-left:22px;",
  ol: "margin:0 0 14px;padding-left:22px;",
  blockquote: "margin:0 0 14px;padding:2px 0 2px 14px;border-left:3px solid #27D2A9;color:#4b5563;",
  hr: "border:0;border-top:1px solid #e5e7eb;margin:20px 0;",
};

/** The one style read from the editor's output: which way a block is aligned. */
function alignment(attribs: sanitizeHtml.Attributes) {
  const match = /text-align:\s*(left|center|right)/i.exec(attribs.style || "");
  return match ? `text-align:${match[1].toLowerCase()};` : "";
}

const styledBlock: sanitizeHtml.Transformer = (tagName, attribs) => ({
  tagName,
  attribs: {
    style: TAG_STYLES[tagName] + alignment(attribs),
    ...(tagName === "ol" && attribs.start ? { start: attribs.start } : {}),
  },
});

export function sanitizeBroadcastHtml(input: string): string {
  const clean = sanitizeHtml(input, {
    allowedTags: [
      "p", "br", "strong", "b", "em", "i", "u", "s",
      "h2", "h3", "ul", "ol", "li", "blockquote", "hr", "a", "img",
    ],
    // style is allowed only on tags whose transform below writes it, so none
    // survives from the request.
    allowedAttributes: {
      p: ["style"],
      h2: ["style"],
      h3: ["style"],
      ul: ["style"],
      ol: ["start", "style"],
      blockquote: ["style"],
      hr: ["style"],
      a: ["href", "target", "rel", "style"],
      img: ["src", "alt", "width", "style"],
    },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    // Images must be hosted: a data: URI is stripped by most mail clients and
    // would bloat every copy of the message.
    allowedSchemesByTag: { img: ["https"] },
    transformTags: {
      p: styledBlock,
      h2: styledBlock,
      h3: styledBlock,
      ul: styledBlock,
      ol: styledBlock,
      blockquote: styledBlock,
      hr: styledBlock,
      a: (tagName, attribs) => ({
        tagName,
        attribs: {
          href: attribs.href || "",
          target: "_blank",
          rel: "noopener noreferrer",
          style: "color:#092358;text-decoration:underline;",
        },
      }),
      img: (tagName, attribs) => {
        // Outlook ignores max-width, so the width attribute is what keeps a large
        // image inside the card there.
        const width = Number.parseInt(attribs.width, 10);
        return {
          tagName,
          attribs: {
            src: attribs.src || "",
            alt: attribs.alt || "",
            ...(width > 0 ? { width: String(Math.min(width, BROADCAST_CONTENT_WIDTH)) } : {}),
            style: "max-width:100%;height:auto;border:0;",
          },
        };
      },
    },
    // An image whose source was rejected is dropped rather than sent broken.
    exclusiveFilter: (frame) => frame.tag === "img" && !frame.attribs.src,
  });

  return (
    clean
      // The editor wraps list items in a paragraph; tighten it so lists do not
      // come out double-spaced.
      .replace(/<li><p style="margin:0 0 14px/g, '<li><p style="margin:0 0 6px')
      // A blank line in the editor is an empty paragraph, which a mail client
      // collapses to nothing. Give it height so spacing matches what was composed.
      .replace(/(<p style="[^"]*">)<\/p>/g, "$1&nbsp;</p>")
  );
}

/** True when sanitised HTML carries nothing a reader would see. */
export function isBlankBroadcast(cleanHtml: string) {
  return !/<img /.test(cleanHtml) && !broadcastText(cleanHtml);
}

/**
 * The plain-text alternative for the same message. Takes sanitised HTML, so the
 * markup is regular enough to convert with a few replacements. Tokens survive
 * untouched and are filled per recipient afterwards.
 */
export function broadcastText(cleanHtml: string): string {
  return cleanHtml
    .replace(/<img[^>]*>/g, "")
    .replace(/<a [^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g, (_whole, href: string, label: string) => {
      const url = href.replace(/^mailto:|^tel:/, "");
      const plain = label.replace(/<[^>]+>/g, "").trim();
      return plain && plain !== url && plain !== href ? `${plain} (${url})` : url;
    })
    .replace(/<\/p><\/li>/g, "</li>")
    .replace(/<li[^>]*>/g, "- ")
    .replace(/<br\s*\/?>/g, "\n")
    .replace(/<hr[^>]*>/g, "---\n\n")
    .replace(/<\/(p|h2|h3|blockquote|ul|ol)>/g, "\n\n")
    .replace(/<\/li>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
