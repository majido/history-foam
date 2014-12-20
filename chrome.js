// Placeholder for functions that are usually provided by Chrome if this was a chrome webui page
CHROME = {
  utils: {// would have been provided by utils.js 
    getFaviconImageSet: function(url, opt_size, opt_type) {
      var size = opt_size || 16;
      var type = opt_type || 'favicon';
      return CHROME.utils.imageset(
          'chrome://' + type + '/size/' + size + '@scalefactorx/' + url);
    },
    // would have been provided by utils.js 
    imageset: function(path) {
      var supportedScaleFactors = [1, 2];//getSupportedScaleFactors();

      var replaceStartIndex = path.indexOf('scalefactor');
      if (replaceStartIndex < 0)
        return CHROME.utils.url(path);

      var s = '';
      for (var i = 0; i < supportedScaleFactors.length; ++i) {
        var scaleFactor = supportedScaleFactors[i];
        var pathWithScaleFactor = path.substr(0, replaceStartIndex) + scaleFactor +
            path.substr(replaceStartIndex + 'scalefactor'.length);

        s += CHROME.utils.url(pathWithScaleFactor) + ' ' + scaleFactor + 'x';

        if (i != supportedScaleFactors.length - 1)
          s += ', ';
      }
      return '-webkit-image-set(' + s + ')';
    },
    url: function(s) {
      // http://www.w3.org/TR/css3-values/#uris
      // Parentheses, commas, whitespace characters, single quotes (') and double
      // quotes (") appearing in a URI must be escaped with a backslash
      var s2 = s.replace(/(\(|\)|\,|\s|\'|\"|\\)/g, '\\$1');
      // WebKit has a bug when it comes to URLs that end with \
      // https://bugs.webkit.org/show_bug.cgi?id=28885
      if (/\\\\$/.test(s2)) {
        // Add a space to work around the WebKit bug.
        s2 += ' ';
      }
      return 'url("' + s2 + '")';
    }
  }, 
  // TODO: Find a better way to detect if running as an extension
  isExtension: !!chrome.history,  
  FileBackend_: {
    getHistoryEntries: function(callback) {
      // Use sample data
      console.log('loading ' + HISTORY_DATA.length + ' history entries from file.');
      callback(HISTORY_DATA);
    },
    deleteHistoryEntry: function(){/*no-op*/}
  },
  ExtensionBackend_: {
    getHistoryEntries: function(callback) {
      // Use chrome history API when running as an extension
      // TODO: It currently loads 1000 entries in memory but it should paginate it instead
      chrome.history.search({text: '', maxResults: 1000}, function(result) {
        // Add fields to make it match sample data format
        for (var i in result) {
          var entry = result[i];
          var date = new Date(entry.lastVisitTime);
          entry["time"] = entry.lastVisitTime;
          entry["dateRelativeDay"] = date.toLocaleDateString('en', { year: 'numeric', month: 'short', day: 'numeric' }); // TODO: compute relative date e.g., Today - Wednesday, December 17, 2014
          entry["dateShort"] =  date.toLocaleDateString('en', { year: 'numeric', month: 'short', day: 'numeric' }); // e.g. "Dec 17, 2014"
          entry["dateTimeOfDay"] = date.toLocaleTimeString('en', {hour:'numeric', minute:'numeric'}); // e.g. "9:31 AM,
          entry["domain"] = new URL(entry.url).host;
        }
        console.log('loading ' + result.length + ' history entries from chrome history API.');
        callback(result);
      });
    },
    deleteHistoryEntry: function(url, callback){    
      // TODO: we also need deleteUrl(url, timestamps) to replicate the full
      //  functionality of the current history page.
      // TODO: UMA: HistoryPage_RemoveSelected', HistoryPage_SearchResultRemove, etc
      // TODO: if (!loadTimeData.getBoolean('allowDeletingHistory'))
      // TOD: this doesn't work - fix it
      chrome.history.deleteUrl({url: url});
      callback();
    }
  }
};

// TODO: implement for web-ui case
CHROME.API = CHROME.isExtension ? CHROME.ExtensionBackend_ : CHROME.FileBackend_;
