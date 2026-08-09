export default async function handler(req, res) {

    // Only allow GET requests
    if (req.method !== 'GET') {
        return res.status(405).json({
            error: 'Method not allowed'
        });
    }


    // Get username from query string
    const username =
        typeof req.query.username === 'string'
            ? req.query.username.trim()
            : '';


    // Require username
    if (!username) {
        return res.status(400).json({
            error: 'Missing username',
            message: 'A Last.fm username is required'
        });
    }


    /*
     * Last.fm usernames are limited in length.
     * Keep input conservative and reject weird values.
     */
    if (
        username.length > 50 ||
        !/^[A-Za-z0-9_-]+$/.test(username)
    ) {
        return res.status(400).json({
            error: 'Invalid username',
            message: 'Invalid Last.fm username'
        });
    }


    // Read private API key from Vercel
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


    // Build a fixed Last.fm request
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


    /*
     * Abort Last.fm request if it hangs too long.
     */
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


        /*
         * Last.fm often returns API errors
         * inside JSON.
         */
        if (data.error) {

            return res.status(400).json({
                error: 'Last.fm error',
                message:
                    data.message ||
                    'Unable to retrieve that user'
            });
        }


        /*
         * Cache at Vercel's CDN.
         *
         * For 10 seconds:
         * reuse the same response when possible.
         *
         * For another 20 seconds:
         * Vercel may serve stale data while
         * refreshing in the background.
         */
        res.setHeader(
            'Cache-Control',
            'public, s-maxage=10, stale-while-revalidate=20'
        );


        /*
         * Prevent MIME sniffing.
         */
        res.setHeader(
            'X-Content-Type-Options',
            'nosniff'
        );


        /*
         * Return only the Last.fm response.
         * Never return env vars or stack traces.
         */
        return res.status(200).json(data);


    } catch (error) {

        clearTimeout(timeout);


        if (
            error &&
            error.name ===
                'AbortError'
        ) {

            console.error(
                'Last.fm request timed out'
            );

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