export default async function handler(req, res) {

    /* =========================================
       METHOD CHECK
    ========================================= */

    if (req.method !== 'GET') {

        res.setHeader(
            'Allow',
            'GET'
        );

        return res.status(405).json({
            error: 'Method not allowed'
        });
    }


    /* =========================================
       API KEY
    ========================================= */

    const apiKey =
        process.env.LASTFM_API_KEY;


    if (!apiKey) {

        console.error(
            'LASTFM_API_KEY is not configured.'
        );

        return res.status(500).json({
            error: 'Server configuration error'
        });
    }


    /* =========================================
       USERNAME VALIDATION
    ========================================= */

    const rawUsername =
        Array.isArray(req.query.username)
            ? req.query.username[0]
            : req.query.username;


    const username =
        String(
            rawUsername || ''
        ).trim();


    if (
        !username ||
        username.length > 64
    ) {

        return res.status(400).json({
            error: 'Invalid Last.fm username'
        });
    }


    /*
     * Reject control characters.
     * The username is still encoded before
     * being sent to Last.fm.
     */

    if (
        /[\u0000-\u001F\u007F]/.test(
            username
        )
    ) {

        return res.status(400).json({
            error: 'Invalid Last.fm username'
        });
    }


    /* =========================================
       RESPONSE HEADERS
    ========================================= */

    /*
     * Pogly/OBS may request this endpoint
     * from another origin, so we allow CORS.
     *
     * This is NOT where the security comes
     * from — the endpoint itself is narrowly
     * restricted below.
     */

    res.setHeader(
        'Access-Control-Allow-Origin',
        '*'
    );


    res.setHeader(
        'Content-Type',
        'application/json; charset=utf-8'
    );


    /*
     * Cache briefly at Vercel's edge.
     * ZERO SIGNAL polls every few seconds,
     * so this reduces duplicate Last.fm calls.
     */

    res.setHeader(
        'Cache-Control',
        'public, s-maxage=2, stale-while-revalidate=5'
    );


    /* =========================================
       LAST.FM REQUEST
    ========================================= */

    const params =
        new URLSearchParams({
            method:
                'user.getrecenttracks',

            user:
                username,

            api_key:
                apiKey,

            format:
                'json',

            limit:
                '1',

            extended:
                '0'
        });


    const controller =
        new AbortController();


    const timeout =
        setTimeout(
            () => controller.abort(),
            5000
        );


    try {

        const response =
            await fetch(
                `https://ws.audioscrobbler.com/2.0/?${params.toString()}`,
                {
                    method: 'GET',

                    signal:
                        controller.signal,

                    headers: {
                        'User-Agent':
                            'ZERO-SIGNAL-MK1/1.0'
                    }
                }
            );


        clearTimeout(
            timeout
        );


        if (!response.ok) {

            console.error(
                'Last.fm HTTP error:',
                response.status
            );


            return res.status(502).json({
                error:
                    'Unable to reach Last.fm'
            });
        }


        const data =
            await response.json();


        /* =========================================
           LAST.FM ERROR
        ========================================= */

        if (data.error) {

            /*
             * Don't expose unnecessary
             * upstream debugging details.
             */

            if (
                data.error === 6
            ) {

                return res.status(404).json({
                    error:
                        'Last.fm user not found'
                });
            }


            console.error(
                'Last.fm API error:',
                data.error
            );


            return res.status(502).json({
                error:
                    'Last.fm request failed'
            });
        }


        /* =========================================
           SAFE RESPONSE
        ========================================= */

        const tracks =
            data.recenttracks &&
            data.recenttracks.track;


        if (
            !tracks ||
            !Array.isArray(tracks) ||
            tracks.length === 0
        ) {

            return res.status(200).json({
                recenttracks: {
                    track: []
                }
            });
        }


        const track =
            tracks[0];


        /*
         * Return only fields ZERO SIGNAL
         * actually needs.
         */

        const safeTrack = {

            name:
                track.name || '',

            mbid:
                track.mbid || '',

            artist: {
                '#text':
                    track.artist &&
                    track.artist['#text']
                        ? track.artist['#text']
                        : ''
            },

            image:
                Array.isArray(track.image)
                    ? track.image.map(
                        image => ({
                            size:
                                image.size || '',

                            '#text':
                                image['#text'] || ''
                        })
                    )
                    : [],

            '@attr':
                track['@attr'] &&
                track['@attr'].nowplaying
                    ? {
                        nowplaying:
                            String(
                                track['@attr']
                                    .nowplaying
                            )
                    }
                    : {}
        };


        return res.status(200).json({
            recenttracks: {
                track: [
                    safeTrack
                ]
            }
        });


    } catch (error) {

        clearTimeout(
            timeout
        );


        if (
            error &&
            error.name ===
                'AbortError'
        ) {

            console.error(
                'Last.fm request timed out.'
            );


            return res.status(504).json({
                error:
                    'Last.fm request timed out'
            });
        }


        console.error(
            'Last.fm proxy error:',
            error
        );


        return res.status(500).json({
            error:
                'Unable to load Last.fm data'
        });
    }
}