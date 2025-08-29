import { QGIconProps } from '../types';
import { getColorVar } from '../utils/icon';

export const PlayAvatarIcon = ({
  secondaryAccentCssVar: primaryColorClass = '',
}: QGIconProps) => {
  return (
    <svg
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
      viewBox="248.28 163.923 52.018 55.781"
      width="100%"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M 248.28 163.923 L 300.298 163.923 L 300.298 219.704 L 248.28 219.704 L 248.28 163.923 Z"
        fill="none"
        stroke="none"
      />
      <path
        d="M 263.452 173.22 L 263.452 210.407 L 291.629 191.813 L 263.452 173.22 Z"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />
      <path
        d="M 251.249 215.749 L 251.249 213.94 C 251.249 212.983 251.605 212.062 252.238 211.384 C 252.869 210.707 253.727 210.326 254.622 210.326 L 257.992 210.326 C 258.887 210.326 259.744 210.707 260.376 211.384 C 261.009 212.062 261.365 212.983 261.365 213.94 L 261.365 215.749 L 251.249 215.749 Z"
        fill={getColorVar(primaryColorClass)}
        stroke={getColorVar(primaryColorClass)}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />
      <path
        d="M 252.936 203.096 C 252.936 204.053 253.291 204.974 253.922 205.65 C 254.555 206.329 255.413 206.71 256.306 206.71 C 257.201 206.71 258.06 206.329 258.69 205.65 C 259.323 204.974 259.679 204.053 259.679 203.096 C 259.679 202.136 259.323 201.215 258.69 200.539 C 258.06 199.86 257.201 199.479 256.306 199.479 C 255.413 199.479 254.555 199.86 253.922 200.539 C 253.291 201.215 252.936 202.136 252.936 203.096 Z"
        fill={getColorVar(primaryColorClass)}
        stroke={getColorVar(primaryColorClass)}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
};
