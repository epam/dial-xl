/**
 * Checks if `content` ends with at least one completely empty line,
 * accounting for possible Windows (\r\n) or Unix (\n) line breaks
 * and ignoring any trailing spaces.
 */
export function endsWithBlankLine(content: string): boolean {
  const normalized = content.replace(/\r\n/g, '\n');

  return /\n\s*\n\s*$/.test(normalized);
}
