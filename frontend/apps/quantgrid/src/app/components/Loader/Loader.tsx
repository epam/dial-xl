import { Spin } from 'antd';

import { useUIStore } from '../../store';

export function Loader() {
  const loading = useUIStore((s) => s.loading);

  if (loading) {
    return (
      <div className="absolute top-0 left-0 w-screen h-dvh bg-gray-100/90 z-1000 flex items-center justify-center">
        <Spin className="z-1000" size="large"></Spin>
      </div>
    );
  }

  return null;
}
