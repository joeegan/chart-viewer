/**
 * @exports IG to either the window (this), or defines it as an AMD module.
 */
(function(cls) {
   // Require the dependencies as AMD modules and define as a requirejs modeule.
   if (typeof define === 'function' && define.amd) {
      define(['jquery', 'LightstreamerClient', 'Subscription'], cls);
      // Find the dependencies in the window and export to window.
   } else {
      var lsNamespace = typeof Lightstreamer == 'object' ? Lightstreamer : window;
      window.IG = cls(jQuery, lsNamespace.LightstreamerClient, lsNamespace.Subscription);
   }
}(function($, LightstreamerClient, Subscription) {

   'use strict';

   /**
    * @classdesc Provides convenient methods to use IG's Public API.
    * After calling the login function the user is then authenticated for subsequent calls.
    * @requires jQuery
    * @example
       IG.setDebug(true);
       IG.authenticate(data).then(function(){
          IG.connectToLightstreamer().then(foo)
       });
    * @constructor
    */
   function IG() {}

   /**
    * @desc Used to authenticate the application with the remote API.
    * @private
    */
   IG.prototype._apiKey = null;

   /**
    * @desc Used to authenticate calls to the API after the initial account has been authenticate.
    * @private
    */
   IG.prototype._accountToken = null;

   /**
    * @desc The unique identity of the account, e.g. 'PAR44'.
    * @private
    */
   IG.prototype._accountId = null;

   /**
    * @desc The Lightstreamer endpoint.
    * @private
    */
   IG.prototype._lsEndpoint = null;

   /**
    * @desc The Lightstreamer instance.
    * @private
    */
   IG.prototype._lsEndpoint = null;

   /**
    * @desc Set to true to enable internal log messages to be written to the console.
    * @private
    */
   IG.prototype._debug = null;

   /**
    * Used for internal development only.
    * @private
    */
   IG.prototype._callCount = 0;

   /**
    * @type {String}
    */
   IG.prototype._urlRoot = 'https://deal-api.ig.com/gateway/deal';

   /**
    * @desc Override the root api URL. Used for internal development only.
    */
   IG.prototype.setUrl = function(apiUrl) {
      this._urlRoot = apiUrl;
   };

   /**
    * {String} name A key from IG._environments
    */
   IG.prototype.setEnvironment = function(name) {
      if (IG._environments.hasOwnProperty(name)) {
         this._urlRoot = IG._environments[name];
      } else {
         throw Error('Invalid environment specified. Environment must exist within: IG._environments');
      }
   };

   /**
    * @param {String} url
    * @param {String} requestType
    * @param {Object} [data]
    * @param {Number} [timeout]
    * @returns {jqXHR} To offer promises
    * @see http://api.jquery.com/jQuery.ajax/#jqXHR
    * @private
    */
   IG.prototype._send = function(url, requestType, data, timeout, version) {

      var headers = {
         'Content-Type': 'application/json; charset=UTF-8',
         'Accept': 'application/json; charset=UTF-8'
      };

      this._callCount++;

      if (data && data.vendorKey) {
         this._apiKey = data.vendorKey;
         delete data.vendorKey;
      }

      if (version) {
         headers['VERSION'] = version;
      }

      if (this._apiKey) {
         headers['X-IG-API-KEY'] = this._apiKey;
      }

      if (this._accountToken) {
         headers['X-SECURITY-TOKEN'] = this._accountToken;
         headers['CST'] = this._clientToken;
      }

      return $.ajax({
         type: requestType,
         url: this._urlRoot + url,
         data: data && JSON.stringify(data),
         headers: headers,
         timeout: timeout,
         success: $.proxy(function(response, status, data) {
            if (data.getResponseHeader('X-SECURITY-TOKEN')) {
               this._accountToken = data.getResponseHeader('X-SECURITY-TOKEN');
            }
            if (data.getResponseHeader('CST')) {
               this._clientToken = data.getResponseHeader('CST');
            }
            if (response.currentAccountId) {
               this._accountId = response.currentAccountId;
            }
            if (response.lightstreamerEndpoint) {
               this._lsEndpoint = response.lightstreamerEndpoint;
            }
            this._log('X-SECURITY-TOKEN:', this._accountToken, 'CST:', this._clientToken);
         }, this),
         error: $.proxy(function(response, status, error) {
            this._log('error', response, status, error);
         }, this)
      });
   };

   IG.prototype.setAuthenticationData = function(data){
      this._accountToken = data.accountToken;
      this._clientToken = data.clientToken;
      this._lsEndpoint = data.lsEndpoint;
      this._apiKey = data.apiKey;
   };

   /**
    * @desc Wrapper for console.log to reduce verbose logging.
    * @private
    */
   IG.prototype._log = function() {
      if (this._debug && console.log) {
         console.log(Array.prototype.slice.call(arguments));
      }
   };

   /**
    * @desc Used to replace placeholders in a url with data.
    * E.g. ._merge('/a/{foo}?p={bar}', {foo:'baz', bar:'qux'}) results in '/a/baz?p=qux'
    * @param {String} The string to contain the supplied object.
    * @param {Object} The data to merge into the string.
    * @return {String}
    * @private
    */
   IG.prototype._merge = function(url, obj) {
      for (var key in obj) {
         url = url.replace('{' + key + '}', obj[key]);
      }
      var missingFields = url.match(/{([A-Za-z]*)}/);
      if (missingFields) {
         console.error('You need to supply: ', missingFields[1])
      }
      return url;
   };

   /**
    * @desc Stores the {Subscription}s with IDs as keys.
    * @type {Object}
    * @private
    */
   IG.prototype._subscriptions = {};

   /**
    * @desc Sets whether internal log messages are written to the console.
    * @param {Boolean}
    */
   IG.prototype.setDebug = function(bool) {
      this._debug = true;
   };

   /**
    * @desc Creates a new instance of the Lightstreamer client and connects using details stored upon login.
    * @param {Function} onListenStart
    * @param {Function} onStatusChange
    */
   IG.prototype.connectToLightstreamer = function(onListenStart, onStatusChange) {
      this.lsClient = new LightstreamerClient(this._lsEndpoint);
      var password = '';

      if (this._clientToken) {
         password = 'CST-' + this._clientToken;
      }
      if (this._clientToken && this._accountToken) {
         password = password + '|';
      }
      if (this._accountToken) {
         password = password + 'XST-' + this._accountToken
      }
      this.lsClient.connectionDetails.setPassword(password);
      this.lsClient.connectionDetails.setUser(this._accountId);

      this.lsClient.addListener({
         onListenStart: onListenStart,
         onStatusChange: onStatusChange
      });

      this.lsClient.connect();
   };

   /**
    * @desc Creates a new subscription to a particular key using the lightstreamer client.
    * @param {String} subscriptionId Used to identify the subscription, so it can be unsubscribed at any point.
    * @param {Function} subscriptionType Lightstreamer subscription type. e.g. 'MERGE', 'RAW'
    * @param {Array} subscriptionKeys List of subscription keys e.g ['ACCOUNT:MYID']
    * @param {Function} subscriptionList e.g. ['PNL']
    * @param {Function} updateHandler Handles a streamed update to the key is received.
    * @param {Function} errorHandler Called when there is a problem subscribing.
    */
   IG.prototype.subscribe = function(subscriptionId, subscriptionType, subscriptionKeys, subscriptionList, startHandler, updateHandler, errorHandler) {
      var subscription = new Subscription(subscriptionType, subscriptionKeys, subscriptionList);
      this._subscriptions[subscriptionId] = subscription;
      subscription.addListener({
         onListenStart: startHandler,
         onItemUpdate: updateHandler,
         onSubscriptionError: errorHandler
      });

      this.lsClient.subscribe(subscription);
   };

   /**
    * @desc Unsubscribes and deletes an existing subscription.
    * @param {String} subscriptionId.
    */
   IG.prototype.unsubscribe = function(subscriptionId) {
      var subscription = this._subscriptions[subscriptionId];
      if (subscription) {
         this.lsClient.unsubscribe(subscription);
      }
      delete this._subscriptions[subscriptionId];
   };

   /**
    * @name authenticate
    * @desc Creates a trading session, obtaining session tokens for subsequent API access
    * @param {Object} data
    * @param {String} data.identifier
    * @param {String} data.password
    * @param {Function} success Handler called once successfully authenticated
    * @param {Function} failure Handler called once authentication was deemed unsuccessful
    * @returns {jqXHR}
    */
   IG.prototype.authenticate = function(data, success, failure) {
      var deffered = $.Deferred();
      deffered.then(success, failure);
      this._send('/session', 'POST', data, null, 2).then(deffered.resolve, deffered.reject);
      return deffered;
   };

   IG.prototype.createSprintPosition = function(data, success, failure) {
      return this._send('/positions/sprintmarkets', 'POST', data).then(success, failure);
   };


   IG.prototype.getSprintMarketPositions = function(success, failure) {
      return this._send('/positions/sprintmarkets', 'GET').then(success, failure);
   };

   /**
    * @name browse
    * @desc Returns all sub-nodes of the given node in the market navigation hierarchy
    * @param {String} data.nodeId  * the identifier of the node to browse
    * @returns {jqXHR}
    */
   IG.prototype.browse = function(data, success, failure) {
      return this._send(this._merge('/marketnavigation/{nodeId}', data), 'GET').then(success, failure);
   };

   /**
    * @name priceSearchByNumV2
    * @desc Returns a list of historical prices for the given epic, resolution and number of data points
    * @param {String} data.epic  * Instrument epic
    * @param {String} data.resolution  * Price resolution (MINUTE, MINUTE_2, MINUTE_3, MINUTE_5, MINUTE_10, MINUTE_15, MINUTE_30, HOUR, HOUR_2, HOUR_3, HOUR_4, DAY, WEEK, MONTH)
    * @param {String} data.numPoints  * Number of data points required
    * @returns {jqXHR}
    */
   IG.prototype.priceSearchByNumV2 = function(data, success, failure) {
      return this._send(this._merge('/prices/{epic}/{resolution}/{numPoints}', data), 'GET').then(success, failure);
   };

   IG.prototype.getWatchlists = function(success, failure) {
      return this._send('/watchlists', 'GET').then(success, failure);
   };

   IG.prototype.getWatchlist = function(data, success, failure) {
      return this._send(this._merge('/watchlists/{id}', data), 'GET').then(success, failure);
   };


   /**
    * @type {Object} Enum containing the root urls for the available environments.
    * @private
    */
   IG._environments = {
      PRODUCTION: 'https://deal-api.ig.com/gateway/deal',
      DEMO: 'https://demo-api.ig.com/gateway/deal'
   };

   return new IG();

}));
