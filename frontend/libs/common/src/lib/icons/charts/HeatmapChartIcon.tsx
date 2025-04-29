import { QGIconProps } from '../../types/icon';
import { getColorVar } from '../../utils/icon';

export const HeatmapChartIcon = ({
  secondaryAccentCssVar: primaryColorClass = 'text-error',
}: QGIconProps) => {
  return (
    <svg fill="none" viewBox="0 0 18 18" width="100%">
      <path
        d="M2.25 6.75V11.25H6.75V6.75H2.25Z"
        fill={getColorVar(primaryColorClass)}
        fillOpacity="0.15"
      />
      <path
        d="M6.75 6.75V11.25H11.25V6.75H6.75Z"
        fill={getColorVar(primaryColorClass)}
      />
      <path
        d="M15.75 15V11.25H11.25V15.75H15C15.1989 15.75 15.3897 15.671 15.5303 15.5303C15.671 15.3897 15.75 15.1989 15.75 15Z"
        fill={getColorVar(primaryColorClass)}
        fillOpacity="0.15"
      />
      <path
        d="M2.46967 2.46967C2.32902 2.61032 2.25 2.80109 2.25 3V6.75H6.75V2.25H3C2.80109 2.25 2.61032 2.32902 2.46967 2.46967Z"
        fill={getColorVar(primaryColorClass)}
        fillOpacity="0.15"
      />
      <path
        d="M3 15.75H6.75V11.25H2.25V15C2.25 15.1989 2.32902 15.3897 2.46967 15.5303C2.61032 15.671 2.80109 15.75 3 15.75Z"
        fill={getColorVar(primaryColorClass)}
      />
      <path
        d="M15 2.25H11.25V6.75H15.75V3C15.75 2.80109 15.671 2.61032 15.5303 2.46967C15.3897 2.32902 15.1989 2.25 15 2.25Z"
        fill={getColorVar(primaryColorClass)}
      />
      <path
        d="M15.75 11.25V6.75H11.25V11.25H15.75Z"
        fill={getColorVar(primaryColorClass)}
        fillOpacity="0.15"
      />
      <path
        d="M2.25 3C2.25 2.80109 2.32902 2.61032 2.46967 2.46967C2.61032 2.32902 2.80109 2.25 3 2.25M2.25 3V15M2.25 3V6.75M3 2.25H15M3 2.25H6.75V6.75M15 2.25C15.1989 2.25 15.3897 2.32902 15.5303 2.46967C15.671 2.61032 15.75 2.80109 15.75 3M15 2.25H11.25V6.75M15.75 3V15M15.75 3V6.75M15.75 15C15.75 15.1989 15.671 15.3897 15.5303 15.5303C15.3897 15.671 15.1989 15.75 15 15.75M15.75 15V11.25M15 15.75H3M15 15.75H11.25M3 15.75C2.80109 15.75 2.61032 15.671 2.46967 15.5303C2.32902 15.3897 2.25 15.1989 2.25 15M3 15.75H6.75M2.25 15V11.25M6.75 15.75V11.25M6.75 15.75H11.25M11.25 15.75V11.25M2.25 11.25H6.75M2.25 11.25V6.75M15.75 11.25H11.25M15.75 11.25V6.75M2.25 6.75H6.75M15.75 6.75H11.25M6.75 11.25V6.75M6.75 11.25H11.25M6.75 6.75H11.25M11.25 11.25V6.75"
        stroke={getColorVar(primaryColorClass)}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
