export default async function handler(req, res) {

    // Only allow GET requests
    if (req.method !== 'GET') {
        return res.status(405).json({
            error: 'Method not allowed'
        });
    }


    // Get Last.fm username from the widget request
    const username =
        typeof req.query.username === 'string'
            ? req.query.username.trim()
            : '';


    // Make sure a username was provided
    if (!username) {
        return res.status(400).json({
            error: 'Missing username',
            message: 'A Last.fm username is required'
        });
    }


    // Basic protection against unreasonable input
    if (username.length > 100) {
        return res.status(400).json({
            error: 'Invalid username',
            message: 'Invalid Last.fm username'
        });
    }


    /*
     * Get the API key from the server environment.
     *
     * IMPORTANT:
     * Do NOT put your actual API key in this file.
     */
    const apiKey =
        process.env.LASTFM_API_KEY;


    if (!apiKey) {

        console.error(
            'LASTFM_API_KEY environment variable is missing'
        );

        return res.status(500).json({
            error: 'Server configuration error',
            message: 'Widget server is not configured correctly'
        });
    }


    // Build the Last.fm API request
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


    try {

        // Contact Last.fm from our server
        const response =
            await fetch(
                lastFMURL.toString()
            );


        if (!response.ok) {

            console.error(
                'Last.fm HTTP error:',
                response.status
            );

            return res.status(502).json({
                error: 'Last.fm request failed',
                message: 'Unable to contact Last.fm'
            });
        }


        const data =
            await response.json();


        /*
         * Last.fm sometimes returns API errors
         * inside otherwise-valid JSON.
         */
        if (data.error) {

            return res.status(400).json({
                error: data.error,
                message:
                    data.message ||
                    'Last.fm returned an error'
            });
        }


        /*
         * Cache results briefly.
         *
         * This reduces the number of requests
         * your server sends to Last.fm.
         */
        res.setHeader(
            'Cache-Control',
            'public, s-maxage=5, stale-while-revalidate=10'
        );


        return res.status(200).json(data);

    } catch (error) {

        console.error(
            'Last.fm API request failed:',
            error
        );


        return res.status(500).json({
            error: 'Internal server error',
            message: 'Unable to retrieve Last.fm data'
        });
    }
}