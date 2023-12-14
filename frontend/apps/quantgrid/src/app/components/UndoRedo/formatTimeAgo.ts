const secondsInMinute = 60;
const minutesInHour = 60;
const hoursInDay = 24;
const daysInYear = 365;

export function formatTimeAgo(time: number) {
  const diffSeconds = Math.floor((Date.now() - time) / 1000);

  const minutes = Math.floor(diffSeconds / secondsInMinute);
  const hours = Math.floor(minutes / minutesInHour);
  const days = Math.floor(hours / hoursInDay);
  const years = Math.floor(days / daysInYear);

  if (years > 0) {
    return `${years} year${years === 1 ? '' : 's'} ago`;
  }

  if (days > 0) {
    return `${days} day${days === 1 ? '' : 's'} ago`;
  }

  if (hours > 0) {
    return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  }

  if (minutes > 0) {
    return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  }

  return 'Just now';
}
