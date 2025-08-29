export function triggerDownload(fileUrl: string, fileName: string): void {
  const link = document.createElement('a');
  link.download = fileName;
  link.href = fileUrl;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(fileUrl);
}

export function triggerDownloadContent(
  content: string,
  fileName: string
): void {
  const file = new File([content], fileName);
  const fileUrl = window.URL.createObjectURL(file);

  triggerDownload(fileUrl, fileName);
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
