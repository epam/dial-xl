import cx from 'classnames';

type Props = {
  selected?: boolean;
  filterName: string;
  onClick: () => void;
};

export function SearchFilter({ selected, filterName, onClick }: Props) {
  return (
    <div
      className={cx(
        'px-2 py-1 select-none hover:bg-slate-200 cursor-pointer rounded-lg mr-2',
        {
          'bg-slate-300': selected,
        }
      )}
      onClick={onClick}
    >
      {filterName}
    </div>
  );
}
