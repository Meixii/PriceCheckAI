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
    scrapingFunction: (searchTerm: string) => Promise<Product[]>,
    searchTerm: string,
    sourceName: string,
    timeoutMs: number = 60000
): Promise<ScrapingResult> {
    try {
        const data = await withTimeout(scrapingFunction(searchTerm), timeoutMs);
        return {
            success: true,
            data: data || [],
            source: sourceName
        };
    } catch (error) {
        console.error(`Error scraping ${sourceName}:`, error);
        return {
            success: false,
            data: [],
            error: error instanceof Error ? error.message : 'Unknown error occurred',
            source: sourceName
        };
    }
}

async function tgp(SEARCH_TERM: string): Promise<Product[]> {
    const TGP_URL = "https://tgp.com.ph/search?controller=search&s=" + SEARCH_TERM;
    let browser;

    try {
        browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            headless: true,
        });
        const page = await browser.newPage();

        // Set longer timeout for page operations
        page.setDefaultTimeout(45000);
        await page.goto(TGP_URL, { 
            waitUntil: 'domcontentloaded', // Less strict than networkidle2
            timeout: 45000 
        });

        // Set screen size.
        await page.setViewport({ width: 300, height: 300 });

        const productsHandles = await page.$$('.products.row > *');

        const products: Product[] = [];
        for (const productsHandle of productsHandles) {
            try {
                const title = await page.evaluate(el => el.querySelector(".h3.product-title a")?.textContent, productsHandle);
                const formatTitle = title?.replace(/(\r\n|\n|\r)/gm, "").trim();
                const price = await page.evaluate(el => el.querySelector(".price")?.textContent, productsHandle);
                const formatPrice = price?.replace(/(\r\n|\n|\r)/gm, "").trim();
                const link = await page.evaluate(el => el.querySelector(".thumbnail-top a")?.getAttribute('href'), productsHandle);
            
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
            await browser.close();
        }
    }
}

async function southstar(SEARCH_TERM: string): Promise<Product[]> {
    const URL = `https://southstardrug.com.ph/search?q=${SEARCH_TERM}&options%5Bprefix%5D=last`
    let browser;

    try {
        browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            headless: true,
        });
        const page = await browser.newPage();

        page.setDefaultTimeout(45000);
        await page.goto(URL, { 
            waitUntil: 'domcontentloaded',
            timeout: 45000 
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
                const title = await page.evaluate(el => el.querySelector(".boost-sd__product-title")?.textContent, productsHandle);
                const formatTitle = title?.replace(/(\r\n|\n|\r)/gm, "").trim();
                const price = await page.evaluate(el => el.querySelector(".boost-sd__format-currency")?.textContent, productsHandle);
                const formatPrice = price?.replace(/(\r\n|\n|\r)/gm, "").trim();
                const link = await page.evaluate(el => el.querySelector(".boost-sd__product-link")?.getAttribute('href'), productsHandle);
                
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

async function watsons(SEARCH_TERM: string): Promise<Product[]> {
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3';
    const URL = `https://www.watsons.com.ph/search?text=${SEARCH_TERM}`
    let browser;

    try {
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

async function rose(SEARCH_TERM: string): Promise<Product[]> {
    const URL = `https://www.rosepharmacy.com/?s=${SEARCH_TERM}&post_type=product`;
    let browser;

    try {
        browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            headless: true,
        });
        const page = await browser.newPage();
        
        page.setDefaultTimeout(45000);
        await page.goto(URL, { 
            waitUntil: 'domcontentloaded',
            timeout: 45000 
        });

        await page.setViewport({ width: 300, height: 300 });

        try {
            await page.waitForSelector('.wpb_wrapper', { timeout: 15000 });
        } catch (e) {
            console.log("Rose Pharmacy: Content wrapper not found, continuing anyway");
        }
        
        const productHandles = await page.$$('.porto-posts-grid.porto-posts-grid-75121fa532f6c490d02770d2b728412e > .products-container > .porto-tb-item');
        
        const products: Product[] = [];
        for (const productHandle of productHandles) {
            try {
                const title = await page.evaluate(el => el.querySelector(".post-title")?.textContent, productHandle);
                const formatTitle = title?.replace(/(\r\n|\n|\r)/gm, "").trim();
                const price = await page.evaluate(el => el.querySelector(".woocommerce-Price-amount.amount")?.textContent, productHandle);
                const formatPrice = price?.replace(/(\r\n|\n|\r)/gm, "").trim();
                const link = await page.evaluate(el => el.querySelector(".porto-tb-featured-image a")?.getAttribute('href'), productHandle);
                
                products.push({
                    title: formatTitle,
                    price: formatPrice,
                    link: link
                });

            } catch (error) { 
                console.log("Error processing Rose Pharmacy product:", error);
            }
        }

        return products;
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

async function getmeds(SEARCH_TERM: string): Promise<Product[]> {
    const URL = `https://getmeds.ph/search?s=${SEARCH_TERM}`;
    let browser;

    try {
        browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            headless: true,
        });
        const page = await browser.newPage();
        
        page.setDefaultTimeout(45000);
        await page.goto(URL, { 
            waitUntil: 'domcontentloaded',
            timeout: 45000 
        });

        await page.setViewport({ width: 300, height: 300 });

        try {
            await page.waitForSelector('.product_list_outer', { timeout: 15000 });
        } catch (e) {
            console.log("GetMeds: Product list not found, continuing anyway");
        }
        
        const productHandles = await page.$$('.product_list_outer > .row.product_list > .col-md-4.col-sm-6 > .product_item');

        const products: Product[] = [];
        for (const productHandle of productHandles) {
            try {
                const title = await page.evaluate(el => el.querySelector(".product_item_title")?.textContent, productHandle);
                const formatTitle = title?.replace(/(\r\n|\n|\r)/gm, "").trim();
                const price = await page.evaluate(el => el.querySelector(".product-list-price")?.textContent, productHandle);
                const formatPrice = price?.replace(/(\r\n|\n|\r)/gm, "").trim();
                const link = await page.evaluate(el => el.querySelector(".product_item a")?.getAttribute('href'), productHandle);

                products.push({
                    title: formatTitle,
                    price: formatPrice,
                    link: link
                });

            } catch (error) { 
                console.log("Error processing GetMeds product:", error);
            }
        }

        return products;
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

