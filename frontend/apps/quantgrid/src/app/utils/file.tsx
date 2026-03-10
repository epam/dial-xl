import { Button } from 'antd';
import { toast } from 'react-toastify';

import { secondaryButtonClasses } from '@frontend/common/lib';

export function triggerDownload({
  fileUrl,
  fileName,
  successToast,
}: {
  fileUrl: string;
  fileName: string;

  // We need this for cases where creating url take more than 1 second and browser block popup window
  successToast?: {
    message: string;
    onClose?: () => void;
  };
}): void {
  const click = () => {
    const link = document.createElement('a');
    link.download = fileName;
    link.href = fileUrl;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  click();

  if (successToast) {
    toast.success(successToast.message, {
      closeButton: (props) => {
        return (
          <Button {...props} className={secondaryButtonClasses} type="primary">
            Download
          </Button>
        );
      },
      onClose(reason) {
        if (reason) {
          click();
        }

        successToast?.onClose?.();
      },
    });
  }
}

export function triggerDownloadContent(
  content: string,
  fileName: string,
): void {
  const file = new File([content], fileName);
  const fileUrl = window.URL.createObjectURL(file);

  triggerDownload({ fileUrl, fileName });

  URL.revokeObjectURL(fileUrl);
}

export function triggerUpload(): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.style.display = 'none';

    input.onchange = async () => {
      const file = input.files?.[0];
      if (file) {
        try {
          const content = await file.text();
          resolve(content);
        } catch (error) {
          reject(new Error('Error reading file'));
        }
      } else {
        reject(new Error('No file selected'));
      }
    };

    document.body.appendChild(input);
    input.click();
    document.body.removeChild(input);
  });
}
