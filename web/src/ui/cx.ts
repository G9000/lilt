/** Compose complete utility recipes; keep conditional classes explicit for Tailwind's scanner. */
export function cx(...values: (string | false | null | undefined)[]): string {
  return values.filter(Boolean).join(' ');
}
