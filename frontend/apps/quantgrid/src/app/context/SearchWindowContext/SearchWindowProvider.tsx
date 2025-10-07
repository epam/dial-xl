import { Modal } from 'antd';
import { PropsWithChildren, useCallback, useState } from 'react';

import { SearchWindow } from '../../components';
import { ISearchFilter } from '../../components/SearchWindow/search';
import { SearchWindowContext } from './SearchWindowContext';

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
        closeIcon={null}
        destroyOnHidden={true}
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
