const {join} = require('path');

/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
  // Changes the cache location for Puppeteer to the project's root folder.
  // This is especially useful for shared hosting (Hostinger, cPanel) where the 
  // global ~/.cache directory might be cleared, restricted, or inaccessible.
  cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
};
