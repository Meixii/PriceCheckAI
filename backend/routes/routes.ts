import { Router } from "express";
import { allController, singleController } from "../controllers/scrape";

const scrapeRoute = Router();

scrapeRoute.get("/all", allController);
scrapeRoute.get("/single", singleController);

export default scrapeRoute;

