type FetchOptions = {
  method?: string;
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
};

export class HeadersMap {
  private headers: Map<string, string>;

  constructor(headersString: string) {
    this.headers = new Map();
    headersString
      .trim()
      .split(/[\r\n]+/)
      .forEach((line) => {
        const parts = line.split(': ');
        const key = parts.shift()?.trim().toLowerCase();
        const value = parts.join(': ').trim();
        if (key) {
          this.headers.set(key, value);
        }
      });
  }

  get(name: string): string | null {
    return this.headers.get(name.toLowerCase()) || null;
  }
}

type FetchResponse = {
  status: number;
  statusText: string;
  ok: boolean;
  headers: HeadersMap;
  text: () => Promise<string>;
  json: () => Promise<any>;
  blob: () => Promise<Blob>;
};

export function fetchWithProgress(
  url: string,
  options: FetchOptions = {},
  onProgress?: (progress: number, event: ProgressEvent<EventTarget>) => void
): Promise<FetchResponse> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open(options.method || 'GET', url, true);

    // Set headers
    if (options.headers) {
      Object.entries(options.headers).forEach(([key, value]) => {
        xhr.setRequestHeader(key, value);
      });
    }

    // Handle progress
    if (typeof onProgress === 'function') {
      const onprogress = (event: ProgressEvent) => {
        if (event.lengthComputable) {
          const percentCompleted = (event.loaded / event.total) * 100;
          onProgress(percentCompleted, event);
        }
      };
      xhr.onload = onprogress;
      xhr.upload.onprogress = onprogress;
    }

    // Handle response
    xhr.onload = () => {
      const isOk = xhr.status >= 200 && xhr.status < 300;
      const response: FetchResponse = {
        status: xhr.status,
        statusText: xhr.statusText,
        ok: isOk,
        headers: new HeadersMap(xhr.getAllResponseHeaders()),
        text: () => Promise.resolve(xhr.responseText),
        json: () => Promise.resolve(JSON.parse(xhr.responseText)),
        blob: () => Promise.resolve(new Blob([xhr.response])),
      };
      if (isOk) {
        resolve(response);
      } else {
        reject(
          new Error(
            `Request failed with status ${xhr.status}: ${xhr.statusText}`
          )
        );
      }
    };

    // Handle network errors
    xhr.onerror = () => reject(new Error('Network error'));

    // Handle request timeout
    if (options.timeout) {
      xhr.timeout = options.timeout;
      xhr.ontimeout = () => reject(new Error('Request timed out'));
    }

    // Send the request
    xhr.send(options.body || null);
  });
}

// Usage example
// fetchWithProgress('https://example.com/api/data', {}, (progress, event) => {
//   console.log(`Progress: ${progress}%`);
// })
//   .then((response) => {
//     if (response.ok) {
//       console.log('Content-Type:', response.headers.get('Content-Type'));
//       return response.json();
//     } else {
//       throw new Error(
//         `Request failed with status ${response.status}: ${response.statusText}`
//       );
//     }
//   })
//   .then((data) => {
//     console.log('Data received:', data);
//   })
//   .catch((error) => {
//     console.error('Error:', error);
//   });
