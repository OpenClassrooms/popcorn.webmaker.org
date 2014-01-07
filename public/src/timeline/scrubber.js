/* This Source Code Form is subject to the terms of the MIT license
 * If a copy of the MIT license was not distributed with this file, you can
 * obtain one at https://raw.github.com/mozilla/butter/master/LICENSE */

define( [ "util/time" ],
  function( util ) {

  var SCROLL_INTERVAL = 16,
      SCROLL_DISTANCE = 20,
      MOUSE_SCRUBBER_PIXEL_WINDOW = 3;

  return function( butter, parentElement, media, tracksContainer ) {
    var _container = parentElement.querySelector( ".time-bar-scrubber-container" ),
        _tocContainer = parentElement.querySelector( ".time-bar-toc-container" ),
        //_tocTooltip = parentElement.querySelector( ".time-bar-toc-tooltip"),
        _node = _container.querySelector( ".time-bar-scrubber-node" ),
        _timeTooltip = _container.querySelector( ".butter-time-tooltip" ),
        _line = _container.querySelector( ".time-bar-scrubber-line" ),
        _fill = _container.querySelector( ".fill-bar" ),
        _tracksContainer = tracksContainer,
        _tracksContainerWidth,
        _media = media,
        _mouseDownPos,
        _currentMousePos,
        _timelineMousePos,
        _scrollInterval = -1,
        _rect,
        _width = 0,
        _isPlaying = false,
        _isScrubbing = false,
        _lastTime = -1,
        _lastScrollLeft = _tracksContainer.element.scrollLeft,
        _lastScrollWidth = _tracksContainer.element.scrollWidth,
        _lineWidth = 0,
        _isSeeking = false,
        _seekMouseUp = false,

        //_bookmarks = [[], [], []],
        _bookmarks = [],
        _currentBookmark,
        _currentBookmarkIndex = 0,

        BOOKMARK_WIDTH = 5; // to align the bookmark

        //CHAPTER_INTERVAL = 0.001,
        CHAPTER_MARK = 0.5, // only materialize a chapter
        //CHAPTER_MIN_DURATION = 1,
        CHAPTER_MOVE_MARGIN = 1.5;
        CHAPTER_MOVE_MAGNET = 1;

        // Below this limit a chapter is considered as immediately previous to another one
        CHAPTER_PREV_MARGIN = 1;
        CHAPTER_FLOAT_ACCURACY = 100000;

    /*_bookmarks[1] = [];
    _bookmarks[2] = [];
    _bookmarks[3] = [];*/

    function sortBookmarksFunction(b1, b2) {
      return b1.time - b2.time;
    }

    /**
     * Get bookmark immediately precceding a given bookmark.
     * A chapter is defined only by its start date; its end is implicitely
     * defined by the beginning of the next chapter.
     */
    function getPrevBookmarkOf( bookmark ) {
      var res = bookmark;
      var bookmarks = _bookmarks;
      for (var i = 0; i < bookmarks.length; ++i) {
        var b = bookmarks[i];

        if( b != bookmark && b.time <= bookmark.time ) {
          res = b;
        }
        // When bookmark is the first of all
        else if( b.time > bookmark.time ) {
          return res;
        }
      }
      return res;
    }

    /**
     * Given a bookmark of level n,
     * get all immediately preceeding bookmarks of level k > n.
     */
    function getAllPrevBookmarksOf( bookmark ) {
      var res = [];
      var bookmarks = _bookmarks;
      for (var l = bookmark.level; l <= 3; ++l) {
        var resBookmark;
        for (var i = 0; i < bookmarks.length; ++i) {
          var b = bookmarks[i];

          if( b != bookmark && b.time <= bookmark.time && b.level == l ) {
            resBookmark = b;
          }

        }
        // If found bookmark is well immediately preceeding the given bookmark
        // using the chapter margin
        if( resBookmark !== undefined
          && resBookmark.trackEvent.popcornOptions.viewEndTime > bookmark.trackEvent.popcornOptions.start - CHAPTER_PREV_MARGIN ) {
          res.push( resBookmark );
        }
      }

      return res;
    }

    function getNextBookmarkOf( bookmark ) {
      var res = bookmark;
      var bookmarks = _bookmarks;//[bookmark.level];
      for (var i = 0; i < bookmarks.length; ++i) {
        var b = bookmarks[i];
        if( b.time > bookmark.time ) {
          return b;
        }
      }
      return res;
    }


    function getTimeOfNextBookmarkSameLevel( targetIndex, targetLevel ) {
      var bookmarks = _bookmarks;

      for(var j = targetIndex + 1; j < bookmarks.length; j++) {
        if( bookmarks[j].level <= targetLevel ) {
          return bookmarks[j].time;
        }
        else {
          continue;
        }
      }

      return _media.duration;
    }

    /**
     * Add a chapter bookmark when a chapter has been added in chapter editor
     */
    function addBookmark( butterEvent ) {
      var bookmark = {},
        newBookmarkDiv = document.createElement('div'),
        //newBookmarkDivRect = document.createElement('div'),
        newBookmarkDivArrow = document.createElement('div'),
        options = butterEvent.data.popcornOptions;

        newBookmarkDiv.classList.add("time-bar-bookmark-item");
        newBookmarkDiv.innerHTML = "&nbsp;";

        newBookmarkDivArrow.classList.add("time-bar-bookmark-item-arrow");
        newBookmarkDiv.appendChild( newBookmarkDivArrow );

        newBookmarkDiv.setAttribute("data-level", options.level);

        /*var itemLeft = start/_media.duration * 100 + "%",
          itemWidth = (end-start)/_media.duration * 100 + "%";

        newBookmarkDiv.style.left = itemLeft;*/

        bookmark.time = options.start;
        bookmark.title = options.text;
        bookmark.level = options.level;
        bookmark.trackEvent = butterEvent.data;
        bookmark.div = newBookmarkDiv;

        setBookmarkPosition( bookmark );

        // Bind chapter track event and bookmark object
        $( butterEvent.data ).data("bookmark", bookmark);

        // Bind bookmark div and bookmark object
        $( newBookmarkDiv ).data("bookmark", bookmark);

        // Set event listeners for all bookmarks but the first
        //if( bookmark.time != 0) {
          newBookmarkDiv.addEventListener("mousedown", bookmarkMouseDown, false);          
        //}

        // Listen to chapter track event updates
        butterEvent.data.listen( "trackeventupdated", onChapterTrackEventUpdate );

        // Add to toc container
        _tocContainer.appendChild( newBookmarkDiv );

        // Add bookmark in the list
        //_bookmarks[ bookmark.level-1 ].push( bookmark );
        //_bookmarks[ bookmark.level ].push( bookmark );
        _bookmarks.push( bookmark );

        sortBookmarks();
    }

    /**
     * Sort bookmarks by time, for each level list.
     */
    function sortBookmarks() {
      /*_bookmarks.forEach(function( bookmarks ) {
        bookmarks.sort( sortBookmarksFunction );
      });*/
      _bookmarks.sort( sortBookmarksFunction );
    }

    function onChapterTrackEventUpdate( e ) {
      var trackEvent = e.target,
        bookmark = $( trackEvent ).data("bookmark");
      
      if( bookmark ) {
        bookmark.title = trackEvent.popcornOptions.text;        
      }

    }

    function bookmarkMouseDown( e ) {
      // Stop text selection in chrome.
      e.preventDefault();

      _isScrubbing = true;
      _isSeeking = true;
      _seekMouseUp = false;
      _media.listen( "mediaseeked", onSeeked );

      // Sort bookmark array after time position
      // to resolve right prev and next bookmarks of current one.
      sortBookmarks();

      if( _isPlaying ){
        _media.pause();
      }

      setNodePosition();
      setBookmarksPositions();
      _mouseDownPos = e.pageX - e.target.offsetLeft;

      // Set current dragged bookmark object
      _currentBookmark = $( e.target ).data("bookmark"); 

      parentElement.removeEventListener( "mouseout", onMouseOut, false );
      parentElement.removeEventListener( "mousemove", onTimelineMouseMove, false );
      window.addEventListener( "mousemove", bookmarkMouseMove, false );
      window.addEventListener( "mouseup", bookmarkMouseUp, false );
    }

    function evalBookmarkPosition( bookmark ) {
      var diff = _currentMousePos - _mouseDownPos;
      diff = Math.max( 0, Math.min( diff, _width ) );
      bookmark.time = ( diff + _tracksContainer.element.scrollLeft ) / _tracksContainerWidth * _media.duration;
    } //evalBookmarkPosition

    function bookmarkMouseMove( e ) {
      if( !_currentBookmark ) {
        return;
      }

      _currentMousePos = e.pageX;
      _timelineMousePos = e.clientX - parentElement.offsetLeft;

      var currentTime = ( _timelineMousePos + _tracksContainer.element.scrollLeft ) / _tracksContainerWidth * _media.duration;

      var prevBookmark = getPrevBookmarkOf( _currentBookmark ),
        nextBookmark = getNextBookmarkOf( _currentBookmark );

      if( _scrollInterval === -1 ){
        if( _currentMousePos > _rect.right - MOUSE_SCRUBBER_PIXEL_WINDOW ){
          scrollTracksContainer( "right" );
        }
        else if( _currentMousePos < _rect.left + MOUSE_SCRUBBER_PIXEL_WINDOW ){
          scrollTracksContainer( "left" );
        } //if
      } //if

      // Stop if cursor is outside timeline
      if( currentTime > _media.duration - CHAPTER_MOVE_MARGIN ) {
        return;
      }

      // Rules for bookmarks moving limits

      // Example: 2 can be dragged between 1 and 3
      if( _currentBookmark != prevBookmark &&
        prevBookmark.level == _currentBookmark.level && 
        currentTime <= prevBookmark.time + CHAPTER_MOVE_MARGIN ) {
        return;
      }

      // Example: 1.1 can be dragged at same date of 1 but not further on the left
      if( prevBookmark.level == (_currentBookmark.level - 1) && 
        currentTime <= prevBookmark.time ) {
        return;
      }

      // Example: 1 can be dragged at same date of 1.1 but not further on the right
      if( nextBookmark.level == (_currentBookmark.level + 1) && 
        currentTime >= nextBookmark.time ) {
        return;
      }

      // Example: 2 can't be dragged on the left of 1.3 in a given margin
      if( prevBookmark.level > _currentBookmark.level && 
        currentTime <= prevBookmark.time + CHAPTER_MOVE_MARGIN ) {
        return;
      }

      // Example: 1.3 can't be dragged on the right of 2 in a given margin
      if( _currentBookmark != nextBookmark &&
        nextBookmark.level <= _currentBookmark.level && 
        currentTime >= nextBookmark.time - CHAPTER_MOVE_MARGIN) {
        return;
      }

      // Example: 1 can't go between 1.1 and 1.2
      if( _currentBookmark != nextBookmark &&
        _currentBookmark != prevBookmark &&
        prevBookmark.level >= _currentBookmark.level && 
        nextBookmark.level >= _currentBookmark.level && 
        currentTime >= nextBookmark.time - CHAPTER_MOVE_MARGIN &&
        currentTime >= prevBookmark.time + CHAPTER_MOVE_MARGIN) {
        return;
      }

      // Rules for bookmark moving magnetism

      // Example: 1.1 can go at same date of 1
      // Counter example: 2 can't go 
      if( _currentBookmark != prevBookmark &&
        prevBookmark.time + CHAPTER_MOVE_MAGNET >= currentTime ) {
        _currentBookmark.time = prevBookmark.time;
      }

      // Example: 1 can't go at same date of 1.1 nor 1.2
      else if( _currentBookmark != nextBookmark &&
        nextBookmark.time - CHAPTER_MOVE_MAGNET <= currentTime ) {
        //_currentBookmark.time = nextBookmark.time;
        return;
      }
      else {        
        evalBookmarkPosition( _currentBookmark );
      }


      //_tocTooltip.classList.add( "tooltip-no-transition-on" );

      onTimelineMouseMove( e );
      //onToclineMouseMove( e );
      setNodePosition();
      setBookmarksPositions();

      //sortBookmarks();
    } //onBookmarkMouseMove

    function bookmarkMouseUp() {
      _seekMouseUp = true;

      _timeTooltip.classList.remove( "tooltip-no-transition-on" );
      //_tocTooltip.classList.add( "tooltip-no-transition-on" );

      if( _isPlaying && !_isSeeking ){
        _media.play();
      }

      if( _isScrubbing ){
        _isScrubbing = false;
      }

      clearInterval( _scrollInterval );
      _scrollInterval = -1;

      // Update chapter track events
      if( _currentBookmark ) {
        var prevBookmark = getPrevBookmarkOf( _currentBookmark ),
          allPrevBookmarks = getAllPrevBookmarksOf( _currentBookmark );
        //prevBookmark.trackEvent.popcornOptions.end = _currentBookmark.time;

        /*if( _currentBookmark.time < prevBookmark.trackEvent.popcornOptions.end ) {
          _currentBookmark.time = prevBookmark.trackEvent.popcornOptions.end + CHAPTER_INTERVAL;
        }*/

        _currentBookmark.time = Math.round( _currentBookmark.time*CHAPTER_FLOAT_ACCURACY )/CHAPTER_FLOAT_ACCURACY;

        _currentBookmark.trackEvent.popcornOptions.start = _currentBookmark.time;
        _currentBookmark.trackEvent.popcornOptions.end = _currentBookmark.time + CHAPTER_MARK;

        _currentBookmark.trackEvent.dispatch("trackeventupdated", _currentBookmark.trackEvent);
        _currentBookmark.trackEvent.update( _currentBookmark.trackEvent.popcornOptions );
        _currentBookmark.trackEvent.view.update( _currentBookmark.trackEvent.popcornOptions );

        for (var i = 0; i < allPrevBookmarks.length; ++i) {
          var b = allPrevBookmarks[i];

          b.trackEvent.popcornOptions.viewEndTime = _currentBookmark.time;

          b.trackEvent.dispatch("trackeventupdated", b.trackEvent);
          b.trackEvent.update( b.trackEvent.popcornOptions );
          b.trackEvent.view.update( b.trackEvent.popcornOptions );

        }

      }


      parentElement.addEventListener( "mouseover", onMouseOver, false );
      window.removeEventListener( "mouseup", bookmarkMouseUp, false );
      window.removeEventListener( "mousemove", bookmarkMouseMove, false );

      sortBookmarks();
    } //onMouseUp

    function setBookmarksPositions() {
      /*_bookmarks.forEach(function( bookmarks ) {
        bookmarks.forEach( function( bookmark ) {
          setBookmarkPosition( bookmark );
        });
      });*/
      _bookmarks.forEach( function( bookmark ) {
          setBookmarkPosition( bookmark );
      });
    }

    function setBookmarkPosition( bookmark ) {
      var duration = _media.duration,
          tracksElement = _tracksContainer.element,
          scrollLeft = tracksElement.scrollLeft,
          scrollWidth = tracksElement.scrollWidth;

      setTimeTooltip();

      // To prevent some scrubber jittering (from viewport centering), pos is rounded before
      // being used in calculation to account for possible precision issues.
      var pos = Math.round( bookmark.time / duration * _tracksContainerWidth ),
          adjustedPos = pos - scrollLeft;

      // If the node position is outside of the viewing window, hide it.
      // Otherwise, show it and adjust its position.
      // Note the use of clientWidth here to account for padding/margin width fuzziness.
      if( pos < scrollLeft || pos - _lineWidth > _container.clientWidth + scrollLeft ){
        bookmark.div.style.display = "none";
      }
      else {
        bookmark.div.style.left = adjustedPos - BOOKMARK_WIDTH + "px";
        bookmark.div.style.display = "block";
      } //if

      //_media.dispatch("trackeventupdated", bookmark.trackEvent);
      //bookmark.trackEvent.view.update( bookmark.trackEvent.popcornOptions );
    }

    function setNodePosition() {
      var duration = _media.duration,
          currentTime = _media.currentTime,
          tracksElement = _tracksContainer.element,
          scrollLeft = tracksElement.scrollLeft,
          scrollWidth = tracksElement.scrollWidth;

      // If we can avoid re-setting position and visibility, then do so
      if( _lastTime !== currentTime || _lastScrollLeft !== scrollLeft || _lastScrollWidth !== scrollWidth ){
        setTimeTooltip();

        // To prevent some scrubber jittering (from viewport centering), pos is rounded before
        // being used in calculation to account for possible precision issues.
        var pos = Math.round( currentTime / duration * _tracksContainerWidth ),
            adjustedPos = pos - scrollLeft;

        // If the node position is outside of the viewing window, hide it.
        // Otherwise, show it and adjust its position.
        // Note the use of clientWidth here to account for padding/margin width fuzziness.
        if( pos < scrollLeft || pos - _lineWidth > _container.clientWidth + scrollLeft ){
          _node.style.display = "none";
        }
        else {
          _node.style.left = adjustedPos + "px";
          _node.style.display = "block";
        } //if

        if( pos < scrollLeft ){
          _fill.style.display = "none";
        }
        else {
          if( pos > _width + scrollLeft ){
            _fill.style.width = ( _width - 2 ) + "px";
          }
          else {
            _fill.style.width = adjustedPos + "px";
          } //if
          _fill.style.display = "block";
        } //if
      } //if

      _lastTime = currentTime;
      _lastScrollLeft = scrollLeft;
      _lastScrollWidth = scrollWidth;
    }

    function onMouseUp() {
      _seekMouseUp = true;

      _timeTooltip.classList.remove( "tooltip-no-transition-on" );

      if( _isPlaying && !_isSeeking ){
        _media.play();
      }

      if( _isScrubbing ){
        _isScrubbing = false;
      }

      clearInterval( _scrollInterval );
      _scrollInterval = -1;

      parentElement.addEventListener( "mouseover", onMouseOver, false );
      window.removeEventListener( "mouseup", onMouseUp, false );
      window.removeEventListener( "mousemove", onMouseMove, false );
    } //onMouseUp

    function scrollTracksContainer( direction ) {
      if( direction === "right" ){
        _scrollInterval = setInterval(function() {
          if( _currentMousePos < _rect.right - MOUSE_SCRUBBER_PIXEL_WINDOW ){
            clearInterval( _scrollInterval );
            _scrollInterval = -1;
          }
          else{
            _currentMousePos += SCROLL_DISTANCE;
            _tracksContainer.element.scrollLeft += SCROLL_DISTANCE;
            //evalMousePosition();
            setNodePosition();
            setBookmarksPositions();
          }
        }, SCROLL_INTERVAL );
      }
      else{
        _scrollInterval = setInterval(function() {
          if( _currentMousePos > _rect.left + MOUSE_SCRUBBER_PIXEL_WINDOW ){
            clearInterval( _scrollInterval );
            _scrollInterval = -1;
          }
          else{
            _currentMousePos -= SCROLL_DISTANCE;
            _tracksContainer.element.scrollLeft -= SCROLL_DISTANCE;
            //evalMousePosition();
            setNodePosition();
            setBookmarksPositions();
          }
        }, SCROLL_INTERVAL );
      }
    } //scrollTracksContainer

    function evalMousePosition() {
      var diff = _currentMousePos - _mouseDownPos;
      diff = Math.max( 0, Math.min( diff, _width ) );
      _media.currentTime = ( diff + _tracksContainer.element.scrollLeft ) / _tracksContainerWidth * _media.duration;
    } //evalMousePosition

    function onMouseMove( e ) {
      _currentMousePos = e.pageX;

      if( _scrollInterval === -1 ){
        if( _currentMousePos > _rect.right - MOUSE_SCRUBBER_PIXEL_WINDOW ){
          scrollTracksContainer( "right" );
        }
        else if( _currentMousePos < _rect.left + MOUSE_SCRUBBER_PIXEL_WINDOW ){
          scrollTracksContainer( "left" );
        } //if
      } //if

      onTimelineMouseMove( e );
      //onToclineMouseMove( e );
      evalMousePosition();
      setNodePosition();
      setBookmarksPositions();
    } //onMouseMove



    function onSeeked() {
      _isSeeking = false;

      _media.unlisten( "mediaseeked", onSeeked );

      if( _isPlaying && _seekMouseUp ) {
        _media.play();
      }
    }

    function onTimelineMouseMove( e ) {
      _timelineMousePos = e.clientX - parentElement.offsetLeft;

      if ( _timelineMousePos < 0 ) {
        _timelineMousePos = 0;
      } else if ( _timelineMousePos > _container.offsetWidth ) {
        _timelineMousePos = _container.offsetWidth;
      }

      _timeTooltip.style.left = _timelineMousePos + "px";
      setTimeTooltip();
    }

    /*function onToclineMouseMove( e ) {
      _toclineMousePos = e.clientX - parentElement.offsetLeft;

      if ( _toclineMousePos < 0 ) {
        _toclineMousePos = 0;
      } else if ( _toclineMousePos > _container.offsetWidth ) {
        _toclineMousePos = _container.offsetWidth;
      }

      _tocTooltip.style.left = _toclineMousePos + "px";
      setTocTooltip();
    }*/

    function getChapterTooltip( targetTime, targetLevel ) {
      var bookmarks = _bookmarks;//[ targetLevel ];
      var targetText = "";

      if( bookmarks.length>0 ) {
        // Display current chapters 
        for(var j = 0; j < bookmarks.length-1; j++) {

          if( bookmarks[j].level != targetLevel ) {
            continue;
          }

          // Get the right chapter label of the current time
          if( targetTime >= bookmarks[j].time &&
            targetTime < getTimeOfNextBookmarkSameLevel(j, targetLevel) ) {

            targetText += bookmarks[j].trackEvent.popcornOptions.text;
          }
        }

        // Limit condition for last bookmark
        if( targetTime >= bookmarks[bookmarks.length-1].time &&
          bookmarks[bookmarks.length-1].level == targetLevel ) {
          targetText += bookmarks[bookmarks.length-1].trackEvent.popcornOptions.text;
        }
      }
      return targetText;
    }

    function setTimeTooltip() {
      var targetText,
        targetTime = ( _timelineMousePos + _tracksContainer.element.scrollLeft ) / _tracksContainerWidth * _media.duration;
      
      targetText = util.toTimecode( targetTime, 0 );
      targetText += " " + getChapterTooltip( targetTime, 1 );
      targetText += " " + getChapterTooltip( targetTime, 2 );
      targetText += " " + getChapterTooltip( targetTime, 3 );
      /*targetText += " " + setLevelTooltip( targetTime, 1, targetText );
      targetText += " " + setLevelTooltip( targetTime, 2, targetText );
      targetText += " " + setLevelTooltip( targetTime, 3, targetText );*/

      _timeTooltip.innerHTML = targetText;

    }

    /*function setTocTooltip() {
      _tocTooltip.innerHTML = util.toTimecode( ( _toclineMousePos + _tracksContainer.element.scrollLeft ) / _tracksContainerWidth * _media.duration, 0 );
    }*/

    function onMouseOver( e ) {
      onTimelineMouseMove( e );
      //onToclineMouseMove( e );
      _timeTooltip.classList.add( "tooltip-no-transition-on" );
      //_tocTooltip.classList.add( "tooltip-no-transition-on" );

      parentElement.addEventListener( "mousemove", onTimelineMouseMove, false );
      parentElement.removeEventListener( "mouseover", onMouseOver, false );
      parentElement.addEventListener( "mouseout", onMouseOut, false );
    }

    function onMouseOut() {
      _timeTooltip.classList.remove( "tooltip-no-transition-on" );
      //_tocTooltip.classList.remove( "tooltip-no-transition-on" );

      parentElement.removeEventListener( "mousemove", onTimelineMouseMove, false );
      parentElement.removeEventListener( "mouseout", onMouseOut, false );
      parentElement.addEventListener( "mouseover", onMouseOver, false );
    }



    function onTocbarMouseOver( e ) {
      //onToclineMouseMove( e );
      //_timeTooltip.classList.add( "tooltip-no-transition-on" );

      //_tocContainer.addEventListener( "mousemove", onToclineMouseMove, false );
      _tocContainer.removeEventListener( "mouseover", onTocbarMouseOver, false );
      _tocContainer.addEventListener( "mouseout", onTocbarMouseOut, false );
    }

    function onTocbarMouseOut() {
      //_timeTooltip.classList.remove( "tooltip-no-transition-on" );

      //_tocContainer.removeEventListener( "mousemove", onToclineMouseMove, false );
      _tocContainer.removeEventListener( "mouseout", onTocbarMouseOut, false );
      _tocContainer.addEventListener( "mouseover", onTocbarMouseOver, false );
    }

    var onMouseDown = this.onMouseDown = function( e ) {
      var pos = e.pageX - _container.getBoundingClientRect().left;
      // Stop text selection in chrome.
      e.preventDefault();

      _isScrubbing = true;
      _isSeeking = true;
      _seekMouseUp = false;
      _media.listen( "mediaseeked", onSeeked );

      if( _isPlaying ){
        _media.pause();
      }

      _media.currentTime = ( pos + _tracksContainer.element.scrollLeft ) / _tracksContainerWidth * _media.duration;
      setNodePosition();
      setBookmarksPositions();
      _mouseDownPos = e.pageX - _node.offsetLeft;

      if ( _media.currentTime >= 0 ) {
        _timeTooltip.innerHTML = util.toTimecode( _media.currentTime, 0 );
      }
      _timeTooltip.classList.add( "tooltip-no-transition-on" );

      parentElement.removeEventListener( "mouseout", onMouseOut, false );
      parentElement.removeEventListener( "mousemove", onTimelineMouseMove, false );
      window.addEventListener( "mousemove", onMouseMove, false );
      window.addEventListener( "mouseup", onMouseUp, false );
    }; //onMouseDown

    parentElement.addEventListener( "mouseover", onMouseOver, false );
    _tocContainer.addEventListener( "mouseover", onTocbarMouseOver, false );

    this.update = function( containerWidth ) {
      _width = containerWidth || _width;
      _tracksContainerWidth = _tracksContainer.container.getBoundingClientRect().width;
      _rect = _container.getBoundingClientRect();
      _lineWidth = _line.clientWidth;
      setNodePosition();
      setBookmarksPositions();
    };

    this.enable = function() {
      _container.addEventListener( "mousedown", onMouseDown, false );
    };

    this.disable = function() {
      _container.removeEventListener( "mousedown", onMouseDown, false );
    };


    function onMediaTrackEventRemoved( e ) {
      var trackEvent = e.data,
        bookmark = $( trackEvent ).data("bookmark");

      if( bookmark ) {
        $( bookmark.div ).removeData("bookmark");
        bookmark.div.removeEventListener("mousedown", bookmarkMouseDown, false);   
        _tocContainer.removeChild(bookmark.div);
      }

      trackEvent.unlisten( "trackeventupdated", onChapterTrackEventUpdate );
      $( trackEvent ).removeData("bookmark");

      // Remove bookmark from list
      var index = _bookmarks.indexOf( bookmark );
      if( index > -1 ) {
        _bookmarks.splice(index, 1);
      }
    }


    _media.listen( "mediaplay", function() {
      _isPlaying = true;
    });

    _media.listen( "mediapause", function() {
      // scrubbing is for the mouseup and mousedown state.
      // seeking is the media's state.
      // these are not always the same.
      if( !_isScrubbing && !_isSeeking ){
        _isPlaying = false;
      }
    });

    _media.listen("chapteradded", function( butterEvent ) {
        addBookmark( butterEvent );
    });

    _media.listen( "trackeventremoved", onMediaTrackEventRemoved );

    _media.listen( "mediatimeupdate", setNodePosition );
    _media.listen( "mediatimeupdate", setBookmarksPositions );
  };
});
