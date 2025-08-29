import { Page } from '@playwright/test';

export class LoginPage {
  private usernameInput: string;

  private passwordInput: string;

  private signInButton: string;

  private innerPage: Page;

  private constructor(page: Page) {
    this.innerPage = page;
  }

  public static createKeycloakPage(page: Page) {
    const result = new LoginPage(page);
    result.usernameInput = '#username';
    result.passwordInput = '#password';
    result.signInButton = '#kc-login';

    return result;
  }

  public static createAuth0Page(page: Page) {
    const result = new LoginPage(page);
    result.usernameInput = '[name="email"]';
    result.passwordInput = '[name="password"]';
    result.signInButton = 'span.auth0-label-submit';

    return result;
  }

  public async doLogin(username: string, password: string) {
    await this.innerPage.locator(this.usernameInput).fill(username);
    await this.innerPage.locator(this.passwordInput).fill(password);
    await this.innerPage.locator(this.signInButton).click();
  }
}
