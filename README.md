# Dice.fm Events Scraper

Extract comprehensive event data from Dice.fm — the world's leading live events and ticketing platform. Scrape events by city, genre, category, artist, or venue including names, dates, prices, artists, venues, and ticket information. Perfect for event research, market analysis, trend monitoring, and building event databases.

## Features

- **City Browse** — Collect all upcoming events from any Dice.fm city page
- **Genre Filtering** — Filter events by music genre (DJ, Gigs, Party) or culture category (Comedy, Sport, Theatre, Art)
- **Event Details** — Extract full event information including lineup, pricing, and descriptions
- **Artist & Venue Pages** — Scrape events for specific artists or venues
- **Smart Pagination** — Automatically handles multi-page results
- **Multi-Currency** — Supports USD, GBP, EUR, AUD pricing
- **Null-Free Output** — Only includes fields with actual data — no empty or null values

---

## Use Cases

### Event Discovery & Research

Discover upcoming events across cities and genres. Track which artists are performing, where, and when — ideal for music journalists, bloggers, and entertainment researchers building comprehensive event databases.

### Market Intelligence

Analyze ticket pricing trends across venues, cities, and genres. Identify pricing patterns, premium vs. budget events, and market gaps for competitive positioning in the live events industry.

### Event Aggregation

Build event listings for apps, websites, or newsletters. Automatically collect fresh event data to populate calendars, recommendation engines, or event comparison platforms.

### Trend Monitoring

Track emerging artists, trending genres, and popular venues over time. Use structured event data to identify cultural trends and audience preferences across regions.

### Promoter & Venue Analysis

Monitor event schedules for specific venues or promoters. Analyze event frequency, genre mix, and pricing strategies to understand competitive landscapes.

---

## Input Parameters

| Parameter            | Type    | Required | Default                    | Description                                                                                               |
| -------------------- | ------- | -------- | -------------------------- | --------------------------------------------------------------------------------------------------------- |
| `url`                | String  | No       | —                          | Any Dice.fm URL (browse, event, artist, or venue page). Defaults to New York browse page if not provided. |
| `results_wanted`     | Integer | No       | `100`                      | Maximum number of events to collect.                                                                      |
| `max_pages`          | Integer | No       | `10`                       | Maximum number of pages to visit for pagination.                                                          |
| `proxyConfiguration` | Object  | No       | `{"useApifyProxy": false}` | Apify Proxy configuration. Recommended for large-scale runs.                                              |

---

## Output Data

Each item in the dataset contains (null fields are automatically excluded):

| Field           | Type   | Description                                           |
| --------------- | ------ | ----------------------------------------------------- |
| `event_name`    | String | Name of the event                                     |
| `status`        | String | Ticket status (e.g., "on-sale", "sold-out")           |
| `date`          | String | Event start date (YYYY-MM-DD)                         |
| `date_end`      | String | Event end date (YYYY-MM-DD)                           |
| `venue_name`    | String | Venue name                                            |
| `venue_address` | String | Full venue address                                    |
| `city`          | String | City name                                             |
| `country`       | String | Country name                                          |
| `price_from`    | String | Starting price with currency symbol (e.g., "$38.17")  |
| `currency`      | String | Currency code (e.g., "USD", "GBP", "EUR")             |
| `artists`       | Array  | List of performing artist names                       |
| `presented_by`  | String | Promoter or organizer name                            |
| `category`      | String | Event category (e.g., "DJ", "Gigs", "Comedy")         |
| `image_url`     | String | Event image URL                                       |
| `event_url`     | String | Full Dice.fm event page URL                           |
| `ticket_types`  | Array  | Available ticket tiers with names, prices, and status |
| `max_tickets`   | Number | Maximum tickets per order                             |
| `description`   | String | Event description text                                |

---

## Usage Examples

### Browse Events by City

Collect events from a specific city:

```json
{
    "url": "https://dice.fm/browse/new_york-5bbf4db0f06331478e9b2c59",
    "results_wanted": 50
}
```

### Filter by Genre

Get only DJ events in London:

```json
{
    "url": "https://dice.fm/browse/london-54d8a23438fe5d27d500001c/music/dj",
    "results_wanted": 30
}
```

### Single Event Details

Extract full details for a specific event:

```json
{
    "url": "https://dice.fm/event/6dadr3-unreal-x-rush-12th-sep-knockdown-center-new-york-tickets",
    "results_wanted": 1
}
```

### Large Scale Collection

Collect events from multiple pages with proxy:

```json
{
    "url": "https://dice.fm/browse/london-54d8a23438fe5d27d500001c",
    "results_wanted": 500,
    "max_pages": 20,
    "proxyConfiguration": {
        "useApifyProxy": true,
        "apifyProxyGroups": ["RESIDENTIAL"]
    }
}
```

---

## Sample Output

```json
{
    "event_name": "ANOTR at Ally Pally",
    "status": "on-sale",
    "date": "2026-09-17",
    "date_end": "2026-09-17",
    "venue_name": "Alexandra Palace",
    "venue_address": "Alexandra Palace, Alexandra Palace Way, London N22 7AY",
    "city": "London",
    "country": "United Kingdom",
    "price_from": "£42.04",
    "currency": "GBP",
    "artists": ["ANOTR"],
    "presented_by": "Presented by Labyrinth.",
    "category": "DJ",
    "image_url": "https://dice-media.imgix.net/attachments/2026-06-04/40c54c68.jpg",
    "event_url": "https://dice.fm/event/2wyym6-anotr-at-ally-pally-17th-sep-alexandra-palace-london-tickets",
    "max_tickets": 6,
    "description": "ANOTR head to the iconic Alexandra Palace for their biggest UK headline dates..."
}
```

---

## Tips for Best Results

### Use Direct URLs

Paste the exact Dice.fm URL for the most reliable results. Browse pages, event pages, artist pages, and venue pages are all supported.

### Popular City Slugs

- **New York**: `new_york-5bbf4db0f06331478e9b2c59`
- **London**: `london-54d8a23438fe5d27d500001c`
- **Berlin**: `berlin-5e426dbb749e68e3e923d1e4`

### Genre Filters

Append `/music/dj`, `/music/gig`, `/music/party`, `/culture/comedy`, `/culture/sport`, or `/culture/theatre` to any browse URL to filter by genre.

### Optimize Collection Size

Start with 10-20 results for testing, then increase for production runs. Use `max_pages` to control how many pages the scraper visits.

### Use Proxy for Large Runs

Enable Apify Proxy (residential recommended) when collecting large datasets to ensure consistent results.

---

## Integrations

Connect your event data with:

- **Google Sheets** — Export for spreadsheet analysis and reporting
- **Airtable** — Build searchable event databases
- **Slack** — Get notifications for new events matching your criteria
- **Webhooks** — Send event data to custom endpoints in real-time
- **Make** — Create automated event monitoring workflows
- **Zapier** — Trigger actions when new events are found

### Export Formats

Download data in multiple formats:

- **JSON** — For developers and API integrations
- **CSV** — For spreadsheet analysis
- **Excel** — For business reporting
- **XML** — For system integrations

---

## Frequently Asked Questions

### How many events can I collect?

The scraper can collect all available events for a city or search. Most cities have 20-100 upcoming events. Use `results_wanted` to set your limit.

### Which cities are supported?

All cities available on Dice.fm are supported — including major cities across the UK, Europe, USA, and Australia. Just paste the Dice.fm browse URL for any city.

### Can I scrape event details like full descriptions?

Yes, event detail pages include full descriptions, lineup information, ticket types, and more. Just provide the event URL directly.

### What if an event is sold out?

The scraper captures the event status (e.g., "on-sale", "sold-out") so you can filter results accordingly.

### How often should I run this?

For monitoring new events, running daily or weekly is recommended. Use Apify Schedules to automate recurring runs.

### Can I filter by date?

The scraper collects all events from the browse page. You can filter the output dataset by date after collection.

### Does it work with artist and venue pages?

Yes! Provide any Dice.fm artist page URL (`/artist/...`) or venue page URL (`/venue/...`) to collect all their upcoming events.

---

## Support

For issues or feature requests, contact support through the Apify Console.

### Resources

- [Apify Documentation](https://docs.apify.com/)
- [API Reference](https://docs.apify.com/api/v2)
- [Scheduling Runs](https://docs.apify.com/schedules)

---

## Legal Notice

This actor is designed for legitimate data collection purposes. Users are responsible for ensuring compliance with website terms of service and applicable laws. Use data responsibly and respect rate limits. Dice.fm is a registered trademark of Dice.fm Ltd. This scraper is not affiliated with or endorsed by Dice.fm.
