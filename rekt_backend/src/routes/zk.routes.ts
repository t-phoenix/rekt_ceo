import { Router, Request, Response, IRouter } from 'express';

import {
  verifyHolderController
} from "../controllers/zk.controller"

const router: IRouter = Router();

router.post(
  "/verify-holder",
  verifyHolderController
)

export default router