import { Router, type IRouter } from "express";
import healthRouter from "./health";
import speedtestRouter from "./speedtest";

const router: IRouter = Router();

router.use(healthRouter);
router.use(speedtestRouter);

export default router;
