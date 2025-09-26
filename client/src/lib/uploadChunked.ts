export type ChunkedUploadOptions = {
  endpointBase?: string; // base like /api/upload/profile-music/chunked
  chunkSize?: number; // bytes
  onProgress?: (progressPercent: number) => void;
  signal?: AbortSignal;
  title?: string;
};

export async function uploadMusicChunked(file: File, options: ChunkedUploadOptions = {}) {
  const endpointBase = options.endpointBase || '/api/upload/profile-music/chunked';
  const chunkSize = options.chunkSize || 1024 * 1024; // 1MB default
  const onProgress = options.onProgress;
  const signal = options.signal;
  const title = options.title;

  const fileName = file.name;
  const fileSize = file.size;
  const mimeType = file.type;

  const totalChunks = Math.ceil(fileSize / chunkSize);

  const startRes = await fetch(`${endpointBase}/start`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileName, fileSize, mimeType, chunkSize, title }),
    signal,
  });
  if (!startRes.ok) {
    const msg = await startRes.text().catch(() => 'Failed to start chunked upload');
    throw new Error(msg || 'Failed to start chunked upload');
  }
  const startData = await startRes.json();
  if (!startData?.success || !startData?.uploadId) {
    throw new Error(startData?.error || 'Failed to start chunked upload');
  }
  const uploadId: string = startData.uploadId;

  let sentBytes = 0;

  for (let index = 0; index < totalChunks; index++) {
    const begin = index * chunkSize;
    const end = Math.min(begin + chunkSize, fileSize);
    const blob = file.slice(begin, end);

    const fd = new FormData();
    fd.append('chunk', new File([blob], `chunk-${index}.part`, { type: 'application/octet-stream' }));

    const res = await fetch(`${endpointBase}/chunk`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'x-upload-id': uploadId,
        'x-chunk-index': String(index),
        'x-chunk-count': String(totalChunks),
      },
      body: fd,
      signal,
    });
    if (!res.ok) {
      const msg = await res.text().catch(() => 'Failed to upload chunk');
      throw new Error(msg || `Failed chunk ${index}`);
    }
    sentBytes += blob.size;
    if (onProgress && fileSize > 0) {
      onProgress(Math.min(100, Math.round((sentBytes / fileSize) * 100)));
    }
  }

  const finishRes = await fetch(`${endpointBase}/finish`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uploadId }),
    signal,
  });
  if (!finishRes.ok) {
    const msg = await finishRes.text().catch(() => 'Failed to finish upload');
    throw new Error(msg || 'Failed to finish upload');
  }
  const finishData = await finishRes.json();
  if (!finishData?.success) {
    throw new Error(finishData?.error || 'Failed to finish upload');
  }
  return finishData as { success: true; url: string; title: string };
}

