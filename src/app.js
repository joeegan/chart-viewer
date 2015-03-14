(function() {

   function App() {}

   /**
    * @type {}
    */
   App.prototype._loggedIn = false;

   /**
    * @returns {RSVP.Promise}
    */
   App.prototype.login = function() {
      IG.setUrl(Credentials.apiUrl);
      console.debug('Logging in...');
      return RSVP.Promise.resolve(IG.authenticate({
         identifier: Credentials.identifier,
         password: Credentials.password,
         vendorKey: Credentials.apiKey
      })).then(function() {
         console.debug('Logged in successfully.');
         this._loggedIn = true;
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

   App.prototype.populateInstrumentDropdown = function(id){
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

   var drawChart = function(data) {
      var data = google.visualization.arrayToDataTable(data, true);
      var options = {
        colors: ['#333'],
        strokeWidth: 1,
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
         drawChart(chartData);
      });
   };

   App.prototype.attachEvents = function(){
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

   window.App = App;

})();

google.load("visualization", "1", { packages:["corechart"] });
numeral.language('en-gb');

$(function() {

   var app = new App();

   window.warn = function(msg) {
      $('.warn').toggleClass('hidden', false).find('p').html(msg);
   }

   app.login().then(function() {

      app.populateWatchlistDropdown().then(function(id) {
         return app.populateInstrumentDropdown(id);
      }).then(function(epic){
         app.populateChart(epic, $('#resolution').val());
         app.attachEvents();

      });

   }).catch(function(error) {
      console.error(error);
   });
});

