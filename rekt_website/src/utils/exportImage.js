import html2canvas from "html2canvas";

export async function exportNodeToPng(node, fileName = "meme.png") {
  if (!node) return;

  const classesToIgnore = new Set([
    "sticker-delete-btn",
    "sticker-resize-handle",
    "sticker-rotate-handle",
    "text-resize-handle",
    "sticker-rotation-indicator",
  ]);

  const width = node.offsetWidth;
  const height = node.offsetHeight;

  // Workaround for html2canvas not honoring object-fit: contain on <img> reliably
  // We temporarily set the stage's background-image with background-size: contain
  // and hide the inner img so the aspect ratio is preserved in the export.
  const backgroundImgEl = node.querySelector?.(".meme-canvas-background");
  const originalImgDisplay = backgroundImgEl?.style?.display;
  const originalNodeBg = {
    backgroundImage: node.style.backgroundImage,
    backgroundSize: node.style.backgroundSize,
    backgroundPosition: node.style.backgroundPosition,
    backgroundRepeat: node.style.backgroundRepeat,
  };

  try {
    if (backgroundImgEl && backgroundImgEl.tagName === "IMG" && backgroundImgEl.src) {
      // Hide the <img> during capture
      backgroundImgEl.style.display = "none";
      // Apply background image with contain semantics
      node.style.backgroundImage = `url(${backgroundImgEl.src})`;
      node.style.backgroundSize = "contain";
      node.style.backgroundPosition = "center";
      node.style.backgroundRepeat = "no-repeat";
    }

    const canvas = await html2canvas(node, {
      backgroundColor: null,
      useCORS: true,
      scale: window.devicePixelRatio > 1 ? 2 : 1,
      width,
      height,
      ignoreElements: (el) => {
        if (!el || !el.classList) return false;
        for (const cls of classesToIgnore) {
          if (el.classList.contains(cls)) return true;
        }
        return false;
      },
    });

    const dataUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } finally {
    // Revert temporary style changes
    if (backgroundImgEl) backgroundImgEl.style.display = originalImgDisplay || "";
    node.style.backgroundImage = originalNodeBg.backgroundImage || "";
    node.style.backgroundSize = originalNodeBg.backgroundSize || "";
    node.style.backgroundPosition = originalNodeBg.backgroundPosition || "";
    node.style.backgroundRepeat = originalNodeBg.backgroundRepeat || "";
  }
}

