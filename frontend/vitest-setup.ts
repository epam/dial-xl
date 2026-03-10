import { vi } from 'vitest';
import createFetchMock from 'vitest-fetch-mock';

import 'reflect-metadata';

const fetchMocker = createFetchMock(vi);
fetchMocker.enableMocks();

(global as unknown as Record<string, unknown>).FontFace =
  function FontFace(this: { load: () => { then: () => void } }) {
    this.load = () => ({
      then: () => {},
    });
  };

vi.mock('react-oidc-context', () => ({
  useAuth() {
    return {
      isLoading: false,
      isAuthenticated: true,
      signinRedirect: vi.fn(),
      removeUser: vi.fn(),
      settings: {},
    };
  },
  withAuthenticationRequired: vi.fn(),
}));

(global as unknown as Record<string, unknown>).externalEnv = {};

// Mock ResizeObserver from the CodeEditor.tsx
Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  configurable: true,
  value: vi.fn(),
});

if (!window.requestAnimationFrame) {
  window.requestAnimationFrame =
    vi.fn() as unknown as typeof window.requestAnimationFrame;
}
