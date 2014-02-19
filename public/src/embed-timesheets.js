/* Copyright (c) 2014 Nicolas Hairon, INRIA <http://tyrex.inria.fr/>
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

/*
 * author      : Nicolas Hairon
 * contact     : nicolas.hairon@inria.fr
 * license     : MIT
 * version     : 0.4.1
 * last change : 2014-02-01
 */




  /**
   * Member: roundTime
   *
   * Rounds a number to a set accuracy
   * Accuracy of 5:
   * 1.012345 -> 1.01234
   * Accuracy of 2:
   * 1.012345 -> 1.01
   *
   * @param {Number} time: Time which will be rounded
   * @param {Number} accuracy: A one time accuracy to round to
   */
  function roundTime( time, accuracy ){
    accuracy = accuracy >= 0 ? accuracy : __timeAccuracy;
    return Math.round( time * ( Math.pow( 10, accuracy ) ) ) / Math.pow( 10, accuracy );
  }

  /**
   * Member: toSeconds
   *
   * toSeconds converts a timecode string to seconds.
   * "HH:MM:SS.DD" -> seconds
   * examples:
   * "1:00:00" -> 3600
   * "-1:00:00" -> -3600
   * it also converts strings with seconds to seconds
   * " 003600.00" -> 3600
   * " 003600.99" -> 3600.99
   *
   * @param {String} time: Timecode to be converted to seconds
   */
  function toSeconds( time ) {
    var splitTime,
        seconds,
        minutes,
        hours,
        isNegative = 1;

    if ( typeof time === "number" ) {
      return time;
    }

    if ( typeof time !== "string" ) {
      return 0;
    }

    time = time.trim();
    if ( time.substring( 0, 1 ) === "-" ) {
      time = time.replace( "-", "" );
      isNegative = -1;
    }

    splitTime = time.split( ":" );
    seconds = +splitTime[ splitTime.length - 1 ] || 0;
    minutes = +splitTime[ splitTime.length - 2 ] || 0;
    hours = +splitTime[ splitTime.length - 3 ] || 0;

    seconds += hours * 3600;
    seconds += minutes * 60;

    return seconds * isNegative;
  }

  /**
   * Member: toTimecode
   *
   * toTimecode converts seconds to a timecode string.
   * seconds -> "HH:MM:SS.DD"
   * examples:
   * 3600 -> "1:00:00"
   * -3600 -> "-1:00:00"
   * it also converts strings to timecode
   * "  00:00:01" -> "1"
   * "  000:01:01.00" -> "1:01"
   * "3600" -> "1:00:00"
   *
   * Accuracy of 5:
   * 1.012345 -> "0:01.01234"
   * Accuracy of 2:
   * 1.012345 -> "0:01.01"
   * Defaults to 2
   *
   * @param {Number} time: Seconds to be converted to timecode
   * @param {Number} accuracy: A one time accuracy to round to
   */
  function toTimecode( time, accuracy ){
    var hours,
        minutes,
        seconds,
        timeString,
        isNegative = "";

    if ( !accuracy && accuracy !== 0 ) {
      accuracy = 2;
    }

    if ( typeof time === "string" ) {
      time = toSeconds( time );
    }

    if ( typeof time !== "number" ) {
      return 0;
    }

    if ( time < 0 ) {
      isNegative = "-";
      time = -time;
    }

    time = roundTime( time, accuracy );
    hours = Math.floor( time / 3600 );
    minutes = Math.floor( ( time % 3600 ) / 60 );
    seconds = roundTime( time % 60, accuracy );
    timeString = seconds + "";

    if ( !minutes && !hours ) {
      if ( seconds < 10 ) {
        timeString = "0" + timeString;
      }
      return isNegative + "0:" + timeString;
    }

    if ( !seconds ) {
      timeString = ":00";
    } else if ( seconds < 10 ) {
      timeString = ":0" + seconds;
    } else {
      timeString = ":" + timeString;
    }

    if ( !minutes ) {
      timeString = "00" + timeString;
    } else if ( hours && minutes < 10 ) {
      timeString = "0" + minutes + timeString;
    } else {
      timeString = minutes + timeString;
    }

    if ( hours ) {
      timeString = hours + ":" + timeString;
    }

    return isNegative + timeString;
  }


var duration,
  tocTrackEvent,
  sequenceTrackEvents = [],
  clipData;

function initTimesheets() {

	if( popcornData == undefined ) {
		return;
	}

  tocTrackEvent = getTocTrackEvent();
  getSequenceTrackEvents();
  duration = getDuration( sequenceTrackEvents );
  clipData = getClipData();

	generateTocHTML( tocTrackEvent );
  generateSequences( sequenceTrackEvents );
  setDurationHTML( duration );

  var baseSequence = document.getElementById('talk');
  baseSequence.addEventListener('play', onBaseSequenceStateChanged);
  baseSequence.addEventListener('pause', onBaseSequenceStateChanged);
  baseSequence.addEventListener('playing', onBaseSequenceStateChanged);

}


function getTocTrackEvent() {
	var tocTrackEvent;
	$.each( popcornData.media, function(i, media) {
		$.each( media.tracks, function(j, track) {
			$.each( track.trackEvents, function(k, trackEvent) {
				if( trackEvent.type === "toc") {
					tocTrackEvent = trackEvent;
					return false;
				}
			})
		});
	});
	return tocTrackEvent;
}

function getSequenceTrackEvents() {
  $.each( popcornData.media, function(i, media) {
    $.each( media.tracks, function(j, track) {
      $.each( track.trackEvents, function(k, trackEvent) {
        if( trackEvent.type === "sequencer") {
          sequenceTrackEvents.push( trackEvent );
        }
      })
    });
  });
}

function getDuration( sequenceTrackEvents ) {
  var duration = 0;
  for (var i = 0; i <= sequenceTrackEvents.length - 1; i++) {
    duration += sequenceTrackEvents[i].popcornOptions.duration;
  }
  return duration;
}

function getClipData() {
  var clipData;
  $.each( popcornData.media, function(i, media) {
    clipData = media.clipData;
  });
  return clipData;
}

function getSequenceData( sequenceTrackEvent ) {
  // Get sequence source with butter id
  var sequenceSource = sequenceTrackEvent.popcornOptions.source;

  for (var clipSource in clipData) {
    if(clipData.hasOwnProperty( clipSource )) {
      // Test if sequence source contains clipSource to match
      if( sequenceSource.indexOf(clipSource) !== -1 ) {
        return clipData[ clipSource ];
        break;
      }
    }
  }
  return null;
}

function generateTocHTML( tocTrackEvent ) {
	var tocHTML = JsonML.toHTML( tocTrackEvent.popcornOptions.jsonml ),
		timecodesHTML = document.getElementById('timecodes');

	tocHTML.classList.add('smil-tocList');

	var i = 1;
	$( tocHTML ).find('li > a').each( function() {
		this.setAttribute('href', '#timecode'+ i);

    //$( this ).on('click', onChapterClick);

		var timecodeSpan = document.createElement('span');
		timecodeSpan.setAttribute('id', 'timecode'+i);
		timecodeSpan.setAttribute('data-begin', toTimecode(this.getAttribute('data-start'), 2));

		timecodesHTML.appendChild(timecodeSpan);
		++i;
	});

	$('.smil-toc').append( tocHTML );
}

/*function onChapterClick(e) {

  var ytPlayer = $("#sequences iframe[smil='active']").data('ytPlayer');
  ytPlayer.pauseVideo();
  ytPlayer.seekTo(0, true);
}*/

function generateSequences( sequenceTrackEvents ) {
  if(!sequenceTrackEvents) return;

  sequenceTrackEvents.forEach( function( sequenceTrackEvent ) {
    generateSequence( sequenceTrackEvent );
  });

}

function generateSequence( sequenceTrackEvent ) {
  if(!sequenceTrackEvent) return;
  var sequenceData = getSequenceData( sequenceTrackEvent );
  if(!sequenceData) return;

  var sequencesHTML = document.getElementById('sequences');

  if(sequenceData.type === 'YouTube') {
    var ytIFrame = document.createElement('iframe');
    ytIFrame.setAttribute('id', sequenceTrackEvent.id);
    ytIFrame.setAttribute('type', 'text/html');
    ytIFrame.setAttribute('width', '640');
    ytIFrame.setAttribute('height', '360');
    ytIFrame.setAttribute('begin', sequenceTrackEvent.popcornOptions.start+'s');
    //ytIFrame.setAttribute('enablejsapi', '1');
    ytIFrame.setAttribute('src',
      'http://www.youtube.com/embed/'+
      sequenceData.source.substring(31)+ // after 'http://www.youtube.com/watch?v='
      '?controls=0&enablejsapi=1&rel=0&showinfo=0'
      );
    ytIFrame.setAttribute('frameborder', '0');

    sequencesHTML.appendChild( ytIFrame );

    // Add event listener on iframe DOM node to detect when smil="active" is set
    $( ytIFrame ).watch('smil', function() {
      var smilState = $(this).attr('smil');
      var baseSequence = document.getElementById('talk');

      var ytPlayer = $(this).data('ytPlayer');

      if(!ytPlayer) return;

      if( smilState == "active" ) {
        ytPlayer.playVideo();
      }
      else if( smilState == "done" || smilState == "idle" ) {
        ytPlayer.stopVideo();
      }
    });

  }

}

function setDurationHTML( duration ) {
  if( duration==0 ) return;

  var sequencesHTML = document.getElementById('sequences');
  var timecodesHTML = document.getElementById('timecodes');

  sequencesHTML.setAttribute('data-dur', toTimecode(duration));
  timecodesHTML.setAttribute('data-dur', toTimecode(duration));
  
}

function onBaseSequenceStateChanged() {
  var baseSequence = document.getElementById('talk');

  // Get active video YT player object
  var ytPlayer = $("#sequences iframe[smil='active']").data('ytPlayer');

  if(!ytPlayer) return;

  if( baseSequence.paused ) {
    ytPlayer.pauseVideo();
  }
  else {
    ytPlayer.playVideo();
  }
}

document.addEventListener( "DOMContentLoaded", function() {
  initTimesheets();

}, false );