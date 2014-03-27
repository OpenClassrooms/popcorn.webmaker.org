{
    baseUrl: '.',
    paths: {
        // Core
        "popcorn.core": "../external/popcorn-js/popcorn",
        "popcorn.ie8": "../external/popcorn-js/ie8/popcorn.ie8",

        // Wrappers
        "popcorn._MediaElementProto": "../external/popcorn-js/wrappers/common/popcorn._MediaElementProto",
        "popcorn.HTMLMediaElement": "../external/popcorn-js/wrappers/html5/popcorn.HTMLMediaElement",
        "popcorn.HTMLNullVideoElement": "../external/popcorn-js/wrappers/null/popcorn.HTMLNullVideoElement",
        "popcorn.HTMLSoundCloudAudioElement": "../external/popcorn-js/wrappers/soundcloud/popcorn.HTMLSoundCloudAudioElement",
        "popcorn.HTMLVimeoVideoElement": "../external/popcorn-js/wrappers/vimeo/popcorn.HTMLVimeoVideoElement",
        "popcorn.HTMLYouTubeVideoElement": "../external/popcorn-js/wrappers/youtube/popcorn.HTMLYouTubeVideoElement",
        "popcorn.HTMLJWPlayerVideoElement": "../external/popcorn-js/wrappers/jwplayer/popcorn.HTMLJWPlayerVideoElement",

        // Players
        "popcorn.player": "../external/popcorn-js/modules/player/popcorn.player",
        "popcorn.youtube": "../external/popcorn-js/players/youtube/popcorn.youtube",
        "popcorn.vimeo": "../external/popcorn-js/players/vimeo/popcorn.vimeo",
        "popcorn.soundcloud": "../external/popcorn-js/players/soundcloud/popcorn.soundcloud",
        // Plugins
        "popcorn.googlemap": "../templates/assets/plugins/googlemap/popcorn.googlemap",
        "popcorn.image": "../templates/assets/plugins/image/popcorn.image",
        "popcorn.loopPlugin": "../templates/assets/plugins/loopPlugin/popcorn.loopPlugin",
        "popcorn.pausePlugin": "../templates/assets/plugins/pausePlugin/popcorn.pausePlugin",
        "popcorn.popup": "../templates/assets/plugins/popup/popcorn.popup",
        "popcorn.sequencer": "../templates/assets/plugins/sequencer/popcorn.sequencer",
        "popcorn.sketchfab": "../templates/assets/plugins/sketchfab/popcorn.sketchfab",
        "popcorn.skip": "../templates/assets/plugins/skip/popcorn.skip",
        "popcorn.text": "../templates/assets/plugins/text/popcorn.text",
        "popcorn.toc": "../templates/assets/plugins/toc/popcorn.toc",
        "popcorn.chapter": "../templates/assets/plugins/chapter/popcorn.chapter",
        "popcorn.wikipedia": "../templates/assets/plugins/wikipedia/popcorn.wikipedia",
        "popcorn.deprecated": "../src/util/deprecated",

        // RequireJS
        "text": "../external/require/text",
        "json": "../external/require/json",
        "l10n": "../external/require/l10n",
        "i18n": "../external/require/i18n",

        // Our other APIs
        "make-api": "../external/make-api",
        "sketchfab-iframe": "../external/sketchfab/sketchfab-iframe",
        "sso-include": "../external/sso-include",
        "localized": "../../bower_components/webmaker-i18n/localized"
    },
      // shim config defines dependencies between non-AMD modules, which is all of the Popcorn code
      shim: {
        // Core
        "popcorn.core": [ "popcorn.ie8" ],

        // Wrappers
        "popcorn._MediaElementProto": [ "popcorn.core" ],
        "popcorn.HTMLMediaElement": [ "popcorn.core" ],
        "popcorn.HTMLNullVideoElement": [ "popcorn.core", "popcorn._MediaElementProto" ],
        "popcorn.HTMLSoundCloudAudioElement": [ "popcorn.core", "popcorn._MediaElementProto" ],
        "popcorn.HTMLVimeoVideoElement": [ "popcorn.core", "popcorn._MediaElementProto" ],
        "popcorn.HTMLYouTubeVideoElement": [ "popcorn.core", "popcorn._MediaElementProto" ],
        "popcorn.HTMLJWPlayerVideoElement": [ "popcorn.core", "popcorn._MediaElementProto" ],

        // Players
        "popcorn.player": [ "popcorn.core" ],
        "popcorn.soundcloud": [ "popcorn.core", "popcorn.player", "popcorn.HTMLSoundCloudAudioElement" ],
        "popcorn.vimeo":  [ "popcorn.core", "popcorn.player", "popcorn.HTMLVimeoVideoElement" ],
        "popcorn.youtube":  [ "popcorn.core", "popcorn.player", "popcorn.HTMLYouTubeVideoElement" ],

        // Plugins
        "popcorn.googlemap": [ "popcorn.core" ],
        "popcorn.image": [ "popcorn.core" ],
        "popcorn.loopPlugin": [ "popcorn.core" ],
        "popcorn.pausePlugin": [ "popcorn.core" ],
        "popcorn.popup": [ "popcorn.core"],
        "popcorn.sequencer": [ "popcorn.core", "popcorn.player" ],
        "popcorn.skip": [ "popcorn.core" ],
        "popcorn.text": [ "popcorn.core" ],
        "popcorn.toc": [ "popcorn.core" ],
        "popcorn.chapter": [ "popcorn.core" ],
        "popcorn.wikipedia": [ "popcorn.core" ],
        "popcorn.sketchfab": [ "popcorn.core", "sketchfab-iframe" ],
        "popcorn.deprecated": [ "popcorn.core" ]
      },
    
    name: '../../node_modules/requirejs-middleware/almond',
    include: ['embed-bootstrap'],
    //optimize: 'none',

    locale: "fr-fr",
    out: 'embed-built.js',
    wrap: true
}