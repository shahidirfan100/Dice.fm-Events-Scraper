# Dice.fm API Discovery

## Overview

Dice.fm is a Next.js (SSR) application. All page data is embedded server-side in the `__NEXT_DATA__` script tag as structured JSON. No separate REST API is needed for most pages — the HTML response itself contains complete JSON data.

## Extraction Method

**Primary**: HTTP GET with `got-scraping` → Parse `__NEXT_DATA__` from HTML source via regex.
**Works with**: got-scraping (no browser needed for browse, event, artist, venue pages).
**Blocked**: `/search` endpoint returns 403 Cloudflare challenge.

## Required Headers (Browser-like, Same-Origin)

```
accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8
accept-language: en-US,en;q=0.9
origin: https://dice.fm
referer: https://dice.fm/
sec-fetch-dest: document
sec-fetch-mode: navigate
sec-fetch-site: same-origin
user-agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36
```

## Discovered Endpoints

### 1. Browse Page (City Events)

- **URL**: `https://dice.fm/browse/{city_slug}`
- **Example**: `https://dice.fm/browse/new_york-5bbf4db0f06331478e9b2c59`
- **Method**: GET
- **Auth**: None
- **Pagination**: `?cursor={nextCursor}` (cursor-based)
- **Data path**: `__NEXT_DATA__.props.pageProps.events[]`
- **Fields**: name, status, dates, price, venues, summary_lineup, images, perm_name, tags_types, about, max_tickets, presented_by, etc. (40+ fields per event)
- **Events per page**: ~29-30
- **Score**: 95/100

### 2. Browse with Genre/Category Filter

- **URL**: `https://dice.fm/browse/{city_slug}/music/{genre}` or `/culture/{category}`
- **Example**: `https://dice.fm/browse/new_york-5bbf4db0f06331478e9b2c59/music/gig`
- **Pagination**: Cursor-based, same as browse
- **Events per page**: ~22
- **Data path**: Same as browse

### 3. Event Detail Page

- **URL**: `https://dice.fm/event/{perm_name}`
- **Example**: `https://dice.fm/event/6dadr3-unreal-x-rush-12th-sep-knockdown-center-new-york-tickets`
- **Data path**: `__NEXT_DATA__.props.pageProps.initialState` (JSON string) → parse → `.event.event`
- **Fields**: Same event fields + full `about.description`, `faqs`, `streaming_options`, `public_refund_policy`
- **Score**: 90/100

### 4. Artist Page

- **URL**: `https://dice.fm/artist/{artist_slug}`
- **Data path**: `__NEXT_DATA__.props.pageProps.events[]`
- **Returns**: All upcoming events for that artist

### 5. Venue Page

- **URL**: `https://dice.fm/venue/{venue_slug}`
- **Data path**: `__NEXT_DATA__.props.pageProps.events[]`
- **Returns**: All upcoming events at that venue

### 6. Places API (City Lookup)

- **URL**: `https://api.dice.fm/places/search?types=city&query={city_name}`
- **Method**: GET
- **Auth**: None
- **Returns**: JSON with `predictions[]` containing city name, country, mapbox_id
- **Use**: Resolve city names to browse page slugs

### 7. Search Page (BLOCKED)

- **URL**: `https://dice.fm/search?query={keyword}`
- **Status**: 403 Cloudflare challenge — cannot use with got-scraping
- **Fallback**: Use browse page + keyword filtering, or Playwright Firefox

## Price Format

- Prices are in **cents**: `3817` = `$38.17`
- Currency: `USD`, `GBP`, `EUR`, etc.
- Price path: `event.price.amount_from` or `event.price.amount`

## Key Data Paths

```
Browse/Search: __NEXT_DATA__.props.pageProps.events[]
Pagination:    __NEXT_DATA__.props.pageProps.nextCursor
City info:     __NEXT_DATA__.props.pageProps.city
Event detail:  __NEXT_DATA__.props.pageProps.initialState (JSON string) → .event.event
```

## Known City Slugs

| City        | Slug                                   |
| ----------- | -------------------------------------- |
| New York    | `new_york-5bbf4db0f06331478e9b2c59`    |
| London      | `london-54d8a23438fe5d27d500001c`      |
| Berlin      | `berlin-5e426dbb749e68e3e923d1e4`      |
| Los Angeles | `los_angeles-5bbf4db0f06331478e9b2c5a` |

## Why Playwright Can Be Removed

All SSR pages (browse, event, artist, venue) return complete `__NEXT_DATA__` in the initial HTML response. No JavaScript execution, cookies, or browser session is needed. got-scraping with proper browser-like headers is sufficient and **10x faster** than Playwright.
