global.FontFace = function FontFace() {
  this.load = () => ({
    then: () => {},
  });
};

jest.mock('react-oidc-context', () => ({
  useAuth() {
    return {
      isLoading: false,
      isAuthenticated: true,
      signinRedirect: jest.fn(),
      removeUser: jest.fn(),
      settings: {},
    };
  },
  withAuthenticationRequired: jest.fn(),
}));

global.externalEnv = {};
