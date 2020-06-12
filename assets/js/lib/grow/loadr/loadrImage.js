/*
* # # # # # # # # # # # # # # # # # # # # # #
*
* Provides loading functionality for a single image asset, extending from loadrAsset. 
* Supported image formats include 'jpeg', 'jpg', 'png', 'gif'.
* When the image has been loaded this instance will fire the onLoad function of its
* parent loader, or fire the onError function if the loading process errors out in any way.
*
* @function loadrImage
* @param p_url {String} Filepath of the image asset to be loaded.
*
* # # # # # # # # # # # # # # # # # # # # # #
*/

function loadrImage(p_url) {

  var self = new loadrAsset();

  self.srcEl = new Image();

  self.start = function(p_loadr_instance) {
    self.loadr = p_loadr_instance;

    self.on('load', self.onLoad);
    self.on('readystatechange', self.onReadyStateChange);
    self.on('error', self.onError);

    self.srcEl.src = p_url;
  };

  return self;

}
