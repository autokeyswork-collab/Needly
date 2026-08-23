import { Platform } from "react-native";

export const PROFILE_IMAGE_LIMIT_BYTES = 1800000;
export const PRODUCT_IMAGE_LIMIT_BYTES = 900000;

function dataUrlBytes(dataUrl) {
  return String(dataUrl || "").length;
}

function drawImageToDataUrl(img, maxSize, quality) {
  const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(img.width * scale));
  canvas.height = Math.max(1, Math.round(img.height * scale));
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", quality);
}

export function resizeDataUrlToLimit(dataUrl, options = {}) {
  const {
    maxBytes = PROFILE_IMAGE_LIMIT_BYTES,
    maxSize = 720,
    minSize = 220,
    quality = 0.78,
    minQuality = 0.44,
  } = options;

  if (!dataUrl || Platform.OS !== "web" || typeof document === "undefined") {
    return Promise.resolve(dataUrl);
  }

  return new Promise((resolve) => {
    const img = document.createElement("img");
    img.onload = () => {
      let nextSize = maxSize;
      let nextQuality = quality;
      let best = drawImageToDataUrl(img, nextSize, nextQuality);

      while (dataUrlBytes(best) > maxBytes && (nextQuality > minQuality || nextSize > minSize)) {
        if (nextQuality > minQuality) {
          nextQuality = Math.max(minQuality, nextQuality - 0.08);
        } else {
          nextSize = Math.max(minSize, Math.round(nextSize * 0.82));
        }
        best = drawImageToDataUrl(img, nextSize, nextQuality);
      }

      resolve(best);
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export async function preparePickedImageDataUrl(asset, options = {}) {
  if (!asset) return null;
  if (!asset.base64 && asset.uri) return asset.uri;

  const dataUrl = `data:${asset.mimeType || "image/jpeg"};base64,${asset.base64}`;
  return resizeDataUrlToLimit(dataUrl, options);
}
