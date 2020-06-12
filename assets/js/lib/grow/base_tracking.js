/**
 * Handles analytics tracking for the app. Extend from it if you need additional / different logic.
 * TODO - listens for route for tracking information.
 *
 * We should modify this next project to meet our needs.
 *
 * TO REGISTER A TRACKEVENT ON A DOM ELEMENT CLICK:
 * add attributes beginning with "data-tracking" to that element set to the values that you wish to be passed to Google Analytics. For example, this HTML:
 *
 * <button data-tracking-section="home" data-tracking-action="share"></button>
 *
 * will generate an event tracking call with this data:
 *
 * ["home", "share"]
 *
 * The order of the tracking data corresponds to the order of the data attributes set in the DOM. 
 */

var mediator = require('./mediator');

function Tracking() {}

var info = ['i', 'n', 'f', 'o'].join(''),
  console_log_css = "background-color:#A84D6B; color:#fff;",

  save_event_array = [],
  save_page_array = [],
  save_custom_array = [],

  trackLog = function () {};

if(/tracking=1/i.test(location.href)) {
  trackLog = function () {
    return console[info].apply(console, arguments);
  };
}

window._gaq = window._gaq || [];

Tracking.prototype.init = function() {
  document.addEventListener("click", function(e) {
    var data = [];

    for(var property in e.target.dataset) {
      if(property.indexOf("tracking") === 0) {
        data.push(e.target.dataset[property]);
      }
    }

    if(data.length) {
      this.trackEvent(data);
    }
  }.bind(this));

  mediator.subscribe("ROUTE_CHANGE", this.trackPageView.bind(this));
};

Tracking.prototype.trackEvent = function(data) {
  _gaq.push(['_trackEvent'].concat(data));
};

Tracking.prototype.trackPageView = function(track_url) {
  _gaq.push(["_trackPageview", track_url]);
};

Tracking.prototype.setCustomVariable = function(index, name, value, opt_scope) {
  if(!opt_scope) {
    opt_scope = 1;
  }
  _gaq.push(["_setCustomVar", index, name, value, opt_scope]);
};

module.exports = Tracking;
