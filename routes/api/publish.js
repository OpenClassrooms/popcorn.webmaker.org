var express = require('express'),
    app = express(),
    async = require( "async" ),
    metrics = require( "../../lib/metrics" ),
    s3 = require( "../../lib/s3" ),
    config = require( "../../lib/config" ),
    sanitizer = require( "../../lib/sanitizer" ),
    utilities = require( "../../lib/utilities" ),
    filestore = require('../../lib/file-store.js'),
    config = require('../../lib/config.js');

module.exports = function( req, res ) {
  var description = res.locals.project.description || "Created with Popcorn Maker - part of the Mozilla Webmaker initiative",
      iframeUrl = utilities.embedURL( req.session.username, res.locals.project.id ),
      projectData = JSON.parse( res.locals.project.data, sanitizer.escapeHTMLinJSON ),
      publishUrl = utilities.embedShellURL( req.session.username, res.locals.project.id ),
      projectUrl = "/editor/" + res.locals.project.id
      stores = {};

function setupStore( storeConfig ) {
  var store = filestore.create( storeConfig.type, storeConfig.options );
  if ( store.requiresFileSystem ) {
    console.log("setupStore store.root: "+store.root)
    app.use( express.static( store.root, JSON.parse( JSON.stringify( config.staticMiddleware ) ) ) );
  }
  return store;
}

  console.log("publish.js iframeUrl: "+iframeUrl);
  console.log("publish.js publishUrl: "+publishUrl);
  console.log("publish.js projectUrl: "+projectUrl);

  var mediaUrl = projectData.media[ 0 ].url,
      attribURL = Array.isArray( mediaUrl ) ? mediaUrl[ 0 ] : mediaUrl;

  console.log("publishStore: "+JSON.stringify(config.publishStore));

  // File Store types and options come from JSON config file.
  stores.publish = setupStore( config.publishStore );

  async.parallel([
    function( asyncCallback ) {
      res.render( "embed-ios.html", {
        id: res.locals.project.id,
        author: res.locals.project.author,
        title: res.locals.project.name,
        webmakerURL: config.AUDIENCE,
        description: description,
        embedShellSrc: publishUrl,
        projectUrl: projectUrl,
        popcorn: utilities.generatePopcornString( projectData ),
        thumbnail: res.locals.project.thumbnail,
        background: res.locals.project.background
      }, function( err, html ) {
        var sanitized = sanitizer.compressHTMLEntities( html ),
          embedPath = utilities.embedPath( req.session.username, res.locals.project.id );

          console.log(embedPath);
          console.log(config.publishStore.type);

        if( config.publishStore.type == "local" ) {
          stores.publish.write( embedPath, sanitized, asyncCallback );
        }
        else if( config.publishStore.type == "s3" ) {
          s3.put( embedPath, {
            "x-amz-acl": "public-read",
            "Content-Length": Buffer.byteLength( sanitized, "utf8" ),
            "Content-Type": "text/html; charset=UTF-8"
          }).on( "error",
            asyncCallback
          ).on( "response", function( s3res ) {
            if ( s3res.statusCode !== 200 ) {
              return asyncCallback( "S3.writeEmbed returned HTTP " + s3res.statusCode );
            }

            asyncCallback();
          }).end( sanitized );
        }
      });
    },
    function( asyncCallback ) {
      res.render( "embed-openclassrooms.html", {
        id: res.locals.project.id,
        author: res.locals.project.author,
        title: res.locals.project.name,
        webmakerURL: config.AUDIENCE,
        description: description,
        embedShellSrc: publishUrl,
        projectUrl: projectUrl,
        popcorn: utilities.generatePopcornString( projectData ),
        thumbnail: res.locals.project.thumbnail,
        background: res.locals.project.background,
        projectData: utilities.generateProjectDataString( projectData )
      }, function( err, html ) {
        var sanitized = sanitizer.compressHTMLEntities( html ),
          embedOpenClassroomsPath = utilities.embedOpenClassroomsPath( req.session.username, res.locals.project.id );

          console.log(embedOpenClassroomsPath);
          console.log(config.publishStore.type);

        if( config.publishStore.type == "local" ) {
          stores.publish.write( embedOpenClassroomsPath, sanitized, asyncCallback );
        }
        else if( config.publishStore.type == "s3" ) {
          s3.put( embedOpenClassroomsPath, {
            "x-amz-acl": "public-read",
            "Content-Length": Buffer.byteLength( sanitized, "utf8" ),
            "Content-Type": "text/html; charset=UTF-8"
          }).on( "error",
            asyncCallback
          ).on( "response", function( s3res ) {
            if ( s3res.statusCode !== 200 ) {
              return asyncCallback( "S3.writeEmbed returned HTTP " + s3res.statusCode );
            }

            asyncCallback();
          }).end( sanitized );
        }
      });
    },
    function( asyncCallback ) {
      res.render( "embed-timesheets.html", {
        id: res.locals.project.id,
        author: res.locals.project.author,
        title: res.locals.project.name,
        projectData: utilities.generateProjectDataString( projectData )
      }, function( err, html ) {
        var sanitized = sanitizer.compressHTMLEntities( html ),
          embedTimesheetsPath = utilities.embedTimesheetsPath( req.session.username, res.locals.project.id );

          console.log(embedTimesheetsPath);
          console.log(config.publishStore.type);

        if( config.publishStore.type == "local" ) {
          stores.publish.write( embedTimesheetsPath, sanitized, asyncCallback );
        }
        else if( config.publishStore.type == "s3" ) {
          s3.put( embedTimesheetsPath, {
            "x-amz-acl": "public-read",
            "Content-Length": Buffer.byteLength( sanitized, "utf8" ),
            "Content-Type": "text/html; charset=UTF-8"
          }).on( "error",
            asyncCallback
          ).on( "response", function( s3res ) {
            if ( s3res.statusCode !== 200 ) {
              return asyncCallback( "S3.writeEmbed returned HTTP " + s3res.statusCode );
            }

            asyncCallback();
          }).end( sanitized );
        }
      });
    },
    function( asyncCallback ) {
      res.render( "embed-shell.html", {
         author: res.locals.project.author,
         projectName: res.locals.project.name,
         description: description,
         embedShellSrc: publishUrl,
         embedSrc: iframeUrl,
         thumbnail: res.locals.project.thumbnail,
         projectUrl: projectUrl,
         makeID: res.locals.project.makeid
       }, function( err, html ) {
        var sanitized = sanitizer.compressHTMLEntities( html ),
          embedShellPath = utilities.embedShellPath( req.session.username, res.locals.project.id );

          console.log(embedShellPath);

        if( config.publishStore.type == "local" ) {
          stores.publish.write( embedShellPath, sanitized, asyncCallback );
        }
        else if( config.publishStore.type == "s3" ) {
          s3.put( embedShellPath, {
            "x-amz-acl": "public-read",
            "Content-Length": Buffer.byteLength( sanitized, "utf8" ),
            "Content-Type": "text/html; charset=UTF-8"
          }).on( "error",
            asyncCallback
          ).on( "response", function( s3res ) {
            if ( s3res.statusCode !== 200 ) {
              return asyncCallback( "S3.writeEmbedShell returned HTTP " + s3res.statusCode );
            }

            asyncCallback();
          }).end( sanitized );          
        }
      });
    },
    function( asyncCallback ) {
      res.render( "redirect.html", {
        target: projectUrl + "/edit"
      }, function( err, html ) {
        var sanitized = sanitizer.compressHTMLEntities( html ),
          path = utilities.embedPath( req.session.username, res.locals.project.id ) + "/edit"
        
        if( config.publishStore.type == "local" ) {
          stores.publish.write( path, sanitized, asyncCallback );
        }
        else if( config.publishStore.type == "s3" ) {
          s3.put( path, {
            "x-amz-acl": "public-read",
            "Content-Length": Buffer.byteLength( html, "utf8" ),
            "Content-Type": "text/html; charset=UTF-8"
          }).on( "error",
            asyncCallback
          ).on( "response", function( s3res ) {
            if ( s3res.statusCode !== 200 ) {
              return asyncCallback( "S3.writeEmbed/edit redirect returned HTTP " + s3res.statusCode );
            }

            asyncCallback();
          }).end( html );
        }
      });
    },
    function( asyncCallback ) {
      res.render( "redirect.html", {
        target: projectUrl + "/remix"
      }, function( err, html ) {
        var sanitized = sanitizer.compressHTMLEntities( html ),
          path = utilities.embedPath( req.session.username, res.locals.project.id ) + "/remix";

        if( config.publishStore.type == "local" ) {
          stores.publish.write( path, sanitized, asyncCallback );
        }
        else if( config.publishStore.type == "s3" ) {
          s3.put( path, {
            "x-amz-acl": "public-read",
            "Content-Length": Buffer.byteLength( html, "utf8" ),
            "Content-Type": "text/html; charset=UTF-8"
          }).on( "error",
            asyncCallback
          ).on( "response", function( s3res ) {
            if ( s3res.statusCode !== 200 ) {
              return asyncCallback( "S3.writeEmbed/remix redirect returned HTTP " + s3res.statusCode );
            }

            asyncCallback();
          }).end( html );
        }
      });
    },
    function( asyncCallback ) {
      res.render( "redirect.html", {
        target: projectUrl + "/edit"
      }, function( err, html ) {
        var sanitized = sanitizer.compressHTMLEntities( html ),
          path = utilities.embedShellPath( req.session.username, res.locals.project.id ) + "/edit";

        if( config.publishStore.type == "local" ) {
          stores.publish.write( path, sanitized, asyncCallback );
        }
        else if( config.publishStore.type == "s3" ) {
          s3.put( path, {
            "x-amz-acl": "public-read",
            "Content-Length": Buffer.byteLength( html, "utf8" ),
            "Content-Type": "text/html; charset=UTF-8"
          }).on( "error",
            asyncCallback
          ).on( "response", function( s3res ) {
            if ( s3res.statusCode !== 200 ) {
              return asyncCallback( "S3.writeEmbed/edit redirect returned HTTP " + s3res.statusCode );
            }

            asyncCallback();
          }).end( html );
        }
      });
    },
    function( asyncCallback ) {
      res.render( "redirect.html", {
        target: projectUrl + "/remix"
      }, function( err, html ) {
        var sanitized = sanitizer.compressHTMLEntities( html ),
          path = utilities.embedShellPath( req.session.username, res.locals.project.id ) + "/remix";

        if( config.publishStore.type == "local" ) {
          stores.publish.write( path, sanitized, asyncCallback );
        }
        else if( config.publishStore.type == "s3" ) {
          s3.put( path, {
            "x-amz-acl": "public-read",
            "Content-Length": Buffer.byteLength( html, "utf8" ),
            "Content-Type": "text/html; charset=UTF-8"
          }).on( "error",
            asyncCallback
          ).on( "response", function( s3res ) {
            if ( s3res.statusCode !== 200 ) {
              return asyncCallback( "S3.writeEmbed/remix redirect returned HTTP " + s3res.statusCode );
            }

            asyncCallback();
          }).end( html );
        }
      });
    }
  ], function( err ) {
    if ( err ) {
      metrics.increment( "project.publish.error" );
      return res.json(500, { error: err });
    }

    res.json({
      error: "okay",
      publishUrl: publishUrl,
      iframeUrl: iframeUrl
    });
    metrics.increment( "project.publish.success" );
  });
};
