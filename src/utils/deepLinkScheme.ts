/** The community edition uses a separate OS protocol to avoid hijacking upstream Aideo links. */
export function stripAideoDeepLinkScheme(value: string): string | null {
  if (value.startsWith('aideo://')) return value.slice('aideo://'.length);
  if (value.startsWith('aideozh://')) return value.slice('aideozh://'.length);
  return null;
}
