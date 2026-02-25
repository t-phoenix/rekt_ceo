import { toPng } from 'html-to-image';

export async function exportNodeToPng(node) {
  if (!node) return;

  const classesToIgnore = new Set([
    "sticker-delete-btn",
    "sticker-resize-handle",
    "sticker-rotate-handle",
    "text-resize-handle",
    "sticker-rotation-indicator",
  ]);

  const filter = (el) => {
    // If it's a DOM element, check its classes
    if (el && el.classList) {
      for (const cls of classesToIgnore) {
        if (el.classList.contains(cls)) {
          return false; // exclude elements with these classes
        }
      }
    }
    return true; // include everything else
  };

  try {
    // Use exact bounding rect so no surrounding whitespace bleeds in
    const rect = node.getBoundingClientRect();
    const width = Math.round(rect.width);
    const height = Math.round(rect.height);

    const dataUrl = await toPng(node, {
      filter,
      pixelRatio: Math.max(window.devicePixelRatio, 3),
      width,
      height,
      // Strip all margin / padding so the captured canvas starts at pixel 0
      style: {
        margin: '0',
        padding: '0',
        border: 'none',
      },
    });
    return dataUrl;
  } catch (error) {
    console.error("Error exporting image:", error);
    throw error;
  }
}

