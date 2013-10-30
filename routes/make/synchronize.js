var utils = require( "../../lib/utilities" ),
    makeClient = require( "../../lib/makeapi" );

module.exports = function( req, res, next ) {
  var project = req.project;

  console.log("Routes.make.synchronize");

  if ( !project ) {
    return next( utils.error( 404, "No Project Found" ) );
  }


  if ( !project.makeid ) {
    console.log("makeClient.create");
    console.log("project.name: "+project.name);
    console.log("project.author: "+project.author);
    console.log("project.email: "+project.email);
    
    makeClient.create({
      title: project.name,
      author: project.author,
      email: project.email,
      contentType: "application/x-popcorn",
      url: utils.embedShellURL( project.author, project.id ),
      contenturl: utils.embedURL( project.author, project.id ),
      thumbnail: project.thumbnail,
      description: project.description,
      remixedFrom: req.remixedMakeId,
      tags: req.makeTags
    }, function( error, make ) {
      if ( error ) {
        return next( utils.error( 500, error.toString() ) );
      }

      console.log("error: "+error);
      console.log("make: "+make);

      project.updateAttributes({ makeid: make._id })
      .error( function( error ) {
        return next( utils.error( 500, "Failed to add Make ID" ) );
      })
      .success( function( projectUpdateResult ) {
        res.json( { error: "okay", project: projectUpdateResult } );
      });
    });
  } else {
    console.log("makeClient.update: "+project.makeid);
    makeClient.update( project.makeid, {
      maker: project.email,
      make: {
        title: project.name,
        author: project.author,
        url: utils.embedShellURL( project.author, project.id ),
        contenturl: utils.embedURL( project.author, project.id ),
        contentType: "application/x-popcorn",
        thumbnail: project.thumbnail,
        description: project.description,
        email: project.email,
        tags: req.makeTags
      }
    }, function( error, make ) {
      if ( error ) {
        return next( utils.error( 500, error.toString() ) );
      }

      res.json( { error: "okay", project: project } );
    });
  }
};