(function() {

   function App() {}

   /**
    */
   App.prototype._loggedIn = false;

   /**
    * @returns {RSVP.Promise}
    */
   App.prototype.login = function() {
      console.debug('Logging in...');
      return RSVP.Promise.resolve(IG.authenticate({
         identifier: Credentials.identifier,
         password: Credentials.password,
         vendorKey: Credentials.apiKey
      })).then(function() {
         console.debug('Logged in successfully.');
         this._loggedIn = true;
         $.cookie('accountToken', IG._accountToken);
         $.cookie('clientToken', IG._clientToken);
         $.cookie('lsEndpoint', IG._lsEndpoint); 
      }.bind(this));
   };

   /**
    * @returns {RSVP.Promise}
    */
   App.prototype._connectToLightstreamer = function() {
      return new RSVP.Promise(function(resolve, reject) {
         console.debug("Connecting to LS...");
         if (!this._loggedIn) {
            throw new Error('Log in first!');
         }
         IG.connectToLightstreamer(function() {
            console.debug("LS listen start:", arguments);
         }, function(status) {
            console.debug("LS status change:", status);
            if (status.indexOf('STREAMING') !== -1) {
               resolve();
            }
         });
      }.bind(this));
   };

   App.prototype.populateInstrumentDropdown = function(id) {
      return new RSVP.Promise(function(resolve, reject) {
         IG.getWatchlist({id: id}, function(data){
            $('#epics').empty();
            var instruments = data.markets;
            instruments.forEach(function(instrument) {
               $('#epics').append('<option value='+ instrument.epic +'>' + instrument.instrumentName + '</option>');
            });
            resolve(instruments[0].epic);
         });
      }.bind(this));
   };

   App.prototype.populateWatchlistDropdown = function(){
      return new RSVP.Promise(function(resolve, reject) {
         IG.getWatchlists(function(data){
            var watchlists = data.watchlists;
            for (var w in watchlists) {
               $('#watchlists').append('<option>' + watchlists[w].id + '</option>');
            }
            resolve(watchlists[0].id);
         });
      }.bind(this));
   };

   App.prototype.drawChart = function(data) {
      var data = google.visualization.arrayToDataTable(data, true);
      // data.chxl="0:|0|50|100|150|200|250|300|350|400|450|500|1:|16/01/2009|26/01/2009|6/02/2009";
      var options = {
        colors: ['#333'],
        strokeWidth: 1,
        // dateFormat:'HH:mm MMMM dd, yyyy',
        candlestick: {
          fallingColor: {
            fill: '#d92d27',
            stroke: '#333',
            strokeWidth: 1
          },
          risingColor: {
            fill: '#5e9d31',
            stroke: '#333',
            strokeWidth: 1
          }
        }
      };
      var chart = new google.visualization.CandlestickChart(document.getElementById('chart'));
      chart.draw(data, options);
   };

   App.prototype.populateChart = function(epic, resolution) {
      IG.priceSearchByNumV2({epic: epic, resolution: resolution, numPoints: 100}, function(data) {
         var prices = data.prices;
         var chartData = [];
         prices.forEach(function(price) {
            chartData.push([price.snapshotTime, price.lowPrice.bid, price.openPrice.bid, price.closePrice.bid, price.highPrice.bid])
         });
         app.drawChart(chartData);
      }.bind(this), function(error) {
        this.warn(error.responseJSON.errorCode);
      }.bind(this));
   };

   App.prototype.attachEvents = function(){
      var app = this;
      $('#watchlists').change(function(){
         return app.populateInstrumentDropdown($(this).val()).then(function(){
            app.populateChart($('#epics option:first').val(), $('#resolution').val());
         });
      });
      $('#epics').change(function(){
         app.populateChart($(this).val(), $('#resolution').val());
      });
      $('#resolution').change(function(){
         app.populateChart($('#epics').val(), $(this).val());
      })
   };

   App.prototype.warn = function(msg) {
      $('.warn').toggleClass('hidden', false).find('p').html(i18n(msg));
   };

   App.prototype.init = function() {
      this.populateWatchlistDropdown().then(function(id) {
         return this.populateInstrumentDropdown(id);
      }.bind(this)).then(function(epic){
         this.attachEvents();
         this.populateChart(epic, $('#resolution').val());
      }.bind(this));
   };

   window.App = App;

})();

numeral.language('en-gb');
google.load("visualization", "1", { packages:["corechart"] });
IG.setUrl(Credentials.apiUrl);

$(function() {

   var app = new App();

   if ($.cookie('accountToken')) {
      IG.setAuthenticationData({
        accountToken: $.cookie('accountToken'),
        clientToken: $.cookie('clientToken'),
        lsEndpoint: $.cookie('lsEndpoint'),
        apiKey: Credentials.apiKey
     });
     app.init();
   } else {
    app.login().then(app.init.bind(this));
   }

});

