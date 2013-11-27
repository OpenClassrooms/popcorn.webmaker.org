// PLUGIN: text

(function ( Popcorn ) {

  /**
   * text Popcorn plug-in
   * Based on popcorn.text.js by @humph
   * @param {Object} options
   *
   * Example:

   **/

  var DEFAULT_FONT_COLOR = "#000000",
      DEFAULT_SHADOW_COLOR = "#444444",
      DEFAULT_BACKGROUND_COLOR = "#888888";

  function newlineToBreak( string ) {
    // Deal with both \r\n and \n
    return string.replace( /\r?\n/gm, "<br>" );
  }

  Popcorn.plugin( "chapter", {

    manifest: {
      about: {
        name: "Popcorn chapter Plugin",
        version: "0.1",
        author: "@k88hudson, @mjschranz"
      },
      options: {
        text: {
          elem: "textarea",
          label: "Text",
          "default": "Popcorn Maker"
        },
        start: {
          elem: "input",
          type: "text",
          label: "In",
          group: "advanced",
          "units": "seconds"
        },
        end: {
          elem: "input",
          type: "text",
          label: "Out",
          group: "advanced",
          "units": "seconds"
        }
      }
    },

    _setup: function( options ) {
/*      var target = Popcorn.dom.find( options.target ),
          text = newlineToBreak( options.text ),
          container = options._container = document.createElement( "div" ),
          innerContainer = document.createElement( "div" ),
          innerSpan = document.createElement( "span" ),
          innerDiv = document.createElement( "div" ),
          fontSheet,
          fontDecorations = options.fontDecorations || options._natives.manifest.options.fontDecorations[ "default" ],
          position = options.position || options._natives.manifest.options.position[ "default" ],
          alignment = options.alignment,
          transition = options.transition || options._natives.manifest.options.transition[ "default" ],
          link,
          linkUrl = options.linkUrl,
          shadowColor = options.shadowColor || DEFAULT_SHADOW_COLOR,
          backgroundColor = options.backgroundColor || DEFAULT_BACKGROUND_COLOR,
          context = this;

      if ( !target ) {
        target = this.media.parentNode;
      }

      options._target = target;
      container.style.position = "absolute";
      container.classList.add( "popcorn-text" );

      // backwards comp
      if ( "center left right".match( position ) ) {
        alignment = position;
        position = "middle";
      }

      // innerDiv inside innerSpan is to allow zindex from layers to work properly.
      // if you mess with this code, make sure to check for zindex issues.
      innerSpan.appendChild( innerDiv );
      innerContainer.appendChild( innerSpan );
      container.appendChild( innerContainer );
      target.appendChild( container );

      // Add transition class
      // There is a special case where popup has to be added to the innerDiv, not the outer container.
      options._transitionContainer = container;

      options._transitionContainer.classList.add( transition );
      options._transitionContainer.classList.add( "off" );

      // Handle all custom fonts/styling

      options.fontColor = options.fontColor || DEFAULT_FONT_COLOR;
      innerContainer.classList.add( "text-inner-div" );
      innerContainer.style.color = options.fontColor;
      innerContainer.style.fontStyle = fontDecorations.italics ? "italic" : "normal";
      innerContainer.style.fontWeight = fontDecorations.bold ? "bold" : "normal";

      if ( options.background ) {
        innerDiv.style.backgroundColor = backgroundColor;
      }
      if ( options.shadow ) {
        innerDiv.style.textShadow = "0 1px 5px " + shadowColor + ", 0 1px 10px " + shadowColor;
      }

      fontSheet = document.createElement( "link" );
      fontSheet.rel = "stylesheet";
      fontSheet.type = "text/css";
      options.fontFamily = options.fontFamily ? options.fontFamily : options._natives.manifest.options.fontFamily[ "default" ];
      // Store reference to generated sheet for removal later, remove any existing ones
      options._fontSheet = fontSheet;
      document.head.appendChild( fontSheet );

      fontSheet.onload = function () {
        var padding = "3",
            width = 100 - ( padding * 2 );
        innerContainer.style.fontFamily = options.fontFamily;
        innerContainer.style.fontSize = options.fontSize + "%";
        container.classList.add( "text-custom" );
        innerContainer.classList.add( alignment );
        if ( position === "top" ) {
          container.style.left = padding + "%";
          container.style.width = width + "%";
          container.style.top = padding + "%";
        } else if ( position === "bottom" ) {
          container.style.left = padding + "%";
          container.style.width = width + "%";
          container.style.top = 100 - padding - options.fontSize + "%";
        } else if ( position === "middle" ) {
          container.style.left = padding + "%";
          container.style.width = width + "%";
          container.style.top = 50 - ( options.fontSize / 2 ) + "%";
        } else if ( position === "custom" ) {
          container.style.left = options.left + "%";
          container.style.top = options.top + "%";
          if ( options.width ) {
            container.style.width = options.width + "%";
          }
        }
        container.style.zIndex = +options.zindex;

        if ( linkUrl ) {

          if ( !linkUrl.match( /^http(|s):\/\// ) ) {
            linkUrl = "//" + linkUrl;
          }

          link = document.createElement( "a" );
          link.href = linkUrl;
          link.target = "_blank";
          link.innerHTML = text;

          link.addEventListener( "click", function() {
            context.media.pause();
          }, false );

          link.style.color = innerContainer.style.color;

          innerDiv.appendChild( link );
        } else {
          innerDiv.innerHTML = text;
        }
      };
      fontSheet.href = "//fonts.googleapis.com/css?family=" + options.fontFamily.replace( /\s/g, "+" ) + ":400,700";
*/
      options.toString = function() {
        // use the default option if it doesn't exist
        return options.text || options._natives.manifest.options.text[ "default" ];
      };
    },

    start: function( event, options ) {
      var transitionContainer = options._transitionContainer,
          redrawBug;

      if ( transitionContainer ) {
        transitionContainer.classList.add( "on" );
        transitionContainer.classList.remove( "off" );

        // Safari Redraw hack - #3066
        transitionContainer.style.display = "none";
        redrawBug = transitionContainer.offsetHeight;
        transitionContainer.style.display = "";
      }
    },

    end: function( event, options ) {
      if ( options._transitionContainer ) {
        options._transitionContainer.classList.remove( "on" );
        options._transitionContainer.classList.add( "off" );
      }
    },

    _teardown: function( options ) {
      if ( options._target ) {
        options._target.removeChild( options._container );
      }

      if ( options._fontSheet ) {
        document.head.removeChild( options._fontSheet );
      }
    }
  });
}( window.Popcorn ));
