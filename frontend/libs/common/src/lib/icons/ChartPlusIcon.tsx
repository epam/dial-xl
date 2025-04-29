import { QGIconProps } from '../types/icon';
import { getColorVar } from '../utils/icon';

export const ChartPlusIcon = ({
  secondaryAccentCssVar: primaryColorClass = '',
}: QGIconProps) => {
  return (
    <svg
      fill="none"
      viewBox="0 0 18 18"
      width="100%"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M6.75 14.25V9.75C6.75 9.55109 6.67098 9.36032 6.53033 9.21967C6.38968 9.07902 6.19891 9 6 9H3C2.80109 9 2.61032 9.07902 2.46967 9.21967C2.32902 9.36032 2.25 9.55109 2.25 9.75V14.25C2.25 14.4489 2.32902 14.6397 2.46967 14.7803C2.61032 14.921 2.80109 15 3 15H6M6.75 14.25C6.75 14.4489 6.67098 14.6397 6.53033 14.7803C6.38968 14.921 6.19891 15 6 15M6.75 14.25C6.75 14.4489 6.82902 14.6397 6.96967 14.7803C7.11032 14.921 7.30109 15 7.5 15M6.75 14.25V6.75C6.75 6.55109 6.82902 6.36032 6.96967 6.21967C7.11032 6.07902 7.30109 6 7.5 6H10.5C10.6989 6 10.8897 6.07902 11.0303 6.21967C11.171 6.36032 11.25 6.55109 11.25 6.75V10.5V3.75C11.25 3.55109 11.329 3.36032 11.4697 3.21967C11.6103 3.07902 11.8011 3 12 3H15C15.1989 3 15.3897 3.07902 15.5303 3.21967C15.671 3.36032 15.75 3.55109 15.75 3.75V9M6 15H7.5M7.5 15H9"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 14.25H16.5M14.25 12V16.5"
        stroke={getColorVar(primaryColorClass)}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
