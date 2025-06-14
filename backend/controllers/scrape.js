"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.allController = exports.singleController = void 0;
const puppeteer_1 = __importDefault(require("puppeteer"));
// Utility function to add timeout to promises
function withTimeout(promise, timeoutMs) {
    return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs))
    ]);
}
// Wrapper function to handle errors and timeouts for scraping functions
function safeScrapingWrapper(scrapingFunction_1, searchTerm_1, sourceName_1) {
    return __awaiter(this, arguments, void 0, function* (scrapingFunction, searchTerm, sourceName, timeoutMs = 60000) {
        try {
            const data = yield withTimeout(scrapingFunction(searchTerm), timeoutMs);
            return {
                success: true,
                data: data || [],
                source: sourceName
            };
        }
        catch (error) {
            console.error(`Error scraping ${sourceName}:`, error);
            return {
                success: false,
                data: [],
                error: error instanceof Error ? error.message : 'Unknown error occurred',
                source: sourceName
            };
        }
    });
}
function tgp(SEARCH_TERM) {
    return __awaiter(this, void 0, void 0, function* () {
        const TGP_URL = "https://tgp.com.ph/search?controller=search&s=" + SEARCH_TERM;
        let browser;
        try {
            browser = yield puppeteer_1.default.launch({
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
                headless: true,
            });
            const page = yield browser.newPage();
            // Set longer timeout for page operations
            page.setDefaultTimeout(45000);
            yield page.goto(TGP_URL, {
                waitUntil: 'domcontentloaded', // Less strict than networkidle2
                timeout: 45000
            });
            // Set screen size.
            yield page.setViewport({ width: 300, height: 300 });
            const productsHandles = yield page.$$('.products.row > *');
            const products = [];
            for (const productsHandle of productsHandles) {
                try {
                    const title = yield page.evaluate(el => { var _a; return (_a = el.querySelector(".h3.product-title a")) === null || _a === void 0 ? void 0 : _a.textContent; }, productsHandle);
                    const formatTitle = title === null || title === void 0 ? void 0 : title.replace(/(\r\n|\n|\r)/gm, "").trim();
                    const price = yield page.evaluate(el => { var _a; return (_a = el.querySelector(".price")) === null || _a === void 0 ? void 0 : _a.textContent; }, productsHandle);
                    const formatPrice = price === null || price === void 0 ? void 0 : price.replace(/(\r\n|\n|\r)/gm, "").trim();
                    const link = yield page.evaluate(el => { var _a; return (_a = el.querySelector(".thumbnail-top a")) === null || _a === void 0 ? void 0 : _a.getAttribute('href'); }, productsHandle);
                    products.push({
                        title: formatTitle,
                        price: formatPrice,
                        link: link
                    });
                }
                catch (error) {
                    console.log("Error processing TGP product:", error);
                }
            }
            return products;
        }
        finally {
            if (browser) {
                yield browser.close();
            }
        }
    });
}
function southstar(SEARCH_TERM) {
    return __awaiter(this, void 0, void 0, function* () {
        const URL = `https://southstardrug.com.ph/search?q=${SEARCH_TERM}&options%5Bprefix%5D=last`;
        let browser;
        try {
            browser = yield puppeteer_1.default.launch({
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
                headless: true,
            });
            const page = yield browser.newPage();
            page.setDefaultTimeout(45000);
            yield page.goto(URL, {
                waitUntil: 'domcontentloaded',
                timeout: 45000
            });
            yield page.setViewport({ width: 300, height: 300 });
            // Wait for products to load, but don't fail if they don't appear
            try {
                yield page.waitForSelector('.boost-sd__product-list', { timeout: 10000 });
            }
            catch (e) {
                console.log("Southstar: Products container not found, continuing anyway");
            }
            const productsHandles = yield page.$$('.boost-sd__product-list > .boost-sd__product-item');
            const products = [];
            for (const productsHandle of productsHandles) {
                try {
                    const title = yield page.evaluate(el => { var _a; return (_a = el.querySelector(".boost-sd__product-title")) === null || _a === void 0 ? void 0 : _a.textContent; }, productsHandle);
                    const formatTitle = title === null || title === void 0 ? void 0 : title.replace(/(\r\n|\n|\r)/gm, "").trim();
                    const price = yield page.evaluate(el => { var _a; return (_a = el.querySelector(".boost-sd__format-currency")) === null || _a === void 0 ? void 0 : _a.textContent; }, productsHandle);
                    const formatPrice = price === null || price === void 0 ? void 0 : price.replace(/(\r\n|\n|\r)/gm, "").trim();
                    const link = yield page.evaluate(el => { var _a; return (_a = el.querySelector(".boost-sd__product-link")) === null || _a === void 0 ? void 0 : _a.getAttribute('href'); }, productsHandle);
                    products.push({
                        title: formatTitle,
                        price: formatPrice,
                        link: "https://southstardrug.com.ph" + link
                    });
                }
                catch (error) {
                    console.log("Error processing Southstar product:", error);
                }
            }
            return products;
        }
        finally {
            if (browser) {
                yield browser.close();
            }
        }
    });
}
function watsons(SEARCH_TERM) {
    return __awaiter(this, void 0, void 0, function* () {
        const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3';
        const URL = `https://www.watsons.com.ph/search?text=${SEARCH_TERM}`;
        let browser;
        try {
            browser = yield puppeteer_1.default.launch({
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
                headless: true,
            });
            const page = yield browser.newPage();
            page.setUserAgent(userAgent);
            page.setDefaultTimeout(45000);
            yield page.goto(URL, {
                waitUntil: 'domcontentloaded',
                timeout: 45000
            });
            yield page.setViewport({ width: 1366, height: 768 });
            // Wait for at least one of the product containers to be available
            try {
                yield page.waitForSelector('.cx-product-container', { timeout: 15000 });
            }
            catch (e) {
                console.log("Watsons: Product container not found, continuing anyway");
            }
            const productsHandles = yield page.$$('.cx-product-container > .product-container.gridMode.ng-star-inserted > .ng-star-inserted');
            const products = [];
            for (const productsHandle of productsHandles) {
                try {
                    const title = yield page.evaluate(el => { var _a; return (_a = el.querySelector(".productName")) === null || _a === void 0 ? void 0 : _a.textContent; }, productsHandle);
                    const formatTitle = title === null || title === void 0 ? void 0 : title.replace(/(\r\n|\n|\r)/gm, "").trim();
                    const price = yield page.evaluate(el => { var _a; return (_a = el.querySelector(".formatted-value.ng-star-inserted")) === null || _a === void 0 ? void 0 : _a.textContent; }, productsHandle);
                    const formatPrice = price === null || price === void 0 ? void 0 : price.replace(/(\r\n|\n|\r)/gm, "").trim();
                    const link = yield page.evaluate(el => { var _a; return (_a = el.querySelector(".productBottom a")) === null || _a === void 0 ? void 0 : _a.getAttribute('href'); }, productsHandle);
                    products.push({
                        title: formatTitle,
                        price: formatPrice,
                        link: "https://www.watsons.com.ph" + link
                    });
                }
                catch (error) {
                    console.log("Error processing Watsons product:", error);
                }
            }
            return products;
        }
        finally {
            if (browser) {
                yield browser.close();
            }
        }
    });
}
function rose(SEARCH_TERM) {
    return __awaiter(this, void 0, void 0, function* () {
        const URL = `https://www.rosepharmacy.com/?s=${SEARCH_TERM}&post_type=product`;
        let browser;
        try {
            browser = yield puppeteer_1.default.launch({
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
                headless: true,
            });
            const page = yield browser.newPage();
            page.setDefaultTimeout(45000);
            yield page.goto(URL, {
                waitUntil: 'domcontentloaded',
                timeout: 45000
            });
            yield page.setViewport({ width: 300, height: 300 });
            try {
                yield page.waitForSelector('.wpb_wrapper', { timeout: 15000 });
            }
            catch (e) {
                console.log("Rose Pharmacy: Content wrapper not found, continuing anyway");
            }
            const productHandles = yield page.$$('.porto-posts-grid.porto-posts-grid-75121fa532f6c490d02770d2b728412e > .products-container > .porto-tb-item');
            const products = [];
            for (const productHandle of productHandles) {
                try {
                    const title = yield page.evaluate(el => { var _a; return (_a = el.querySelector(".post-title")) === null || _a === void 0 ? void 0 : _a.textContent; }, productHandle);
                    const formatTitle = title === null || title === void 0 ? void 0 : title.replace(/(\r\n|\n|\r)/gm, "").trim();
                    const price = yield page.evaluate(el => { var _a; return (_a = el.querySelector(".woocommerce-Price-amount.amount")) === null || _a === void 0 ? void 0 : _a.textContent; }, productHandle);
                    const formatPrice = price === null || price === void 0 ? void 0 : price.replace(/(\r\n|\n|\r)/gm, "").trim();
                    const link = yield page.evaluate(el => { var _a; return (_a = el.querySelector(".porto-tb-featured-image a")) === null || _a === void 0 ? void 0 : _a.getAttribute('href'); }, productHandle);
                    products.push({
                        title: formatTitle,
                        price: formatPrice,
                        link: link
                    });
                }
                catch (error) {
                    console.log("Error processing Rose Pharmacy product:", error);
                }
            }
            return products;
        }
        finally {
            if (browser) {
                yield browser.close();
            }
        }
    });
}
function getmeds(SEARCH_TERM) {
    return __awaiter(this, void 0, void 0, function* () {
        const URL = `https://getmeds.ph/search?s=${SEARCH_TERM}`;
        let browser;
        try {
            browser = yield puppeteer_1.default.launch({
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
                headless: true,
            });
            const page = yield browser.newPage();
            page.setDefaultTimeout(45000);
            yield page.goto(URL, {
                waitUntil: 'domcontentloaded',
                timeout: 45000
            });
            yield page.setViewport({ width: 300, height: 300 });
            try {
                yield page.waitForSelector('.product_list_outer', { timeout: 15000 });
            }
            catch (e) {
                console.log("GetMeds: Product list not found, continuing anyway");
            }
            const productHandles = yield page.$$('.product_list_outer > .row.product_list > .col-md-4.col-sm-6 > .product_item');
            const products = [];
            for (const productHandle of productHandles) {
                try {
                    const title = yield page.evaluate(el => { var _a; return (_a = el.querySelector(".product_item_title")) === null || _a === void 0 ? void 0 : _a.textContent; }, productHandle);
                    const formatTitle = title === null || title === void 0 ? void 0 : title.replace(/(\r\n|\n|\r)/gm, "").trim();
                    const price = yield page.evaluate(el => { var _a; return (_a = el.querySelector(".product-list-price")) === null || _a === void 0 ? void 0 : _a.textContent; }, productHandle);
                    const formatPrice = price === null || price === void 0 ? void 0 : price.replace(/(\r\n|\n|\r)/gm, "").trim();
                    const link = yield page.evaluate(el => { var _a; return (_a = el.querySelector(".product_item a")) === null || _a === void 0 ? void 0 : _a.getAttribute('href'); }, productHandle);
                    products.push({
                        title: formatTitle,
                        price: formatPrice,
                        link: link
                    });
                }
                catch (error) {
                    console.log("Error processing GetMeds product:", error);
                }
            }
            return products;
        }
        finally {
            if (browser) {
                yield browser.close();
            }
        }
    });
}
const singleController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const SEARCH_TERM = req.query.SEARCH_TERM;
        const PHARMACY = req.query.PHARMACY;
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
        const pharmacyMap = {
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
        const result = yield safeScrapingWrapper(scrapingFunction, SEARCH_TERM, PHARMACY);
        if (result.success) {
            console.log(`✅ ${PHARMACY} refresh completed: ${result.data.length} products found`);
            res.status(200).json({
                status: "success",
                message: `${PHARMACY} refresh completed. Found ${result.data.length} products.`,
                data: result.data,
                pharmacy: PHARMACY,
                success: true
            });
        }
        else {
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
    }
    catch (error) {
        console.error("Error in singleController:", error);
        res.status(500).json({
            status: "error",
            message: "Internal server error occurred during pharmacy refresh",
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
exports.singleController = singleController;
const allController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const SEARCH_TERM = req.query.SEARCH_TERM;
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
        const results = yield Promise.allSettled(scrapingPromises);
        // Process results
        const successfulResults = {};
        const failedSources = {};
        let totalProducts = 0;
        results.forEach((result, index) => {
            var _a;
            if (result.status === 'fulfilled') {
                const scrapingResult = result.value;
                if (scrapingResult.success) {
                    successfulResults[scrapingResult.source] = scrapingResult.data;
                    totalProducts += scrapingResult.data.length;
                    console.log(`${scrapingResult.source}: ${scrapingResult.data.length} products found`);
                }
                else {
                    failedSources[scrapingResult.source] = scrapingResult.error || 'Unknown error';
                    console.log(`${scrapingResult.source}: Failed - ${scrapingResult.error}`);
                }
            }
            else {
                // This shouldn't happen with our wrapper, but just in case
                const sourceNames = ['TGP', 'Southstar', 'Watsons', 'Rose Pharmacy', 'GetMeds'];
                failedSources[sourceNames[index]] = ((_a = result.reason) === null || _a === void 0 ? void 0 : _a.message) || 'Promise rejected';
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
    }
    catch (error) {
        console.error("Error in allController:", error);
        res.status(500).json({
            status: "error",
            message: "Internal server error occurred during scraping",
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
exports.allController = allController;
