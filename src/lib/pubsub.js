(function($) {

  var o = $({});

  $.on = function() {
    o.on.apply(o, arguments);
  };

  $.un = function() {
    o.off.apply(o, arguments);
  };

  $.fire = function() {
    o.trigger.apply(o, arguments);
  };

}(jQuery));

