// open browser to run. Not is node.js

const path = [];
const prefix = '/sportsbook';
const link = document.querySelectorAll('.nav-link.sub-items-menu__body__item__link.request_league.sub-menu-link');

// Regex to remove query strings and hashes
const cleanUrl = (url) => {
  return url.replace(/([?#].*)$/, ''); // This removes anything after '?' or '#'
};

link.forEach(el => {
  let url = el.getAttribute('data-url');

  // Check if the URL starts with the prefix
  if (!url.startsWith(prefix)) return;

  // Remove the prefix
  url = url.replace(prefix, '');

  if (url) {
    // Clean up the URL and push to the path array
    const cleanedUrl = cleanUrl(url);
    path.push(cleanedUrl);
    console.info('Pushed:', cleanedUrl);
  }
});

// Remove duplicates by converting path to a Set and then back to an array
const uniquePaths = [...new Set(path)];

console.log('Unique Paths:', uniquePaths);
