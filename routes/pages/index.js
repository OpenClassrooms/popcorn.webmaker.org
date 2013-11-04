var config = require('../../lib/config.js');

module.exports.editor = function( req, res ) {
  res.render( 'editor.html', {
    csrf: req.session._csrf,
    personaEmail: config.DEFAULT_USER_EMAIL//req.session.email
  });
};
