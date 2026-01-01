import type { NewsData, NewsAlert } from '../types';

const CDC_RSS_FEED = 'https://tools.cdc.gov/api/v2/resources/media/132608.rss'; // Health Alert Network RSS
const NYC_NEWS_URL = 'https://corsproxy.io/?' + encodeURIComponent('https://www.nyc.gov/site/doh/about/press/recent-press-releases.page');
const NYS_NEWS_URL = 'https://corsproxy.io/?' + encodeURIComponent('https://info.nystateofhealth.ny.gov/news');

async function fetchNYCNews(): Promise<NewsAlert[]> {
    try {
        const response = await fetch(NYC_NEWS_URL);
        if (!response.ok) throw new Error('Failed to fetch NYC news');
        const text = await response.text();

        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');

        const paragraphs = Array.from(doc.querySelectorAll('p'));
        const alerts: NewsAlert[] = [];

        for (const p of paragraphs) {
            const strong = p.querySelector('strong');
            const link = p.querySelector('a');

            if (strong && link && link.href) {
                const dateText = strong.textContent?.trim() || '';
                const title = link.textContent?.trim() || '';
                let href = link.getAttribute('href') || '';
                if (href.startsWith('/')) {
                    href = `https://www.nyc.gov${href}`;
                }

                if (dateText && title) {
                    alerts.push({
                        id: `nyc-${Math.random().toString(36).substr(2, 9)}`,
                        title: title,
                        summary: 'Press Release via NYC Health',
                        date: dateText,
                        severity: 'info',
                        source: 'NYC Department of Health',
                        url: href
                    });
                }
            }
            if (alerts.length >= 5) break;
        }

        return alerts;
    } catch (error) {
        console.warn('Failed to scrape NYC news:', error);
        return [];
    }
}

async function fetchNYSNews(): Promise<NewsAlert[]> {
    try {
        const response = await fetch(NYS_NEWS_URL);
        if (!response.ok) throw new Error('Failed to fetch NYS news');
        const text = await response.text();

        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');

        const articles = Array.from(doc.querySelectorAll('article.node--type-news'));
        const alerts: NewsAlert[] = [];

        for (const article of articles) {
            const link = article.querySelector('h2.node__title a');
            const dateElem = article.querySelector('.field--name-field-publication-date time');

            if (link) {
                const title = link.textContent?.trim() || '';
                let href = link.getAttribute('href') || '';
                if (href.startsWith('/')) {
                    href = `https://info.nystateofhealth.ny.gov${href}`;
                }
                const dateText = dateElem?.textContent?.trim() || new Date().toLocaleDateString();

                alerts.push({
                    id: `nys-${Math.random().toString(36).substr(2, 9)}`,
                    title: title,
                    summary: 'News & Events via NY State of Health',
                    date: dateText,
                    severity: 'info',
                    source: 'NY State of Health',
                    url: href
                });
            }
            if (alerts.length >= 5) break;
        }

        return alerts;
    } catch (error) {
        console.warn('Failed to scrape NYS news:', error);
        return [];
    }
}

async function fetchCDCNews(): Promise<NewsAlert[]> {
    try {
        const response = await fetch(CDC_RSS_FEED);
        const text = await response.text();

        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(text, "text/xml");
        const items = xmlDoc.querySelectorAll("item");

        return Array.from(items).slice(0, 5).map((item, index) => ({
            id: `cdc-${index}`,
            title: item.querySelector("title")?.textContent || "Unknown Alert",
            summary: item.querySelector("description")?.textContent || "",
            date: item.querySelector("pubDate")?.textContent || new Date().toISOString(),
            severity: 'info',
            source: 'CDC Health Alert Network',
            url: item.querySelector("link")?.textContent || ""
        }));
    } catch (error) {
        console.warn('CDC News fetch failed:', error);
        return [];
    }
}

export async function fetchNewsData(): Promise<NewsData> {
    const [nycNews, nysNews, cdcNews] = await Promise.all([
        fetchNYCNews(),
        fetchNYSNews(),
        fetchCDCNews()
    ]);

    return {
        nyc: nycNews,
        nys: nysNews,
        usa: cdcNews,
        lastUpdated: new Date().toISOString()
    };
}
