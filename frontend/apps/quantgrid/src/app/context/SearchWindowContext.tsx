import { Modal } from 'antd';
import { createContext, PropsWithChildren, useCallback, useState } from 'react';

import { SearchWindow } from '../components';

type SearchWindowFunctions = {
  openSearchWindow: () => void;
  closeSearchWindow: () => void;
};

type SearchWindowValues = {
  isOpen: boolean;
};

export const SearchWindowContext = createContext<
  SearchWindowFunctions & SearchWindowValues
>({} as SearchWindowFunctions & SearchWindowValues);

export function SearchWindowContextProvider({ children }: PropsWithChildren) {
  const [isOpen, setIsOpen] = useState(false);

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
      }}
    >
      <Modal footer={null} open={isOpen} onCancel={() => setIsOpen(false)}>
        <SearchWindow />
      </Modal>
      {children}
    </SearchWindowContext.Provider>
  );
}
