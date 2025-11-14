import { completeMediaUpload, requestMediaPresign } from "@/lib/data";

const MEDIA_BASE_URL = (process.env.NEXT_PUBLIC_MEDIA_BASE_URL ?? "").replace(/\/$/, "");

export type UploadAudioResult = {
  id: string;
  status: string;
  storageKey: string;
  url: string | null;
};

export const uploadAudioFile = async (file: File, token: string): Promise<UploadAudioResult> => {
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

  const url = MEDIA_BASE_URL ? `${MEDIA_BASE_URL}/${presign.storageKey}` : null;

  return {
    id: asset.id,
    status: asset.status,
    storageKey: presign.storageKey,
    url,
  };
};
