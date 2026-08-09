export default async function handler(req, res) {

    const allowedOrigin =
        'https://cloud.pogly.gg';


    res.setHeader(
        'Access-Control-Allow-Origin',
        allowedOrigin
    );

    res.setHeader(
        'Vary',
        'Origin'
    );

    res.setHeader(
        'Access-Control-Allow-Methods',
        'GET, OPTIONS'
    );

    res.setHeader(
        'Access-Control-Allow-Headers',
        'Content-Type'
    );


    if (req.method === 'OPTIONS') {

        return res.status(204).end();
    }


    if (req.method !== 'GET') {

        return res.status(405).json({
            error: 'Method not allowed'
        });
    }


    const username =
        typeof req.query.username === 'string'
            ? req.query.username.trim()
            : '';


    if (!username) {

        return res.status(400).json({
            error: 'Missing username',
            message: 'A Last.fm username is required'
        });
    }


    if (
        username.length > 50 ||
        !/^[A-Za-z0-9_-]+$/.test(username)
    ) {

        return res.status(400).json({
            error: 'Invalid username',
            message: 'Invalid Last.fm username'
        });
    }


    const apiKey =
        process.env.LASTFM_API_KEY;


    if (!apiKey) {

        console.error(
            'LASTFM_API_KEY is missing'
        );


        return res.status(500).json({
            error: 'Server error',
            message: 'Widget service is unavailable'
        });
    }


    const lastFMURL =
        new URL(
            'https://ws.audioscrobbler.com/2.0/'
        );


    lastFMURL.searchParams.set(
        'method',
        'user.getrecenttracks'
    );

    lastFMURL.searchParams.set(
        'user',
        username
    );

    lastFMURL.searchParams.set(
        'api_key',
        apiKey
    );

    lastFMURL.searchParams.set(
        'format',
        'json'
    );

    lastFMURL.searchParams.set(
        'limit',
        '1'
    );


    const controller =
        new AbortController();


    const timeout =
        setTimeout(
            () =>
                controller.abort(),
            5000
        );


    try {

        const response =
            await fetch(
                lastFMURL.toString(),
                {
                    signal:
                        controller.signal
                }
            );


        clearTimeout(timeout);


        if (!response.ok) {

            console.error(
                'Last.fm HTTP error:',
                response.status
            );


            return res.status(502).json({
                error: 'Upstream error',
                message: 'Unable to contact Last.fm'
            });
        }


        const data =
            await response.json();


        if (data.error) {

            return res.status(400).json({
                error: 'Last.fm error',
                message:
                    data.message ||
                    'Unable to retrieve that user'
            });
        }


        /*
         * Keep now-playing data fresh.
         */

        res.setHeader(
            'Cache-Control',
            'public, s-maxage=2'
        );


        res.setHeader(
            'X-Content-Type-Options',
            'nosniff'
        );


        return res.status(200).json(data);


    } catch (error) {

        clearTimeout(timeout);


        if (
            error &&
            error.name === 'AbortError'
        ) {

            return res.status(504).json({
                error: 'Timeout',
                message: 'Last.fm took too long to respond'
            });
        }


        console.error(
            'Last.fm API request failed:',
            error
        );


        return res.status(500).json({
            error: 'Server error',
            message: 'Unable to retrieve Last.fm data'
        });
    }
}