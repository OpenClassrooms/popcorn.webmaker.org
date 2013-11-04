var metrics = require( "../../lib/metrics" ),
    escapeHTML = require( "../../lib/sanitizer" ).escapeHTML,
    config = require( "../../lib/config" );

function sanitizeProjectData( projectData ) {
  projectData.name = escapeHTML( projectData.name || '' );
  projectData.description = escapeHTML( projectData.description || '' );
  return projectData;
}

module.exports = function( Project ) {

  return function( req, res, next ) {

    // Sanitize project name (i.e., title) and description.
    var projectData = sanitizeProjectData( req.body );

    if ( req.body.id ) {

      Project.update( { email: config.DEFAULT_USER_EMAIL, id: req.body.id, data: projectData },
        function( err, doc ) {
          if ( err ) {
            res.json( 500, { error: err } );
            return;
          }

          req.project = doc;
          req.makeTags = projectData.tags;
          metrics.increment( 'project.save' );
        //next();
        });
    } else {

      Project.create( { email: config.DEFAULT_USER_EMAIL, data: projectData },
        function( err, doc ) {
          if ( err ) {
            console.log("Project Create Error: "+err);
            res.json( 500, { error: err } );
            metrics.increment( 'error.save' );
            return;
          }

          console.log("Project.create success: "+JSON.stringify(doc));
          req.project = doc;

          //console.log("Project id: "+projectData.makeid);
          req.remixedMakeId = projectData.makeid;
          req.makeTags = projectData.tags;

          // Send back the newly added row's ID
          res.json( { error: 'okay', project: doc } );

          metrics.increment( 'project.create' );
          if ( doc.remixedFrom ) {
            metrics.increment( 'project.remix' );
          }
          // Prevent next for claire
          //next();
        });
    }
  };
};

