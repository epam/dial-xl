const shortDateTimeFormatter = Intl.DateTimeFormat(undefined, {
  day: 'numeric',
  month: 'numeric',
  year: '2-digit',
});

const longDateTimeFormatter = Intl.DateTimeFormat(undefined, {
  day: 'numeric',
  month: 'numeric',
  year: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

/**
 * Format date to short form if only day, month and year presented or to full if not
 *
 * @param {string} value
 * @returns {string}
 */
export const formatDate = (value: string): string => {
  if (!value) return '';

  const date = new Date(value);
  const isShortVersion =
    date.getMilliseconds() === 0 &&
    date.getMinutes() === 0 &&
    date.getHours() === 0;

  return isShortVersion
    ? shortDateTimeFormatter.format(date)
    : longDateTimeFormatter.format(date);
};

/**
 * Get formatted current date in the format of 'MMM DD, YYYY'
 *
 * @param {number} updatedAt
 * @returns {string}
 */
export function getFormattedFullDate(updatedAt: number): string {
  const date = new Date(updatedAt);

  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  const year = date.getUTCFullYear();
  const monthNames = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];

  return `${monthNames[month - 1]} ${day}, ${year}`;
}
