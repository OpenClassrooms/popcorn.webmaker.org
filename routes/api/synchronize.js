var metrics = require( "../../lib/metrics" ),
    escapeHTML = require( "../../lib/sanitizer" ).escapeHTML,
    config = require( "../../lib/config" );

function sanitizeProjectData( projectData ) {
  projectData.name = escapeHTML( projectData.name || "" );
  projectData.description = escapeHTML( projectData.description || "" );
  return projectData;
}

module.exports = function( Project ) {

  return function( req, res, next ) {
    console.log("api.synchronize");

    function onUpdate( err, doc ) {
      if ( err ) {
          console.log("onUpdate err: "+err);
        metrics.increment( "project.update.error" );
        res.json( 500, { error: err } );
        return;
      }

      req.project = doc;
      req.makeTags = projectData.tags;
      metrics.increment( "project.update.success" );
      // Prevent this for CLAIRE
      //next();
    }
    function onCreate( err, doc ) {
      if ( err ) {
          console.log("onCreate err: "+err);
        res.json( 500, { error: err } );
        metrics.increment( "project.create.error" );
        return;
      }

          console.log("onUpdate doc.id: "+doc.id);
      req.body.id = doc.id;
      req.project = doc;
      req.remixedMakeId = projectData.makeid;
      req.makeTags = projectData.tags;

      // Send back the newly added row's ID
      res.json( { error: 'okay', project: doc } );

      metrics.increment( "project.create.success" );
      if ( doc.remixedFrom ) {
        metrics.increment( "project.remix.success" );
      }
      // Prevent this for CLAIRE
      //next();
    }

    // Sanitize project name (i.e., title) and description.
    var projectData = sanitizeProjectData( req.body );

    console.log("1 projectData: "+projectData);
    console.log("1 req.body.id: "+req.body.id);

    if ( req.body.id ) {
      Project.update( { email: config.DEFAULT_USER_EMAIL, id: req.body.id, data: projectData },
        function( err, doc ) {
          if ( err ) {
            console.log("Project Update Error: "+err);
            res.json( 500, { error: err } );
            return;
          }
            console.log("Project Update Success");
          res.json( { error: 'okay', project: doc } );

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

          console.log("Project.create success");
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


/*<<<<<<< HEAD
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
=======
      Project.find( { email: req.session.email, id: req.body.id }, function( err, doc ) {
        if ( err ) {
          metrics.increment( "project.find.error" );
          res.json( 500, { error: err } );
          return;
        }
        if ( doc ) {
          Project.update( { email: req.session.email, id: req.body.id, data: projectData }, onUpdate );
        } else {
          Project.create( { email: req.session.email, data: projectData }, onCreate );
        }
      });
    } else {
      Project.create( { email: req.session.email, data: projectData }, onCreate );
>>>>>>> mozilla/master*/
    }
  };
};

