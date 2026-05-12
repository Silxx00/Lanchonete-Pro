import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import categoriesRouter from "./categories";
import productsRouter from "./products";
import extrasRouter from "./extras";
import ordersRouter from "./orders";
import promotionsRouter from "./promotions";
import dashboardRouter from "./dashboard";
import financialRouter from "./financial";
import resetRouter from "./reset";
import optionsRouter from "./options";
import combosRouter from "./combos";
import personalizationRouter from "./personalization";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(categoriesRouter);
router.use(productsRouter);
router.use(extrasRouter);
router.use(optionsRouter);
router.use(ordersRouter);
router.use(promotionsRouter);
router.use(dashboardRouter);
router.use(financialRouter);
router.use(resetRouter);
router.use(combosRouter);
router.use(personalizationRouter);

export default router;
