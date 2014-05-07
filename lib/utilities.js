var config = require( "./config" ),
    http = require( "http" ),
    s3 = require( "./s3" ),
    url = require( "url" ),
    beautify = require('js-beautify').js_beautify;

module.exports.embedPath = function( user, id ) {
  return this.embedShellPath( user, id ) + "_";
};

module.exports.embedTimesheetsPath = function( user, id ) {
  return this.embedShellPath( user, id ) + "_t";
};

module.exports.embedOpenClassroomsPath = function( user, id ) {
  return this.embedShellPath( user, id ) + "_oc";
};

module.exports.embedURL = function( user, id ) {
  if ( !config.USER_SUBDOMAIN ) {
    return s3.http( this.embedPath( user, id ) );
  }

  var parsedURL = url.parse( config.USER_SUBDOMAIN );

  // Edit for claire: no user in projects URLs
  //return parsedURL.protocol + "//" + user + "." + parsedURL.host + "/popcorn/" + this.generateIdString( id ) + "_";
  return parsedURL.protocol + "//" + parsedURL.host + "/" +
    config.publishStore.options.namePrefix +
    "/" + this.generateIdString( id ) + "_" +
    config.publishStore.options.nameSuffix;
};

module.exports.embedShellPath = function( user, id ) {
  //return "/" + user + "/popcorn/" + this.generateIdString( id );
  return this.generateIdString( id );
};

module.exports.embedShellURL = function( user, id ) {
  if ( !config.USER_SUBDOMAIN ) {
    return s3.http( this.embedShellPath( user, id ) );
  }

  var parsedURL = url.parse( config.USER_SUBDOMAIN );

  //return parsedURL.protocol + "//" + user + "." + parsedURL.host + "/popcorn/" + this.generateIdString( id );
  if( config.publishStore.type == "local" ) {
    return parsedURL.protocol + "//" + parsedURL.host + "/" +
      config.publishStore.options.namePrefix +
      "/" + this.generateIdString( id ) +
      config.publishStore.options.nameSuffix;
  }
};

module.exports.error = function( code, msg ) {
  var err = new Error( msg || http.STATUS_CODES[ code ]);
  err.status = code;
  return err;
};

module.exports.generateIdString = function( id ) {
  return id.toString();
//  return id.toString( 36 );
};

module.exports.generatePopcornString = function( projectData ) {
  var popcornString = "<script>";

  projectData.media.forEach(function( currentMedia ) {
    // We expect a string (one url) or an array of url strings.
    // Turn a single url into an array of 1 string.
    var mediaUrls = typeof currentMedia.url === "string" ? [ currentMedia.url ] : currentMedia.url,
        mediaUrlsString = "[ '" + mediaUrls.join( "", "" ) + "' ]";

    var mediaPopcornOptions = currentMedia.popcornOptions || {};
    // Force the Popcorn instance we generate to have an ID we can query.
    mediaPopcornOptions.id = "Butter-Generated";

    // src/embed.js initializes Popcorn by executing the global popcornDataFn()
    popcornString += "\nvar popcornDataFn = function(){";
    popcornString += "\nvar popcorn = Popcorn.smart('#" + currentMedia.target + "', " +
                     mediaUrlsString + ", " + JSON.stringify( mediaPopcornOptions ) + ");";
    currentMedia.tracks.forEach(function( currentTrack ) {
      currentTrack.trackEvents.forEach(function( currentTrackEvent ) {
        popcornString += "\npopcorn." + currentTrackEvent.type + "(";
        popcornString += JSON.stringify( currentTrackEvent.popcornOptions, null, 2 );
        popcornString += ");";
      });
    });

    popcornString += "};\n";
  });

  popcornString += "</script>\n";

  return popcornString;
};

module.exports.generateProjectDataString = function( projectData ) {
  var projectDataString = "<script>";
  projectDataString += "\nvar popcornData = "+beautify(JSON.stringify( projectData, { indent_size: 2 } ));
  projectDataString += "</script>\n";

  return projectDataString;
};

module.exports.pruneSearchResults = function( results ) {
  return results.map( function( result ) {
    return {
      id: result.id,
      name: result.name,
      description: result.description,
      author: result.author,
      remixedFrom: result.remixedFrom,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
      publishUrl: this.embedShellURL( result.author, result.id ),
      iframeUrl: this.embedURL( result.author, result.id ),
      thumbnail: result.thumbnail
    };
  });
};
