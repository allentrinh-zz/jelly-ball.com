/**
 * Logic needed to execute prior to the full app JS has loaded (e.g. immediately showing a loader when the page loads)
 */
(function(global) {

  //example here is just loading the favicon and prepending it to the body
  var Loader = new global.loadr(),
    assetsLoaded = false,
    minAnimDur = 500, // the minimum number of miliseconds the loading animation needs to play to avoid having it flash on and off too quickly
    animComplete = false,
    onBootstrapComplete = function() {
      window.bootstrapped = true;
      $("html").removeClass("loading");
    };

  Loader.on('completion', function(e) {
    assetsLoaded = true;
    $('react_content').prepend(e.resource.srcEl);

    //in case our main javascript file loads faster than the assets and needs to know when the bootstrapping process is complete
    if(animComplete) {
      onBootstrapComplete();
    }
  });

  Loader.add('assets/img/splash/pattern.png');
  Loader.start();

  setTimeout(function() {
    animComplete = true;
    if(assetsLoaded) {
      onBootstrapComplete();
    }
  }, minAnimDur);

}(this));
