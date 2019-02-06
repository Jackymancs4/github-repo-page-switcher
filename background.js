// var browser = chrome
var cache = {};
var cache_count = 0;
var rateLimitReset = -1

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
  if (parsedUrl.host.endsWith("github.io") || parsedUrl.host == "pages.github.com") {
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
  const profileName = parsedUrl.host.slice(0, -".github.io".length);

  return "https://github.com/" + profileName + parsedUrl.pathname;
}

function comToIo(url) {
  const parsedUrl = new URL(url);
  const profileName = parsedUrl.pathname.split("/")[1];

  if (profileName == '')
    return "https://pages.github.com/"

  return ("https://" + profileName + ".github.io/" + (
    parsedUrl.pathname.split("/")[2] ?
    parsedUrl.pathname.split("/")[2] :
    ""));
}

function handleSecondCheck(altUrl, id, secondRes) {
  if (secondRes) {
    let goToMessage = isGithubIoUrl(altUrl) ?
      "the Github Pages web page" :
      "the Github repository"
    let goToIcon = isGithubIoUrl(altUrl) ?
      "pages" :
      "repo"

    browser.pageAction.setTitle({
      tabId: id,
      title: "Go to " + goToMessage
    });
    browser.pageAction.setIcon({
      tabId: id,
      path: {
        "16": "icons/" + goToIcon + ".svg",
        "19": "icons/" + goToIcon + ".svg",
        "24": "icons/" + goToIcon + ".svg",
        "32": "icons/" + goToIcon + ".svg",
        "38": "icons/" + goToIcon + ".svg",
      }
    })
  } else {
    browser.pageAction.hide(id);
  }
}

function handleError(url, id) {
  let goToMessage = isGithubIoUrl(url) ?
    "the Github Pages web page" :
    "the Github repository"
  let goToIcon = isGithubIoUrl(url) ?
    "pages" :
    "repo"

  browser.pageAction.setTitle({
    tabId: id,
    title: "Go to " + goToMessage
  });
  browser.pageAction.setIcon({
    tabId: id,
    path: {
      "16": "icons/" + goToIcon + "-red.svg",
      "19": "icons/" + goToIcon + "-red.svg",
      "24": "icons/" + goToIcon + "-red.svg",
      "32": "icons/" + goToIcon + "-red.svg",
      "38": "icons/" + goToIcon + "-red.svg",
    }
  })
}

function handleSecondError(url, id) {
  handleError(getAltUrl(url), id)
}

function handleFirstCheck(url, id, firstRes) {
  if (firstRes) {
    checkPage(getAltUrl(url), id, handleSecondCheck, handleSecondError);
  } else {
    browser.pageAction.hide(id);
  }
}

function handleFirstError(url, id) {
  handleError(url, id)
}

/* Initialize the page action: set icon and title, then show.*/
function initializePageAction(tab) {
  if (isValidUrl(tab.url)) {
    checkPage(tab.url, tab.id, handleFirstCheck, handleFirstError);
  } else {
    browser.pageAction.hide(tab.id);
  }

  if (cache_count > 100) {
    console.log(cache);

    cache_count = 0;
    cache = {};
  }
}

function checkPage(url, id, callback, error) {

  if (cache[url] !== undefined) {
    callback(url, id, cache[url]);
  } else {

    if (rateLimitReset > 0) {
      // https://stackoverflow.com/questions/221294/how-do-you-get-a-timestamp-in-javascript
      if (rateLimitReset > (+new Date()) / 1000) {
        error(url, id)
      } else {
        rateLimitReset = -1
        checkPage(url, id, callback, error)
      }
    } else {

      var request = new XMLHttpRequest();
      request.open("HEAD", url, true);
      request.onreadystatechange = function () {
        // if (request.readyState === 4) {
        if (request.readyState == request.HEADERS_RECEIVED) {
          if (request.status === 404) {
            cache_count++;
            cache[url] = false;
            callback(url, id, false);
          } else if (request.status === 403) {
            rateLimitReset = new Date(request.getResponseHeader("X-RateLimit-Reset") * 1000);
            error(url, id);
          } else if (request.status === 200) {
            cache_count++;
            cache[url] = true;
            callback(url, id, true);
          } else if (true) {
            error(url, id);
          }
        }
      };
      request.send();
    }
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
