/* ==================================================
   SETTINGS
================================================== */

/*
 * Reads the Last.fm username from the URL.
 *
 * Example:
 * musicplayer2.html?user=ilyjonatan
 */

const params = new URLSearchParams(window.location.search);

const LASTFM_USERNAME =
    params.get('user') ||
    params.get('username');


/*
 * 5000 = check every 5 seconds
 */

const UPDATE_INTERVAL = 5000;


/* ==================================================
   ELEMENTS
================================================== */

const widget =
    document.getElementById('widget');

const albumArt =
    document.getElementById('album-art');

const songTitle =
    document.getElementById('song-title');

const artistName =
    document.getElementById('artist-name');

const status =
    document.getElementById('status');

const statusText =
    document.getElementById('status-text');

const musicIndicator =
    document.getElementById('music-indicator');


/* ==================================================
   DEFAULT ART
================================================== */

const DEFAULT_ART =
    'https://picsum.photos/300';


/* ==================================================
   SHOW PLAYING
================================================== */

function showPlaying(track) {

    const title =
        track.name || 'Unknown Track';

    const artist =
        track.artist &&
        track.artist['#text']
            ? track.artist['#text']
            : 'Unknown Artist';


    songTitle.textContent = title;
    artistName.textContent = artist;


    let imageURL = DEFAULT_ART;

    if (
        track.image &&
        Array.isArray(track.image)
    ) {

        const imageSizes = [
            'extralarge',
            'large',
            'medium',
            'small'
        ];

        for (const size of imageSizes) {

            const image =
                track.image.find(
                    img => img.size === size
                );

            if (
                image &&
                image['#text']
            ) {
                imageURL = image['#text'];
                break;
            }
        }
    }


    albumArt.classList.add('loading');

    const newImage = new Image();

    newImage.onload = function () {

        albumArt.src = imageURL;

        setTimeout(() => {
            albumArt.classList.remove('loading');
        }, 50);
    };

    newImage.onerror = function () {

        albumArt.src = DEFAULT_ART;
        albumArt.classList.remove('loading');
    };

    newImage.src = imageURL;


    widget.classList.remove('idle');

    status.classList.add('playing');

    statusText.textContent =
        'NOW PLAYING';

    musicIndicator.classList.remove('idle');

    musicIndicator.classList.add('playing');
}


/* ==================================================
   SHOW NOTHING PLAYING
================================================== */

function showNothingPlaying() {

    songTitle.textContent =
        'Nothing Playing';

    artistName.textContent =
        'No active Last.fm scrobble';

    albumArt.src =
        DEFAULT_ART;

    widget.classList.add('idle');

    status.classList.remove('playing');

    statusText.textContent =
        'NOT PLAYING';

    musicIndicator.classList.remove('playing');

    musicIndicator.classList.add('idle');
}


/* ==================================================
   SHOW ERROR
================================================== */

function showError(message = 'Unable to connect to Last.fm') {

    songTitle.textContent =
        'Last.fm Error';

    artistName.textContent =
        message;

    widget.classList.add('idle');

    status.classList.remove('playing');

    statusText.textContent =
        'ERROR';

    musicIndicator.classList.remove('playing');

    musicIndicator.classList.add('idle');
}


/* ==================================================
   HANDLE LAST.FM DATA
================================================== */

function handleLastFMResponse(data) {

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
            Array.isArray(tracks)
                ? tracks[0]
                : tracks;


        if (!track) {

            showNothingPlaying();
            return;
        }


        const isPlaying =
            track['@attr'] &&
            track['@attr'].nowplaying === 'true';


        if (isPlaying) {

            showPlaying(track);

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
   QUERY OUR API
================================================== */

async function queryLastFM() {

    if (!LASTFM_USERNAME) {

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


        if (!response.ok) {

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


        handleLastFMResponse(data);

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

queryLastFM();

if (LASTFM_USERNAME) {

    setInterval(
        queryLastFM,
        UPDATE_INTERVAL
    );
}