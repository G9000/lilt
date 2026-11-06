/** File lengths, not allocated disk space. Use the same 1024-byte units throughout Settings. */
export function storageSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "Unavailable";
  const units = ["B", "KB", "MB", "GB", "TB", "PB"];
  const index = bytes === 0 ? 0 : Math.max(0, Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024))));
  return `${Number((bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1))} ${units[index]}`;
}

export function folderResult(value: unknown): { error: string | null } | null {
  if (!value || typeof value !== "object" || !("error" in value)) return null;
  return value.error === null || typeof value.error === "string" ? { error: value.error } : null;
}
