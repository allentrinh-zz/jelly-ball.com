/*
* # # # # # # # # # # # # # # # # # # # # # #
*
* Provides loading functionality for a single text/script asset, extending from loadrAsset. 
* Supported image formats include 'js'.
* When the script has been loaded this instance will fire the onLoad function of its
* parent loader, or fire the onError function if the loading process errors out in any way.
*
* @function loadrScript
* @param p_url {String} Filepath of the script asset to be loaded.
*
* # # # # # # # # # # # # # # # # # # # # # #
*/

function loadrScript(p_url) {

  var self = new loadrAsset();

  self.done = false;

  self.srcEl = document.createElement('script');

  self.start = function(p_loadr_instance) {
    var state,
      scriptLoadCallback = function(data) {
        state = self.srcEl.readyState;
        if(self.done === false && (!state || /loaded|complete/.test(state))) {
          self.done = true;
          self.onLoad(data);
        }
      };

    self.loadr = p_loadr_instance;

    self.on('load', scriptLoadCallback);
    self.on('readystatechange', scriptLoadCallback);
    self.on('error', self.onError);

    self.srcEl.src = p_url;
    self.srcEl.async = true;
    document.getElementsByTagName('head')[0].appendChild(self.srcEl);
  };

  return self;

}
