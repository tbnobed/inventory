import { Router, type IRouter } from "express";
import healthRouter from "./health";
import machinesRouter from "./machines";
import authRouter from "./auth";
import usersRouter from "./users";
import subnetsRouter from "./subnets";
import agentRouter from "./agent";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(machinesRouter);
router.use(usersRouter);
router.use(subnetsRouter);
router.use(agentRouter);

export default router;
