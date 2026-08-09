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


const SHOW_ART =
    params.get('art') !== '0';


const SHOW_STATUS =
    params.get('status') !== '0';


const OPACITY =
    Math.min(
        100,
        Math.max(
            0,
            Number(
                params.get('opacity') || 92
            )
        )
    );


const BACKGROUND_COLOR =
    params.get('bg') || '14141c';


const ACCENT_COLOR =
    params.get('accent') || 'ffffff';


const UPDATE_INTERVAL =
    5000;


/* ==================================================
   ELEMENTS
================================================== */

const widget =
    document.getElementById('widget');

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
   COLOR HELPERS
================================================== */

function isValidHexColor(value) {

    return /^[0-9a-fA-F]{6}$/.test(
        value
    );
}


function hexToRgb(hex) {

    if (!isValidHexColor(hex)) {

        return {
            r: 20,
            g: 20,
            b: 28
        };
    }


    return {
        r: parseInt(
            hex.slice(0, 2),
            16
        ),

        g: parseInt(
            hex.slice(2, 4),
            16
        ),

        b: parseInt(
            hex.slice(4, 6),
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
            BACKGROUND_COLOR
        );


    const alpha =
        OPACITY / 100;


    widget.style.background =
        `rgba(${bg.r}, ${bg.g}, ${bg.b}, ${alpha})`;


    if (
        isValidHexColor(
            ACCENT_COLOR
        )
    ) {

        const accent =
            `#${ACCENT_COLOR}`;


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
    }


    if (!SHOW_ART) {

        albumContainer.style.display =
            'none';
    }


    if (!SHOW_STATUS) {

        status.style.display =
            'none';
    }
}


/* ==================================================
   DEFAULT ART
================================================== */

const DEFAULT_ART = '';


/* ==================================================
   SHOW PLAYING
================================================== */

function showPlaying(track) {

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


    let imageURL =
        DEFAULT_ART;


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
                        img.size === size
                );


            if (
                image &&
                image['#text']
            ) {

                imageURL =
                    image['#text'];

                break;
            }
        }
    }


    if (
        SHOW_ART &&
        imageURL
    ) {

        albumContainer.style.display =
            'block';


        albumArt.classList.add(
            'loading'
        );


        const newImage =
            new Image();


        newImage.onload =
            function () {

                albumArt.src =
                    imageURL;

                setTimeout(
                    () => {

                        albumArt.classList.remove(
                            'loading'
                        );

                    },
                    50
                );
            };


        newImage.onerror =
            function () {

                albumArt.removeAttribute(
                    'src'
                );

                albumArt.classList.remove(
                    'loading'
                );
            };


        newImage.src =
            imageURL;
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

    songTitle.textContent =
        'Nothing Playing';


    artistName.textContent =
        'No active Last.fm scrobble';


    albumArt.removeAttribute(
        'src'
    );


    albumContainer.style.display =
        'none';


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

    songTitle.textContent =
        'Last.fm Error';


    artistName.textContent =
        message;


    albumContainer.style.display =
        'none';


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


        if (isPlaying) {

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


        showError(
            'Unable to connect to server'
        );
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