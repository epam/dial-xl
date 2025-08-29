export function commentToNote(comment: string): string {
  return comment
    .replaceAll('\r', '')
    .split('\n')
    .map((line) => line.replace(/^##/, ''))
    .join('\n');
}

export function noteToComment(note: string): string {
  return note
    .replaceAll('\r', '')
    .trim()
    .split('\n')
    .map((line) => `${line}`)
    .join('\n');
}
