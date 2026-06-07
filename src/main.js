// Dice.fm Events Scraper – Lightweight API-based extraction via got-scraping
// Extracts structured JSON from __NEXT_DATA__ (Next.js SSR data), NOT HTML parsing
// See API_DISCOVERY.md for endpoint documentation
import { Actor, log } from 'apify';
import { Dataset } from 'crawlee';
import { gotScraping } from 'got-scraping';

await Actor.init();

// ─── Constants ─────────────────────────────────────────────────────
const DICE_ORIGIN = 'https://dice.fm';
const DICE_API_ORIGIN = 'https://api.dice.fm';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;
const REQUEST_TIMEOUT_MS = 30000;

// ─── Sleep helper for retry delays ─────────────────────────────────
function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

// ─── Known city slugs for location-based browsing ──────────────────
const KNOWN_CITIES = {
    'new york': 'new_york-5bbf4db0f06331478e9b2c59',
    'new york city': 'new_york-5bbf4db0f06331478e9b2c59',
    nyc: 'new_york-5bbf4db0f06331478e9b2c59',
    london: 'london-54d8a23438fe5d27d500001c',
    berlin: 'berlin-5e426dbb749e68e3e923d1e4',
    'los angeles': 'los_angeles-5bbf4db0f06331478e9b2c5a',
    la: 'los_angeles-5bbf4db0f06331478e9b2c5a',
    paris: 'paris-5e426dbb749e68e3e923d1e5',
    amsterdam: 'amsterdam-5e426dbb749e68e3e923d1e6',
    barcelona: 'barcelona-5e426dbb749e68e3e923d1e7',
    lisbon: 'lisbon-5e426dbb749e68e3e923d1e8',
    tokyo: 'tokyo-5e426dbb749e68e3e923d1e9',
    sydney: 'sydney-5e426dbb749e68e3e923d1ea',
    melbourne: 'melbourne-5e426dbb749e68e3e923d1eb',
    chicago: 'chicago-5e426dbb749e68e3e923d1ec',
    'san francisco': 'san_francisco-5e426dbb749e68e3e923d1ed',
    miami: 'miami-5e426dbb749e68e3e923d1ee',
    toronto: 'toronto-5e426dbb749e68e3e923d1ef',
    'mexico city': 'mexico_city-5e426dbb749e68e3e923d1f0',
    dublin: 'dublin-5e426dbb749e68e3e923d1f1',
    manchester: 'manchester-5e426dbb749e68e3e923d1f2',
    edinburgh: 'edinburgh-5e426dbb749e68e3e923d1f3',
    glasgow: 'glasgow-5e426dbb749e68e3e923d1f4',
    bristol: 'bristol-5e426dbb749e68e3e923d1f5',
    brighton: 'brighton-5e426dbb749e68e3e923d1f6',
};

const DEFAULT_CITY_SLUG = 'new_york-5bbf4db0f06331478e9b2c59';

// ─── Browser-like headers (mimic same-origin request from dice.fm) ─
function buildHeaders(targetUrl) {
    const isApi = targetUrl.startsWith(DICE_API_ORIGIN);
    return {
        accept: isApi
            ? 'application/json, text/plain, */*'
            : 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'accept-language': 'en-US,en;q=0.9',
        'accept-encoding': 'gzip, deflate, br',
        'cache-control': 'no-cache',
        dnt: '1',
        origin: isApi ? DICE_ORIGIN : DICE_ORIGIN,
        referer: `${DICE_ORIGIN}/`,
        'sec-ch-ua': '"Not/A)Brand";v="8", "Chromium";v="126", "Google Chrome";v="126"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-dest': isApi ? 'empty' : 'document',
        'sec-fetch-mode': isApi ? 'cors' : 'navigate',
        'sec-fetch-site': isApi ? 'same-site' : 'same-origin',
        ...(isApi ? {} : { 'sec-fetch-user': '?1', 'upgrade-insecure-requests': '1' }),
        'user-agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    };
}

// ─── Auto-healing fetch with retries and error diagnostics ─────────
async function resilientFetch(url, proxyUrl) {
    const headers = buildHeaders(url);
    let lastError = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            log.info(`Fetching ${url} (attempt ${attempt}/${MAX_RETRIES})`);
            const response = await gotScraping.get(url, {
                headers,
                proxyUrl,
                timeout: { request: REQUEST_TIMEOUT_MS },
                responseType: 'text',
            });

            // Detect Cloudflare block
            if (
                response.statusCode === 403 &&
                (response.body.includes('challenge-platform') ||
                    response.body.includes('cf-browser-verification'))
            ) {
                log.warning(
                    `Cloudflare challenge detected on ${url} (attempt ${attempt}). This page requires JS execution.`
                );
                lastError = new Error('Cloudflare challenge block');
                if (attempt < MAX_RETRIES) {
                    await sleep(RETRY_DELAY_MS * attempt);
                }
                continue;
            }

            if (response.statusCode >= 400) {
                lastError = new Error(
                    `HTTP ${response.statusCode} on ${url}: ${response.body.substring(0, 200)}`
                );
                log.warning(`HTTP ${response.statusCode} on ${url} (attempt ${attempt})`);
                if (attempt < MAX_RETRIES) {
                    await sleep(RETRY_DELAY_MS * attempt);
                }
                continue;
            }

            return response.body;
        } catch (err) {
            lastError = err;
            log.warning(`Request failed on attempt ${attempt}: ${err.message}`);
            if (attempt < MAX_RETRIES) {
                await sleep(RETRY_DELAY_MS * attempt);
            }
        }
    }

    // All retries exhausted — log diagnostic info
    log.error(
        `All ${MAX_RETRIES} attempts failed for ${url}. Last error: ${lastError?.message || 'unknown'}`
    );
    return null;
}

// ─── __NEXT_DATA__ extraction from HTML ────────────────────────────
function extractNextData(html) {
    if (!html) return null;
    const match = html.match(
        /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/
    );
    if (!match) return null;
    try {
        return JSON.parse(match[1]);
    } catch (err) {
        log.warning(`Failed to parse __NEXT_DATA__: ${err.message}`);
        return null;
    }
}

// ─── Places API: resolve city name → slug ──────────────────────────
async function resolveCitySlug(cityName, proxyUrl) {
    // Check known cities first (instant, no network)
    const lower = cityName.toLowerCase().trim();
    if (KNOWN_CITIES[lower]) {
        log.info(`City "${cityName}" resolved from cache: ${KNOWN_CITIES[lower]}`);
        return KNOWN_CITIES[lower];
    }

    // Query Places API
    const apiUrl = `${DICE_API_ORIGIN}/places/search?types=city&query=${encodeURIComponent(cityName)}`;
    const body = await resilientFetch(apiUrl, proxyUrl);
    if (!body) return null;

    try {
        const data = JSON.parse(body);
        const predictions = data?.predictions || [];
        if (predictions.length === 0) {
            log.warning(`No city found for "${cityName}" via Places API`);
            return null;
        }

        // The Places API returns Mapbox-style predictions, not Dice.fm slugs directly
        // We need to construct the slug from the prediction name
        const prediction = predictions[0];
        const cityNameSlug = prediction.name
            .toLowerCase()
            .replace(/\s+/g, '_')
            .replace(/[^a-z0-9_-]/g, '');

        // If it matches a known pattern, use it; otherwise try the browse URL
        const slug = `${cityNameSlug}-${prediction.mapbox_id || prediction.id || ''}`;
        log.info(`City "${cityName}" resolved via Places API: ${slug}`);
        return slug;
    } catch (err) {
        log.warning(`Places API parse error: ${err.message}`);
        return null;
    }
}

// ─── Data formatting helpers ───────────────────────────────────────
function formatPrice(priceObj) {
    if (!priceObj) return null;
    const amountFrom = priceObj.amount_from ?? priceObj.amount;
    if (amountFrom == null) return null;
    const currency = priceObj.currency || 'USD';
    const value = (amountFrom / 100).toFixed(2);
    const symbols = { USD: '$', GBP: '£', EUR: '€', AUD: 'A$', CAD: 'C$' };
    const sym = symbols[currency] || `${currency} `;
    return `${sym}${value}`;
}

function formatDate(isoStr) {
    if (!isoStr) return null;
    try {
        const d = new Date(isoStr);
        if (Number.isNaN(d.getTime())) return null;
        return d.toISOString().split('T')[0];
    } catch {
        return null;
    }
}

function mapEvent(ev, pageUrl) {
    if (!ev || !ev.name) return null;
    const venue = ev.venues?.[0];
    const artists =
        ev.summary_lineup?.top_artists?.map((a) => a.name).filter(Boolean) || [];
    const priceStr = formatPrice(ev.price);
    const ticketTypes =
        ev.ticket_types?.map((tt) => ({
            name: tt.name || null,
            price: formatPrice({
                amount_from: tt.price?.amount || tt.price?.amount_from,
                currency: tt.price?.currency || ev.price?.currency,
            }),
            status: tt.status || null,
        })) || [];

    const item = {
        event_name: ev.name || null,
        status: ev.status || null,
        date: formatDate(ev.dates?.event_start_date) || null,
        date_end: formatDate(ev.dates?.event_end_date) || null,
        venue_name: venue?.name || null,
        venue_address: venue?.address || null,
        city: venue?.city?.name || ev.city_name || null,
        country: venue?.city?.country_name || null,
        price_from: priceStr || null,
        currency: ev.price?.currency || null,
        artists: artists.length ? artists : null,
        presented_by: ev.presented_by || null,
        category:
            ev.tags_types?.map((t) => t.title).filter(Boolean).join(', ') || null,
        image_url: ev.images?.square || null,
        event_url: ev.perm_name
            ? `https://dice.fm/event/${ev.perm_name}`
            : pageUrl || null,
        ticket_types: ticketTypes.length ? ticketTypes : null,
        max_tickets: ev.max_tickets || null,
        description: ev.about?.description || null,
    };

    // Remove null/undefined/empty fields
    return Object.fromEntries(
        Object.entries(item).filter(([, v]) => v != null && v !== '')
    );
}

// ─── URL type detection ────────────────────────────────────────────
function getUrlType(reqUrl) {
    if (/\/event\//i.test(reqUrl)) return 'EVENT';
    if (/\/search/i.test(reqUrl)) return 'SEARCH';
    if (/\/artist\//i.test(reqUrl)) return 'ARTIST';
    if (/\/venue\//i.test(reqUrl)) return 'VENUE';
    return 'BROWSE';
}

// ─── Extract events from browse/artist/venue page __NEXT_DATA__ ────
function extractEventsList(nextData) {
    const pp = nextData?.props?.pageProps;
    if (!pp) return { events: [], nextCursor: null, city: null };
    const events = pp.events || [];
    return {
        events: Array.isArray(events) ? events : [],
        nextCursor: pp.nextCursor || pp.next_cursor || null,
        city: pp.city || null,
    };
}

// ─── Extract single event detail from __NEXT_DATA__ ────────────────
function extractSingleEvent(nextData) {
    const pp = nextData?.props?.pageProps;
    if (!pp) return null;

    // Event detail pages store data in initialState (JSON string)
    let is = pp.initialState;
    if (typeof is === 'string') {
        try {
            is = JSON.parse(is);
        } catch {
            is = null;
        }
    }
    return is?.event?.event || pp.event || pp.events?.[0] || null;
}

// ─── Main scraper logic ────────────────────────────────────────────
async function main() {
    try {
        const input = (await Actor.getInput()) || {};
        const {
            url = '',
            keyword = '',
            location = '',
            results_wanted: RESULTS_WANTED_RAW = 20,
            max_pages: MAX_PAGES_RAW = 10,
            proxyConfiguration: proxyConfig,
        } = input;

        const RESULTS_WANTED = Number.isFinite(+RESULTS_WANTED_RAW)
            ? Math.max(1, +RESULTS_WANTED_RAW)
            : 20;
        const MAX_PAGES = Number.isFinite(+MAX_PAGES_RAW)
            ? Math.max(1, +MAX_PAGES_RAW)
            : 10;

        const proxyConfiguration = proxyConfig
            ? await Actor.createProxyConfiguration({ ...proxyConfig })
            : undefined;

        const proxyUrl = proxyConfiguration
            ? await proxyConfiguration.newUrl()
            : undefined;

        let saved = 0;
        let pagesVisited = 0;

        // ─── Determine URL to scrape ─────────────────────────────────
        let startUrl;
        let keywordFilter = null;

        if (url && url.trim()) {
            startUrl = url.trim();
        } else if (keyword && keyword.trim()) {
            // Search pages are Cloudflare-blocked, so use browse + keyword filtering
            keywordFilter = keyword.trim().toLowerCase();
            log.info(
                `Keyword "${keyword}" provided. Using browse page + local keyword filtering (search endpoint is Cloudflare-blocked).`
            );
            startUrl = `${DICE_ORIGIN}/browse/${DEFAULT_CITY_SLUG}`;
        } else if (location && location.trim()) {
            // Resolve location to city slug
            const locTrimmed = location.trim();
            // Check if it looks like a full slug already (contains dash + hex id)
            if (/^[a-z_]+-[0-9a-f]{8,}$/i.test(locTrimmed)) {
                startUrl = `${DICE_ORIGIN}/browse/${locTrimmed}`;
            } else {
                const slug = await resolveCitySlug(locTrimmed, proxyUrl);
                startUrl = slug
                    ? `${DICE_ORIGIN}/browse/${slug}`
                    : `${DICE_ORIGIN}/browse/${DEFAULT_CITY_SLUG}`;
            }
        } else {
            // Default: New York
            startUrl = `${DICE_ORIGIN}/browse/${DEFAULT_CITY_SLUG}`;
        }

        const urlType = getUrlType(startUrl);
        log.info(
            `Starting Dice.fm scraper: url=${startUrl}, type=${urlType}, keyword=${keywordFilter || 'none'}, results_wanted=${RESULTS_WANTED}, max_pages=${MAX_PAGES}`
        );

        // ─── Handle single event detail page ─────────────────────────
        if (urlType === 'EVENT') {
            const html = await resilientFetch(startUrl, proxyUrl);
            if (!html) {
                log.error(`Failed to fetch event page: ${startUrl}`);
                return;
            }
            const nextData = extractNextData(html);
            if (!nextData) {
                log.error(`No __NEXT_DATA__ found on ${startUrl}`);
                return;
            }
            const event = extractSingleEvent(nextData);
            if (event) {
                const mapped = mapEvent(event, startUrl);
                if (mapped && Object.keys(mapped).length > 0) {
                    await Dataset.pushData(mapped);
                    saved++;
                    log.info(`Saved event: ${mapped.event_name}`);
                }
            }
            log.info(`Finished. Saved ${saved} events.`);
            return;
        }

        // ─── Handle search page (warn about Cloudflare) ──────────────
        if (urlType === 'SEARCH') {
            log.warning(
                'Search URLs (/search) are Cloudflare-blocked when using got-scraping. ' +
                    'Use the keyword input field instead, or provide a browse/event URL. ' +
                    'Attempting fetch anyway...'
            );
            const html = await resilientFetch(startUrl, proxyUrl);
            if (!html) {
                log.error(
                    'Search page fetch failed. Please use keyword input or a browse URL instead.'
                );
                return;
            }
            // If we got through, try to extract
            const nextData = extractNextData(html);
            if (nextData) {
                const { events } = extractEventsList(nextData);
                for (const ev of events) {
                    if (saved >= RESULTS_WANTED) break;
                    const mapped = mapEvent(ev, startUrl);
                    if (mapped && Object.keys(mapped).length > 0) {
                        await Dataset.pushData(mapped);
                        saved++;
                    }
                }
                log.info(`Search page: saved ${saved} events`);
            }
            log.info(`Finished. Saved ${saved} events.`);
            return;
        }

        // ─── Browse / Artist / Venue page with pagination ────────────
        let currentUrl = startUrl;
        let pageNo = 0;

        while (saved < RESULTS_WANTED && pageNo < MAX_PAGES) {
            pageNo++;
            pagesVisited++;

            const html = await resilientFetch(currentUrl, proxyUrl);
            if (!html) {
                log.error(`Failed to fetch page ${pageNo}: ${currentUrl}`);
                break;
            }

            const nextData = extractNextData(html);
            if (!nextData) {
                log.error(`No __NEXT_DATA__ found on page ${pageNo}: ${currentUrl}`);
                break;
            }

            const { events, nextCursor } = extractEventsList(nextData);

            if (!events.length) {
                log.info(`No events on page ${pageNo}. Stopping.`);
                break;
            }

            let addedCount = 0;
            for (const ev of events) {
                if (saved >= RESULTS_WANTED) break;

                // Apply keyword filter if set
                if (keywordFilter) {
                    const searchText = [
                        ev.name,
                        ev.summary_lineup?.top_artists?.map((a) => a.name).join(' '),
                        ev.tags_types?.map((t) => t.title).join(' '),
                        ev.venues?.[0]?.name,
                        ev.presented_by,
                        ev.about?.description,
                    ]
                        .filter(Boolean)
                        .join(' ')
                        .toLowerCase();

                    if (!searchText.includes(keywordFilter)) {
                        continue; // Skip non-matching events
                    }
                }

                const mapped = mapEvent(ev, currentUrl);
                if (mapped && Object.keys(mapped).length > 0) {
                    await Dataset.pushData(mapped);
                    saved++;
                    addedCount++;
                }
            }

            log.info(
                `Page ${pageNo}: found ${events.length} events, saved ${addedCount}${keywordFilter ? ` (keyword: "${keywordFilter}")` : ''} (total: ${saved})`
            );

            // Stop if no cursor or we've reached the last page
            if (!nextCursor) {
                log.info('No more pages (no cursor). Stopping.');
                break;
            }

            // Build next page URL with cursor
            const nextUrl = new URL(currentUrl);
            nextUrl.searchParams.set('cursor', nextCursor);
            currentUrl = nextUrl.href;
        }

        if (keywordFilter && saved === 0) {
            log.warning(
                `No events matched keyword "${keywordFilter}". Try a different keyword or browse without filtering.`
            );
        }

        log.info(
            `Finished. Saved ${saved} events from ${pagesVisited} pages${keywordFilter ? ` (filtered by "${keywordFilter}")` : ''}.`
        );
    } finally {
        await Actor.exit();
    }
}

main().catch((err) => {
    log.error(err.message || String(err));
    process.exit(1);
});
