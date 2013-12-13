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

        _createChapterBtn = _editorContainer.querySelector( ".butter-new-entry-link" ),
        _clearBtn = _editorContainer.querySelector( ".butter-clear-link" ),
        _renderBtn = _editorContainer.querySelector( ".butter-render-link" ),

        CHAPTER_ITEM = LangUtils.domFragment( LAYOUT_SRC, ".toc-item" ),
        CHAPTER_INTERVAL = 0.001,
        CHAPTER_MARK = 0.5, // only materialize a chapter
        CHAPTER_MIN_DURATION = 1,

        _butter = butter,
        _media = butter.currentMedia,
        _this,

        _tocTrackEvent,
        _tocOptions = {},
        _tocDisplayList = document.createElement( "ul" ),

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

    function onCreateChapterClick(event) {
      var level = 1,
        startTime = 0,
        endTime = _media.duration,
        newChapterItem;

      createChapterItem( _tocEditorList, level, startTime, endTime );
    }

    function onClearBtnClick(event) {
      clearEditorList();
    }

    function onCreateSubChapterClick(event) {
      var parentChapterItem = event.target.parentNode;
      var parentTrackEvent = $(parentChapterItem).data("trackEvent");
      
      var foundSubChapterList = $(event.target.parentNode).find("> ol"),
        subChapterList;

      if( foundSubChapterList.length==0 ) {
        subChapterList = document.createElement( "ol" );
        parentChapterItem.appendChild( subChapterList );
      }
      else {
        subChapterList = foundSubChapterList[0];
      }

      var level, startTime, endTime, newChapterItem;

      if( parentTrackEvent ) {
        level = parentTrackEvent.popcornOptions.level +1;
        startTime = parentTrackEvent.popcornOptions.start;
        //endTime = parentTrackEvent.popcornOptions.end;


        endTime = getEndTime( parentChapterItem );
        createChapterItem( subChapterList, level, startTime, endTime );
      }
    }

    function createChapterItem( chapterList, level, startTime, endTime, seqTrackEvent ) {
      var newChapterItem = CHAPTER_ITEM.cloneNode( true ),
        deleteBtn = newChapterItem.querySelector( ".toc-item-delete" ),
        createBtn = newChapterItem.querySelector( ".toc-item-create" ),
        label,
        startBox,
        endBox,
        chapterStart = startTime,
        chapterEnd = CHAPTER_MARK;

      deleteBtn.addEventListener( "click", onDeleteBtnClick, false );
      createBtn.addEventListener( "click", onCreateSubChapterClick, false );

      if( seqTrackEvent !== undefined ) {
        $(newChapterItem).data("seqTrackEvent", seqTrackEvent);
        label = seqTrackEvent.popcornOptions.title;

        startBox = new TimeBox(
          $(newChapterItem).find(".toc-item-time-start"),
          seqTrackEvent.popcornOptions.start
        );
        chapterStart = seqTrackEvent.popcornOptions.start;

        endBox = new TimeBox(
          $(newChapterItem).find(".toc-item-time-end"),
          seqTrackEvent.popcornOptions.end
        );

        chapterEnd = seqTrackEvent.popcornOptions.end;
        //TODO: set to seqTrackEvent.popcornOptions.start+CHAPTER_MARK
      }
      else {
        label = _count;
        _count++;

        var lastTrackEvent = _chapterTracks[level].getLastTrackEvent(),
          lastPopcornOptions,
          lastMiddleTime;

        // If an overlapping track event is detected,
        // split available time with the new track event
        if ( lastTrackEvent ) {
          lastPopcornOptions = lastTrackEvent.popcornOptions;
          lastMiddleTime = ( lastPopcornOptions.start + endTime )/2;

          //lastPopcornOptions.end = lastMiddleTime;
          chapterStart = lastMiddleTime;// + CHAPTER_INTERVAL;
          chapterEnd = chapterStart + CHAPTER_MARK;

          //if( chapterEnd - chapterStart < CHAPTER_MIN_DURATION ) {
          if( chapterEnd >= endTime ) {
            return;
          }

          lastTrackEvent.update( lastPopcornOptions );
          lastTrackEvent.view.update( lastPopcornOptions );
          updateChapterItem( lastTrackEvent );
        }
      }

      $(newChapterItem).find( ".dd3-content" ).first().text( label );
      
      _tocEditorDiv.classList.add("visible");
      _clearBtn.classList.add("visible");
      chapterList.appendChild( newChapterItem );

      createTrackEvent( newChapterItem, chapterStart, chapterEnd, label, level );
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
      if(nextChapterItems.length > 0) {
        var nextChapterItem = nextChapterItems[0],
          nextChapterTrackEvent = $(nextChapterItem).data("trackEvent");

        if( nextChapterTrackEvent ) {
          endDate = nextChapterTrackEvent.popcornOptions.start - CHAPTER_INTERVAL;
          return endDate;
        }
      }
      return _media.duration;
    }

    function onDeleteBtnClick(e) {
      var $tocEditorItem = $( e.target.parentNode ),
        trackEvent = $tocEditorItem.data("trackEvent");

      if( trackEvent !== undefined && trackEvent.track) {
        trackEvent.track.removeTrackEvent(trackEvent);
      }

      $tocEditorItem.removeData("trackEvent");
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
      _clearBtn.classList.remove("visible");
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
        popcornOptions.end   = TimeUtils.toSeconds( $element.find(".toc-item-time-end input").val() );
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
          tocListItemLink.setAttribute("data-trackevent-id", trackEvent.id);
          tocListItemLink.setAttribute("class", "toc-item-link");
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
          start = overlapMiddleTime + CHAPTER_INTERVAL;

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

    function createTrackEvent( item, start, end, text, level ) {
      var popcornOptions = {},
          $item = $(item),
          trackEvent,
          startBox,
          endBox;
          
      popcornOptions.start = start;
      popcornOptions.end   = end;
      popcornOptions.text  = text;
      popcornOptions.level = level;

      startBox = new TimeBox($item.find(".toc-item-time-start"));
      endBox = new TimeBox($item.find(".toc-item-time-end"));

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
              chapterStart = lastMiddleTime + CHAPTER_INTERVAL;

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
          var trackEvent = $(this).data("trackEvent");

          if( trackEvent !== undefined ) {
            // Add track event in the timeline
            trackEvent.track.removeTrackEvent( trackEvent );
          }
          removeChapterTrackEvent( this );
        });
      }
    }


    function createTocTrackEvent() {
      if( !_tocTrackEvent ) {
        _tocOptions.start = 0;
        _tocOptions.end = _media.duration;
        // Create a toc track event
        _tocTrackEvent = _butter.generateSafeTrackEvent( "toc", _tocOptions, _tocTrack );
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
        _clearBtn.classList.remove("visible");
      }
    }

    function createTracks() {
      _tocTrack = _media.addTrack();
      _tocTrack.name = "Table";

      _chapterTracks[1] = _media.addTrack();
      _chapterTracks[1].name = "Level 1";

      _chapterTracks[2] = _media.addTrack();
      _chapterTracks[2].name = "Level 2";

      _chapterTracks[3] = _media.addTrack();
      _chapterTracks[3].name = "Level 3";
    }

    function setup() {
      _createChapterBtn.addEventListener( "click", onCreateChapterClick, false);
      _clearBtn.addEventListener( "click", onClearBtnClick, false);
      _renderBtn.addEventListener( "click", render, false );

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
          if( trackEvent.type == "toc") {
            _tocTrackEvent = trackEvent;
            break;
          }
        }

        for(var j = 0; j < track.trackEvents.length; j++) {
          var trackEvent = track.trackEvents[j];
          if( trackEvent.type == "chapter" && trackEvent.popcornOptions.level===1) {
            firstLevelTrack = track;
          }
        }
      }

      if( !_tocTrackEvent ) {
        return;
      }

      // Prevent createTrack
      $(_tocEditorDiv).data("track", firstLevelTrack);

      // Editor list item generation is based on json list
      var jsonList = _tocTrackEvent.popcornOptions.jsonml;

      // Load editor to list
      loadChapterTrack( _tocEditorList, jsonList );

      // Workaround: render to enable dragging on toc
      //render();

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
            dragBtn = chapterItem.querySelector( ".toc-item-handle" ),
            contentDiv = chapterItem.querySelector( ".toc-item-content" ),
            deleteBtn = chapterItem.querySelector( ".toc-item-delete" ),
            trackEvent,
            trackEventId = tocItemLink[1]["data-trackevent-id"],
            trackEventStart = tocItemLink[1]["data-start"],
            trackEventEnd = tocItemLink[1]["data-end"];

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

          _tocEditorDiv.classList.add("visible");
          _clearBtn.classList.add("visible");

          var label = trackEvent.popcornOptions.text;
          $(chapterItem).find(".dd3-content").first().text( label );

          parentEditorList.appendChild( chapterItem );

          startBox = new TimeBox( $chapterItem.find(".toc-item-time-start") );
          endBox = new TimeBox( $chapterItem.find(".toc-item-time-end") );

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

        $('#toc-div').nestable({"maxDepth":3, "group":1});

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
