import type { NewsData, NewsAlert } from '../types';

const CDC_RSS_FEED = 'https://tools.cdc.gov/api/v2/resources/media/132608.rss'; // Health Alert Network RSS
const NYC_NEWS_URL = 'https://api.allorigins.win/raw?url=https://www.nyc.gov/site/doh/about/press/recent-press-releases.page';

async function fetchNYCNews(): Promise<NewsAlert[]> {
    try {
        const response = await fetch(NYC_NEWS_URL);
        if (!response.ok) throw new Error('Failed to fetch NYC news');
        const text = await response.text();

        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');

        // precise selector based on observed HTML structure: 
        // <p><strong>Date</strong><br><a href="...">Title</a></p>
        // We select all paragraphs in the content area. 
        // Based on the curl output, the content is in .iw_component
        // But a broader search for p tags with strong and a might be safer and robust enough.
        const paragraphs = Array.from(doc.querySelectorAll('p'));

        const alerts: NewsAlert[] = [];

        for (const p of paragraphs) {
            const strong = p.querySelector('strong');
            const link = p.querySelector('a');

            if (strong && link && link.href) {
                const dateText = strong.textContent?.trim() || '';
                const title = link.textContent?.trim() || '';
                // The href might be relative, need to ensure it's absolute
                let href = link.getAttribute('href') || '';
                if (href.startsWith('/')) {
                    href = `https://www.nyc.gov${href}`;
                }

                // Simple validation to ensure it's a news item
                if (dateText && title) {
                    alerts.push({
                        id: `nyc-${Math.random().toString(36).substr(2, 9)}`,
                        title: title,
                        summary: 'Press Release via NYC Health', // No summary available in this list view
                        date: dateText,
                        severity: 'info',
                        source: 'NYC Department of Health',
                        url: href
                    });
                }
            }
            if (alerts.length >= 10) break; // Limit to 10 items
        }

        return alerts;
    } catch (error) {
        console.warn('Failed to scrape NYC news:', error);
        return [];
    }
}

async function fetchCDCNews(): Promise<NewsAlert[]> {
    try {
        // Attempt to fetch CDC RSS feed as proxy for "Real Health Alerts" 
        // since NYC site doesn't have a public CORS-friendly JSON API.
        const response = await fetch(CDC_RSS_FEED);
        const text = await response.text();

        // Parse XML
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(text, "text/xml");
        const items = xmlDoc.querySelectorAll("item");

        return Array.from(items).slice(0, 5).map((item, index) => ({
            id: `cdc-${index}`,
            title: item.querySelector("title")?.textContent || "Unknown Alert",
            summary: item.querySelector("description")?.textContent || "",
            date: item.querySelector("pubDate")?.textContent || new Date().toISOString(),
            severity: 'info', // Default
            source: 'CDC Health Alert Network',
            url: item.querySelector("link")?.textContent || ""
        }));
    } catch (error) {
        console.warn('CDC News fetch failed:', error);
        return [];
    }
}

export async function fetchNewsData(): Promise<NewsData> {
    const [nycNews, cdcNews] = await Promise.all([
        fetchNYCNews(),
        fetchCDCNews()
    ]);

    return {
        nyc: nycNews,
        nys: [], // Currently no scraper for NYS
        usa: cdcNews,
        lastUpdated: new Date().toISOString()
    };
}
