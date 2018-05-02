(function() {
  var DOM_API, HEADER_TAGS, buildHierarchy, buildSerializableSiteSections, getHeadersAndText;

  importScripts("/assets/jsdom.js");

  console.log("Hierarchy Worker initialized");

  DOM_API = new jsdom.JSDOM().window;

  HEADER_TAGS = ["H1", "H2", "H3", "H4", "H5", "H6"];

  getHeadersAndText = function(root) {
    var node, nodes, walker;
    walker = DOM_API.document.createTreeWalker(root, DOM_API.NodeFilter.SHOW_ALL, {
      acceptNode: function(node) {
        if (HEADER_TAGS.indexOf(node.tagName) >= 0) {
          return DOM_API.NodeFilter.FILTER_ACCEPT;
        }
        if (HEADER_TAGS.indexOf(node.parentNode.tagName) >= 0) {
          return DOM_API.NodeFilter.FILTER_REJECT;
        }
        if (node.nodeType === 3) {
          return DOM_API.NodeFilter.FILTER_ACCEPT;
        }
        return DOM_API.NodeFilter.FILTER_SKIP;
      }
    }, false);
    nodes = [];
    while (node = walker.nextNode()) {
      nodes.push(node);
    }
    return nodes;
  };

  buildHierarchy = function(pages) {
    var siteHierarchy;
    siteHierarchy = {
      component: {},
      title: 'Init title',
      url: 'Init Url',
      text: []
    };
    siteHierarchy.subsections = pages.map(function(page) {
      var body, currentSection, headersAndText, root;
      body = new jsdom.JSDOM(page.content).window.document.body;
      headersAndText = getHeadersAndText(body);
      root = {
        parent: siteHierarchy,
        component: page,
        title: page.title,
        url: page.url,
        text: [],
        subsections: []
      };
      currentSection = root;
      headersAndText.forEach(function(node) {
        var newSection;
        if (HEADER_TAGS.indexOf(node.tagName) < 0) {
          currentSection.text.push(node.textContent);
          return;
        }
        while (HEADER_TAGS.indexOf(node.tagName) <= HEADER_TAGS.indexOf(currentSection.component.tagName)) {
          currentSection = currentSection.parent;
        }
        newSection = {
          parent: currentSection,
          component: node,
          title: node.textContent,
          url: page.url + "#" + node.id,
          text: [],
          subsections: []
        };
        currentSection.subsections.push(newSection);
        return currentSection = newSection;
      });
      return root;
    });
    return siteHierarchy;
  };

  buildSerializableSiteSections = function(siteHierarchy) {
    var queue, section, sectionIndex, serializableSiteSections, stack;
    queue = [siteHierarchy];
    while (queue.length > 0) {
      section = queue.shift();
      section.text = section.text.join('').trim();
      queue.push.apply(queue, section.subsections);
    }
    queue = [siteHierarchy];
    while (queue.length > 0) {
      section = queue.shift();
      while (section.subsections.length === 1 && section.text.length === 0) {
        section.text += section.subsections[0].text;
        section.subsections = section.subsections[0].subsections;
        section.subsections.forEach(function(child) {
          return child.parent = section;
        });
      }
      queue.push.apply(queue, section.subsections);
    }
    sectionIndex = {};
    stack = [siteHierarchy];
    while (stack.length > 0) {
      section = stack.pop();
      stack.push.apply(stack, section.subsections.slice().reverse());
      sectionIndex[section.url] = section;
    }
    serializableSiteSections = Object.values(sectionIndex).map(function(section) {
      var serializableSection;
      serializableSection = Object.assign({}, section);
      delete serializableSection.parent;
      delete serializableSection.component;
      delete serializableSection.subsections;
      return serializableSection;
    });
    return serializableSiteSections;
  };

  this.onmessage = (function(_this) {
    return function(event) {
      var pages, siteHierarchy, siteSections;
      console.log("Starting to build site sections");
      pages = event.data;
      siteHierarchy = buildHierarchy(pages);
      siteSections = buildSerializableSiteSections(siteHierarchy);
      console.log("Done building site sections");
      return _this.postMessage({
        hierarchy: siteHierarchy,
        sections: siteSections
      });
    };
  })(this);

}).call(this);
