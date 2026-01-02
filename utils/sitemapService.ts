import { ProductEntry } from "../types";

// Helper to handle CORS issues with multiple fallbacks
const fetchWithProxy = async (targetUrl: string): Promise<string> => {
  // Add timestamp to prevent caching
  const urlWithTimestamp = `${targetUrl}${targetUrl.includes('?') ? '&' : '?'}t=${Date.now()}`;
  
  const proxies = [
    // CorsProxy.io is usually fastest and handles large XML files well
    (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
    // AllOrigins is a good backup
    (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  ];

  for (const createProxyUrl of proxies) {
    try {
      const proxyUrl = createProxyUrl(urlWithTimestamp);
      const response = await fetch(proxyUrl);
      if (response.ok) {
        const text = await response.text();
        // Basic validation to ensure we got something meaningful back
        if (text && text.length > 50) return text; 
      }
    } catch (e) {
      console.warn("Proxy attempt failed, trying next...", e);
      continue;
    }
  }
  throw new Error(`Kon URL niet ophalen via beschikbare proxies: ${targetUrl}`);
};

export const fetchSiteProducts = async (sitemapIndexUrl: string): Promise<ProductEntry[]> => {
  try {
    // 1. Fetch the Index Sitemap using robust proxy
    const indexText = await fetchWithProxy(sitemapIndexUrl);
    
    const parser = new DOMParser();
    const indexDoc = parser.parseFromString(indexText, "text/xml");

    // 2. Robustly find URL nodes (handles namespaced XML better)
    // First try getElementsByTagName (standard XML)
    let locNodes = Array.from(indexDoc.getElementsByTagName("loc"));
    
    // Fallback: If 0 nodes found, try querySelectorAll (sometimes better for specific DOM parsers)
    if (locNodes.length === 0) {
        locNodes = Array.from(indexDoc.querySelectorAll("loc"));
    }

    const sitemapUrls = locNodes
        .map(n => n.textContent?.trim() || "")
        .filter(url => url.length > 0);

    if (sitemapUrls.length === 0) {
        // If parsing fails completely, it might be that the URL point directly to a single sitemap instead of an index
        if (sitemapIndexUrl.includes("sitemap")) {
             console.log("No sub-sitemaps found, trying to parse as single sitemap...");
             // Treat input as a single sitemap
             return await fetchSubSitemap(sitemapIndexUrl, "Divers");
        }
        throw new Error("Geen sitemaps gevonden in de index.");
    }

    let fetchPromises: Promise<ProductEntry[]>[] = [];

    // 3. Iterate through all URLs and determine type based on filename
    sitemapUrls.forEach(url => {
        if (url.includes("product-sitemap")) {
            fetchPromises.push(fetchSubSitemap(url, "Product"));
        } else if (url.includes("post-sitemap")) {
            fetchPromises.push(fetchSubSitemap(url, "Blog"));
        } else if (url.includes("page-sitemap")) {
            fetchPromises.push(fetchSubSitemap(url, "Pagina"));
        } else if (url.includes("product_cat-sitemap") || url.includes("category-sitemap")) {
            fetchPromises.push(fetchSubSitemap(url, "Categorie"));
        }
    });

    // 4. Execute all fetches in parallel
    const results = await Promise.all(fetchPromises);
    
    // 5. Flatten and Filter
    let allEntries = results.flat();

    // Filter out irrelevant system pages and assets
    allEntries = allEntries.filter(p => 
        !p.url.includes('/my-account/') && 
        !p.url.includes('/cart/') && 
        !p.url.includes('/checkout/') &&
        !p.url.includes('/feed/') &&
        !p.url.includes('/wp-json/') &&
        !p.url.endsWith('.jpg') &&
        !p.url.endsWith('.png') &&
        !p.url.endsWith('.xml') // Remove sitemap urls themselves if they leaked in
    );

    // Remove duplicates
    const uniqueEntries = Array.from(new Map(allEntries.map(item => [item.url, item])).values());

    return uniqueEntries;

  } catch (error) {
    console.error("Sitemap fetch error:", error);
    throw error;
  }
};

const fetchSubSitemap = async (url: string, category: string): Promise<ProductEntry[]> => {
  try {
    const text = await fetchWithProxy(url);
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, "text/xml");
    
    let locNodes = Array.from(doc.getElementsByTagName("loc"));
    if (locNodes.length === 0) {
        locNodes = Array.from(doc.querySelectorAll("loc"));
    }

    return locNodes.map(n => {
        const urlContent = n.textContent?.trim() || "";
        if (!urlContent) return null;
        return {
            name: formatUrlToName(urlContent),
            url: urlContent,
            category: category
        };
    }).filter((item): item is ProductEntry => item !== null);
  } catch (e) {
    console.warn(`Failed to fetch sub-sitemap: ${url}`, e);
    return [];
  }
};

const formatUrlToName = (url: string): string => {
  // Remove domain
  let slug = url.replace("https://creativeuseoftechnology.com/", "").replace("http://creativeuseoftechnology.com/", "");
  
  // Remove common WordPress prefixes to get a cleaner name
  slug = slug
    .replace("product/", "")
    .replace("diensten/", "")
    .replace("product-categorie/", "")
    .replace("categorie/", "")
    .replace("blog/", ""); 
  
  // Remove trailing slash
  if (slug.endsWith("/")) slug = slug.slice(0, -1);

  // Replace dashes with spaces and capitalize
  return slug
    .split("-")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

// Function to scrape content from a specific URL
export const fetchPageContent = async (url: string): Promise<string> => {
  try {
    // Use the robust proxy for content scraping too
    const html = await fetchWithProxy(url);
    
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    // Extract specific WooCommerce/Wordpress content areas
    const title = doc.querySelector('h1')?.textContent?.trim() || "Naam onbekend";
    
    // Product descriptions
    const shortDesc = doc.querySelector('.woocommerce-product-details__short-description')?.textContent?.trim() || 
                      doc.querySelector('.term-description')?.textContent?.trim() || ""; 
    
    const longDesc = doc.querySelector('#tab-description')?.textContent?.trim() || 
                     doc.querySelector('.woocommerce-Tabs-panel--description')?.textContent?.trim() || "";

    // Extract Reviews (Specific for WooCommerce / standard WP Comments)
    // We look for .commentlist, #reviews, or .comment-text content
    let reviews = "";
    const reviewNodes = doc.querySelectorAll('.commentlist li .description, .comment-content, .review-text');
    
    if (reviewNodes.length > 0) {
        // Take top 3 reviews to avoid token overflow
        const topReviews = Array.from(reviewNodes).slice(0, 3).map(n => {
            const text = n.textContent?.trim() || "";
            // Clean up whitespace
            return text.replace(/\s+/g, ' ');
        }).filter(t => t.length > 10); // Filter out empty or too short reviews

        if (topReviews.length > 0) {
            reviews = topReviews.map(r => `"${r}"`).join("\n- ");
        }
    }

    // Blog/Page Content (Gutenberg/Classic)
    let generalContent = "";
    if (!shortDesc && !longDesc) {
        // Try standard content areas
        const contentDiv = doc.querySelector('.entry-content') || doc.querySelector('.elementor-widget-text-editor');
        if (contentDiv) {
             // Get first few paragraphs to keep context size manageable
             const paragraphs = Array.from(contentDiv.querySelectorAll('p')).slice(0, 5);
             generalContent = paragraphs.map(p => p.textContent).join(" ");
        }
    }

    // Combine and clean
    const fullText = `
      TYPE: Pagina/Product/Blog
      TITEL: ${title}
      URL: ${url}
      KORTE OMSCHRIJVING: ${shortDesc}
      DETAILS: ${longDesc}
      KLANT REVIEWS: 
      - ${reviews || "Geen reviews gevonden op deze pagina."}
      INHOUD: ${generalContent}
    `;

    return fullText.replace(/\s+/g, ' ').substring(0, 4000); // Increased limit slightly for reviews

  } catch (e) {
    console.warn("Could not fetch page content", url);
    return "";
  }
};