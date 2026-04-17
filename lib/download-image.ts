function sanitizeFilename(name: string) {
  return name
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .slice(0, 80) || "photo";
}

function blobToImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new window.Image();
    const objectUrl = URL.createObjectURL(blob);

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("图片加载失败"));
    };

    image.src = objectUrl;
  });
}

function canvasToJpeg(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("图片转换失败"));
        }
      },
      "image/jpeg",
      0.95
    );
  });
}

/**
 * Download a photo through the server-side proxy route (/api/download/[id]).
 * This keeps the original storage URL hidden from the client and enforces
 * the allow_download permission server-side.
 */
export async function downloadImageAsJpeg(photoId: string, title: string) {
  const response = await fetch(`/api/download/${encodeURIComponent(photoId)}`);

  if (response.status === 403) {
    throw new Error("该照片不允许下载");
  }
  if (!response.ok) {
    throw new Error("图片下载失败");
  }

  const sourceBlob = await response.blob();
  const image = await blobToImage(sourceBlob);
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("浏览器不支持图片转换");
  }

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0);

  const jpegBlob = await canvasToJpeg(canvas);
  const downloadUrl = URL.createObjectURL(jpegBlob);
  const anchor = document.createElement("a");
  anchor.href = downloadUrl;
  anchor.download = `${sanitizeFilename(title)}.jpg`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(downloadUrl);
}
