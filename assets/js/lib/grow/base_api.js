/**
 * Handles API calls to the server. You should make an app-specific API class that extends from this.
 */

function BaseAPI() {}

// You can set a token that will be passed in the 'x-auth' header.
// If you don't set anything, it will just make API calls w/o a token
BaseAPI.prototype.setToken = function(token) {
  this.token = token;
};

BaseAPI.prototype.setUrl = function(url) {
  this.url = url.replace(/\/+$/, '') + '/';
};

/**
 * Handles GET requests.
 */
BaseAPI.prototype.get = function(url, callback) {
  if (!this.url) {
    return callback({ message: 'API URL not set' });
  }

  //console.log('[API] GET', this.url + url);

  var request = new XMLHttpRequest();
  request.open('GET', this.url + url, true);

  request.setRequestHeader("Accept", "application/json");
  if(this.token) {
    request.setRequestHeader("x-auth", this.token);
  }

  request.onload = function() {
    var result = {};
    var data;
    if (request.status == 200) {
      data = JSON.parse(request.responseText);
    } else {
      data = {};
    }

    result.responseCode = request.status;
    result.data = data;

    callback(result);
  };

  request.onerror = function() {
    var data = {};
    callback(data);
  };

  request.send();
};

/**
 * Handles PUT, POST, and DELETE requests.
 */
function update(url, data, callback, method) {
  method = (method || 'post').toUpperCase();
  if (!this.url) {
    return callback({ message: 'API URL not set' });
  }

  //console.log('[API] ' + method, this.url + url, data);

  var request = new XMLHttpRequest();
  request.open(method, this.url + url, true);

  request.setRequestHeader("Content-Type", "application/json");
  request.setRequestHeader("Accept", "application/json");
  if(this.token) {
    request.setRequestHeader("x-auth", this.token);
  }

  request.onload = function() {
    var data = {};

    if(request.responseText) {
      data = JSON.parse(request.responseText);
    }
    data.responseCode = request.status;

    if(request.status >= 200 && request.status < 400){
      data.success = true;
    } else {
      data.success = false;
    }

    callback(data);
  };

  request.onerror = function() {
    var data = {};
    callback(data);
  };

  request.send(JSON.stringify(data));
}

BaseAPI.prototype.post = function(url, data, callback) {
  return update.call(this, url, data, callback, 'post');
};

BaseAPI.prototype.put = function(url, data, callback) {
  return update.call(this, url, data, callback, 'put');
};

BaseAPI.prototype.del = function(url, callback) {
  return update.call(this, url, '', callback, 'delete');
};

module.exports = BaseAPI;
