import { twMerge } from 'tailwind-merge';

interface Props {
  label: string;
  className?: string;
}

export const Chip = ({ label, className }: Props) => {
  return (
    <span
      className={twMerge(
        'rounded-md px-1 text-text-primary bg-bg-layer-2',
        className
      )}
    >
      {label}
    </span>
  );
};
