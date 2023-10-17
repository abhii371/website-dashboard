const puppeteer = require('puppeteer');
const { API_BASE_URL } = require('../../constants');
const { filteredUsersData } = require('../../mock-data/users');

describe('App Component', () => {
  let browser;
  let page;
  jest.setTimeout(60000);
  let config = {
    launchOptions: {
      headless: 'new',
      ignoreHTTPSErrors: true,
      args: ['--incognito', '--disable-web-security'],
    },
  };

  const BASE_URL = 'http://localhost:8000';

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
  beforeAll(async () => {
    browser = await puppeteer.launch(config.launchOptions);
    page = await browser.newPage();

    await page.setRequestInterception(true);

    page.on('request', (interceptedRequest) => {
      const url = interceptedRequest.url();
      if (url === `${API_BASE_URL}/users/search/?role=in_discord`) {
        interceptedRequest.respond({
          status: 200,
          contentType: 'application/json',
          headers,
          body: JSON.stringify({
            ...filteredUsersData,
            users: filteredUsersData.users.filter(
              (user) => user.roles.in_discord,
            ),
          }),
        });
      } else if (url === `${API_BASE_URL}/users/search/?verified=true`) {
        interceptedRequest.respond({
          status: 200,
          contentType: 'application/json',
          headers,
          body: JSON.stringify({
            ...filteredUsersData,
            users: filteredUsersData.users.filter((user) => user.discordId),
          }),
        });
      } else {
        interceptedRequest.continue();
      }
    });

    await page.goto(`${BASE_URL}/users/discord/`); // Replace with your app's URL
    await page.waitForNetworkIdle();
  });

  afterAll(async () => {
    await browser.close();
  });

  it('should render all sections', async () => {
    let tabsSection = await page.$('.tabs_section');
    let usersSection = await page.$('.users_section');
    let firstUser = await page.$('.user_card');
    let userDetailsSection = await page.$('.user_details_section');
    expect(tabsSection).toBeDefined();
    const tabs = await tabsSection.$$('.tab');
    expect(tabs.length).toEqual(2);

    expect(usersSection).toBeDefined();

    expect(userDetailsSection).toBeDefined();
  });

  it('should update the URL query string and re-render the app', async () => {
    // Click on the "Linked Accounts" tab
    await page.click('[data_key="verified"]');

    // Get the current URL and make sure the query string has been updated
    const url = await page.url();
    expect(url).toContain('?tab=verified');
  });

  it('should not display user details section initially when window width is less than 600 pixels', async () => {
    await page.setViewport({ width: 599, height: 768 });

    await page.waitForSelector('.user_details_section');

    const userDetailsSection = await page.$('.user_details_section');
    const overlay = await page.$('#overlay');

    const userDetailsSectionStyle = await page.evaluate((element) => {
      return getComputedStyle(element).display;
    }, userDetailsSection);

    const overlayStyle = await page.evaluate((element) => {
      return getComputedStyle(element).display;
    }, overlay);

    expect(overlayStyle).toBe('none');
    expect(userDetailsSectionStyle).toBe('none');
  });

  it('should display user details section when clicking on user_card', async () => {
    await page.setViewport({ width: 599, height: 768 });

    await page.click('.user_card');

    const userDetailsSection = await page.$('.user_details_section');
    const overlay = await page.$('#overlay');

    const userDetailsSectionStyle = await page.evaluate((element) => {
      return getComputedStyle(element).display;
    }, userDetailsSection);

    const overlayStyle = await page.evaluate((element) => {
      return getComputedStyle(element).display;
    }, overlay);

    expect(overlayStyle).toBe('block');
    expect(userDetailsSectionStyle).toBe('block');
  });

  it('should hide user details section when clicking on the overlay', async () => {
    await page.setViewport({ width: 599, height: 768 });

    const userDetailsSection = await page.$('.user_details_section');
    const overlay = await page.$('#overlay');

    expect(overlay).toBeDefined();
    await page.click('#overlay', { offset: { x: 10, y: 10 } });

    const userDetailsSectionStyle = await page.evaluate((element) => {
      return getComputedStyle(element).display;
    }, userDetailsSection);

    const overlayStyle = await page.evaluate((element) => {
      return getComputedStyle(element).display;
    }, overlay);

    expect(userDetailsSectionStyle).toBe('none');
    expect(overlayStyle).toBe('none');
  });
});
