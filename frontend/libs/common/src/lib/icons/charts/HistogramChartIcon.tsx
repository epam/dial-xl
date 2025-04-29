import { QGIconProps } from '../../types/icon';
import { getColorVar } from '../../utils/icon';

export const HistogramChartIcon = ({
  secondaryAccentCssVar: primaryColorClass = 'text-accent-tertiary',
}: QGIconProps) => {
  return (
    <svg fill="none" viewBox="0 0 18 18" width="100%">
      <path
        d="M2.25 9.75C2.25 9.55109 2.32902 9.36032 2.46967 9.21967C2.61032 9.07902 2.80109 9 3 9H6C6.19891 9 6.38968 9.07902 6.53033 9.21967C6.67098 9.36032 6.75 9.55109 6.75 9.75V14.25C6.75 14.4489 6.67098 14.6397 6.53033 14.7803C6.38968 14.921 6.19891 15 6 15H3C2.80109 15 2.61032 14.921 2.46967 14.7803C2.32902 14.6397 2.25 14.4489 2.25 14.25V9.75Z"
        fill={getColorVar(primaryColorClass)}
        fillOpacity="0.15"
        stroke={getColorVar(primaryColorClass)}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M11.25 6.75C11.25 6.55109 11.329 6.36032 11.4697 6.21967C11.6103 6.07902 11.8011 6 12 6H15C15.1989 6 15.3897 6.07902 15.5303 6.21967C15.671 6.36032 15.75 6.55109 15.75 6.75V14.25C15.75 14.4489 15.671 14.6397 15.5303 14.7803C15.3897 14.921 15.1989 15 15 15H12C11.8011 15 11.6103 14.921 11.4697 14.7803C11.329 14.6397 11.25 14.4489 11.25 14.25V6.75Z"
        fill={getColorVar(primaryColorClass)}
        fillOpacity="0.15"
        stroke={getColorVar(primaryColorClass)}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6.75 3.75C6.75 3.55109 6.82902 3.36032 6.96967 3.21967C7.11032 3.07902 7.30109 3 7.5 3H10.5C10.6989 3 10.8897 3.07902 11.0303 3.21967C11.171 3.36032 11.25 3.55109 11.25 3.75V14.25C11.25 14.4489 11.171 14.6397 11.0303 14.7803C10.8897 14.921 10.6989 15 10.5 15H7.5C7.30109 15 7.11032 14.921 6.96967 14.7803C6.82902 14.6397 6.75 14.4489 6.75 14.25V3.75Z"
        fill={getColorVar(primaryColorClass)}
        fillOpacity="0.15"
        stroke={getColorVar(primaryColorClass)}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3 15H13.5"
        stroke={getColorVar(primaryColorClass)}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
