/*
 * John Allen 2/10/2014
 * this code was added to check if a project used a youtube as a source 
 * and if it was an iPad. If both these conditions are meet go ahead 
 * and let the iPad view the project, if it's any other type of device
 * alert and then forward to the homepage.
*/
var initalizeBrowserDetection = {

  checkIfIPadAndSingleSourceYouTube : function(){

    // The popcornDataFn function is in the iframe that plays the 
    // popcorn project. Its a function so lets turn it into
    //  a string and check if the projects
    // JSON has the a SINGLE instance of the string 'youtube'.
    var stringToCheck = popcornDataFn.toString();
    var regExStringToFind = /youtube/g;
    var match;
    var stringCount = 0;
    var sourceIsYouTube = false;
    
    // check how many times 'youtube' is in the string were checking.
    while ( match = regExStringToFind.exec(stringToCheck) ){
      stringCount++
    }

    // if it's only in the string ONE TIME then the iPad can play it.
    if(stringCount === 1){
      sourceIsYouTube = true;
    }

    var isMobile = false;
    if( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ) {
      isMobile = true;
    }

    var isAccetedMobile = false; 
    if( /iPad/i.test(navigator.userAgent) ) {
      isAccetedMobile = true;
    }

    // its a regular browser so move ahead
    if ( !isMobile ){
      return true;// return we have a normal desktop browser
    }
    // were a mobile browser so lets check some more stuff
    else {

      // were a single youtube source project and an iPad, so were 
      // cool lets go ahead and play it
      if( isAccetedMobile && sourceIsYouTube ) {
        return true;
      }

      // were NOT a youtube source and NOT an iPad so fail.
      else{
        //alert('Were sorry! Your device and this project is not supported by Kettlecorn.');
        window.location.href = 'http://kettlecorn-edit.innovation-series.com/unsupporteddevice.html';
      }
    }
  }
}

initalizeBrowserDetection.checkIfIPadAndSingleSourceYouTube();



var stateClasses = [
      "embed-playing",
      "embed-paused",
      "embed-dialog-open"
    ],
    fullScreenedElem;

// Sometimes we want to show the info div when we pause, sometimes
// we don't (e.g., when we open the share dialog).
var hideInfoDiv = false;

var tocItems = [];

/**
 * embed.js is a separate, top-level entry point into the requirejs
 * structure of src/.  We use it in order to cherry-pick modules from
 * Butter as part of our embed scripts.  The embed.js file is meant
 * to be used on its own, without butter.js, and vice versa.  See
 * tools/embed.js and tools/embed.optimized.js, and the `make embed`
 * target for more info.
 */

function selectId( id ) {
  if ( typeof id !== "string" ) {
    return id;
  }
  return document.querySelector( id );
}

function reconstituteHTML( s ) {
  return s.replace( /&#34;/g, '"' )
          .replace( /&#39;/g, "'" )
          .replace( /&quot;/g, '"' )
          .replace( /&apos;/g, "'" )
          .replace( /&lt;/g, '<' )
          .replace( /&gt;/g, '>' )
          .replace( /&amp;/g, '&' );
}

function show( elem ) {
  elem = selectId( elem );
  if ( !elem ) {
    return;
  }
  elem.style.display = "block";
}

function fullScreenEnabled() {
  var container = document.querySelector( ".video" ),
      controls;

  container.classList.add( "full-screen" );

  if ( fullScreenedElem.requestFullscreen ) {
    fullScreenedElem.removeEventListener( "fullscreenchange", fullScreenEnabled, false );
    fullScreenedElem.addEventListener( "fullscreenchange", fullScreenDisabled, false );
  } else if ( fullScreenedElem.mozRequestFullScreen ) {
    fullScreenedElem.removeEventListener( "mozfullscreenchange", fullScreenEnabled, false );
    fullScreenedElem.addEventListener( "mozfullscreenchange", fullScreenDisabled, false );
  } else if ( fullScreenedElem.webkitRequestFullscreen ) {
    fullScreenedElem.removeEventListener( "webkitfullscreenchange", fullScreenEnabled, false );
    fullScreenedElem.addEventListener( "webkitfullscreenchange", fullScreenDisabled, false );
  }

  // OSX has a nice fancy animation that delays the fullscreen transition, but our event still fires.
  // Because of this, we recieve a "premature" innerHeight value.
  setTimeout(function() {
    controls = document.querySelector( "#controls" );
    container.style.height = window.innerHeight - controls.offsetHeight + "px";
  }, 1000 );
}

function fullScreenDisabled() {
  var container = document.querySelector( ".video" );

  container.classList.remove( "full-screen" );
  container.style.height = "";
  if ( fullScreenedElem.requestFullscreen ) {
    fullScreenedElem.removeEventListener( "fullscreenchange", fullScreenDisabled, false );
  } else if ( fullScreenedElem.mozRequestFullScreen ) {
    fullScreenedElem.removeEventListener( "mozfullscreenchange", fullScreenDisabled, false );
  } else if ( fullScreenedElem.webkitRequestFullscreen ) {
    fullScreenedElem.removeEventListener( "webkitfullscreenchange", fullScreenDisabled, false );
  }

  fullScreenedElem = null;
}

function requestFullscreen( elem ) {
  fullScreenedElem = elem;

  if ( elem.requestFullscreen ) {
    elem.addEventListener( "fullscreenchange", fullScreenEnabled, false );
    elem.requestFullscreen();
  } else if ( elem.mozRequestFullScreen ) {
    elem.addEventListener( "mozfullscreenchange", fullScreenEnabled, false );
    elem.mozRequestFullScreen();
  } else if ( elem.webkitRequestFullscreen ) {
    elem.addEventListener( "webkitfullscreenchange", fullScreenEnabled, false );
    elem.webkitRequestFullscreen();
  }
}

function isFullscreen() {
  return !((document.fullScreenElement && document.fullScreenElement !== null) ||
          (!document.mozFullScreen && !document.webkitIsFullScreen));
}

function cancelFullscreen() {
  if ( document.exitFullScreen ) {
    document.exitFullScreen();
  } else if ( document.mozCancelFullScreen ) {
    document.mozCancelFullScreen();
  } else if ( document.webkitCancelFullScreen ) {
    document.webkitCancelFullScreen();
  }
}

function hide( elem ) {
  elem = selectId( elem );
  if ( !elem ) {
    return;
  }
  elem.style.display = "none";
}

function shareClick( popcorn ) {
  if ( !popcorn.paused() ) {
    hideInfoDiv = true;
    popcorn.pause();
  }

  setStateClass( "embed-dialog-open" );
  hide( "#controls-big-play-button" );
  clearStateClass();
  show( "#share-container" );
}

function remixClick() {
  window.open( selectId( "#remix-post" ).href, "_blank" );
}

function fullscreenClick() {
  if( !isFullscreen() ) {
    requestFullscreen( document.body );
  } else {
    cancelFullscreen();
  }
}

function setupClickHandlers( popcorn, config ) {
  function replay() {
    popcorn.play( config.start );
  }

  selectId( "#replay-post" ).addEventListener( "click", replay, false );
  selectId( "#replay-share" ).addEventListener( "click", replay, false );
  selectId( "#share-post" ).addEventListener( "click", function() {
    shareClick( popcorn );
  }, false );
}

function buildIFrameHTML() {
  var src = window.location,
    // Sizes are strings: "200x400"
    shareSize = selectId( ".size-options .current .dimensions" ).textContent.split( "x" ),
    width = shareSize[ 0 ],
    height = shareSize[ 1 ];

  return "<iframe src='" + src + "' width='" + width + "' height='" + height +
         "' frameborder='0' mozallowfullscreen webkitallowfullscreen allowfullscreen></iframe>";
}

// We put the embed's cannoncial URL in a <link rel="cannoncial" href="...">
function getCanonicalURL() {
  var links = document.querySelectorAll( "link" ),
      link;

  for ( var i = 0; i < links.length; i++ ) {
    link = links[ i ];
    if ( link.rel === "canonical" ) {
      return link.href;
    }
  }
  // Should never happen, but for lint...
  return "";
}

// indicate which state the post roll is in
function setStateClass( state ) {
  var el = selectId( "#post-roll-container" );

  if ( el.classList.contains( state ) ) {
    return;
  }

  clearStateClass( el );

  el.classList.add( state );
}

// clear the state class indicator for the post roll container
function clearStateClass( el ) {
  el = el || selectId( "#post-roll-container" );

  for ( var i = 0; i < stateClasses.length; i++ ) {
    el.classList.remove( stateClasses[ i ] );
  }
}

function setupEventHandlers( popcorn, config ) {
  var sizeOptions = document.querySelectorAll( ".option" ),
      i, l, messages;

  selectId( "#share-close" ).addEventListener( "click", function() {
    hide( "#share-container" );

    // If the video is done, go back to the postroll
    if ( popcorn.ended() ) {
      setStateClass( "embed-dialog-open" );
    }
  }, false );

  function sizeOptionFn( e ) {
    e.preventDefault();
    selectId( ".size-options .current" ).classList.remove( "current" );
    this.classList.add( "current" );
    selectId( "#share-iframe" ).value = buildIFrameHTML();
  }

  for ( i = 0, l = sizeOptions.length; i < l; i++ ) {
    sizeOptions[ i ].addEventListener( "click", sizeOptionFn, false );
  }

  popcorn.on( "ended", function() {
    setStateClass( "embed-dialog-open" );
    window.parent.postMessage({
      type: "ended"
    }, "*" );
  });

  popcorn.on( "pause", function() {
    if ( hideInfoDiv ) {
      setStateClass( "embed-dialog-open" );
      hideInfoDiv = false;
    } else {
      setStateClass( "embed-paused" );
    }
    window.parent.postMessage({
      currentTime: popcorn.currentTime(),
      type: "pause"
    }, "*" );
  });

  popcorn.on( "play", function() {
    window.parent.postMessage({
      currentTime: popcorn.currentTime(),
      type: "play"
    }, "*" );
  });

  if ( document.querySelector( ".embed" ).getAttribute( "data-state-waiting" ) ) {
    popcorn.on( "sequencesReady", function() {
      window.parent.postMessage({
        type: "loadedmetadata"
      }, "*" );
    });
  } else {
    popcorn.on( "loadedmetadata", function() {
      window.parent.postMessage({
        type: "loadedmetadata"
      }, "*" );
    });
  }

  popcorn.on( "durationchange", function() {
    window.parent.postMessage({
      duration: popcorn.duration(),
      type: "durationchange"
    }, "*" );
  });

  popcorn.on( "timeupdate", function() {
    window.parent.postMessage({
      currentTime: popcorn.currentTime(),
      type: "timeupdate"
    }, "*" );
  });

  popcorn.on( "playing", function() {
    hide( "#share-container" );
    setStateClass( "embed-playing" );
  });

  function buildOptions( data, manifest ) {
    var options = {};

    for( var option in manifest ) {
      if ( manifest.hasOwnProperty( option ) ) {
        options[ option ] = data[ option ];
      }
    }

    return options;
  }

  popcorn.on( "trackstart", function( e ) {
    window.parent.postMessage({
      plugin: e.plugin,
      type: e.type/*,
      options: buildOptions( e, e._natives.manifest.options )*/
    }, "*" );
  });

  popcorn.on( "trackend", function( e ) {
    window.parent.postMessage({
      plugin: e.plugin,
      type: e.type/*,
      options: buildOptions( e, e._natives.manifest.options )*/
    }, "*" );
  });

  messages = {
    play: function( data ) {
      popcorn.play( data.currentTime );
    },
    pause: function( data ) {
      popcorn.pause( data.currentTime );
    },
    currentTime: function( data ) {
      popcorn.currentTime( data.currentTime );
    }
  };

  function onMessage( e ) {
    var data = e.data,
        type = data.type,
        message = messages[ type ];
    if ( message ) {
      message( data );
    }
  }

  window.addEventListener( "message", onMessage, false );

  function onCanPlay() {
    if ( config.autoplay ) {
      popcorn.play();
    }
  }
  popcorn.on( "canplay", onCanPlay );

  // See if Popcorn was ready before we got setup
  if ( popcorn.readyState() >= 3 && config.autoplay ) {
    popcorn.off( "canplay", onCanPlay );
    popcorn.play();
  }
}