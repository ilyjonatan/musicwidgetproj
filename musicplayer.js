const params =
    new URLSearchParams(
        window.location.search
    );

const LASTFM_USERNAME =
    params.get('user') ||
    params.get('username');

let settings = {
    showArt:
        params.get('art') !== '0',

    showStatus:
        params.get('status') !== '0',

    showCredit:
        params.get('credit') !== '0',

    opacity:
        clamp(
            Number(
                params.get('opacity') || 92
            ),
            0,
            100
        ),

    backgroundColor:
        normalizeHex(
            params.get('bg'),
            '071a2b'
        ),

    accentColor:
        normalizeHex(
            params.get('accent'),
            '69c5ff'
        ),

    layout:
        params.get('layout') ||
        'Standard'
};

const UPDATE_INTERVAL = 3000;
const MAX_FAILURES = 3;
const TRANSITION_TIME = 220;

const widget =
    document.getElementById(
        'widget'
    );

const trackInfo =
    document.getElementById(
        'track-info'
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

const watermark =
    document.getElementById(
        'watermark'
    );

let currentlyPlaying = false;
let currentArtworkURL = '';
let currentTrackKey = '';
let consecutiveFailures = 0;
let hasReceivedValidData = false;
let requestInProgress = false;
let transitionGeneration = 0;


function clamp(
    value,
    min,
    max
) {
    const number =
        Number(value);

    if (
        !Number.isFinite(
            number
        )
    ) {
        return min;
    }

    return Math.min(
        max,
        Math.max(
            min,
            number
        )
    );
}


function validHex(value) {
    return /^[0-9a-fA-F]{6}$/.test(
        String(value)
    );
}


function normalizeHex(
    value,
    fallback
) {
    const clean =
        String(value || '')
            .replace('#', '')
            .trim();

    if (
        /^[0-9a-fA-F]{6}$/.test(
            clean
        )
    ) {
        return clean.toLowerCase();
    }

    return fallback;
}


function normalizeLayout(value) {
    const layout =
        String(value || 'Standard')
            .trim()
            .toLowerCase();

    if (
        layout ===
        'dual panel'
    ) {
        return 'dual-panel';
    }

    if (
        layout ===
        'circle'
    ) {
        return 'circle';
    }

    if (
        layout ===
        'spinning circle'
    ) {
        return 'spinning-circle';
    }

    return 'standard';
}


function hexToRgb(hex) {
    const clean =
        String(hex)
            .replace('#', '');

    return {
        r:
            parseInt(
                clean.slice(0, 2),
                16
            ),

        g:
            parseInt(
                clean.slice(2, 4),
                16
            ),

        b:
            parseInt(
                clean.slice(4, 6),
                16
            )
    };
}


function getTrackKey(
    track
) {
    const title =
        track.name || '';

    const artist =
        track.artist &&
        track.artist['#text']
            ? track.artist['#text']
            : '';

    const mbid =
        track.mbid || '';

    return `${artist}|${title}|${mbid}`;
}


function wait(ms) {
    return new Promise(
        resolve =>
            setTimeout(
                resolve,
                ms
            )
    );
}


function applyLayout() {
    const layout =
        normalizeLayout(
            settings.layout
        );

    widget.classList.remove(
        'dual-panel',
        'circle',
        'spinning-circle'
    );

    if (
        layout ===
        'dual-panel'
    ) {
        widget.classList.add(
            'dual-panel'
        );
    }

    if (
        layout ===
        'circle'
    ) {
        widget.classList.add(
            'circle'
        );
    }

    if (
        layout ===
        'spinning-circle'
    ) {
        widget.classList.add(
            'spinning-circle'
        );
    }
}


function applyAppearance() {
    let background =
        settings.backgroundColor;

    if (
        !validHex(
            `#${background}`
        )
    ) {
        background =
            '071a2b';
    }

    let accent =
        settings.accentColor;

    if (
        !validHex(
            `#${accent}`
        )
    ) {
        accent =
            '69c5ff';
    }

    const opacity =
        clamp(
            settings.opacity,
            0,
            100
        ) / 100;

    const rgb =
        hexToRgb(
            background
        );

    document.documentElement.style
        .setProperty(
            '--accent-color',
            `#${accent}`
        );

    document.documentElement.style
        .setProperty(
            '--bg-r',
            rgb.r
        );

    document.documentElement.style
        .setProperty(
            '--bg-g',
            rgb.g
        );

    document.documentElement.style
        .setProperty(
            '--bg-b',
            rgb.b
        );

    document.documentElement.style
        .setProperty(
            '--bg-opacity',
            opacity
        );

    applyLayout();

    if (
        normalizeLayout(
            settings.layout
        ) ===
        'standard'
    ) {
        widget.style.background =
            `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;

        trackInfo.style.background =
            'transparent';
    } else {
        widget.style.background =
            'transparent';

        trackInfo.style.background =
            `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
    }

    songTitle.style.color =
        `#${accent}`;

    artistName.style.color =
        `#${accent}`;

    status.style.color =
        `#${accent}`;

    status.style.display =
        settings.showStatus
            ? 'flex'
            : 'none';

    if (watermark) {
        watermark.style.display =
            settings.showCredit
                ? 'block'
                : 'none';
    }

    if (
        settings.showArt &&
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


window.addEventListener(
    'message',
    function(event) {

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

        const incoming =
            event.data.settings;

        if (!incoming) {
            return;
        }

        if (
            typeof incoming.art ===
            'boolean'
        ) {
            settings.showArt =
                incoming.art;
        }

        if (
            typeof incoming.status ===
            'boolean'
        ) {
            settings.showStatus =
                incoming.status;
        }

        if (
            typeof incoming.credit ===
            'boolean'
        ) {
            settings.showCredit =
                incoming.credit;
        }

        if (
            typeof incoming.layout ===
            'string'
        ) {
            settings.layout =
                incoming.layout;
        }

        if (
            Number.isFinite(
                Number(
                    incoming.opacity
                )
            )
        ) {
            settings.opacity =
                clamp(
                    Number(
                        incoming.opacity
                    ),
                    0,
                    100
                );
        }

        if (
            validHex(
                incoming.bg
            )
        ) {
            settings.backgroundColor =
                String(
                    incoming.bg
                )
                    .replace('#', '')
                    .toLowerCase();
        }

        if (
            validHex(
                incoming.accent
            )
        ) {
            settings.accentColor =
                String(
                    incoming.accent
                )
                    .replace('#', '')
                    .toLowerCase();
        }

        applyAppearance();
    }
);


function findArtwork(
    track
) {
    if (
        !track.image ||
        !Array.isArray(
            track.image
        )
    ) {
        return '';
    }

    const sizes = [
        'extralarge',
        'large',
        'medium',
        'small'
    ];

    for (
        const size of sizes
    ) {

        const image =
            track.image.find(
                item =>
                    item.size ===
                    size
            );

        if (
            image &&
            image['#text']
        ) {
            return image['#text'];
        }
    }

    return '';
}


async function transitionToTrack(
    track
) {
    const transitionID =
        ++transitionGeneration;

    widget.classList.add(
        'track-transition'
    );

    await wait(
        TRANSITION_TIME
    );

    if (
        transitionID !==
        transitionGeneration
    ) {
        return;
    }

    applyTrackData(
        track
    );

    requestAnimationFrame(
        () => {

            requestAnimationFrame(
                () => {

                    if (
                        transitionID !==
                        transitionGeneration
                    ) {
                        return;
                    }

                    widget.classList.remove(
                        'track-transition'
                    );
                }
            );
        }
    );
}


function applyTrackData(
    track
) {
    const trackKey =
        getTrackKey(
            track
        );

    currentTrackKey =
        trackKey;

    currentlyPlaying =
        true;

    hasReceivedValidData =
        true;

    consecutiveFailures =
        0;

    currentArtworkURL =
        '';

    albumArt.removeAttribute(
        'src'
    );

    albumContainer.style.display =
        'none';

    songTitle.textContent =
        track.name ||
        'Unknown Track';

    artistName.textContent =
        track.artist &&
        track.artist['#text']
            ? track.artist['#text']
            : 'Unknown Artist';

    widget.classList.remove(
        'idle'
    );

    status.classList.add(
        'playing'
    );

    statusText.textContent =
        'NOW PLAYING';

    const artworkURL =
        findArtwork(
            track
        );

    if (!artworkURL) {
        applyAppearance();
        return;
    }

    const artworkTrackKey =
        trackKey;

    const image =
        new Image();

    image.onload =
        function() {

            if (
                artworkTrackKey !==
                currentTrackKey
            ) {
                return;
            }

            currentArtworkURL =
                artworkURL;

            albumArt.src =
                artworkURL;

            applyAppearance();
        };

    image.onerror =
        function() {

            if (
                artworkTrackKey !==
                currentTrackKey
            ) {
                return;
            }

            currentArtworkURL =
                '';

            albumArt.removeAttribute(
                'src'
            );

            applyAppearance();
        };

    image.src =
        artworkURL;

    applyAppearance();
}


function showPlaying(
    track
) {
    const trackKey =
        getTrackKey(
            track
        );

    if (
        trackKey ===
        currentTrackKey
    ) {

        currentlyPlaying =
            true;

        consecutiveFailures =
            0;

        hasReceivedValidData =
            true;

        applyAppearance();

        return;
    }

    transitionToTrack(
        track
    );
}


function showNothingPlaying() {
    transitionGeneration++;

    widget.classList.remove(
        'track-transition'
    );

    currentlyPlaying =
        false;

    currentTrackKey =
        '';

    currentArtworkURL =
        '';

    hasReceivedValidData =
        true;

    consecutiveFailures =
        0;

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

    applyAppearance();
}


function showError(
    message
) {
    transitionGeneration++;

    widget.classList.remove(
        'track-transition'
    );

    currentlyPlaying =
        false;

    currentTrackKey =
        '';

    currentArtworkURL =
        '';

    songTitle.textContent =
        'Last.fm Error';

    artistName.textContent =
        message ||
        'Unable to load music';

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
        'ERROR';

    applyAppearance();
}


function handleFailure(
    error
) {
    consecutiveFailures++;

    if (error) {
        console.error(
            'Last.fm request failed:',
            error
        );
    }

    if (
        hasReceivedValidData &&
        consecutiveFailures <
            MAX_FAILURES
    ) {
        return;
    }

    if (
        consecutiveFailures >=
        MAX_FAILURES
    ) {
        showError(
            'Unable to reach Last.fm'
        );
    }
}


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
                )}&_=${Date.now()}`,
                {
                    cache:
                        'no-store'
                }
            );

        let data;

        try {
            data =
                await response.json();

        } catch (error) {
            handleFailure(
                error
            );

            return;
        }

        if (
            !response.ok ||
            data.error
        ) {
            handleFailure(
                data.message ||
                data.error
            );

            return;
        }

        consecutiveFailures =
            0;

        const tracks =
            data.recenttracks &&
            data.recenttracks.track;

        if (!tracks) {
            showNothingPlaying();

            return;
        }

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
        handleFailure(
            error
        );
    }
}


async function pollLastFM() {
    if (requestInProgress) {
        return;
    }

    requestInProgress =
        true;

    try {
        await queryLastFM();

    } finally {
        requestInProgress =
            false;
    }
}


applyAppearance();
pollLastFM();

setInterval(
    pollLastFM,
    UPDATE_INTERVAL
);