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
    const dataUrl = await toPng(node, {
      filter: filter,
      pixelRatio: Math.max(window.devicePixelRatio, 3),
    });
    return dataUrl;
  } catch (error) {
    console.error("Error exporting image:", error);
    throw error;
  }
}

