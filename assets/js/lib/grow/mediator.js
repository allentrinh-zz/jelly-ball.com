var channels = {};

module.exports = {
  subscribe: function(channel, callback) {
    if(!channels[channel]) {
      channels[channel] = [];
    }

    channels[channel].push({
      context: this,
      callback: callback
    });
  },
  publish: function(channel) {
    if(!channels[channel]) {
      channels[channel] = [];
      return false;
    }

    var args = Array.prototype.slice.call(arguments, 1);

    for(var i=0, l=channels[channel].length; i < l; i++) {
      var subscription = channels[channel][i];
      if(subscription === undefined) {
        return false;
      }
      subscription.callback.apply(subscription.context, args);
    }
  }
};
