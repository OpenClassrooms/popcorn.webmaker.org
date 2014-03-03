/* This Source Code Form is subject to the terms of the MIT license
 * If a copy of the MIT license was not distributed with this file, you can
 * obtain one at https://raw.github.com/mozilla/butter/master/LICENSE */

define([ "localized", "editor/editor", "editor/base-editor",
          "l10n!/layouts/chapter-editor.html",
          "ui/widget/textbox", "ui/widget/tooltip",
          "util/lang", "util/keys", "util/time" ],
  function( Localized, Editor, BaseEditor, LAYOUT_SRC, TextboxWrapper, ToolTip, LangUtils, KeysUtils, TimeUtils ) {

  Editor.register( "chapter-editor", LAYOUT_SRC, function( rootElement, butter ) {

    var _rootElement = rootElement,
        _editorContainer = rootElement.querySelector( ".editor-container" ),
        _tocEditorDiv = rootElement.querySelector( "#toc-div" ),
        _tocEditorList = _editorContainer.querySelector( "#toc-ol" ),

        _createTableBtn = _editorContainer.querySelector( ".butter-create-table-link" ),
        _removeTableBtn = _editorContainer.querySelector( ".butter-remove-table-link" ),
        //_renderBtn = _editorContainer.querySelector( ".butter-render-link" ),

        CHAPTER_MAX_LEVEL = 3,
        CHAPTER_ITEM = LangUtils.domFragment( LAYOUT_SRC, ".toc-item" ),
        CHAPTER_INTERVAL = 0.001,
        TABLE_MARK = 0.001, // Arbitrary time to materialize a toc trackevent
        CHAPTER_MARK = 0.5, // Arbitrary time to materialize a chapter trackevent
        CHAPTER_MIN_DURATION = 1,
        CHAPTER_FLOAT_ACCURACY = 100000,

        _butter = butter,
        _media = butter.currentMedia,
        _this,

        _tocTrackEvent,
        _tocOptions = {},
        _tocPopcornOptions = {},
        _tocDisplayList = document.createElement( "ul" ),

        _mediaTrack,
        _tocTrack,
        _chapterTracks = [],

        _count = 1,
        _loaded = false,
        _rendering = false,
        _rendered = false;

    setup();

    function TimeBox( parentNode, newValue ){
      var _timeBox = $(parentNode).find("input").get(0),
          _oldValue = 0;

      if( newValue ) {
        setTime( newValue );
      }

      function setTime( time ){
        if( typeof( time ) === "string" || !isNaN( time ) ){
          try {
            time = TimeUtils.toSeconds( time );
          }
          catch( e ){
            _timeBox.value = _oldValue;
          } //try

          _timeBox.value = TimeUtils.toTimecode( time, 2 );
          if(_rendered) {
            updateTrackEvent( $(parentNode).parent().get(0) );
          }
        }
        else {
          _timeBox.value = _oldValue;
        } //if
      } //setTime

      _timeBox.addEventListener( "focus", function(){
        _oldValue = _timeBox.value;
      }, false );

      _timeBox.addEventListener( "blur", function(){
        if( _timeBox.value !== _oldValue ){
          setTime( _timeBox.value );
        } //if
      }, false );

      _timeBox.addEventListener( "keydown", function( e ){
        if( e.which === KeysUtils.ENTER ){
          _timeBox.blur();
        }
        else if( e.which === KeysUtils.ESCAPE ){
          _timeBox.value = _oldValue;
          _timeBox.blur();
        } //if
      }, false );
    }

    function onCreateTableBtnClick(event) {
      _createTableBtn.style.display = 'none';
      onCreateChapterClick(event);
    }

    function onCreateChapterClick(event) {
      var level = 1,
        startTime = 0,
        endTime = _media.duration;

      createChapterItem( _tocEditorList, level, startTime, endTime );
    }

    function onRemoveTableBtnClick(event) {
      clearEditorList();
      _createTableBtn.style.display = 'inline-block';
    }

    function onCreateSubChapterClick(event) {
      createSubChapterFor( event.target.parentNode );
    }

    function createSubChapterFor( chapterItem ) {
      var parentTrackEvent = $( chapterItem ).data("trackEvent");
      
      var foundSubChapterList = $( chapterItem ).find("> ol"),
        subChapterList;

      if( foundSubChapterList.length==0 ) {
        subChapterList = document.createElement( "ol" );
        chapterItem.appendChild( subChapterList );
      }
      else {
        subChapterList = foundSubChapterList[0];
      }

      var level, startTime, endTime;

      if( parentTrackEvent ) {
        level = parentTrackEvent.popcornOptions.level +1;

        if(level > CHAPTER_MAX_LEVEL) { return; }

        startTime = parentTrackEvent.popcornOptions.start;
        endTime = getEndTime( chapterItem );

        startTime = Math.round( startTime*CHAPTER_FLOAT_ACCURACY )/CHAPTER_FLOAT_ACCURACY;
        endTime = Math.round( endTime*CHAPTER_FLOAT_ACCURACY )/CHAPTER_FLOAT_ACCURACY;

        createChapterItem( subChapterList, level, startTime, endTime );
      }
    }

    function onCreateNextChapterClick(event) {
      var parentChapterItem = $( event.target.parentNode ).parents("li").get(0);
      createSubChapterFor( parentChapterItem );
    }

    function createChapterItem( chapterList, level, startTime, endTime, seqTrackEvent ) {
      var newChapterItem = CHAPTER_ITEM.cloneNode( true ),
        deleteBtn = newChapterItem.querySelector( ".toc-item-delete" ),
        createSubBtn = newChapterItem.querySelector( ".toc-item-handle" ),
        createBtn = newChapterItem.querySelector( ".toc-item-create" ),
        text,
        startBox,
        endBox,
        newPopcornOptions = {},
        chapterStart = startTime,
        chapterEnd = startTime + CHAPTER_MARK;

      newPopcornOptions.viewEndTime = endTime;

      deleteBtn.addEventListener( "click", onDeleteBtnClick, false );
      createSubBtn.addEventListener( "click", onCreateSubChapterClick, false );

      if( level === 1 ) {
        createBtn.addEventListener( "click", onCreateChapterClick, false );
      }
      else {
        createBtn.addEventListener( "click", onCreateNextChapterClick, false );        
      }

      if( seqTrackEvent !== undefined ) {
        $(newChapterItem).data("seqTrackEvent", seqTrackEvent);
        text = seqTrackEvent.popcornOptions.title;

        startBox = new TimeBox(
          $(newChapterItem).find(".toc-item-time-start"),
          seqTrackEvent.popcornOptions.start
        );
        chapterStart = seqTrackEvent.popcornOptions.start;
        newPopcornOptions.start = seqTrackEvent.popcornOptions.start;

        /*endBox = new TimeBox(
          $(newChapterItem).find(".toc-item-time-end"),
          seqTrackEvent.popcornOptions.end
        );*/

        chapterEnd = seqTrackEvent.popcornOptions.start + CHAPTER_MARK;
        newPopcornOptions.end = seqTrackEvent.popcornOptions.start + CHAPTER_MARK;
        newPopcornOptions.viewEndTime = seqTrackEvent.popcornOptions.end;
      }
      else {
        text = _count;

        _count++;

        // Find last chapter item in the chapters list
        // and divide time of the last one.
          var lastChapterItem = $(chapterList).find("li").last(),
            lastPopcornOptions,
            lastMiddleTime;

          if( lastChapterItem ) {
            var lastTrackEvent = lastChapterItem.data("trackEvent");

            if( lastTrackEvent ) {
              lastPopcornOptions = lastTrackEvent.popcornOptions;
              lastMiddleTime = (lastTrackEvent.popcornOptions.start + endTime )/2;
              
              chapterStart = lastMiddleTime;
              chapterEnd = chapterStart + CHAPTER_MARK;

              newPopcornOptions.start = lastMiddleTime;
              newPopcornOptions.end = lastMiddleTime + CHAPTER_MARK;

              if( level == 1 ) {
                newPopcornOptions.viewEndTime = lastTrackEvent.popcornOptions.viewEndTime;
              }
              else if( level >= 1 ) {
                newPopcornOptions.viewEndTime = endTime;
              }

              lastPopcornOptions.viewEndTime = lastMiddleTime - CHAPTER_INTERVAL;
              lastTrackEvent.update( lastPopcornOptions );
              lastTrackEvent.view.update( lastPopcornOptions );

            }

          }

        // If calculated chapter end is superior to allowed
        // chapter interval, prevent from creating it.
        if( chapterEnd >= endTime ) {
          return;
        }

      }

      var $content = $(newChapterItem).find( ".dd3-content" );
      $content.first().text( text );
      $content.attr("data-level", level)

      //$(newChapterItem).data("level", level);
      
      _tocEditorDiv.classList.add("visible");
      _removeTableBtn.classList.add("visible");
      chapterList.appendChild( newChapterItem );

      //chapterStart = Math.round( chapterStart*CHAPTER_FLOAT_ACCURACY )/CHAPTER_FLOAT_ACCURACY;
      //chapterEnd = Math.round( chapterEnd*CHAPTER_FLOAT_ACCURACY )/CHAPTER_FLOAT_ACCURACY;

      newPopcornOptions.start = Math.round( newPopcornOptions.start*CHAPTER_FLOAT_ACCURACY )/CHAPTER_FLOAT_ACCURACY;
      newPopcornOptions.end = Math.round( newPopcornOptions.end*CHAPTER_FLOAT_ACCURACY )/CHAPTER_FLOAT_ACCURACY;

      newPopcornOptions.text = text;
      newPopcornOptions.level = level;

      if( !_chapterTracks[level] ) {
        _chapterTracks[level] = _media.insertTrackBefore( _tocTrack );
      }

      createTrackEvent( newChapterItem, chapterStart, chapterEnd, text, level, newPopcornOptions.viewEndTime );
      render();

      return newChapterItem;
    }

    /**
     * The end date of a given chapter item is the start date of
     * he next one if any, the media duration if the given chapter item
     * is the last one.
     */
    function getEndTime( chapterItem ) {
      var nextChapterItems = $(chapterItem).next(),
        endDate;
      // If no sibling chapter item, get upper level chapter item
      if(nextChapterItems.length == 0) {
        nextChapterItems = $(chapterItem).parent().parent().next();
      }
      if( nextChapterItems.length > 0 ) {
        var nextChapterItem = nextChapterItems[0],
          nextChapterTrackEvent = $(nextChapterItem).data("trackEvent");

        if( nextChapterTrackEvent ) {
          endDate = nextChapterTrackEvent.popcornOptions.start;// - CHAPTER_INTERVAL;
          return endDate;
        }
      }
      return _media.duration;
    }

    /**
     * Get the very last chapter track event in the timeline.
     * Usefull to instert a new chapter track event in last position.
     */
    function getLastChapterTrackEvent() {
      var lastTrackEvents = [];

      if( _chapterTracks[1] ) lastTrackEvents[1] = _chapterTracks[1].getLastTrackEvent();
      if( _chapterTracks[2] ) lastTrackEvents[2] = _chapterTracks[2].getLastTrackEvent();
      if( _chapterTracks[3] ) lastTrackEvents[3] = _chapterTracks[3].getLastTrackEvent();

      var lastTrackEventStartTime = 0,
        lastTrackEvent;
      for(var i = 1; i <= _chapterTracks.length; i++) {
        if( lastTrackEvents[i] &&
          lastTrackEvents[i].popcornOptions.start > lastTrackEventStartTime ) {
          lastTrackEvent = lastTrackEvents[i];
          lastTrackEventStartTime = lastTrackEvent.popcornOptions.start;          
        }
      }

      return lastTrackEvent;
    }

    function onDeleteBtnClick(e) {
      var $tocEditorItem = $( e.target.parentNode ),
        trackEvent = $tocEditorItem.data("trackEvent");

      // Remove sub chapter track events
      removeChapterTrackEvent( e.target.parentNode );

      if( trackEvent !== undefined && trackEvent.track) {
        trackEvent.track.removeTrackEvent(trackEvent);
      }

      /*$tocEditorItem.find(">li").each(function() {
        var trackEvent = $(this).data("trackEvent");
      });*/


      // Remove chapter track event
      $tocEditorItem.removeData("trackEvent");



      // Remove chapter editor elements
      $tocEditorItem.remove();
    }

    function createChapterFromSequence( seqTrackEvent ) {
      var chapterItem = getChapterItem( seqTrackEvent, "seqTrackEvent" );
      if( chapterItem ) {
        return;
      }
      createChapterItem( _tocEditorList, 1, 0, _media.duration, seqTrackEvent );
    }

    function clearEditorList() {
      var editorList = document.getElementById("toc-ol");

      // Recursively remove track events
      removeChapterTrackEvent( _tocEditorDiv );

      editorList.innerHTML = '';
      _tocEditorDiv.classList.remove("visible");
      _removeTableBtn.classList.remove("visible");
    }

    /*
     * Method getChapterItem
     *
     * @param {Object} trackEvent: The trackEvent object from which we try to find related editor element.
     */
    function getChapterItem( trackEvent, dataKey ) {
      var element,
          chapterItems = $(_tocEditorDiv).find("li");

      dataKey = dataKey || "trackEvent";

      chapterItems.each(function() {
        var itemTrackEvent = $(this).data( dataKey );

//var id1 = itemTrackEvent.popcornOptions;
//var id2 = trackEvent.popcornOptions;

        if( itemTrackEvent == trackEvent ) {
          element = this;
        }
      });
      return element;
    }

    function updateChapterItem( trackEvent ) {
      var chapterItem = getChapterItem( trackEvent );
      if( chapterItem ) {
        var $element = $(chapterItem),
            popcornOptions = trackEvent.popcornOptions;
        $element.find( ".dd3-content" ).first().text(popcornOptions.text);
        $element.find( ".toc-item-time-start input" ).first().val( TimeUtils.toTimecode(popcornOptions.start, 2) ) ;
        $element.find( ".toc-item-time-end input" ).first().val( TimeUtils.toTimecode(popcornOptions.end, 2) ) ;
        updateToc();
      }
    }

    /*function updateChapterItemBySequence( seqTrackEvent ) {
      var chapterItem = getChapterItem( seqTrackEvent );
      if( chapterItem ) {
        var $element = $(chapterItem),
            popcornOptions = seqTrackEvent.popcornOptions;
        $element.find( ".dd3-content" ).first().text(popcornOptions.title);
        $element.find( ".toc-item-time-start input" ).first().val( TimeUtils.toTimecode(popcornOptions.start) ) ;
        $element.find( ".toc-item-time-end input" ).first().val( TimeUtils.toTimecode(popcornOptions.end) ) ;
      }
      updateToc();
    }*/

    function updateTrackEvent( element ) {
      var popcornOptions = {},
          $element = $(element),
          trackEvent;

      trackEvent = $element.data("trackEvent");

      if( trackEvent !== undefined ) {
        popcornOptions.start = TimeUtils.toSeconds( $element.find(".toc-item-time-start input").val() );
        popcornOptions.end   = popcornOptions.start + CHAPTER_MARK;
        popcornOptions.text  = $element.find(".toc-item-content:first").text();
        popcornOptions.level = ($element.parentsUntil("#toc-ol").length)/2+1;
        trackEvent.update( popcornOptions, true );
        updateToc();
      }
    }

    function updateToc() {
      if( !_rendering ) {
        clearTocDisplayList();
        updateTocDisplayList();
        updateTocTrackEvent();
      }
    }

    function updateTocDisplayList(editorList, displayList) {
      if(!editorList) { editorList = _tocEditorDiv; }
      if(!displayList) { displayList = _tocDisplayList; }

      var subListItems = $(editorList).find("> ol > li");

      if( subListItems.length>0 ) {
        subListItems.each(function() {
          var text = $(this).find( ".dd3-content" ).first().text(),
              trackEvent = $(this).data("trackEvent"),
              childDisplayList = document.createElement( "ul" ),
              tocListItem = document.createElement( "li" ),
              tocListItemLink = document.createElement( "a" );

          if(!trackEvent) {
            return;
          }

          // Create list item to display
          tocListItemLink.setAttribute("href", "#");
          tocListItemLink.setAttribute("data-start", trackEvent.popcornOptions.start);
          tocListItemLink.setAttribute("data-end", trackEvent.popcornOptions.end);
          tocListItemLink.setAttribute("data-level", trackEvent.popcornOptions.level);
          tocListItemLink.setAttribute("data-view-end-time", trackEvent.popcornOptions.viewEndTime);
          tocListItemLink.setAttribute("data-trackevent-id", trackEvent.id);
          //tocListItemLink.setAttribute("class", "toc-item-link");
          tocListItemLink.innerHTML = text;

          //$( tocListItemLink ).removeData("trackEvent");
          //$( tocListItemLink ).data("trackEvent", trackEvent);

          /*tocListItemLink.removeEventListener("click");
          tocListItemLink.addEventListener("click", function(e) {
            var thestart = $(e.target).data("trackEvent").popcornOptions.start;
              _media.currentTime = thestart;
          });*/

          tocListItem.appendChild(tocListItemLink);
          tocListItem.appendChild(childDisplayList);

          displayList.appendChild(tocListItem);

          updateTocDisplayList(this, childDisplayList);

        });
      }
      else {
        if(displayList.parentNode) {
          displayList.parentNode.removeChild( displayList );

        }
      }
    }

    function generateSafeChapterTrackEvent( popcornOptions, track ) {
        var trackEvent,
            start = popcornOptions.start,
            end = popcornOptions.end,
            overlapTrackEvent,
            overlapPopcornOptions,
            overlapMiddleTime;

        /*if ( start + _butter.defaultTrackeventDuration > _media.duration ) {
          start = _media.duration - _butter.defaultTrackeventDuration;
        }*/

        if ( start < 0 ) {
          start = 0;
        }

        if ( !end && end !== 0 ) {
          end = start + CHAPTER_MIN_DURATION;
        }

        if ( end > _media.duration ) {
          end = _media.duration;
        }

        if ( !_butter.defaultTarget ) {
          console.warn( "No targets to drop events!" );
          return;
        }

        track = track || _media.addTrack();

        overlapTrackEvent = track.findOverlappingTrackEvent( start, end );

        // If an overlapping track event is detected,
        // split available time with the new track event
        if ( overlapTrackEvent ) {
          overlapPopcornOptions = overlapTrackEvent.popcornOptions;
          overlapMiddleTime = ( overlapPopcornOptions.start + end )/2;

          overlapPopcornOptions.end = overlapMiddleTime;
          start = overlapMiddleTime;// + CHAPTER_INTERVAL;

          overlapTrackEvent.update( overlapPopcornOptions );
          overlapTrackEvent.view.update( overlapPopcornOptions );
          updateChapterItem( overlapTrackEvent );
        }

        popcornOptions.start = start;
        popcornOptions.end = end;
        popcornOptions.target = _butter.defaultTarget.elementID;

        trackEvent = track.addTrackEvent({
          popcornOptions: popcornOptions,
          type: "chapter"
        });

        _media.dispatch("chapteradded", trackEvent);

        _butter.deselectAllTrackEvents();
        trackEvent.selected = true;

        return trackEvent;
    }

    function createTrackEvent( item, start, end, text, level, viewEndTime ) {
      var popcornOptions = {},
          $item = $(item),
          trackEvent,
          startBox,
          endBox;
          
      popcornOptions.start = start;
      popcornOptions.end   = end;
      popcornOptions.text  = text;
      popcornOptions.level = level;
      popcornOptions.viewEndTime = viewEndTime;

      startBox = new TimeBox($item.find(".toc-item-time-start"));
      //endBox = new TimeBox($item.find(".toc-item-time-end"));

      trackEvent = generateSafeChapterTrackEvent( popcornOptions, _chapterTracks[level] );

      // Listen to updates on track event
      //trackEvent.listen( "trackeventadded", onTrackEventAdded );
      trackEvent.listen( "trackeventupdated", onTrackEventUpdated );

      // Save track event associated to chapter item
      $( item ).data( "trackEvent", trackEvent );

      // Update start and end time in chapter item inputs
      updateChapterItem( trackEvent );

      return trackEvent;
    }

    function onTrackEventDragStarted( e ) {
      var trackEvent = e.target;
    }

    function onSequenceTrackEventAdded( e ) {
      var seqTrackEvent = e.data;
      if( seqTrackEvent ) {
        createChapterFromSequence( seqTrackEvent );
      }
    }

    function onSequenceTrackAdded( e ) {
      render();
    }

    /*function onTrackEventAdded( e ) {
      var trackEvent = e.target;
    }*/

    function onTrackEventUpdated( e ) {
      var trackEvent = e.target;
      updateChapterItem( trackEvent );
    }

    function onMediaTrackEventRemoved( e ) {
      var trackEvent = e.data,
          chapterItem;

      chapterItem = getChapterItem( trackEvent );

      // If track event is beeing draged or resized, don't allow deletion
      if( trackEvent.selected || trackEvent.dragging || trackEvent.resizing ) {
        return;
      }

      if( chapterItem ) {
        removeChapterItem( chapterItem );
        render();
      }
    }

    function createChaptersFrom(editorList, level, start, duration) {//, parentTrack) {
      var subListItems = $(editorList).find("> ol > li");

      if( subListItems.length>0 ) {
        // Calculate default start and end dates
        var chapterStart = start,
          chapterStep = duration/subListItems.length,
          chapterEnd = start+chapterStep,
          lastTrackEvent,
          lastPopcornOptions,
          lastMiddleTime;/*,
          levelTrack = $(editorList).data("track");

        if( levelTrack === undefined ) {
          levelTrack = _media.insertTrackAfter( parentTrack );
          $(editorList).data("track", levelTrack);
        }*/



        subListItems.each(function() {
          var text = $(this).find( ".dd3-content" ).first().text(),
              trackEvent = $(this).data("trackEvent"),
              seqTrackEvent = $(this).data("seqTrackEvent");

          // If time data from a sequence track event, get it
          if( seqTrackEvent ) {
            chapterStart = seqTrackEvent.popcornOptions.start;
            chapterEnd = seqTrackEvent.popcornOptions.end;
            //text = seqTrackEvent.popcornOptions.title;
          }        

          // If not already in the timeline, insert a chapter track event
          // by splitting the last chapter track event of the track
          if( trackEvent === undefined ) {
            var lastTrackEvent = _chapterTracks[level].getLastTrackEvent();

            // If an overlapping track event is detected,
            // split available time with the new track event
            if ( lastTrackEvent ) {
              lastPopcornOptions = lastTrackEvent.popcornOptions;
              lastMiddleTime = ( lastPopcornOptions.start + end )/2;

              lastPopcornOptions.end = lastMiddleTime;
              chapterStart = lastMiddleTime;// + CHAPTER_INTERVAL;

              lastTrackEvent.update( lastPopcornOptions );
              lastTrackEvent.view.update( lastPopcornOptions );
              updateChapterItem( lastTrackEvent );
            }

            trackEvent = createTrackEvent( this, chapterStart, chapterEnd, text, level );
          }
          // Else, update existing track event with latest data from chapter item
          else {
            updateTrackEvent( this );
          }

          // Restart with all next level chapter items
          createChaptersFrom(this, level+1, chapterStart, chapterStep);

          chapterStart = chapterEnd;
          chapterEnd = chapterStart + chapterStep;

        });
      }
    }

    function removeChapterTrackEvent(editorList) {
      var tocList = $(editorList).find("> ol > li");

      if( tocList.length>0 ) {
        tocList.each(function() {
          removeChapterTrackEvent( this );
          var trackEvent = $(this).data("trackEvent");

          if( trackEvent !== undefined ) {
            trackEvent.track.removeTrackEvent( trackEvent );
          }
        });
      }
    }

    /**
     * Update toc track event when media duration changed.
     */
    function onMediaDurationChanged( e ) {
      if( _tocTrackEvent ) {
        _tocOptions.start = 0;
        _tocOptions.end = _media.duration;
        _tocTrackEvent.update( _tocOptions );
        _tocTrackEvent.view.update( _tocOptions );
      }

      //var lastChapterTrackEvents = getLastChapterTrackEvent();

      for(var i = 1; i <= _chapterTracks.length; i++) {
        if (!_chapterTracks[i]) continue;

        var lastTrackEvent = _chapterTracks[i].getLastTrackEvent();
        lastTrackEvent.popcornOptions.viewEndTime = _media.duration;
        lastTrackEvent.update( lastTrackEvent.popcornOptions );
        lastTrackEvent.view.update( lastTrackEvent.popcornOptions );
      }
    }

    function createTocTrackEvent() {
      if( !_tocTrackEvent ) {
        _tocPopcornOptions.start = 0;
        _tocPopcornOptions.end = _media.duration;
        _tocOptions.popcornOptions = _tocPopcornOptions;
        _tocOptions.type = "toc";
        _tocOptions.track = _tocTrack;
        // Create a toc track event
        _tocTrackEvent = _butter.generateSafeTrackEvent( _tocOptions );
      }
    }

    function clearTocDisplayList() {
      _tocDisplayList.innerHTML = '';
    }

    function updateTocTrackEvent() {
      if( _tocTrackEvent ) {
        var updateOptions = {},
          jsonml = JsonML.fromHTML( _tocDisplayList );

        updateOptions.jsonml = jsonml;
        _tocTrackEvent.update( updateOptions );
      }
    }

    function render() {
      _rendering = true;
      _rendered = false;
      clearTocDisplayList();
      createTocTrackEvent();
      //createChaptersFrom( _tocEditorDiv, 1, 0, _butter.duration);
      updateTocDisplayList( _tocEditorDiv, _tocDisplayList );
      updateTocTrackEvent();
      _rendering = false;
      _rendered = true;
    }

    function removeChapterItem( element ) {
      var $element = $( element );
      $element.removeData("trackEvent");
      $element.remove();

      if($(_tocEditorList).children().length==0) {
        _tocEditorDiv.classList.remove("visible");
        _removeTableBtn.classList.remove("visible");
      }
    }

    function createTracks() {
      // Search for an existing track containing toc track event
      var tocFound = _media.findTrackWithTocTrackEvent(),
        mediaTrackFound = _media.findTrackWithSequencerTrackEvents();

      if( mediaTrackFound ) {
        _mediaTrack = mediaTrackFound.track;
      }
      else {
        _mediaTrack = _media.addTrack(null, true);        
      }

      if( tocFound ) {
        _tocTrack = tocFound.track;
      }
      else {
        // Create a new track dedicated to track event        
        _tocTrack = _media.insertTrackAfter(_mediaTrack, null, false);
      }

    }

    function setup() {
      _createTableBtn.addEventListener( "click", onCreateTableBtnClick, false);
      _removeTableBtn.addEventListener( "click", onRemoveTableBtnClick, false);
      //_renderBtn.addEventListener( "click", render, false );

      _media.listen( "trackeventremoved", onMediaTrackEventRemoved );
      _media.listen( "sequencetrackadded", onSequenceTrackAdded );
      _media.listen( "sequencetrackeventadded", onSequenceTrackEventAdded );

      _tocDisplayList.classList.add('toc-list');

      createTracks();

      if( !_loaded ) {
        loadTracks();
      }
    }


    function updateTrackEventsAfterLoading(editorList) {
      // Update track events
      var tocList = $(editorList).find("> ol > li");

      if( tocList.length>0 ) {

        for(var j = 0; j < tocList.length; j++) {
          var trackEvent = $( tocList[j] ).data("trackEvent");

          if( trackEvent !== undefined ) {
            trackEvent.update();
          }
          updateTrackEventsAfterLoading( tocList[j] );
        }
      }

      updateToc();

    }

    function loadTracks() {
      var tracks = _media.tracks,
        firstLevelTrack;

      for(var i = 0; i < _media.tracks.length; i++) {
        var track = tracks[i];

        for(var j = 0; j < track.trackEvents.length; j++) {
          var trackEvent = track.trackEvents[j];
          if( trackEvent.type === "toc") {
            _tocTrackEvent = trackEvent;
            break;
          }
        }

        for(var j = 0; j < track.trackEvents.length; j++) {
          var trackEvent = track.trackEvents[j];
          if( trackEvent.type === "chapter" && trackEvent.popcornOptions.level === 1) {
            firstLevelTrack = track;
            _chapterTracks[1] = firstLevelTrack;
          }
          if( trackEvent.type === "chapter" && trackEvent.popcornOptions.level === 2) {
            _chapterTracks[2] = track;
          }
          if( trackEvent.type === "chapter" && trackEvent.popcornOptions.level === 3) {
            _chapterTracks[3] = track;
          }
        }
      }

      if( !_tocTrackEvent ) {
        return;
      }

      // Prevent createTrack
      //$(_tocEditorDiv).data("track", firstLevelTrack);

      // Editor list item generation is based on json list
      var jsonList = _tocTrackEvent.popcornOptions.jsonml;

      // Load editor to list
      loadChapterTrack( _tocEditorList, jsonList );

      // Workaround: render to enable dragging on toc
      //render();

      _createTableBtn.style.display = 'none';
      _loaded = true;
    }

    function loadChapterTrack( parentEditorList, jsonList ) {
      for(var k = 0; k < jsonList.length; k++) {
        var item = jsonList[k];

        if( 'string' === typeof item) {
          continue;
        }

        if(!(item instanceof Array)) {
          continue;
        }
        
        var tocItemLink = item[1],
          tocItemSubList = item[2];

        // Create editor toc item
        if( tocItemLink[0] == "A") {
          var chapterItem = CHAPTER_ITEM.cloneNode( true ),
            $chapterItem = $(chapterItem),
            contentDiv = chapterItem.querySelector( ".toc-item-content" ),
            deleteBtn = chapterItem.querySelector( ".toc-item-delete" ),
            createSubBtn = chapterItem.querySelector( ".toc-item-handle" ),
            createBtn = chapterItem.querySelector( ".toc-item-create" ),
            trackEvent,
            trackEventId = tocItemLink[1]["data-trackevent-id"],
            trackEventStart = tocItemLink[1]["data-start"],
            trackEventEnd = tocItemLink[1]["data-end"],
            trackEventLevel = tocItemLink[1]["data-level"];

          // If no link to track event, move to next item
          if( !trackEventId ) {
            continue;
          }

          //var result = _media.findTrackWithTrackEventId( trackEventId );
          var result = _media.findTrackEventByTime( trackEventStart, trackEventEnd );
          if( result !== undefined ) {
            trackEvent = result.trackEvent;
          }
          else {
            continue;
          }

          deleteBtn.addEventListener( "click", onDeleteBtnClick, false );
          createSubBtn.addEventListener( "click", onCreateSubChapterClick, false );

          if( trackEventLevel === "1" ) {
            createBtn.addEventListener( "click", onCreateChapterClick, false );
          }
          else {
            createBtn.addEventListener( "click", onCreateNextChapterClick, false );        
          }

          _tocEditorDiv.classList.add("visible");
          _removeTableBtn.classList.add("visible");

          var label = trackEvent.popcornOptions.text;
          $(chapterItem).find(".dd3-content").first().text( label );

          parentEditorList.appendChild( chapterItem );

          startBox = new TimeBox( $chapterItem.find(".toc-item-time-start") );
          //endBox = new TimeBox( $chapterItem.find(".toc-item-time-end") );

          // Dispatch this event to create a chapter mark in timeline
          _media.dispatch("chapteradded", trackEvent);

          // Listen to updates on track event
          trackEvent.listen( "trackeventupdated", onTrackEventUpdated );

          // Save trackevent associated to editor element
          $( chapterItem ).data( "trackEvent", trackEvent );

          updateChapterItem( trackEvent );
          //trackEvent.dispatch( "trackeventupdated", trackEvent );
          //updateTrackEvent( chapterItem );
          
          if( tocItemSubList !== undefined) {
            var childEditorList = document.createElement( "ol" );
            chapterItem.appendChild( childEditorList );

            loadChapterTrack( childEditorList, tocItemSubList );
          }

        }
      }
    }

    Editor.BaseEditor.extend( this, butter, rootElement, {
      open: function() {
        _butter = butter;
        _media = butter.currentMedia;
        _this = this;

        _createTableBtn.classList.add("visible");
        _media.listen("mediadurationchanged", onMediaDurationChanged );

        // Nestable table of contents now de-activated
        //$('#toc-div').nestable({"maxDepth":CHAPTER_MAX_LEVEL, "group":1});

        $('#toc-div').on('keypress', '.toc-item-content[contenteditable]',
        function(event) {
            if(event.keyCode === KeysUtils.ENTER) {
              event.preventDefault();
              var $this = $(this),
                  $nextDiv = $this.parent().next().children(".dd3-content");

              //if(_rendered) {
                updateTrackEvent( $this.parent() );
                //render();
              //}
              if( $nextDiv.length > 0 ) {
                $( $nextDiv[0] ).focus();
              }

            }
        });

      },
      close: function() {
      }
    });
  }, true );
});
