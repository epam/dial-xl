import { QGIconProps } from '../types/icon';
import { getColorVar } from '../utils/icon';

export const TableArrowIcon = ({
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
        d="M2.25 7.5H15.75V14.25C15.75 14.6478 15.592 15.0294 15.3107 15.3107C15.0294 15.592 14.6478 15.75 14.25 15.75H3.75C3.35218 15.75 2.97064 15.592 2.68934 15.3107C2.40804 15.0294 2.25 14.6478 2.25 14.25V3.75C2.25 3.35218 2.40804 2.97064 2.68934 2.68934C2.97064 2.40804 3.35218 2.25 3.75 2.25H9.5M7.5 2.25V15.75"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 3.25H16.5M16.5 3.25L14.25 1M16.5 3.25L14.25 5.5"
        stroke={getColorVar(primaryColorClass)}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
