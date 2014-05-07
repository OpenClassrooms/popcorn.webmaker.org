/*! This Source Code Form is subject to the terms of the MIT license
 *  If a copy of the MIT license was not distributed with this file, you can
 *  obtain one at https://raw.github.com/mozilla/butter/master/LICENSE */

function init() {

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

  var require = requirejs.config({
    baseUrl: "/src",
    paths: {
      "text": "../external/require/text",
      "localized": "/static/bower/webmaker-i18n/localized"
    }
  });

  define("embed-main",
    [
      "util/uri",
      "util/lang",
      "ui/widget/controls",
      "ui/widget/textbox",
      "ui/resizeHandler",
      "util/mediatypes",
      "text!layouts/attribution.html",
      "util/accepted-flash",
      "util/accepted-ua",
      "popcorn"
    ],
    function( URI, LangUtil, Controls, TextboxWrapper, ResizeHandler, MediaUtil, DEFAULT_LAYOUT_SNIPPETS ) {

      var __defaultLayouts = LangUtil.domFragment( DEFAULT_LAYOUT_SNIPPETS );
      /**
       * Expose Butter so we can get version info out of the iframe doc's embed.
       * This "butter" is never meant to live in a page with the full "butter".
       * We warn then remove if this happens.
       **/
      var Butter = {
            version: "Butter-Embed-@VERSION@"
          },
          popcorn,
          resizeHandler = new ResizeHandler(),
          config,
          qs = URI.parse( window.location.href ).queryKey,
          container = document.querySelectorAll( ".container" )[ 0 ];

      /**
       * the embed can be configured via the query string:
       *   autohide   = 1{default}|0    automatically hide the controls once playing begins
       *   autoplay   = 1|{default}0    automatically play the video on load
       *   controls   = 1{default}|0    display controls
       *   start      = {integer 0-end} time to start playing (default=0)
       *   end        = {integer 0-end} time to end playing (default={end})
       *   fullscreen = 1{default}|0    whether to allow fullscreen mode (e.g., hide/show button)
       *   loop       = 1|0{default}    whether to loop when hitting the end
       *   showinfo   = 1{default}|0    whether to show video title, author, etc. before playing
       *   preload    = auto{default}|none    whether to preload the video, or wait for user action
       **/
      config = {
        autohide: qs.autohide === "1" ? true : false,
        autoplay: qs.autoplay === "1" ? true : false,
        controls: qs.controls === "0" ? false : true,
        preload: qs.preload !== "none",
        start: qs.start|0,
        end: qs.end|0,
        fullscreen: qs.fullscreen === "0" ? false : (function( document ) {
          // Check for prefixed/unprefixed Fullscreen API support
          if ( "fullScreenElement" in document ) {
            return true;
          }

          var pre = "khtml o ms webkit moz".split( " " ),
              i = pre.length,
              prefix;

          while ( i-- ) {
            prefix = pre[ i ];
            if ( (prefix + "FullscreenElement" ) in document ) {
              return true;
            }
          }
          return false;
        }( document )),
        loop: qs.loop === "1" ? true : false,
        branding: qs.branding === "0" ? false : true,
        showinfo: qs.showinfo === "0" ? false : true
      };

      resizeHandler.resize();
      window.addEventListener( "resize", resizeHandler.resize, false );

      Controls.create( "controls", {
        onShareClick: function() {
          shareClick( popcorn );
        },
        onRemixClick: function() {
          remixClick( popcorn );
        },
        onFullscreenClick: function() {
          fullscreenClick();
        },
        init: function( setPopcorn ) {
          // cornfield writes out the Popcorn initialization code as popcornDataFn()
          window.popcornDataFn();
          popcorn = Popcorn.byId( "Butter-Generated" );
          setPopcorn( popcorn );
          // Always show controls.  See #2284 and #2298 on supporting
          // options.controls, options.autohide.
          popcorn.controls( true );

          if ( config.loop ) {
            popcorn.loop( true );
          }

          // Either the video is ready, or we need to wait.
          if ( popcorn.readyState() >= 1 ) {
            onLoad();
          } else {
            popcorn.media.addEventListener( "canplay", onLoad );
          }

          if ( config.branding ) {
            setupClickHandlers( popcorn, config );
            setupEventHandlers( popcorn, config );

            // Wrap textboxes so they click-to-highlight and are readonly
            TextboxWrapper.applyTo( selectId( "#share-url" ), { readOnly: true } );
            TextboxWrapper.applyTo( selectId( "#share-iframe" ), { readOnly: true } );

            // Write out the iframe HTML necessary to embed this
            selectId( "#share-iframe" ).value = buildIFrameHTML();

            // Get the page's canonical URL and put in share URL
            selectId( "#share-url" ).value = getCanonicalURL();
          }

          var sequencerEvents = popcorn.data.trackEvents.where({ type: "sequencer" }),
              imageEvents = popcorn.data.trackEvents.where({ type: "image" }),
              mapEvents = popcorn.data.trackEvents.where({ type: "googlemap" }),
              attributionContainer = document.querySelector( ".attribution-details" ),
              attributionMedia = document.querySelector( ".attribution-media" ),

              attributionContent = selectId( ".attribution-content" ),
              toggler = selectId( ".attribution-logo" ),
              closeBtn = selectId( ".attribution-close" ),
              container = selectId( ".attribution-info" ),
              jsonToc,
              htmlToc,
              checkedFlashVersion;

          // Backwards compat for old layout. Removes the null media that's shown there.
          if ( attributionMedia ) {
            attributionContainer.removeChild( attributionMedia );
          }

          // Table of contents settings
          jsonToc = popcorn.data.running.toc ? popcorn.data.running.toc[0].jsonml : null;
          htmlToc = jsonToc ? JsonML.toHTML( jsonToc ) : document.createElement("ol");

          attributionContent.appendChild( htmlToc );

    var tocLinks = htmlToc.querySelectorAll("a");

    function updateCurrentTocItem() {
      var currentLinks = htmlToc.querySelectorAll(".current-toc-item");
      if( currentLinks ) {
        $.each( currentLinks, function() {
          this.classList.remove("current-toc-item");
        });
      }

      var newLinks = [];
      for (var j = 0; j < tocItems.length; j++) {
        var item = tocItems[j],
          currentTime = popcorn.currentTime();
        if( currentTime >= item.start && currentTime < item.end ) {
          item.link.classList.add("current-toc-item");
          newLinks.push( item.link );
        }
      }
    }

    // Build toc items data list.
    // Used to switch from one part to another. 
    for( var i = 0; i < tocLinks.length; i++) {
      var tocLink = tocLinks[ i ];
      tocLink.innerHTML = reconstituteHTML( tocLink.innerHTML );

      var end = tocLink.getAttribute('data-end'),
        start = tocLink.getAttribute('data-start'),
        level = tocLink.getAttribute('data-level'),
        viewEndTime = tocLink.getAttribute('data-view-end-time'),
        tocItem = {};

      // Set data. Usefull to display tooltips of current chapter.
      tocItem.start = parseFloat( start );
      tocItem.end = parseFloat( viewEndTime );
      tocItem.viewEndTime = parseFloat( viewEndTime );
      tocItem.level = parseFloat( level );
      tocItem.link = tocLink;

      tocItems.push(tocItem);

      popcorn.cue( tocItem.start, updateCurrentTocItem);
      
      // Workaround to prevent player to pause in the end of item
      popcorn.cue( tocItem.end, function() {
        if( popcorn.paused() ) {
          popcorn.play();
        }
      });

      tocLink.onclick = function(e) {
        e.preventDefault();
        var start = e.target.getAttribute("data-start");
        if( popcorn.paused() ) {
          popcorn.pause( start );
        }
        else {
          popcorn.play( start );
        }
      }
    }

    // Set as global var of the popcorn instance to get it in controls.js
    popcorn.data.running.toc ? popcorn.data.running.toc[0].tocItems = tocItems : null;

    // Build toc labels list.
    // Used for tooltips in the player timeline.

    var tocStarts = [];

    var tocTooltips = [],
      h1Count = 0;

    $( htmlToc ).find("a[data-level='3']").each(function() {
      tocStarts.push( this.getAttribute("data-start") );
    });

    function addTooltip( start, end, h1Count, titles ) {
      var tocTooltip = {};
      tocTooltip.start = parseFloat( start );
      tocTooltip.end = parseFloat( end );
      tocTooltip.h1Count = parseFloat( h1Count );
      tocTooltip.titles = titles;
      tocTooltip.tocBars = [];
      tocTooltips.push( tocTooltip );
    }

    function onTocTogglerClick() {
      container.classList.toggle( "attribution-on" );
      videoContainer = document.querySelectorAll( ".container" )[ 0 ]
      videoContainer.classList.toggle( "reduced-on" );
    }

    $( htmlToc ).find("[data-level='1']").each(function() {
      var h1Chapter = this,
        titles = [],
        tocTooltip = {};

      ++h1Count;

      // If no further child, add a toc tooltip
      if( $( h1Chapter ).parent().children().length == 1 ) {
        titles.push( h1Chapter.innerHTML );
        addTooltip( h1Chapter.getAttribute("data-start"),
          h1Chapter.getAttribute("data-view-end-time"),
          h1Count,
          titles );
      }

      $( h1Chapter ).parent().find("[data-level='2']").each(function() {
        var h2Chapter = this;

        // If no further child, add a toc tooltip
        if( $( h2Chapter ).parent().children().length == 1 ) {
          titles.push( h2Chapter.innerHTML );
          addTooltip( h2Chapter.getAttribute("data-start"),
            h2Chapter.getAttribute("data-view-end-time"),
            h1Count,
            titles );          
          titles = [];
        }

        $( h2Chapter ).parent().find("[data-level='3']").each(function() {
          var h3Chapter = this;

          titles.push( h1Chapter.innerHTML );
          titles.push( h2Chapter.innerHTML );
          titles.push( h3Chapter.innerHTML );

          addTooltip( h3Chapter.getAttribute("data-start"),
            h3Chapter.getAttribute("data-view-end-time"),
            h1Count,
            titles );

          titles = [];
        });
      });
    });

    // Set as global var of the popcorn instance to get it in controls.js
    popcorn.data.running.toc ? popcorn.data.running.toc[0].tocTooltips = tocTooltips : null;

    // Update toc whenever receives the order to update it
    popcorn.on("updateToc", updateCurrentTocItem);

    toggler.addEventListener( "click", onTocTogglerClick, false );


          /*toggler.addEventListener( "click", function() {
            container.classList.toggle( "attribution-on" );
          }, false );

          closeBtn.addEventListener( "click", function() {
            container.classList.toggle( "attribution-on" );
          }, false );*/

          if ( sequencerEvents.length ) {
            var clipsContainer = __defaultLayouts.querySelector( ".attribution-media" ).cloneNode( true ),
                clipCont,
                clip,
                source,
                type;

            for ( var i = 0; i < sequencerEvents.length; i++ ) {
              clip = sequencerEvents[ i ];
              clipCont = __defaultLayouts.querySelector( ".data-container.media" ).cloneNode( true );
              source = clip.source[ 0 ];
              type = MediaUtil.checkUrl( source );

              if ( type === "YouTube" && !checkedFlashVersion ) {
                checkedFlashVersion = true;
                //FLASH.warn();
              }

              if ( type === "Archive" ) {
                source = clip.linkback;
              }

              clipCont.querySelector( "span" ).classList.add( type.toLowerCase() + "-icon" );
              clipCont.querySelector( "a" ).href = source;
              clipCont.querySelector( "a" ).innerHTML = clip.title;

              clipsContainer.appendChild( clipCont );
            }

            //attributionContainer.appendChild( clipsContainer );
          }

          if ( imageEvents.length ) {
            var imagesContainer = __defaultLayouts.querySelector( ".attribution-images" ).cloneNode( true ),
                imgCont,
                img,
                imgPrefix = "/resources/icons/",
                foundMatch = false;

            for ( var k = 0; k < imageEvents.length; k++ ) {
              img = imageEvents[ k ];
              imgCont = __defaultLayouts.querySelector( ".data-container.image" ).cloneNode( true );

              var href = img.photosetId || img.src || "http://www.flickr.com/search/?m=tags&q=" + img.tags,
                  text = img.src || img.photosetId || img.tags,
                  icon = document.createElement( "img" );

              icon.classList.add( "media-icon" );

              imgCont.querySelector( "a" ).href = href;
              imgCont.querySelector( "a" ).innerHTML = text;

              // We have a slight edgecase where "default" image events have all attributes
              // to support better user experience when trying different options in the image
              // plugin editor. In this scenario, they didn't change past the default single image.
              if ( img.tags && img.photosetId && img.src ) {
                img.tags = img.photosetId = "";
              }

              if ( img.tags || img.photosetId || MediaUtil.checkUrl( img.src ) === "Flickr" ) {
                foundMatch = true;
                icon.src += imgPrefix + "flickr-black.png";
                imgCont.insertBefore( icon, imgCont.firstChild );
                imagesContainer.appendChild( imgCont );
              } else if ( img.src.indexOf( "giphy" ) !== -1 ) {
                foundMatch = true;
                icon.src += imgPrefix + "giphy.png";
                imgCont.insertBefore( icon, imgCont.firstChild );
                imagesContainer.appendChild( imgCont );
              } else {
                imgCont = null;
              }
            }

            // We only care about attributing Flickr and Giphy images
            if ( foundMatch ) {
              attributionContainer.appendChild( imagesContainer );
            }
          }

          // We only need to know if a maps event exists in some fashion.
          if ( mapEvents.length ) {
            var extraAttribution = __defaultLayouts.querySelector( ".attribution-extra" ).cloneNode( true );

            extraAttribution.querySelector( ".data-container" ).innerHTML = Popcorn.manifest.googlemap.about.attribution;
            attributionContainer.appendChild( extraAttribution );
          }
        },
        preload: config.preload
      });

      // Setup UI based on config options
      if ( !config.showinfo ) {
        var embedInfo = document.getElementById( "embed-info" );
        embedInfo.parentNode.removeChild( embedInfo );
      }

      // Some config options want the video to be ready before we do anything.
      function onLoad() {
        var start = config.start,
            end = config.end;

        if ( config.fullscreen ) {
          // dispatch an event to let the controls know we want to setup a click listener for the fullscreen button
          popcorn.emit( "butter-fullscreen-allowed", container );
        }

        popcorn.off( "load", onLoad );

        // update the currentTime to the embed options start value
        // this is needed for mobile devices as attempting to listen for `canplay` or similar events
        // that let us know it is safe to update the current time seem to be futile
        function timeupdate() {
          popcorn.currentTime( start );
          popcorn.off( "timeupdate", timeupdate );
        }
        // See if we should start playing at a time other than 0.
        // We combine this logic with autoplay, since you either
        // seek+play or play or neither.
        if ( start > 0 && start < popcorn.duration() ) {
          popcorn.on( "seeked", function onSeeked() {
            popcorn.off( "seeked", onSeeked );
            if ( config.autoplay ) {
              popcorn.play();
            }
          });
          popcorn.on( "timeupdate", timeupdate );
        } else if ( config.autoplay ) {
          popcorn.play();
        }

        // See if we should pause at some time other than duration.
        if ( end > 0 && end > start && end <= popcorn.duration() ) {
          popcorn.cue( end, function() {
            popcorn.pause();
            popcorn.emit( "ended" );
          });
        }
      }

      if ( window.Butter && console && console.warn ) {
        console.warn( "Butter Warning: page already contains Butter, removing." );
        delete window.Butter;
      }
      window.Butter = Butter;
    }
  );

//  require(["localized", "util/shims"], function( Localized ) {
//    Localized.ready(function() {
//      require([ "embed-main" ]);
//    });
//  });
}

document.addEventListener( "DOMContentLoaded", function() {
  // Source tree case vs. require-built case.
  if ( typeof require === "undefined" ) {
    var rscript = document.createElement( "script" );
    rscript.onload = function() {
      init();
    };
    rscript.src = "/external/require/require.js";
    document.head.appendChild( rscript );
  } else {
    init();
  }
}, false );
