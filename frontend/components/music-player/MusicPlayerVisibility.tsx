"use client";

import { usePathname } from "next/navigation";
import MusicPlayer from "./MusicPlayer";

const HIDDEN_PATH_PREFIXES = ["/members"];

function isHiddenPath(pathname: string | null) {
  if (!pathname) {
    return false;
  }

  return HIDDEN_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export default function MusicPlayerVisibility() {
  const pathname = usePathname();

  if (isHiddenPath(pathname)) {
    return null;
  }

  return <MusicPlayer />;
}
