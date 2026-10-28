/** Local playlist names are user content; generated mix titles are application copy. */
export function mixDisplayTitle(mix: { id: string; title: string }, translate: (source: string) => string): string {
  return mix.id.startsWith('local_playlist_') ? mix.title : translate(mix.title);
}
