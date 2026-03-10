import { Button } from 'antd';
import { toast } from 'react-toastify';

import { secondaryButtonClasses } from '@frontend/common/lib';

// Special handler to show toast for cases when action before take more than 1 second and browser block popup window
export const navigateWithToast = (url: string, toastMessage: string) => {
  const navigate = () => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  toast.success(toastMessage, {
    closeButton: (props) => {
      return (
        <Button {...props} className={secondaryButtonClasses} type="primary">
          Open
        </Button>
      );
    },
    onClose: (reason) => {
      if (reason) {
        navigate();
      }
    },
  });

  navigate();
};
