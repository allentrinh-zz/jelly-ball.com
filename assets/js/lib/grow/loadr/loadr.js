(function(global) {

  /*
  * # # # # # # # # # # # # # # # # # # # # # #
  *
  * General functionality for loading assets.
  *
  * @function loadr
  * @param p_settings {<Object>} Object containing various options for 
  * customizing the loadr instance.
  * Settings include:
  * - Maximum amount of concurrent downloads allowed (Note: this may be 
  * further capped by the maximum amount allowed by the browser)
  * - How often progress report is polled
  * - How often the status of loading assets are polled
  * - How long to wait before an asset is considered to have timed out
  *
  * # # # # # # # # # # # # # # # # # # # # # #
  */

  function loadr(p_settings) {

    var defaults = {
      maxSimultaneousLoads: 2,      // Amount of simultaneous assets to load
      progressPollTime:   500,    // How often progress of all assets are polled, in milliseconds
      statusInterval:     5000,   // How often the status of a loading asset is polled, in miliseconds
      noProgressTimeout:    Infinity  // Amount of time to wait before an asset is considered to have timed out, in milliseconds
    },
    assets = [],
    progressListeners = [],
    uniqueListeners = [],
    timeStarted,
    progressChanged = Date.now(),
    statusTmr = null,
    isFrozen = false,
    idCounter = 0,
    globalCallbackIndex = 0,
    AssetState = {
      QUEUED:   0,
      WAITING:  1,
      LOADED:   2,
      ERROR:    3,
      TIMEOUT:  4
    },
    haltedComplete,
    haltedTotal;

    // # # # # # # # # # # # # # # # # # # # # # #
    //
    // UTILITY
    //
    // # # # # # # # # # # # # # # # # # # # # # #

    /*
    * ====================
    *
    * Extend functionality - Add the properties of one object to another.
    *
    * @function combine
    * @param p_base_obj {Object} Object which will receive properties
    * @param p_graft_obj {Object} Object that contains properties to pass onto the base object
    *
    * ====================
    */

    var combine = function(p_base_obj, p_graft_obj) {
      Object.keys(p_graft_obj).forEach(function(key) { p_base_obj[key] = p_graft_obj[key]; });
      return p_base_obj;
    },

    /*
    * ====================
    *
    * Compare two arrays and return a list of the overlapping values.
    *
    * @function compare
    * @param p_this_list {Object}
    * @param p_that_list {Object}
    *
    * ====================
    */

    compare = function(p_this_list, p_that_list) {
      return p_this_list.filter(function(p_value, p_index, p_array) {
        return p_that_list.indexOf(p_value.toLowerCase()) > -1;
      });
    },

    /*
    * ====================
    *
    * Round a number to two decimal places.
    *
    * @function round
    * @param p_num {Number} Number to be rounded to two decimal places.
    *
    * ====================
    */

    round = function(p_num) {
      return Math.round(p_num * 100) / 100;
    },

    /*
    * ====================
    *
    * Round a number to two decimal places.
    *
    * @function ensureArray
    * @param p_val {String/Array/Object} A set of values to test and turn into an array if need be.
    * @param p_delimiter {String} Optional parameter that dictates which character(s) to split parameter 
    * p_val by, if p_val is a String. Defaults to a comma (',').
    *
    * ====================
    */

    ensureArray = function(p_val, p_delimiter) {
      p_delimiter = p_delimiter || ',';
      if(p_val === null) { return []; }
      if(Array.isArray(p_val)) { return p_val; }
      if(typeof p_val === 'string') {
        p_val =  p_val.split(p_delimiter);
        p_val.forEach(function(p_value, p_index, p_array) { p_array[p_index] = p_value.trim(); });
        return p_val;
      } else {
        return [p_val];
      }
    },

    /*
    * ====================
    *
    * Returns extension from a filename string.
    *
    * @function getExtension
    * @param p_filename {String} Path to filename.
    *
    * ====================
    */

    getExtension = function(p_filename) {
      var split_filename = p_filename.split('.');
      return split_filename[split_filename.length - 1];
    };

    //

    // Set loadr options
    p_settings = p_settings || {};
    p_settings = combine(defaults, p_settings);
    this.settings = p_settings;

    //

    // # # # # # # # # # # # # # # # # # # # # # #
    //
    // PRIVATE
    //
    // # # # # # # # # # # # # # # # # # # # # # #

    /*
    * ====================
    *
    * Checks progress for each asset and updates overall progress and/or completion, 
    * and determines whether or not unique progress/completion handlers exist and 
    * if they should trigger.
    *
    * @function onProgress
    * @param p_resource {loadrImage/loadrScript/loadrSound} Reference to a loadr asset instance.
    * @param p_status_type {Number} Number corresponding to the loadr asset instance's current state (See AssetState Object)
    *
    * ====================
    */

    var onProgress = function(p_resource, p_status_type) {

      var i, len,
        thisAsset = null,
        thisListener,
        fireUniqueCallback,
        sendProgressData,
        listenersArray = [];

      for(i = 0, len = assets.length; i < len; i++) {
        if (assets[i].resource === p_resource) {
          thisAsset = assets[i];
          break;
        }
      }
      
      if(thisAsset === null || thisAsset.status !== AssetState.WAITING) {
        return;
      }
      
      thisAsset.status = p_status_type;

      // Fire generic progress/completion handler for all assets
      for(i = 0, len = progressListeners.length; i < len; i++) {
        thisListener = progressListeners[i];
        sendProgress(thisAsset, thisListener);
      }

      for(i = 0, len = uniqueListeners.length; i < len; i++) {
        thisListener = uniqueListeners[i];
        if(thisAsset.id === thisListener.id) {
          // Fire unique progress handler for a single asset, if added - not fully supported/doesn't fire
          if(thisAsset.status === AssetState.WAITING) {
            thisListener.callback(thisAsset);
          // Fire completion handler for a single asset, if added
          } else if(thisAsset.status === AssetState.LOADED && thisListener.fired === false) {
            thisListener.fired = true;
            thisListener.callback(thisAsset);
          }
        }
      }
    };

    /*
    * ====================
    *
    * Fire and pass data to a callback that was attached to an asset.
    *
    * @function sendProgress
    * @param p_updated_asset {loadrImage/loadrScript/loadrSound} Reference to a loadr asset instance.
    * @param p_listener {Number} Reference to a callback added to the asset.
    *
    * ====================
    */

    var sendProgress = function(p_updated_asset, p_listener) {

      var this_callback = p_listener.callback,
        completed = 0,
        total = 0,
        i, len, thisAsset, progressObj;

      for(i = 0, len = assets.length; i < len; i++) {
        thisAsset = assets[i];
        total++;
        if (thisAsset.status === AssetState.LOADED ||
          thisAsset.status === AssetState.ERROR || 
          thisAsset.status === AssetState.TIMEOUT) {
          completed++;
        }
      }

      progressObj = {
        resource:   p_updated_asset.resource,
        loaded:     (p_updated_asset.status === AssetState.LOADED),
        error:      (p_updated_asset.status === AssetState.ERROR),
        timeout:    (p_updated_asset.status === AssetState.TIMEOUT),
        completedCount: completed,
        totalCount:   total
      };

      if(p_updated_asset.resource.halted === true) {
        if(p_updated_asset.resource.haltedObj.callback !== null && p_updated_asset.resource.haltedObj.fired === false) {
          p_updated_asset.resource.haltedObj.fired = true;
          p_updated_asset.resource.haltedObj.callback.call(this, progressObj);
        }
      } else {
        this_callback.call(this, progressObj);
      }
    };

    /*
    * ====================
    *
    * Check the status of the assets to determine if they have loaded or not.
    *
    * @function checkAssetStatus
    *
    * ====================
    */

    var checkAssetStatus = function() {
      var checkAgain = false,
        noProgressTime = Date.now() - progressChanged,
        timedOut = (noProgressTime >= this.settings.noProgressTimeout),
        i, len, thisAsset;

      for(i = 0, len = assets.length; i < len; i++) {
        thisAsset = assets[i];
        if (thisAsset.status !== AssetState.WAITING) {
          continue;
        }

        // see if the resource has loaded
        if (thisAsset.resource.checkStatus) {
          thisAsset.resource.checkStatus();
        }

        // if still waiting, mark as timed out or make sure we check again
        if (thisAsset.status === AssetState.WAITING) {
          if (timedOut) {
            thisAsset.resource.onTimeout();
          } else {
            checkAgain = true;
          }
        }
      }

      if(checkAgain) {
        clearTimeout(statusTmr);
        statusTmr = setTimeout(checkAssetStatus, this.settings.statusInterval);
      }
    }.bind(this);

    // # # # # # # # # # # # # # # # # # # # # # #
    //
    // PUBLIC
    //
    // # # # # # # # # # # # # # # # # # # # # # #
    
    /*
    * ====================
    *
    * Add an asset to be loaded.
    *
    * @method add
    * @param p_asset {String/Object} Loadr asset instance to be loaded. If filepath
    * is provided instead, the instance is automatically determined with the createAsstByUrl method.
    * @param p_options {Object} Options used when initializing the loadr asset instance.
    * @param p_get_instance_only {Boolean} Optional parameter for blocking automatic 
    * addition to the load queue. Useful for creating an instance first, and adding to the 
    * load queue later. Defaults to false.
    *
    * ====================
    */

    this.add = function(p_asset, p_options, p_get_instance_only) {
      var asset = null,
        options = {
          id:     idCounter, // internal unique identifier
          weight:   1,
          tags:   [],
          callbacks:  []
        };
      p_options = p_options || {};
      p_options = combine(options, p_options);
      p_get_instance_only = p_get_instance_only || false;
      if(typeof p_asset === 'string') {
        // Create a loadr asset instance
        asset = this.createAssetByUrl(p_asset, p_options);
      } else {
        // Already a loadr asset instance
        asset = p_asset;
      }
      // Add to the load queue, unless the user says otherwise
      if(!p_get_instance_only) {
        assets.push({
          resource:   asset,
          id:       p_options.id.toString(),
          weight:     p_options.weight,
          tags:     ensureArray(p_options.tags),
          callbacks:    p_options.callbacks,
          status:     AssetState.QUEUED
        });
      }
      idCounter++;
      return asset;
    };

    /*
    * ====================
    *
    * Automatically create a loadr asset instance based off the asset's filename.
    *
    * @method createAssetByUrl
    * @param p_asset {String} Filepath to asset.
    * @param p_options {Object} Options object to pass to the loadr asset instance.
    *
    * ====================
    */

    this.createAssetByUrl = function(p_asset_filename, p_options) {
      var file_ext = getExtension(p_asset_filename);
      switch(file_ext) {
        case 'bmp':
        case 'gif':
        case 'jpeg':
        case 'jpg':
        case 'png':
        case 'ico':
          return (typeof loadrImage === 'function') ? new loadrImage(p_asset_filename, p_options) : { status: 'loadrImage NOT AVAILABLE' };
        case 'js':
        case 'json':
          return (typeof loadrScript === 'function') ? new loadrScript(p_asset_filename, p_options) : { status: 'loadrScript NOT AVAILABLE' };
      }
      return { status: 'NOT A SUPPORTED FILE TYPE' };
    };


    /*
    * ====================
    *
    * Add event handlers to assets.
    *
    * @method on
    * @param p_event_name {String} Event name to respond to. Accepts 'progress' and 'completion'.
    * @param p_callback {Function} Callback function to fire upon event.
    * @param p_id {String/Number} Optional parameter for unique callbacks. If exists, 
    * the provided callback will only fire for the asset tied to the provided id.
    * If no id is provided, the handler is considered generic and fires for all assets. 
    * Defaults to undefined.
    *
    * ====================
    */

    this.on = function(p_event_name, p_callback, p_id) {
      p_callback = p_callback || undefined;
      if(p_callback === undefined) {
        console.log('Please provide a callback.');
        return false;
      }
      p_id = (p_id !== null && p_id !== undefined) ? p_id.toString() : undefined;
      var shouldReturn = false,
        listenersArray = [],
        allCompleteCallback = function(e) {
          if(e.completedCount === e.totalCount) {
            p_callback(e);
          }
        };
      // determine which listener array to use
      if(p_id !== undefined) {
        listenersArray = uniqueListeners;
      } else {
        listenersArray = progressListeners;
      }
      switch(p_event_name) {
        case 'progress':
          listenersArray.push({
            callback: p_callback,
            id: p_id // if specified, tie callback to unique id
          });
          shouldReturn = true;
        break;
        case 'completion':
          var thisCallback = (p_id !== undefined) ? p_callback : allCompleteCallback;
          listenersArray.push({
            callback: thisCallback,
            fired: false,
            id: p_id // if specified, tie callback to unique id
          });
          shouldReturn = true;
        break;
        default:
          console.log('Unavailable listener event: ', p_event_name);
        break;
      }
      if(shouldReturn === true) {
        return p_id;
      }
    };

    /*
    * ====================
    *
    * Remove an event handler added with the on method.
    *
    * @method off
    * @param p_event_name {String} Event name to callback was attached to. Accepts 'progress' and 'completion'.
    * @param p_callback {Function} Callback function to remove.
    * @param p_id {String/Number} Optional parameter for unique callbacks. 
    * Defaults to undefined.
    *
    * ====================
    */

    this.off = function(p_event_name, p_callback, p_id) {
      p_callback = p_callback || undefined;
      p_id = p_id || undefined;
      var i, len,
        thisListener,
        listenersArray = [],
        shouldCheckCallback = p_callback !== undefined,
        shouldCheckId = p_id !== undefined,
        shouldRemoveIt = false;
      // determine which listener array to use
      if(p_id !== undefined) {
        listenersArray = uniqueListeners;
      } else {
        listenersArray = progressListeners;
      }
      for(i = 0, len = listenersArray.length; i < len; i++) {
        thisListener = listenersArray[i];
        if(!shouldCheckCallback && !shouldCheckId) {
          // Just flag it
          shouldRemoveIt = true;
        } else if(shouldCheckCallback && shouldCheckId) {
          // If the callback and id both match, flag it
          if(thisListener.callback === p_callback && thisListener.id === p_id) {
            shouldRemoveIt = true;
          }
        } else if(shouldCheckCallback || shouldCheckId) {
          // If either the callback or id were provided and match, flag it
          if( (shouldCheckCallback && thisListener.callback === p_callback) ||
            (shouldCheckId && thisListener.id === p_id)) {
            shouldRemoveIt = true;
          }
        }
        if(shouldRemoveIt === true) {
          // Remove the listener if it was flagged
          progressListeners.splice(i, 1);
          break;
        }
      }
    };

    //

    /*
    * ====================
    *
    * Starts loading the current queue.
    *
    * @method start
    * @param p_tags {String/Array} Optional parameter of specific identifiers. Accepts a comma-
    * delimited string, or array of strings. If provided, only load assets with matching tags 
    * will be loaded. Defaults to [].
    *
    * ====================
    */

    this.start = function(p_tags) {
      this.isFrozen = false;
      p_tags = p_tags || [];
      p_tags = ensureArray(p_tags);
      var i, len, thisAsset,
        shouldCheckTags = p_tags.length > 0,
        shouldStart;
      for(i = 0, len = assets.length; i < len; i++) {
        shouldStart = !shouldCheckTags;
        thisAsset = assets[i];
        if(shouldCheckTags) {
          if(compare(thisAsset.tags, p_tags).length === p_tags.length) {
            shouldStart = true;
          }
        }
        if(shouldStart === true && thisAsset.status === AssetState.QUEUED) {
          thisAsset.status = AssetState.WAITING;
          thisAsset.resource.start(this);
        }
      }
      clearTimeout(statusTmr);
      statusTmr = setTimeout(checkAssetStatus, 100);
    };

    /*
    * ====================
    *
    * Stop loading the current load queue.
    *
    * @method stop
    * (Note: does not cancel active http requests)
    *
    * ====================
    */

    this.stop = function() {
      this.isFrozen = true;
      clearTimeout(statusTmr);
    };

    /*
    * ====================
    *
    * Stop loading the current load queue, and emit an event when all currently loading assets 
    * finsh loading.
    *
    * @method halt
    * @param p_callback {Function} Callback function to fire once all currently 
    * loaded assets of halted queue have finished loading.
    *
    * ====================
    */

    this.halt = function(p_callback) {
      p_callback = p_callback || null;
      this.stop();
      var i, len, thisAsset,
        haltCompleteHandler = function(data) {
          haltedComplete++;
          if(haltedComplete === haltedTotal) {
            if(p_callback !== null) p_callback.call(this, data);
          }
        };
      haltedComplete = haltedTotal = 0;
      for(i = 0, len = assets.length; i < len; i++) {
        thisAsset = assets[i];
        if(thisAsset.status === AssetState.WAITING) {
          haltedTotal++;
          thisAsset.resource.stop(haltCompleteHandler);
        } else {
          thisAsset.resource.stop();
        }
        
      }
    };

    /*
    * ====================
    *
    * Modify the maximum amount of concurrent downloads allowed.
    *
    * @method setCap
    * (Note: does not cancel active http requests)
    *
    * ====================
    */

    this.setCap = function(pNum, pStop) {
      if(pStop) {
        // force stoppage of currently queued assets
        this.halt();
      }
      this.settings.maxSimultaneousLoads = pNum;
    };

    /*
    * ====================
    *
    * Removes all assets for current load queue and all accompanying listeners.
    *
    * @method clear
    *
    * TODO: Complete!
    *
    * ====================
    */

    this.clear = function() {
      this.stop();

      // empty assets
      assets = [];

      // remove listeners
      // progressListeners = [];
      // uniquelisteners = [];
    };

    //

    /*
    * ====================
    *
    * Internal routing function for when an asset is loaded.
    *
    * @method onLoad
    * @param p_resource {loadrImage/loadrScript/loadrSound} Reference to loadr asset instance.
    *
    * ====================
    */

    this.onLoad = function(p_resource) {
      onProgress(p_resource, AssetState.LOADED);
    };

    /*
    * ====================
    *
    * Internal routing function for when an asset encounters an error while loading.
    *
    * @method onError
    * @param p_resource {loadrImage/loadrScript/loadrSound} Reference to loadr asset instance.
    *
    * ====================
    */

    this.onError = function(p_resource) {
      onProgress(p_resource, AssetState.ERROR);
    };

    /*
    * ====================
    *
    * Internal routing function for when an asset times out during loading.
    *
    * @method onTimeout
    * @param p_resource {loadrImage/loadrScript/loadrSound} Reference to loadr asset instance.
    *
    * ====================
    */

    this.onTimeout = function(p_resource) {
      onProgress(p_resource, AssetState.TIMEOUT);
    };

    /*
    * ====================
    *
    * Check progress of all assets within current load queue and return the percentage 
    * of loaded assets.
    *
    * Note: Does not return indiviual percentages, only overall count of 
    * loaded assets over total amount assets. In order to accomplish this, xhr support 
    * would need to be available.
    *
    * @method getPercentageLoaded
    *
    * TODO: Complete!
    * TODO: Check xhr support and add individual asset loaded percentage if available
    * TODO: Test for AssetState.WAITING when calculating total
    *
    * ====================
    */

    this.getPercentageLoaded = function() {
      var i, len, thisAsset, completed = 0, total = 0, 
        weighted_obj = {
          completed: 0,
          total: 0
        }, percentage;
      for(i = 0, len = assets.length; i < len; i++) {
        thisAsset = assets[i];
        // TODO: Should test for AssetState.WAITING to make sure its in the current
        // queue - for example a tagged start() call will not reflect the correct total.
        total++;
        weighted_obj.total += thisAsset.weight;
        if (thisAsset.status === AssetState.LOADED ||
          thisAsset.status === AssetState.ERROR || 
          thisAsset.status === AssetState.TIMEOUT) {
          completed++;
          weighted_obj.completed += thisAsset.weight;
        }
      }
      percentage = round(weighted_obj.completed / weighted_obj.total);
      return { percent: percentage, loaded: completed, total: total };
    };

  }

  // # # # # # # # # # # # # # # # # # # # # # #

  if(typeof define === 'function' && define.amd) {
    define('loadr', [], function() {
      return loadr;
    });
  }
  global.loadr = loadr;

}(this));

(function(global) {

  /*
  * # # # # # # # # # # # # # # # # # # # # # #
  *
  * Provides loading functionality for a generic asset.
  * When the asset has been loaded this instance will fire the onLoad function of its
  * parent loadr, or fire the onError function if the loading process errors out in any way.
  *
  * @function loadrAsset
  *
  * # # # # # # # # # # # # # # # # # # # # # #
  */

  function loadrAsset() {
    
    var self = this;

    /*
    * ====================
    *
    * Reference to parent loadr instance
    *
    * @property loadr
    * @type loadr
    *
    * ====================
    */

    this.loadr = null;
    
    /*
    * ====================
    *
    * Source dom element
    *
    * @property srcEl
    * @type *
    *
    * ====================
    */

    this.srcEl = null;

    /*
    * ====================
    *
    * Boolean that tracks whether a halt action was called on this loadr asset instance.
    *
    * @property halted
    * @type Boolean
    *
    * ====================
    */

    this.halted = false;

    /*
    * ====================
    *
    * Object that contains properties pertaining to halt actions.
    *
    * @property haltedObj
    * @type Object
    *
    * ====================
    */

    this.haltedObj = {
      callback: null, // optional callback for when asset load is halted
      fired:    false // ensure the halt callback is fired only once
    };

    // # # # # # # # # # # # # # # # # # # # # # #
    //
    // PUBLIC
    //
    // # # # # # # # # # # # # # # # # # # # # # #

    /*
    * ====================
    *
    * Fired when a state change is detected on the source dom element.
    *
    * @function onReadyStateChange
    *
    * ====================
    */

    this.onReadyStateChange = function() {
      if(self.srcEl.readyState === 'complete') {
        self.removeEventHandlers();
        self.loadr.onLoad(self);
      }
    };

    /*
    * ====================
    *
    * Fired when the load event is detected on the source dom element.
    *
    * @function onLoad
    *
    * ====================
    */

    this.onLoad = function() {
      self.removeEventHandlers();
      self.loadr.onLoad(self);
    };

    /*
    * ====================
    *
    * Fired when an error is detected on the source dom element.
    *
    * @function onError
    *
    * ====================
    */

    this.onError = function() {
      self.removeEventHandlers();
      self.loadr.onError(self);
    };

    /*
    * ====================
    *
    * Fired when a timeout is detected on the source dom element.
    *
    * @method onTimeout
    *
    * ====================
    */

    this.onTimeout = function() {
      self.removeEventHandlers();
      if(self.srcEl.complete) {
        self.loadr.onLoad(self);
      } else {
        self.loadr.onTimeout(self);
      }
    };

    /*
    * ====================
    *
    * Removes all event handlers on the source dom element.
    *
    * @function removeEventHandlers
    *
    * ====================
    */

    this.removeEventHandlers = function() {
      self.off('load', self.onLoad);
      self.off('readystatechange', self.onReadyStateChange);
      self.off('error', self.onError);
    };

    /*
    * ====================
    *
    * Begins loading process for a single asset.
    *
    * @method start
    * @param p_loadr_instance {loadr} Instance of loadr that this asset will report to
    *
    * ====================
    */

    this.start = function(p_loadr_instance) {
      /*

      self.loadr = p_loadr_instance;

      self.on('load', self.onLoad);
      self.on('readystatechange', self.onReadyStateChange);
      self.on('error', self.onError);

      */
    };

    /*
    * ====================
    *
    * Checks the srcEl element's complete state.
    * Useful if the complete event fires before handler is added.
    *
    * @method checkStatus
    *
    * ====================
    */

    this.checkStatus = function() {
      if (self.srcEl.complete) {
        self.removeEventHandlers();
        self.loadr.onLoad(self);
      }
    };

    // # # # # # # # # # # # # # # # # # # # # # #
    //
    // UTILITY
    //
    // # # # # # # # # # # # # # # # # # # # # # #

    /*
    * ====================
    *
    * Add event handling to the source element.
    *
    * @method on
    * @param p_event_name {String} Name of a valid event to listen to
    * @param p_event_handler {Function} Callback to attach and fire once the event is triggered
    *
    * ====================
    */

    this.on = function(p_event_name, p_event_handler) {
      if(self.srcEl.addEventListener) {
        self.srcEl.addEventListener(p_event_name, p_event_handler, false);
      } else if(self.srcEl.attachEvent) {
        self.srcEl.attachEvent('on' + p_event_name, p_event_handler);
      }
    };

    /*
    * ====================
    *
    * Remove event handling from the source element.
    *
    * @method off
    * @param p_event_name {String} Name of a valid event to stop listening to
    * @param p_event_handler {Function} Reference to the attached callback that should be removed
    *
    * ====================
    */

    this.off = function(p_event_name, p_event_handler) {
      if(self.srcEl.removeEventListener) {
        self.srcEl.removeEventListener(p_event_name, p_event_handler, false);
      } else if(self.srcEl.detachEvent) {
        self.srcEl.detachEvent('on' + p_event_name, p_event_handler);
      }
    };

    /*
    * ====================
    *
    * Set the loadr asset to a halted state.
    *
    * @method stop
    * @param p_event_handler {Function} Optional eference to the callback that should fire once any outstanding loads finish loading
    *
    * ====================
    */

    this.stop = function(p_callback) {
      p_callback = p_callback || null;
      self.halted = true;
      self.haltedObj.callback = p_callback;
    };

  }

  // # # # # # # # # # # # # # # # # # # # # # #

  if(typeof define === 'function' && define.amd) {
    define('loadrAsset', [], function() {
      return loadrAsset;
    });
  }
  global.loadrAsset = loadrAsset;

}(this));