//var config = require('../../lib/config.js');
var config = require( "../../lib/config" );

module.exports.editor = function( req, res ) {
	console.log("routes/pages/index.js");
  res.render( 'editor.html', {
    //csrf: req.session._csrf,
    csrf: req.csrfToken(),
    personaEmail: config.DEFAULT_USER_EMAIL,//req.session.email
    togetherjs: config.TOGETHERJS,
    togetherjsEnabled: config.TOGETHERJS_ENABLED
  });
};