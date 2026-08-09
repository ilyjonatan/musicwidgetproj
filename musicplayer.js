/* ==================================================
   URL SETTINGS
================================================== */

const params =
    new URLSearchParams(
        window.location.search
    );


const LASTFM_USERNAME =
    params.get('user') ||
    params.get('username');


const UPDATE_INTERVAL =
    5000;


/* ==================================================
   CUSTOMIZATION STATE
================================================== */

const widgetSettings = {

    showArt:
        params.get('art') !== '0',

    showStatus:
        params.get('status') !== '0',

    opacity:
        clampNumber(
            Number(
                params.get('opacity') || 92
            ),
            0,
            100
        ),

    bg:
        normalizeHex(
            params.get('bg'),
            '14141c'
        ),

    accent:
        normalizeHex(
            params.get('accent'),
            'ffffff'
        )
};


/* ==================================================
   ELEMENTS
================================================== */

const widget =
    document.getElementById(
        'widget'
    );

const albumContainer =
    document.getElementById(
        'album-container'
    );

const albumArt =
    document.getElementById(
        'album-art'
    );

const songTitle =
    document.getElementById(
        'song-title'
    );

const artistName =
    document.getElementById(
        'artist-name'
    );

const status =
    document.getElementById(
        'status'
    );

const statusText =
    document.getElementById(
        'status-text'
    );

const musicIndicator =
    document.getElementById(
        'music-indicator'
    );


/* ==================================================
   CURRENT PLAYBACK STATE
================================================== */

let currentlyPlaying =
    false;

let currentArtworkURL =
    '';


/* ==================================================
   HELPERS
================================================== */

function clampNumber(
    value,
    min,
    max
) {

    if (!Number.isFinite(value)) {
        return min;
    }


    return Math.min(
        max,
        Math.max(
            min,
            value
        )
    );
}


function isValidHexColor(
    value
) {

    return (
        typeof value ===
            'string' &&
        /^[0-9a-fA-F]{6}$/.test(
            value
        )
    );
}


function normalizeHex(
    value,
    fallback
) {

    if (
        isValidHexColor(
            value
        )
    ) {

        return value
            .toLowerCase();
    }


    return fallback;
}


function hexToRgb(
    hex
) {

    return {

        r:
            parseInt(
                hex.slice(
                    0,
                    2
                ),
                16
            ),

        g:
            parseInt(
                hex.slice(
                    2,
                    4
                ),
                16
            ),

        b:
            parseInt(
                hex.slice(
                    4,
                    6
                ),
                16
            )
    };
}


/* ==================================================
   APPLY CUSTOMIZATION
================================================== */

function applyCustomization() {

    const bg =
        hexToRgb(
            widgetSettings.bg
        );


    const alpha =
        widgetSettings.opacity /
        100;


    widget.style.background =
        `rgba(${bg.r}, ${bg.g}, ${bg.b}, ${alpha})`;


    const accent =
        `#${widgetSettings.accent}`;


    songTitle.style.color =
        accent;


    status.style.color =
        accent;


    musicIndicator.style.background =
        accent;


    document.documentElement.style
        .setProperty(
            '--accent-color',
            accent
        );


    /*
     * Status visibility
     */

    status.style.display =
        widgetSettings.showStatus
            ? ''
            : 'none';


    /*
     * Album artwork visibility.
     *
     * Only show it if:
     * - user enabled artwork
     * - something is currently playing
     * - we have artwork
     */

    if (
        widgetSettings.showArt &&
        currentlyPlaying &&
        currentArtworkURL
    ) {

        albumContainer.style.display =
            'block';

    } else {

        albumContainer.style.display =
            'none';
    }
}


/* ==================================================
   LIVE SETTINGS FROM GENERATOR
================================================== */

function applyLiveSettings(
    settings
) {

    if (
        !settings ||
        typeof settings !==
            'object'
    ) {
        return;
    }


    if (
        typeof settings.art ===
        'boolean'
    ) {

        widgetSettings.showArt =
            settings.art;
    }


    if (
        typeof settings.status ===
        'boolean'
    ) {

        widgetSettings.showStatus =
            settings.status;
    }


    if (
        Number.isFinite(
            Number(
                settings.opacity
            )
        )
    ) {

        widgetSettings.opacity =
            clampNumber(
                Number(
                    settings.opacity
                ),
                0,
                100
            );
    }


    if (
        isValidHexColor(
            settings.bg
        )
    ) {

        widgetSettings.bg =
            settings.bg.toLowerCase();
    }


    if (
        isValidHexColor(
            settings.accent
        )
    ) {

        widgetSettings.accent =
            settings.accent
                .toLowerCase();
    }


    applyCustomization();
}


/* ==================================================
   POSTMESSAGE LISTENER
================================================== */

window.addEventListener(
    'message',
    function (event) {

        /*
         * Only accept messages from
         * the same website.
         */

        if (
            event.origin !==
            window.location.origin
        ) {

            return;
        }


        if (
            !event.data ||
            event.data.type !==
                'widget-settings'
        ) {

            return;
        }


        applyLiveSettings(
            event.data.settings
        );
    }
);


/* ==================================================
   SHOW PLAYING
================================================== */

function showPlaying(
    track
) {

    currentlyPlaying =
        true;


    const title =
        track.name ||
        'Unknown Track';


    const artist =
        track.artist &&
        track.artist['#text']
            ? track.artist['#text']
            : 'Unknown Artist';


    songTitle.textContent =
        title;


    artistName.textContent =
        artist;


    currentArtworkURL =
        '';


    if (
        track.image &&
        Array.isArray(
            track.image
        )
    ) {

        const imageSizes = [
            'extralarge',
            'large',
            'medium',
            'small'
        ];


        for (
            const size
            of imageSizes
        ) {

            const image =
                track.image.find(
                    img =>
                        img.size ===
                        size
                );


            if (
                image &&
                image['#text']
            ) {

                currentArtworkURL =
                    image['#text'];

                break;
            }
        }
    }


    if (
        currentArtworkURL
    ) {

        albumArt.classList.add(
            'loading'
        );


        const newImage =
            new Image();


        newImage.onload =
            function () {

                albumArt.src =
                    currentArtworkURL;


                albumArt.classList.remove(
                    'loading'
                );


                applyCustomization();
            };


        newImage.onerror =
            function () {

                currentArtworkURL =
                    '';


                albumArt.removeAttribute(
                    'src'
                );


                albumArt.classList.remove(
                    'loading'
                );


                applyCustomization();
            };


        newImage.src =
            currentArtworkURL;

    } else {

        albumArt.removeAttribute(
            'src'
        );
    }


    widget.classList.remove(
        'idle'
    );


    status.classList.add(
        'playing'
    );


    statusText.textContent =
        'NOW PLAYING';


    musicIndicator.classList.remove(
        'idle'
    );


    musicIndicator.classList.add(
        'playing'
    );


    applyCustomization();
}


/* ==================================================
   SHOW NOTHING PLAYING
================================================== */

function showNothingPlaying() {

    currentlyPlaying =
        false;


    currentArtworkURL =
        '';


    songTitle.textContent =
        'Nothing Playing';


    artistName.textContent =
        'No active Last.fm scrobble';


    albumArt.removeAttribute(
        'src'
    );


    widget.classList.add(
        'idle'
    );


    status.classList.remove(
        'playing'
    );


    statusText.textContent =
        'NOT PLAYING';


    musicIndicator.classList.remove(
        'playing'
    );


    musicIndicator.classList.add(
        'idle'
    );


    applyCustomization();
}


/* ==================================================
   SHOW ERROR
================================================== */

function showError(
    message =
        'Unable to connect to Last.fm'
) {

    currentlyPlaying =
        false;


    currentArtworkURL =
        '';


    songTitle.textContent =
        'Last.fm Error';


    artistName.textContent =
        message;


    albumArt.removeAttribute(
        'src'
    );


    widget.classList.add(
        'idle'
    );


    status.classList.remove(
        'playing'
    );


    statusText.textContent =
        'ERROR';


    musicIndicator.classList.remove(
        'playing'
    );


    musicIndicator.classList.add(
        'idle'
    );


    applyCustomization();
}


/* ==================================================
   HANDLE LAST.FM DATA
================================================== */

function handleLastFMResponse(
    data
) {

    try {

        if (
            !data ||
            data.error
        ) {

            console.error(
                'Last.fm error:',
                data
            );


            showError(
                data &&
                data.message
                    ? data.message
                    : 'Check the Last.fm username'
            );


            return;
        }


        if (
            !data.recenttracks ||
            !data.recenttracks.track
        ) {

            showNothingPlaying();

            return;
        }


        const tracks =
            data.recenttracks.track;


        const track =
            Array.isArray(
                tracks
            )
                ? tracks[0]
                : tracks;


        if (!track) {

            showNothingPlaying();

            return;
        }


        const isPlaying =
            track['@attr'] &&
            track['@attr']
                .nowplaying ===
                'true';


        if (
            isPlaying
        ) {

            showPlaying(
                track
            );

        } else {

            showNothingPlaying();
        }


    } catch (error) {

        console.error(
            'Last.fm data error:',
            error
        );


        showError();
    }
}


/* ==================================================
   QUERY API
================================================== */

async function queryLastFM() {

    if (
        !LASTFM_USERNAME
    ) {

        showError(
            'No Last.fm username provided'
        );

        return;
    }


    try {

        const response =
            await fetch(
                `/api/lastfm?username=${encodeURIComponent(
                    LASTFM_USERNAME
                )}`
            );


        const data =
            await response.json();


        if (
            !response.ok
        ) {

            console.error(
                'Widget API error:',
                data
            );


            showError(
                data.message ||
                data.error ||
                'Unable to retrieve Last.fm data'
            );


            return;
        }


        handleLastFMResponse(
            data
        );


    } catch (error) {

        console.error(
            'Could not connect to widget API:',
            error
        );


        /*
         * Don't immediately destroy a working
         * now-playing display because of one
         * temporary failed request.
         */

        if (!currentlyPlaying) {

            showError(
                'Unable to connect to server'
            );
        }
    }
}


/* ==================================================
   START
================================================== */

applyCustomization();

queryLastFM();


if (
    LASTFM_USERNAME
) {

    setInterval(
        queryLastFM,
        UPDATE_INTERVAL
    );
}