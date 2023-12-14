import { useContext, useEffect } from 'react';

import { AppContext } from '../context';

export function ErrorPage() {
  const { setLoading } = useContext(AppContext);

  useEffect(() => {
    setLoading(false);
  }, [setLoading]);

  return (
    <div className="flex flex-col items-center justify-center flex-1">
      <h1 className="text-4xl font-bold text-gray-700">404</h1>
      <h2 className="text-2xl font-bold text-gray-700">Page not found</h2>
    </div>
  );
}
