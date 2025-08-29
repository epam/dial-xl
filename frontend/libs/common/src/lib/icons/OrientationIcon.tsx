import { QGIconProps } from '../types/icon';
import { getColorVar } from '../utils/icon';

export const OrientationIcon = ({
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
        d="M2.25 2.25V15.75H15.75"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5.25 2.58594C5.98846 2.75425 6.71317 2.9848 7.41623 3.27601C9.05412 3.95445 10.5424 4.94885 11.7959 6.20244C13.0495 7.45603 14.0439 8.94426 14.7224 10.5822C15.0136 11.2852 15.2441 12.0099 15.4124 12.7484M15.4124 12.7484L16.9401 10.0386M15.4124 12.7484L12.4538 11.3581"
        stroke={getColorVar(primaryColorClass)}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
