// var browser = chrome
var cache = {};
var cache_count = 0;

// Worst name ever
function goToAlternativeTabUrl(tab) {
  var updating = browser.tabs.update({
    url: getAltUrl(tab.url)
  });
}

function isGithubComUrl(url) {
  const parsedUrl = new URL(url);
  if (parsedUrl.host == "github.com") {
    return true;
  } else {
    return false;
  }
}

function isGithubIoUrl(url) {
  const parsedUrl = new URL(url);
  if (parsedUrl.host.endsWith("github.io")) {
    return true;
  } else {
    return false;
  }
}

function getAltUrl(url) {
  if (isGithubComUrl(url)) {
    return comToIo(url);
  } else if (isGithubIoUrl(url)) {
    return ioToCom(url);
  } else {
    return url;
  }
}

function isValidUrl(url) {
  const parsedUrl = new URL(url);
  if (isGithubComUrl(url) || isGithubIoUrl(url)) {
    return true;
  } else {
    return false;
  }
}

function ioToCom(url) {
  const parsedUrl = new URL(url);
  const profileName = parsedUrl.host.slice(0, - ".github.io".length);

  return "https://github.com/" + profileName + parsedUrl.pathname;
}

function comToIo(url) {
  const parsedUrl = new URL(url);
  const profileName = parsedUrl.pathname.split("/")[1];

  return ("https://" + profileName + ".github.io/" + (
    parsedUrl.pathname.split("/")[2]
    ? parsedUrl.pathname.split("/")[2]
    : ""));
}

/* Initialize the page action: set icon and title, then show.*/
function initializePageAction(tab) {
  if (isValidUrl(tab.url)) {
    checkPage(tab.url, (orUrl, firstRes) => {
      if (firstRes) {
        checkPage(getAltUrl(tab.url), (altUrl, secondRes) => {
          if (secondRes) {
            browser.pageAction.setTitle({tabId: tab.id, title: "Go to…"});
          } else {
            browser.pageAction.hide(tab.id);
          }
        });
      } else {
        browser.pageAction.hide(tab.id);
      }
    });
  }

  if (cache_count > 100) {
    console.log(cache);

    cache_count = 0;
    cache = {};
  }
}

function checkPage(url, callback) {
  if (cache[url] !== undefined) {
    callback(url, cache[url]);
  } else {
    cache_count++;

    var request = new XMLHttpRequest();
    request.open("GET", url, true);
    request.onreadystatechange = function () {
      if (request.readyState === 4) {
        if (request.status === 404) {
          cache[url] = false;
          callback(url, false);
        } else if (true) {
          cache[url] = true;
          callback(url, true);
        }
      }
    };
    request.send();
  }
}

/* When first loaded, initialize the page action for all required tabs. */
var gettingAllTabs = browser.tabs.query({
  url: [
    "https://*.github.io/*",
    "https://*.github.com/*"
  ]
});
gettingAllTabs.then(tabs => {
  for (let tab of tabs) {
    initializePageAction(tab);
  }
});

/* Each time a tab is updated, reset the page action for that tab. */
browser.tabs.onUpdated.addListener((id, changeInfo, tab) => {
  initializePageAction(tab);
});

/* go to the respective other URL */
browser.pageAction.onClicked.addListener(goToAlternativeTabUrl);
