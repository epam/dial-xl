import { Button } from 'antd';
import classNames from 'classnames';

import { primaryButtonClasses } from '@frontend/common';

export function ErrorMessage() {
  return (
    <div className="absolute inset-0 flex items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-[3px] border border-stroke-error bg-bg-layer-3 shadow-sm">
        <div className="p-6 text-center">
          <p className="text-base font-semibold text-text-primary">
            Rendering unavailable
          </p>
          <p className="mt-2 text-sm text-text-secondary">
            The canvas failed to initialize or render.
          </p>
          <p className="mt-2 mb-4 text-sm text-text-secondary">
            Please try to reload the page.
          </p>

          <Button
            className={classNames(primaryButtonClasses)}
            onClick={() => window.location.reload()}
          >
            Reload page
          </Button>
        </div>
      </div>
    </div>
  );
}
