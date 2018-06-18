// Usage
// $.cachedScript( "ajax/test.js" ).done(function( script, textStatus ) {
//   console.log( textStatus );
// });
jQuery.cachedScript = function( url, success, options ) {
 
  // Allow user to set any option except for dataType, cache, and url
  options = $.extend( options || {}, {
    dataType: "script",
    cache: true,
    url: url,
    success: success
  });
 
  // Use $.ajax() since it is more flexible than $.getScript
  // Return the jqXHR object so we can chain callbacks
  return jQuery.ajax( options );
};

$(document).ready(function () {
  $(document).on("click", 'a[href="#"]', function (e) {
    e.preventDefault();
  });

  $.cachedScript('https://connect.facebook.net/en_US/sdk.js', function(){
    FB.init({
      appId: fb_app_id,
      cookie : true,
      xfbml: true,
      version: 'v3.0'
    });
    // alert("test00: " + fb_app_id);     
    FB.AppEvents.logPageView(); 
  });

  // Place JavaScript code here...

});
