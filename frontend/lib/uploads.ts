import { completeMediaUpload, requestMediaPresign } from "@/lib/data";

export const uploadAudioFile = async (file: File, token: string) => {
  const mime = file.type || "audio/mpeg";
  const presign = await requestMediaPresign(token, {
    filename: file.name,
    mime,
    size_bytes: file.size,
    type: "audio",
  });

  await fetch(presign.uploadUrl, {
    method: "PUT",
    headers: presign.headers,
    body: file,
  });

  const asset = await completeMediaUpload(token, {
    asset_id: presign.assetId,
    storage_key: presign.storageKey,
    mime,
    size_bytes: file.size,
    kind: "audio",
  });

  return asset;
};
