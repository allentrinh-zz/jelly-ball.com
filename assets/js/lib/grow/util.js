module.exports = {
  vendors: ['', 'webkit', 'Moz', 'O', 'ms'],
  prefixedProperties: {
    transform: "transform", 
    transformOrigin: "transformOrigin",
    transformStyle: "transformStyle",
    animation: "animation",
    perspectiveOrigin: "perspectiveOrigin",
    transition: "transition",
  },
  prefixedTransitionEnd: {
    'transition':'transitionend',
    'webkitTransition':'webkitTransitionEnd'
  },
  prefixedAnimationEnd: {
    'animation': 'animationend',
    'webkitAnimation': 'webkitAnimationEnd'
  },
  prefixedKeyframe: {
    'animation': '@keyframes',
    'webkitAnimation': '@-webkit-keyframes'
  },
  prefix: "",
  supportsPreserve3D: true,
  /* Math */
  degreesToRadians: function(deg) {
    return Math.PI * deg / 180;
  },
  getNumber: function(digit) {
    var digits = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'];
    if(digits[digit]) { return digits[digit]; }
    return digit;
  },
  sign: function(x) {
    x = +x;
    if (x === 0 || isNaN(x)) {
      return x;
    }
    return x > 0 ? 1 : -1;
  },
  /* Object Manipulation */
  clone: function(obj) {
    var copy;
    if (null === obj || "object" !== typeof obj) {
      return obj;
    }
    if (obj instanceof Array) {
      return obj.slice(0);
    }
    if (obj instanceof Object) {
      copy = {};
      for (var attr in obj) {
        if (obj.hasOwnProperty(attr)) {
          copy[attr] = this.clone(obj[attr]);
        }
      }
      return copy;
    }
  },
  combine: function (left, right, createNew) {
    var combinedObject = left;

    if(createNew) {
      combinedObject = this.clone(left);
    }

    Object.keys(right).forEach(function (key) {
      combinedObject[key] = right[key];
    });
    
    return combinedObject;
  },
  extend: function(props) {
    var prop, obj;
    obj = Object.create(this);
    for(prop in props) {
      if(props.hasOwnProperty(prop)) {
        obj[prop] = props[prop];
      }
    }
    return obj;
  },

  isEmptyObject: function(obj) {
    return Object.keys(obj).length === 0;
  },
  objectShallowEquals: function(a, b) {
    if (a === b) {
      return true;
    }
    var key;
    for (key in a) {
      if (a.hasOwnProperty(key) &&
      (!b.hasOwnProperty(key) || a[key] !== b[key])) {
        return false;
      }
    }
    for (key in b) {
      if (b.hasOwnProperty(key) && !a.hasOwnProperty(key)) {
        return false;
      }
    }
    return true;
  },
  /* Array Manipulation */
  arrayEquals: function(a, b) {
    if(a.length !== b.length) {
      return false;
    }

    for(var i=0; i < a.length; i++) {
      if(a[i] !== b[i]) {
        return false;
      }
    }
    return true;
  },
  convertToArray: function(input, delimiter) {
    delimiter = delimiter || ',';
    if(input === null) { return []; }
    if(Array.isArray(input)) { return input; }
    if(typeof input === 'string') {
      input = input.split(delimiter);
      input.forEach(function(p_value, p_index, p_array) { p_array[p_index] = p_value.trim(); });
      return input;
    } else {
      return [input];
    }
  },
  /* Timeout/Delay */
  debounce: function(func, wait) {
    var timeout;
    return function() {
      var context = this, args = arguments;
      var later = function() {
        timeout = null;
        func.apply(context, args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },
  once: function(fn) {
    var flag = false;
    return function() {
      if(!flag) {
        fn();
      }
      flag = true;
    }
  },
  /* String */
  camelCaseToDelimited: function(str, delimiter) {
    delimiter = delimiter || "-";
    return str.replace(/([A-Z])/g, function(match) {
      return delimiter + match.toLowerCase();
    });
  },
  capitalize: function(str, convertRemainder) {
    var rest = str.slice(1);
    if(convertRemainder) {
      rest = str.slice(1).toLowerCase();
    }
    return str.charAt(0).toUpperCase() + rest;
  },
  /* URL Manipulation */
  cleanPath: function(path) {
    window.history.replaceState({}, document.title, path);
  },
  determineOrigin: function() {
    return window.location.protocol + "//" + window.location.hostname + (window.location.port ? ':' + window.location.port: '');
  },
  getParam: function(name) {
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    var regexS = '[\\?&]' + name + '=([^&#]*)';
    var regex = new RegExp(regexS);
    var results = regex.exec(window.location.href);
    if(results === null) return '';
    else return results[1];
  },
  /* Class Manipulation */
  addClass: function(element, classesToBeAdded, trim) {
    trim = trim || true;
    if(classesToBeAdded instanceof Array === false) {
      classesToBeAdded = this.convertToArray(classesToBeAdded);
    }

    classesToBeAdded.forEach(function(className) {
      element.classList.add(className);
    });
  },
  removeClass: function(element, classesToBeRemoved) {
    if(Array.isArray(classesToBeRemoved) === false) {
      classesToBeRemoved = this.convertToArray(classesToBeRemoved);
    }

    classesToBeRemoved.forEach(function(className) {
      if(element) {
        element.classList.remove(className);
      }
    });
  },
  hasClass: function(element, classToMatch) {
    return element.classList.contains(classToMatch);
  },
  /* Event Handling */
  prefixedEvent: function(element, eventType, callbackFunc) {
    for (var p = 0; p < this.vendors.length; p++) {
      if (p > 1) eventType = eventType.toLowerCase();
      element.addEventListener(this.vendors[p]+eventType, callbackFunc, false);
    }
  },
  removePrefixedEvent: function(element, eventType, callbackFunc) {
    for (var p = 0; p < this.vendors.length; p++) {
      if (p > 1) eventType = eventType.toLowerCase();
      element.removeEventListener(this.vendors[p]+eventType, callbackFunc, false);
    }
  },
  /* Utility */
  initStack: function(p_scope) {
    if(p_scope.hasOwnProperty('tmo_array')) {
      return;
    }
    p_scope.tmo_array = [];
    p_scope.addToStack = function(p_func, p_time) {
      this.tmo_array.push(setTimeout(p_func, p_time));
    }.bind(p_scope);
    p_scope.clearStack = function() {
      for(var t = 0; t < this.tmo_array.length; t++) {
        clearTimeout(this.tmo_array[t]);
      }
      this.tmo_array = [];
    }.bind(p_scope);
  },
  bindAll: function(obj, functions) {
    functions.forEach(function (fn) {
      obj[fn] = obj[fn].bind(obj);
    });
  },
  /* Browser Capabilities */
  test3dSupport: function() {
    var element = document.createElement('p'),
      html = document.getElementsByTagName('HTML')[0],
      body = document.getElementsByTagName('BODY')[0],
      properties_ = {
        'webkitTransformStyle':'-webkit-transform-style',
        'MozTransformStyle':'-moz-transform-style',
        'msTransformStyle':'-ms-transform-style',
        'transformStyle':'transform-style'
      };
    body.insertBefore(element, null);
    for (var i in properties_) {
      if (element.style[i] !== undefined) {
        element.style[i] = "preserve-3d";
      }
    }
    var st = window.getComputedStyle(element, null),
      transform =
        st.getPropertyValue("-webkit-transform-style") ||
        st.getPropertyValue("-moz-transform-style") ||
        st.getPropertyValue("-ms-transform-style") ||
        st.getPropertyValue("transform-style");
    document.body.removeChild(element);
    return transform === 'preserve-3d';
  },
  determineReqAnimFrame: function() {
    this.raf = this.requestAnimationFrame = 
      window.requestAnimationFrame || 
      window.mozRequestAnimationFrame ||
      window.webkitRequestAnimationFrame || 
      window.msRequestAnimationFrame;
    this.caf = this.cancelAnimationFrame =
      window.cancelAnimationFrame || 
      window.mozCancelAnimationFrame || 
      window.webkitCancelRequestAnimationFrame || 
      window.webkitCancelAnimationFrame;
  },
  determineVendorPrefix: function() {
    this.vendors.every(function(prefix) {
      var e = prefix + 'Transform';
      if(typeof document.body.style[e] !== 'undefined') {
        this.prefix = prefix.length > 0 ? "-" + prefix + "-" : prefix;
        Object.keys(this.prefixedProperties).forEach(function(prop, index) {
          this.prefixedProperties[prop] = prefix + this.capitalize(prop);
        }.bind(this));
        return false;
      }
      return true;
    }.bind(this));
  },
  /* Initialization */
  init: function() {
    window.utils_ = this;
    this.determineReqAnimFrame();
    this.supportsPreserve3D = this.test3dSupport();
    this.determineVendorPrefix();
  }
};