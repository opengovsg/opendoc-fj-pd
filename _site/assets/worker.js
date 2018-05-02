(function() {
  importScripts("/assets/lunr.js");

  console.log("Indexing worker initialized");

  this.onmessage = (function(_this) {
    return function(event) {
      var index, siteSections;
      console.log("Starting to build index");
      siteSections = event.data;
      index = lunr(function() {
        this.ref('url');
        this.field('title', {
          boost: 10
        });
        this.field('text');
        this.metadataWhitelist = ['position'];
        return siteSections.forEach((function(_this) {
          return function(section) {
            if (section.text.length > 0) {
              return _this.add({
                'url': section.url,
                'title': section.title,
                'text': section.text
              });
            }
          };
        })(this));
      });
      console.log("Done building index");
      return _this.postMessage(index.toJSON());
    };
  })(this);

}).call(this);
