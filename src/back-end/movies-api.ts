import type { Express } from 'express'
import express from 'express'
import { tmdbAccessToken } from './config';
import { DEFAULT_LANGUAGE, DEFAULT_PAGE, DEFAULT_REGION } from './constants';
import type { TmdbMovieDetails } from './schemas/MoviesTypes';

export function registerMoviesApi(app: Express): void {

    app.get('/api/movies/:id', async (_req: express.Request, res: express.Response) => {
        const id = _req.params.id as string;
        const queryParams = new URLSearchParams();
        const { language } = _req.query;

        queryParams.append('language', (language as string) || DEFAULT_LANGUAGE);

        try {
            const response = await fetch(
                `https://api.themoviedb.org/3/movie/${encodeURIComponent(id)}?${queryParams.toString()}`,
                {
                    headers: {
                        Authorization: `Bearer ${tmdbAccessToken}`,
                        'Content-Type': 'application/json;charset=utf-8'
                    }
                }
            );

            if (!response.ok) {
                throw new Error(`TMDB API request failed with status ${response.status}`);
            }

            const {
                adult: _adult,
                video: _video,
                production_companies: _productionCompanies,
                ...movieDetails
            } = await response.json() as TmdbMovieDetails;

            res.json(movieDetails);
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch movie details' });
        }
    });

    // Define a route handler for fetching popular movies from TMDB API
    app.get('/api/movies/popular', async (_req: express.Request, res: express.Response) => {
        // Create a URLSearchParams object to build the query string for the TMDB API request
        const queryParams = new URLSearchParams();

        // Extract query parameters from the request and append them to the query string
        const { language, page, region } = _req.query;

        queryParams.append('language', (language as string) || DEFAULT_LANGUAGE);
        queryParams.append('page', (page as string) || DEFAULT_PAGE);
        queryParams.append('region', (region as string) || DEFAULT_REGION);
        try {
            const response = await fetch('https://api.themoviedb.org/3/movie/popular', {
                headers: {
                    Authorization: `Bearer ${tmdbAccessToken}`,
                    'Content-Type': 'application/json;charset=utf-8'
                }
            });

            if (!response.ok) {
                throw new Error(`TMDB API request failed with status ${response.status}`);
            }

            const data = await response.json();
            res.json(data);
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch popular movies' });
        }
    })
}