import { Router } from "express";
import { allController, singleController, multipleSearchController, getSearchProgress, cancelSearch, refreshItemPharmacies } from "../controllers/scrape";

const scrapeRoute = Router();

scrapeRoute.get("/all", allController);
scrapeRoute.get("/single", singleController);

// Multiple item search routes
scrapeRoute.post("/multiple", multipleSearchController);
scrapeRoute.get("/progress/:sessionId", getSearchProgress);
scrapeRoute.post("/cancel/:sessionId", cancelSearch);

scrapeRoute.post('/refresh/:sessionId/:itemId', refreshItemPharmacies);

export default scrapeRoute;

