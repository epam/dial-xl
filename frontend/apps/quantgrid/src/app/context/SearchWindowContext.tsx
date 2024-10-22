import { Modal } from 'antd';
import { createContext, PropsWithChildren, useCallback, useState } from 'react';

import { focusSpreadsheet } from '@frontend/spreadsheet';

import { SearchWindow } from '../components';
import { ISearchFilter } from '../components/SearchWindow/search';

type SearchWindowFunctions = {
  openSearchWindow: () => void;
  closeSearchWindow: () => void;
  setFilter: (filter: ISearchFilter | null) => void;
  setSearchQuery: (query: string) => void;
};

type SearchWindowValues = {
  isOpen: boolean;
  filter: ISearchFilter | null;
  searchQuery: string;
};

export const SearchWindowContext = createContext<
  SearchWindowFunctions & SearchWindowValues
>({} as SearchWindowFunctions & SearchWindowValues);

export function SearchWindowContextProvider({ children }: PropsWithChildren) {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<ISearchFilter | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const openSearchWindow = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeSearchWindow = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <SearchWindowContext.Provider
      value={{
        openSearchWindow,
        isOpen,
        closeSearchWindow,
        filter,
        setFilter,
        searchQuery,
        setSearchQuery,
      }}
    >
      <Modal
        afterClose={focusSpreadsheet}
        closeIcon={null}
        destroyOnClose={true}
        footer={null}
        open={isOpen}
        style={{ top: 12 }}
        title={null}
        onCancel={() => setIsOpen(false)}
      >
        <SearchWindow />
      </Modal>
      {children}
    </SearchWindowContext.Provider>
  );
}
