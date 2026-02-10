import { useEffect, useState } from 'react';

export const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState<boolean>(
    window.matchMedia('(max-width: 768px)').matches
  );

  useEffect(() => {
    const onWindowResize = () => {
      // Same breakpoint as tailwind `md`
      setIsMobile(window.matchMedia('(max-width: 768px)').matches);
    };

    onWindowResize();

    window.addEventListener('resize', onWindowResize);

    return () => window.removeEventListener('resize', onWindowResize);
  }, []);

  return isMobile;
};
