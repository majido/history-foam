// Placeholder for functions that are usually provided by Chrome if this was a chrome webui page
CHROME = {
  // provided by utils.js 
  getFaviconImageSet: function(url, opt_size, opt_type) {
    var size = opt_size || 16;
    var type = opt_type || 'favicon';
    return CHROME.imageset(
        'chrome://' + type + '/size/' + size + '@scalefactorx/' + url);
  },
  // provided by utils.js 
  imageset: function(path) {
    var supportedScaleFactors = [1, 2];//getSupportedScaleFactors();

    var replaceStartIndex = path.indexOf('scalefactor');
    if (replaceStartIndex < 0)
      return CHROME.url(path);

    var s = '';
    for (var i = 0; i < supportedScaleFactors.length; ++i) {
      var scaleFactor = supportedScaleFactors[i];
      var pathWithScaleFactor = path.substr(0, replaceStartIndex) + scaleFactor +
          path.substr(replaceStartIndex + 'scalefactor'.length);

      s += CHROME.url(pathWithScaleFactor) + ' ' + scaleFactor + 'x';

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
};