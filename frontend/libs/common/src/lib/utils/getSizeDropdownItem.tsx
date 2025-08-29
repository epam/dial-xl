import { Button } from 'antd';
import classNames from 'classnames';
import { useCallback, useEffect, useState } from 'react';

import { CellPlacement, MenuItem } from '../types';

const size = 10;
const defaultSizes = { col: 3, row: 3 };
const iterable = new Array(size).fill(0);

const SizeDropdownItem = ({
  onCreateTable,
}: {
  onCreateTable: (cols: number, rows: number) => void;
}) => {
  const [hoveredCell, setHoveredCell] = useState<CellPlacement>(defaultSizes);
  const [inputRow, setInputRow] = useState(defaultSizes.row.toString());
  const [inputCol, setInputCol] = useState(defaultSizes.col.toString());

  const handleInputClick = useCallback(
    (e: React.MouseEvent<HTMLInputElement, MouseEvent>) => {
      e.preventDefault();
      e.stopPropagation();
    },
    []
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        onCreateTable(hoveredCell.col, hoveredCell.row);
      }
    },
    [hoveredCell.col, hoveredCell.row, onCreateTable]
  );

  const handleInputChange = useCallback(
    (newValue: string, isRow: boolean) => {
      const parsedNewValue = parseInt(newValue, 10);

      if (newValue.length === 0 || isFinite(newValue as any)) {
        if (isRow) {
          setInputRow(newValue);
        } else {
          setInputCol(newValue);
        }

        if (newValue.length !== 0) {
          setHoveredCell({
            row: isRow ? parsedNewValue : hoveredCell.row,
            col: !isRow ? parsedNewValue : hoveredCell.col,
          });
        }
      }
    },
    [hoveredCell]
  );

  useEffect(() => {
    setInputRow(hoveredCell.row.toString());
    setInputCol(hoveredCell.col.toString());
  }, [hoveredCell]);

  return (
    <div
      className={classNames(
        'flex flex-col justify-between items-center py-2 px-3'
      )}
    >
      {iterable.map((_, rowIndex) => (
        <div className="flex">
          {iterable.map((_, colIndex) => (
            <div
              className="p-1"
              onClick={() => {
                onCreateTable(colIndex + 1, rowIndex + 1);
              }}
              onMouseEnter={() => {
                setHoveredCell({ col: colIndex + 1, row: rowIndex + 1 });
              }}
            >
              <div
                className={classNames(
                  'size-4 border border-strokeSecondary',
                  hoveredCell &&
                    hoveredCell?.col > colIndex &&
                    hoveredCell?.row > rowIndex &&
                    'border-strokeAccentSecondary/70 bg-bgAccentSecondary'
                )}
              ></div>
            </div>
          ))}
        </div>
      ))}
      <div className="p-1 flex justify-start items-start w-full">
        <div>
          <input
            className="border border-strokePrimary mr-1 px-1 h-6"
            maxLength={2}
            size={2}
            type="text"
            value={inputRow}
            onChange={(e) => {
              const newValue = e.target.value;
              handleInputChange(newValue, true);
            }}
            onClick={handleInputClick}
            onKeyDown={handleKeyDown}
          />
          x
          <input
            className="ml-1 border border-strokePrimary px-1 h-6"
            maxLength={2}
            size={2}
            type="text"
            value={inputCol}
            onChange={(e) => {
              const newValue = e.target.value;
              handleInputChange(newValue, false);
            }}
            onClick={handleInputClick}
            onKeyDown={handleKeyDown}
          />
          <Button
            className="ml-2"
            size="small"
            onClick={() => {
              onCreateTable(hoveredCell.col, hoveredCell.row);
            }}
          >
            Create
          </Button>
        </div>
      </div>
    </div>
  );
};

export const getTableBySizeDropdownItem = ({
  key,
  onCreateTable,
}: {
  key: string;
  onCreateTable: (cols: number, rows: number) => void;
}): MenuItem => {
  return {
    key,
    label: <SizeDropdownItem onCreateTable={onCreateTable} />,
  };
};
