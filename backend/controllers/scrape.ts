import { Request, Response } from 'express';
import puppeteer from 'puppeteer';

interface Product {
    title: string | null | undefined;
    price: string | null | undefined;
    link: string | null | undefined;
}

interface ScrapingResult {
    success: boolean;
    data: Product[];
    error?: string;
    source: string;
}

// New interface for multiple item search
interface MultipleSearchItem {
    id: string;
    name: string;
    status: 'pending' | 'searching' | 'completed' | 'cancelled';
    results?: { [source: string]: Product[] };
    errors?: { [source: string]: string };
    progress?: number;
}

interface MultipleSearchProgress {
    items: MultipleSearchItem[];
    currentItem: number;
    totalItems: number;
    status: 'pending' | 'running' | 'completed' | 'cancelled';
    canCancel: boolean;
    abortController?: AbortController;
}

// Store for managing multiple search sessions
const searchSessions = new Map<string, MultipleSearchProgress>();

// Utility function to create a cancellable Promise.allSettled
function cancellablePromiseAllSettled<T>(
    promises: Promise<T>[],
    abortSignal?: AbortSignal
): Promise<PromiseSettledResult<T>[]> {
    return new Promise((resolve, reject) => {
        if (abortSignal?.aborted) {
            reject(new Error('Operation was cancelled'));
            return;
        }

        // Create an abort promise that rejects when signal is aborted
        const abortPromise = new Promise<never>((_, reject) => {
            if (abortSignal) {
                abortSignal.addEventListener('abort', () => {
                    reject(new Error('Operation was cancelled'));
                });
            }
        });

        // Race between the actual operation and the abort signal
        Promise.race([
            Promise.allSettled(promises),
            abortPromise
        ])
        .then(results => {
            // If we get here, it's the Promise.allSettled result
            resolve(results as PromiseSettledResult<T>[]);
        })
        .catch(error => {
            // If we get here, either Promise.allSettled failed or abort was triggered
            reject(error);
        });
    });
}

// Utility function to add timeout to promises
function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) => 
            setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
        )
    ]);
}

// Wrapper function to handle errors and timeouts for scraping functions
async function safeScrapingWrapper(
    scrapingFunction: (searchTerm: string, abortSignal?: AbortSignal) => Promise<Product[]>,
    searchTerm: string,
    sourceName: string,
    timeoutMs: number = 60000,
    abortSignal?: AbortSignal
): Promise<ScrapingResult> {
    try {
        // Check if already aborted
        if (abortSignal?.aborted) {
            return {
                success: false,
                data: [],
                error: 'Operation was cancelled',
                source: sourceName
            };
        }

        const data = await withTimeout(scrapingFunction(searchTerm, abortSignal), timeoutMs);
        return {
            success: true,
            data: data || [],
            source: sourceName
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '';
        if (abortSignal?.aborted || errorMessage.includes('cancelled') || errorMessage.includes('aborted')) {
            return {
                success: false,
                data: [],
                error: 'Operation was cancelled',
                source: sourceName
            };
        }
        console.error(`Error scraping ${sourceName}:`, error);
        return {
            success: false,
            data: [],
            error: error instanceof Error ? error.message : 'Unknown error occurred',
            source: sourceName
        };
    }
}

async function tgp(SEARCH_TERM: string, abortSignal?: AbortSignal): Promise<Product[]> {
    const TGP_URL = "https://tgp.com.ph/search?controller=search&s=" + SEARCH_TERM;
    let browser: any = null;

    try {
        // Check if cancelled before starting
        if (abortSignal?.aborted) {
            throw new Error('Operation was cancelled');
        }

        browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            headless: true,
        });
        
        // Check cancellation after browser launch
        if (abortSignal?.aborted) {
            throw new Error('Operation was cancelled');
        }
        
        const page = await browser.newPage();

        // Set up abort listener to immediately close browser
        const currentBrowser = browser; // Capture browser reference for closure
        if (abortSignal) {
            abortSignal.addEventListener('abort', async () => {
                console.log('TGP: Abort signal received, closing browser');
                if (currentBrowser) {
                    await currentBrowser.close().catch(() => {}); // Ignore errors during cleanup
                }
            });
        }

        // Set longer timeout for page operations
        page.setDefaultTimeout(20000); // Reduced timeout for faster cancellation
        
        // Check cancellation before navigation
        if (abortSignal?.aborted) {
            throw new Error('Operation was cancelled');
        }
        
        await page.goto(TGP_URL, { 
            waitUntil: 'domcontentloaded',
            timeout: 20000 
        });

        // Check cancellation after navigation
        if (abortSignal?.aborted) {
            throw new Error('Operation was cancelled');
        }

        // Set screen size
        await page.setViewport({ width: 300, height: 300 });

        // Check cancellation before scraping
        if (abortSignal?.aborted) {
            throw new Error('Operation was cancelled');
        }

        const productsHandles = await page.$$('.products.row > *');

        const products: Product[] = [];
        
        // Process products with more frequent cancellation checks
        for (let i = 0; i < productsHandles.length; i++) {
            // Check cancellation every 5 products
            if (i % 5 === 0 && abortSignal?.aborted) {
                throw new Error('Operation was cancelled');
            }
            
            try {
                const productsHandle = productsHandles[i];
                const title = await page.evaluate((el: any) => el.querySelector(".h3.product-title a")?.textContent, productsHandle);
                const formatTitle = title?.replace(/(\r\n|\n|\r)/gm, "").trim();
                const price = await page.evaluate((el: any) => el.querySelector(".price")?.textContent, productsHandle);
                const formatPrice = price?.replace(/(\r\n|\n|\r)/gm, "").trim();
                const link = await page.evaluate((el: any) => el.querySelector(".thumbnail-top a")?.getAttribute('href'), productsHandle);
            
                products.push({
                    title: formatTitle,
                    price: formatPrice,
                    link: link
                });

            } catch (error) {
                console.log("Error processing TGP product:", error);
            }
        }

        return products;
    } finally {
        if (browser) {
            await browser.close().catch(() => {}); // Ignore errors during cleanup
        }
    }
}

async function southstar(SEARCH_TERM: string, abortSignal?: AbortSignal): Promise<Product[]> {
    const URL = `https://southstardrug.com.ph/search?q=${SEARCH_TERM}&options%5Bprefix%5D=last`
    let browser: any = null;

    try {
        // Check if cancelled before starting
        if (abortSignal?.aborted) {
            throw new Error('Operation was cancelled');
        }

        browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            headless: true,
        });
        
        // Check cancellation after browser launch
        if (abortSignal?.aborted) {
            throw new Error('Operation was cancelled');
        }
        
        const page = await browser.newPage();

        // Set up abort listener
        const currentBrowser = browser;
        if (abortSignal) {
            abortSignal.addEventListener('abort', async () => {
                console.log('Southstar: Abort signal received, closing browser');
                if (currentBrowser) {
                    await currentBrowser.close().catch(() => {});
                }
            });
        }

        page.setDefaultTimeout(20000); // Reduced timeout
        
        if (abortSignal?.aborted) {
            throw new Error('Operation was cancelled');
        }
        
        await page.goto(URL, { 
            waitUntil: 'domcontentloaded',
            timeout: 20000 
        });

        await page.setViewport({ width: 300, height: 300 });
        
        // Wait for products to load, but don't fail if they don't appear
        try {
            await page.waitForSelector('.boost-sd__product-list', { timeout: 10000 });
        } catch (e) {
            console.log("Southstar: Products container not found, continuing anyway");
        }
        
        const productsHandles = await page.$$('.boost-sd__product-list > .boost-sd__product-item');

        const products: Product[] = [];
        for (const productsHandle of productsHandles) {
            try {
                const title = await page.evaluate((el: any) => el.querySelector(".boost-sd__product-title")?.textContent, productsHandle);
                const formatTitle = title?.replace(/(\r\n|\n|\r)/gm, "").trim();
                const price = await page.evaluate((el: any) => el.querySelector(".boost-sd__format-currency")?.textContent, productsHandle);
                const formatPrice = price?.replace(/(\r\n|\n|\r)/gm, "").trim();
                const link = await page.evaluate((el: any) => el.querySelector(".boost-sd__product-link")?.getAttribute('href'), productsHandle);
                
                products.push({
                    title: formatTitle,
                    price: formatPrice,
                    link: "https://southstardrug.com.ph" + link
                });

            } catch (error) { 
                console.log("Error processing Southstar product:", error);
            }
        }

        return products;
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

async function watsons(SEARCH_TERM: string, abortSignal?: AbortSignal): Promise<Product[]> {
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3';
    const URL = `https://www.watsons.com.ph/search?text=${SEARCH_TERM}`
    let browser;

    try {
        // Check if cancelled before starting
        if (abortSignal?.aborted) {
            throw new Error('Operation was cancelled');
        }

        browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            headless: true,
        });
        const page = await browser.newPage();
        page.setUserAgent(userAgent);

        page.setDefaultTimeout(45000);
        await page.goto(URL, { 
            waitUntil: 'domcontentloaded',
            timeout: 45000 
        });

        await page.setViewport({ width: 1366, height: 768 });
        
        // Wait for at least one of the product containers to be available
        try {
            await page.waitForSelector('.cx-product-container', { timeout: 15000 });
        } catch (e) {
            console.log("Watsons: Product container not found, continuing anyway");
        }

        const productsHandles = await page.$$('.cx-product-container > .product-container.gridMode.ng-star-inserted > .ng-star-inserted');

        const products: Product[] = [];
        for (const productsHandle of productsHandles) {
            try {
                const title = await page.evaluate(el => el.querySelector(".productName")?.textContent, productsHandle);
                const formatTitle = title?.replace(/(\r\n|\n|\r)/gm, "").trim();
                const price = await page.evaluate(el => el.querySelector(".formatted-value.ng-star-inserted")?.textContent, productsHandle);
                const formatPrice = price?.replace(/(\r\n|\n|\r)/gm, "").trim();
                const link = await page.evaluate(el => el.querySelector(".productBottom a")?.getAttribute('href'), productsHandle);
                
                products.push({
                    title: formatTitle,
                    price: formatPrice,
                    link: "https://www.watsons.com.ph" + link
                });

            } catch (error) { 
                console.log("Error processing Watsons product:", error);
            }
        }

        return products;
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

async function rose(SEARCH_TERM: string, abortSignal?: AbortSignal): Promise<Product[]> {
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    const URL = `https://www.rosepharmacy.com/?s=${SEARCH_TERM}&post_type=product`;
    let browser;

    try {
        // Check if cancelled before starting
        if (abortSignal?.aborted) {
            throw new Error('Operation was cancelled');
        }

        console.log(`🔍 Rose Pharmacy: Starting search for "${SEARCH_TERM}" at ${URL}`);

        browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            headless: true,
        });
        const page = await browser.newPage();
        
        await page.setUserAgent(userAgent);
        page.setDefaultTimeout(45000);
        await page.goto(URL, { 
            waitUntil: 'domcontentloaded',
            timeout: 45000 
        });

        await page.setViewport({ width: 1200, height: 800 });

        console.log(`📄 Rose Pharmacy: Page loaded, waiting for content...`);

        try {
            await page.waitForSelector('.wpb_wrapper', { timeout: 15000 });
            console.log(`✅ Rose Pharmacy: Content wrapper found`);
        } catch (e) {
            console.log("⚠️ Rose Pharmacy: Content wrapper not found, trying alternative selectors...");
            
            // Try to wait for any product-related content
            try {
                await page.waitForSelector('.porto-tb-item', { timeout: 10000 });
                console.log(`✅ Rose Pharmacy: Found product items with alternative selector`);
            } catch (e2) {
                console.log("⚠️ Rose Pharmacy: No product content found, proceeding anyway");
                
                // Log page content for debugging
                const pageContent = await page.content();
                if (pageContent.includes('No products found') || pageContent.includes('no results')) {
                    console.log(`🔍 Rose Pharmacy: Page indicates no products found for "${SEARCH_TERM}"`);
                } else {
                    console.log(`🔍 Rose Pharmacy: Page loaded but no expected selectors found`);
                }
            }
        }
        
        // Try multiple selector strategies
        let productHandles = await page.$$('.porto-posts-grid.porto-posts-grid-75121fa532f6c490d02770d2b728412e > .products-container > .porto-tb-item');
        
        if (productHandles.length === 0) {
            console.log(`🔍 Rose Pharmacy: Primary selector found 0 products, trying alternative selectors...`);
            
            // Alternative selector 1
            productHandles = await page.$$('.porto-tb-item');
            console.log(`🔍 Rose Pharmacy: Alternative selector 1 found ${productHandles.length} products`);
            
            if (productHandles.length === 0) {
                // Alternative selector 2
                productHandles = await page.$$('[class*="product"]');
                console.log(`🔍 Rose Pharmacy: Alternative selector 2 found ${productHandles.length} products`);
                
                if (productHandles.length === 0) {
                    // Alternative selector 3
                    productHandles = await page.$$('.woocommerce-product, .product');
                    console.log(`🔍 Rose Pharmacy: Alternative selector 3 found ${productHandles.length} products`);
                }
            }
        } else {
            console.log(`✅ Rose Pharmacy: Primary selector found ${productHandles.length} products`);
        }

        const products: Product[] = [];
        for (const productHandle of productHandles) {
            try {
                const title = await page.evaluate(el => {
                    // Try multiple title selectors
                    return el.querySelector(".post-title")?.textContent ||
                           el.querySelector(".product-title")?.textContent ||
                           el.querySelector("h2")?.textContent ||
                           el.querySelector("h3")?.textContent ||
                           el.querySelector("[class*='title']")?.textContent;
                }, productHandle);
                
                const formatTitle = title?.replace(/(\r\n|\n|\r)/gm, "").trim();
                
                const price = await page.evaluate(el => {
                    // Try multiple price selectors
                    return el.querySelector(".woocommerce-Price-amount.amount")?.textContent ||
                           el.querySelector(".price")?.textContent ||
                           el.querySelector("[class*='price']")?.textContent ||
                           el.querySelector(".amount")?.textContent;
                }, productHandle);
                
                const formatPrice = price?.replace(/(\r\n|\n|\r)/gm, "").trim();
                
                const link = await page.evaluate(el => {
                    // Try multiple link selectors
                    return el.querySelector(".porto-tb-featured-image a")?.getAttribute('href') ||
                           el.querySelector("a")?.getAttribute('href');
                }, productHandle);

                if (formatTitle) {  // Only add if we have a title
                    products.push({
                        title: formatTitle,
                        price: formatPrice,
                        link: link
                    });
                }

            } catch (error) { 
                console.log("⚠️ Rose Pharmacy: Error processing product:", error);
            }
        }

        console.log(`✅ Rose Pharmacy: Successfully scraped ${products.length} products for "${SEARCH_TERM}"`);
        return products;
    } catch (error) {
        console.error(`❌ Rose Pharmacy: Error scraping for "${SEARCH_TERM}":`, error);
        throw error;
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

async function getmeds(SEARCH_TERM: string, abortSignal?: AbortSignal): Promise<Product[]> {
    const URL = `https://getmeds.ph/search?s=${SEARCH_TERM}`;
    let browser;

    try {
        // Check if cancelled before starting
        if (abortSignal?.aborted) {
            throw new Error('Operation was cancelled');
        }

        console.log(`🔍 GetMeds: Starting search for "${SEARCH_TERM}" at ${URL}`);

        browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            headless: true,
        });
        const page = await browser.newPage();
        
        // Set user agent to avoid blocking
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        page.setDefaultTimeout(45000);
        await page.goto(URL, { 
            waitUntil: 'domcontentloaded',
            timeout: 45000 
        });

        await page.setViewport({ width: 1200, height: 800 });

        console.log(`📄 GetMeds: Page loaded, waiting for content...`);

        try {
            await page.waitForSelector('.product_list_outer', { timeout: 15000 });
            console.log(`✅ GetMeds: Product list container found`);
        } catch (e) {
            console.log("⚠️ GetMeds: Product list container not found, trying alternative selectors...");
            
            // Try to wait for any product-related content
            try {
                await page.waitForSelector('.product_item', { timeout: 10000 });
                console.log(`✅ GetMeds: Found product items with alternative selector`);
            } catch (e2) {
                console.log("⚠️ GetMeds: No product content found, proceeding anyway");
                
                // Log page content for debugging
                const pageContent = await page.content();
                if (pageContent.includes('No products found') || pageContent.includes('no results')) {
                    console.log(`🔍 GetMeds: Page indicates no products found for "${SEARCH_TERM}"`);
                } else {
                    console.log(`🔍 GetMeds: Page loaded but no expected selectors found`);
                }
            }
        }
        
        // Try multiple selector strategies
        let productHandles = await page.$$('.product_list_outer > .row.product_list > .col-md-4.col-sm-6 > .product_item');
        
        if (productHandles.length === 0) {
            console.log(`🔍 GetMeds: Primary selector found 0 products, trying alternative selectors...`);
            
            // Alternative selector 1
            productHandles = await page.$$('.product_item');
            console.log(`🔍 GetMeds: Alternative selector 1 found ${productHandles.length} products`);
            
            if (productHandles.length === 0) {
                // Alternative selector 2
                productHandles = await page.$$('[class*="product"]');
                console.log(`🔍 GetMeds: Alternative selector 2 found ${productHandles.length} products`);
            }
        } else {
            console.log(`✅ GetMeds: Primary selector found ${productHandles.length} products`);
        }

        const products: Product[] = [];
        for (const productHandle of productHandles) {
            try {
                const title = await page.evaluate(el => {
                    // Try multiple title selectors
                    return el.querySelector(".product_item_title")?.textContent ||
                           el.querySelector(".product-title")?.textContent ||
                           el.querySelector("[class*='title']")?.textContent ||
                           el.querySelector("h3")?.textContent ||
                           el.querySelector("h4")?.textContent;
                }, productHandle);
                
                const formatTitle = title?.replace(/(\r\n|\n|\r)/gm, "").trim();
                
                const price = await page.evaluate(el => {
                    // Try multiple price selectors
                    return el.querySelector(".product-list-price")?.textContent ||
                           el.querySelector(".price")?.textContent ||
                           el.querySelector("[class*='price']")?.textContent ||
                           el.querySelector(".amount")?.textContent;
                }, productHandle);
                
                const formatPrice = price?.replace(/(\r\n|\n|\r)/gm, "").trim();
                
                const link = await page.evaluate(el => {
                    // Try multiple link selectors
                    return el.querySelector(".product_item a")?.getAttribute('href') ||
                           el.querySelector("a")?.getAttribute('href');
                }, productHandle);

                if (formatTitle) {  // Only add if we have a title
                    products.push({
                        title: formatTitle,
                        price: formatPrice,
                        link: link
                    });
                }

            } catch (error) { 
                console.log("⚠️ GetMeds: Error processing product:", error);
            }
        }

        console.log(`✅ GetMeds: Successfully scraped ${products.length} products for "${SEARCH_TERM}"`);
        return products;
    } catch (error) {
        console.error(`❌ GetMeds: Error scraping for "${SEARCH_TERM}":`, error);
        throw error;
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

export const singleController = async (req: Request, res: Response): Promise<void> => {
    try {
        const SEARCH_TERM = req.query.SEARCH_TERM as string;
        const PHARMACY = req.query.PHARMACY as string;
        
        if (!SEARCH_TERM) {
            res.status(400).json({
                status: "error",
                message: "Search term is required"
            });
            return;
        }

        if (!PHARMACY) {
            res.status(400).json({
                status: "error",
                message: "Pharmacy name is required"
            });
            return;
        }

        console.log(`🔄 Refreshing ${PHARMACY} for: ${SEARCH_TERM}`);

        // Map pharmacy names to their scraping functions
        const pharmacyMap: { [key: string]: (searchTerm: string) => Promise<Product[]> } = {
            'TGP': tgp,
            'Southstar': southstar,
            'Watsons': watsons,
            'Rose Pharmacy': rose,
            'GetMeds': getmeds
        };

        const scrapingFunction = pharmacyMap[PHARMACY];
        if (!scrapingFunction) {
            res.status(400).json({
                status: "error",
                message: `Unknown pharmacy: ${PHARMACY}`
            });
            return;
        }

        // Scrape the specific pharmacy
        const result = await safeScrapingWrapper(scrapingFunction, SEARCH_TERM, PHARMACY);
        
        if (result.success) {
            console.log(`✅ ${PHARMACY} refresh completed: ${result.data.length} products found`);
            res.status(200).json({
                status: "success",
                message: `${PHARMACY} refresh completed. Found ${result.data.length} products.`,
                data: result.data,
                pharmacy: PHARMACY,
                success: true
            });
        } else {
            console.log(`❌ ${PHARMACY} refresh failed: ${result.error}`);
            res.status(200).json({
                status: "error",
                message: `${PHARMACY} refresh failed: ${result.error}`,
                data: [],
                pharmacy: PHARMACY,
                success: false,
                error: result.error
            });
        }

    } catch (error) {
        console.error("Error in singleController:", error);
        res.status(500).json({
            status: "error",
            message: "Internal server error occurred during pharmacy refresh",
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

export const allController = async (req: Request, res: Response): Promise<void> => {
    try {
        const SEARCH_TERM = req.query.SEARCH_TERM as string;
        
        if (!SEARCH_TERM) {
            res.status(400).json({
                status: "error",
                message: "Search term is required"
            });
            return;
        }

        console.log(`Starting search for: ${SEARCH_TERM}`);

        // Use Promise.allSettled to allow partial failures
        const scrapingPromises = [
            safeScrapingWrapper(tgp, SEARCH_TERM, 'TGP'),
            safeScrapingWrapper(southstar, SEARCH_TERM, 'Southstar'),
            safeScrapingWrapper(watsons, SEARCH_TERM, 'Watsons'),
            safeScrapingWrapper(rose, SEARCH_TERM, 'Rose Pharmacy'),
            safeScrapingWrapper(getmeds, SEARCH_TERM, 'GetMeds')
        ];

        const results = await Promise.allSettled(scrapingPromises);
        
        // Process results
        const successfulResults: { [key: string]: Product[] } = {};
        const failedSources: { [key: string]: string } = {};
        let totalProducts = 0;

        results.forEach((result, index) => {
            if (result.status === 'fulfilled') {
                const scrapingResult = result.value;
                if (scrapingResult.success) {
                    successfulResults[scrapingResult.source] = scrapingResult.data;
                    totalProducts += scrapingResult.data.length;
                    console.log(`${scrapingResult.source}: ${scrapingResult.data.length} products found`);
                } else {
                    failedSources[scrapingResult.source] = scrapingResult.error || 'Unknown error';
                    console.log(`${scrapingResult.source}: Failed - ${scrapingResult.error}`);
                }
            } else {
                // This shouldn't happen with our wrapper, but just in case
                const sourceNames = ['TGP', 'Southstar', 'Watsons', 'Rose Pharmacy', 'GetMeds'];
                failedSources[sourceNames[index]] = result.reason?.message || 'Promise rejected';
            }
        });

        // Always return a response, even if some sources failed
        const response = {
            status: "success",
            message: `Search completed. Found ${totalProducts} products from ${Object.keys(successfulResults).length} sources.`,
            data: successfulResults,
            errors: Object.keys(failedSources).length > 0 ? failedSources : undefined,
            summary: {
                totalProducts,
                successfulSources: Object.keys(successfulResults).length,
                failedSources: Object.keys(failedSources).length,
                searchTerm: SEARCH_TERM
            }
        };

        res.status(200).json(response);

    } catch (error) {
        console.error("Error in allController:", error);
        res.status(500).json({
            status: "error",
            message: "Internal server error occurred during scraping",
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

// Multiple item search controller
export const multipleSearchController = async (req: Request, res: Response): Promise<void> => {
    try {
        const { items } = req.body;
        
        if (!items || !Array.isArray(items) || items.length === 0) {
            res.status(400).json({
                status: "error",
                message: "Items array is required and must not be empty"
            });
            return;
        }

        // Generate session ID
        const sessionId = `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Initialize search session
        const searchItems: MultipleSearchItem[] = items.map((item: string, index: number) => ({
            id: `item_${index}`,
            name: item.trim(),
            status: 'pending' as const,
            progress: 0
        }));

        const searchProgress: MultipleSearchProgress = {
            items: searchItems,
            currentItem: 0,
            totalItems: searchItems.length,
            status: 'pending',
            canCancel: true,
            abortController: new AbortController()
        };

        searchSessions.set(sessionId, searchProgress);

        // Start the search process asynchronously
        processMultipleSearch(sessionId);

        res.status(200).json({
            status: "success",
            message: "Multiple item search started",
            sessionId,
            progress: searchProgress
        });

    } catch (error) {
        console.error("Error in multipleSearchController:", error);
        res.status(500).json({
            status: "error",
            message: "Internal server error occurred",
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

// Get search progress
export const getSearchProgress = async (req: Request, res: Response): Promise<void> => {
    try {
        const { sessionId } = req.params;
        
        const progress = searchSessions.get(sessionId);
        if (!progress) {
            res.status(404).json({
                status: "error",
                message: "Search session not found"
            });
            return;
        }

        res.status(200).json({
            status: "success",
            progress
        });

    } catch (error) {
        console.error("Error in getSearchProgress:", error);
        res.status(500).json({
            status: "error",
            message: "Internal server error occurred",
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

// Cancel search
export const cancelSearch = async (req: Request, res: Response): Promise<void> => {
    try {
        const { sessionId } = req.params;
        
        const progress = searchSessions.get(sessionId);
        if (!progress) {
            res.status(404).json({
                status: "error",
                message: "Search session not found"
            });
            return;
        }

        if (!progress.canCancel) {
            res.status(400).json({
                status: "error",
                message: "Search cannot be cancelled at this time"
            });
            return;
        }

        progress.status = 'cancelled';
        
        // Abort any ongoing scraping operations
        if (progress.abortController) {
            progress.abortController.abort('Search cancelled by user');
        }
        
        searchSessions.set(sessionId, progress);

        res.status(200).json({
            status: "success",
            message: "Search cancelled successfully"
        });

    } catch (error) {
        console.error("Error in cancelSearch:", error);
        res.status(500).json({
            status: "error",
            message: "Internal server error occurred",
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

// Process multiple search items sequentially
async function processMultipleSearch(sessionId: string): Promise<void> {
    const progress = searchSessions.get(sessionId);
    if (!progress) return;

    progress.status = 'running';
    searchSessions.set(sessionId, progress);

    for (let i = 0; i < progress.items.length; i++) {
        // Check if cancelled before starting each item
        const currentProgress = searchSessions.get(sessionId);
        if (!currentProgress || currentProgress.status === 'cancelled') {
            console.log(`Search ${sessionId} cancelled at item ${i}`);
            // Mark remaining items as cancelled
            for (let j = i; j < progress.items.length; j++) {
                progress.items[j].status = 'cancelled';
            }
            searchSessions.set(sessionId, progress);
            return;
        }

        const item = progress.items[i];
        item.status = 'searching';
        progress.currentItem = i;
        searchSessions.set(sessionId, progress);

        console.log(`Searching for item ${i + 1}/${progress.totalItems}: ${item.name}`);

        try {
            // Perform search for current item
            const abortSignal = progress.abortController?.signal;
            
            const scrapingPromises = [
                safeScrapingWrapper(tgp, item.name, 'TGP', 60000, abortSignal),
                safeScrapingWrapper(southstar, item.name, 'Southstar', 60000, abortSignal),
                safeScrapingWrapper(watsons, item.name, 'Watsons', 60000, abortSignal),
                safeScrapingWrapper(rose, item.name, 'Rose Pharmacy', 60000, abortSignal),
                safeScrapingWrapper(getmeds, item.name, 'GetMeds', 60000, abortSignal)
            ];

            const results = await cancellablePromiseAllSettled(scrapingPromises, abortSignal);
            
            // Check if cancelled during search
            const progressAfterSearch = searchSessions.get(sessionId);
            if (!progressAfterSearch || progressAfterSearch.status === 'cancelled') {
                console.log(`Search ${sessionId} cancelled during item ${i} search`);
                item.status = 'cancelled';
                // Mark remaining items as cancelled
                for (let j = i + 1; j < progress.items.length; j++) {
                    progress.items[j].status = 'cancelled';
                }
                searchSessions.set(sessionId, progress);
                return;
            }
            
            // Process results for this item
            const successfulResults: { [key: string]: Product[] } = {};
            const failedSources: { [key: string]: string } = {};

            results.forEach((result, index) => {
                if (result.status === 'fulfilled') {
                    const scrapingResult = result.value;
                    if (scrapingResult.success) {
                        successfulResults[scrapingResult.source] = scrapingResult.data;
                    } else {
                        failedSources[scrapingResult.source] = scrapingResult.error || 'Unknown error';
                    }
                } else {
                    const sourceNames = ['TGP', 'Southstar', 'Watsons', 'Rose Pharmacy', 'GetMeds'];
                    failedSources[sourceNames[index]] = result.reason?.message || 'Promise rejected';
                }
            });

            item.results = successfulResults;
            item.errors = Object.keys(failedSources).length > 0 ? failedSources : undefined;
            item.status = 'completed';
            item.progress = 100;

        } catch (error) {
            console.error(`Error searching for ${item.name}:`, error);
            
            // Check if error is due to cancellation
            const errorMessage = error instanceof Error ? error.message : '';
            if (errorMessage.includes('cancelled') || errorMessage.includes('aborted')) {
                console.log(`Search ${sessionId} cancelled during item ${i} processing`);
                item.status = 'cancelled';
                // Mark remaining items as cancelled
                for (let j = i + 1; j < progress.items.length; j++) {
                    progress.items[j].status = 'cancelled';
                }
                searchSessions.set(sessionId, progress);
                return;
            }
            
            item.status = 'completed';
            item.errors = { 'System': errorMessage || 'Unknown error' };
            item.progress = 100;
        }

        searchSessions.set(sessionId, progress);

        // Add 3-second delay between searches (except for the last item)
        if (i < progress.totalItems - 1) {
            console.log(`Waiting 3 seconds before next search...`);
            
            // Wait with cancellation checks every 500ms
            for (let delayCheck = 0; delayCheck < 6; delayCheck++) {
                await new Promise(resolve => setTimeout(resolve, 500));
                const progressDuringDelay = searchSessions.get(sessionId);
                if (!progressDuringDelay || progressDuringDelay.status === 'cancelled') {
                    console.log(`Search ${sessionId} cancelled during delay after item ${i}`);
                    // Mark remaining items as cancelled
                    for (let j = i + 1; j < progress.items.length; j++) {
                        progress.items[j].status = 'cancelled';
                    }
                    searchSessions.set(sessionId, progress);
                    return;
                }
            }
        }
    }

    // Mark search as completed
    progress.status = 'completed';
    progress.canCancel = false;
    searchSessions.set(sessionId, progress);

    console.log(`Multiple search ${sessionId} completed`);
    
    // Clean up session after 10 minutes
    setTimeout(() => {
        searchSessions.delete(sessionId);
        console.log(`Cleaned up search session ${sessionId}`);
    }, 10 * 60 * 1000);
}

// Refresh specific failed pharmacies for a single item
export const refreshItemPharmacies = async (req: Request, res: Response): Promise<void> => {
    try {
        const { sessionId, itemId } = req.params;
        const { failedPharmacies } = req.body;
        
        if (!failedPharmacies || !Array.isArray(failedPharmacies) || failedPharmacies.length === 0) {
            res.status(400).json({
                status: "error",
                message: "Failed pharmacies array is required"
            });
            return;
        }

        const progress = searchSessions.get(sessionId);
        if (!progress) {
            res.status(404).json({
                status: "error",
                message: "Search session not found"
            });
            return;
        }

        // Find the specific item
        const item = progress.items.find(i => i.id === itemId);
        if (!item) {
            res.status(404).json({
                status: "error",
                message: "Item not found"
            });
            return;
        }

        // Map pharmacy names to their scraping functions
        const pharmacyMap: { [key: string]: (searchTerm: string, abortSignal?: AbortSignal) => Promise<Product[]> } = {
            'TGP': tgp,
            'Southstar': southstar,
            'Watsons': watsons,
            'Rose Pharmacy': rose,
            'GetMeds': getmeds
        };

        // Validate that all failed pharmacies have corresponding functions
        const validPharmacies = failedPharmacies.filter(pharmacy => {
            if (!pharmacyMap[pharmacy]) {
                console.error(`⚠️ No scraping function found for pharmacy: ${pharmacy}`);
                return false;
            }
            return true;
        });

        if (validPharmacies.length === 0) {
            res.status(400).json({
                status: "error",
                message: "No valid pharmacies to refresh"
            });
            return;
        }

        console.log(`🔄 Refreshing failed pharmacies for item ${item.name}: ${validPharmacies.join(', ')}`);

        // Create promises only for the valid failed pharmacies with shorter timeout for refresh
        const refreshPromises = validPharmacies.map(pharmacy => {
            console.log(`🔎 Starting refresh for ${pharmacy} - ${item.name}`);
            // Use shorter timeout for refresh (30 seconds instead of 60)
            return safeScrapingWrapper(pharmacyMap[pharmacy], item.name, pharmacy, 30000);
        });

        const results = await Promise.allSettled(refreshPromises);
        
        console.log(`📊 Refresh results for ${item.name}:`, results.map((r, i) => ({
            pharmacy: validPharmacies[i],
            status: r.status,
            success: r.status === 'fulfilled' ? r.value.success : false,
            error: r.status === 'fulfilled' ? r.value.error : r.reason?.message,
            productCount: r.status === 'fulfilled' && r.value.success ? r.value.data.length : 0
        })));
        
        // Update only the failed pharmacies' results
        results.forEach((result, index) => {
            const pharmacy = validPharmacies[index];
            if (result.status === 'fulfilled') {
                const scrapingResult = result.value;
                if (scrapingResult.success) {
                    // Update the results for this pharmacy
                    if (!item.results) item.results = {};
                    item.results[pharmacy] = scrapingResult.data;
                    
                    // Remove from errors if it was there
                    if (item.errors && item.errors[pharmacy]) {
                        delete item.errors[pharmacy];
                        // If no more errors, remove the errors object
                        if (Object.keys(item.errors).length === 0) {
                            delete item.errors;
                        }
                    }
                    
                    console.log(`✅ ${pharmacy} refresh successful: ${scrapingResult.data.length} products found for ${item.name}`);
                } else {
                    // Update the error for this pharmacy
                    if (!item.errors) item.errors = {};
                    item.errors[pharmacy] = scrapingResult.error || 'Refresh failed';
                    console.log(`❌ ${pharmacy} refresh failed for ${item.name}: ${scrapingResult.error}`);
                }
            } else {
                // Update the error for this pharmacy
                if (!item.errors) item.errors = {};
                item.errors[pharmacy] = result.reason?.message || 'Refresh failed';
                console.log(`💥 ${pharmacy} refresh promise rejected for ${item.name}: ${result.reason?.message}`);
            }
        });

        // Update the session
        searchSessions.set(sessionId, progress);

        res.status(200).json({
            status: "success",
            message: `Refreshed ${validPharmacies.length} pharmacies for ${item.name}`,
            item: item
        });

    } catch (error) {
        console.error("Error in refreshItemPharmacies:", error);
        res.status(500).json({
            status: "error",
            message: "Internal server error occurred during pharmacy refresh",
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

