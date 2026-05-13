import { Request, Response } from "express"

import {
  verifyHolderCampaign
} from "../services/zk.service"

export async function verifyHolderController(
  req: Request,
  res: Response
) {

  try {

    const {
      wallet,
      minBalance,
    } = req.body

    const result =
      await verifyHolderCampaign({
        wallet,
        minBalance,
      })

    return res.json(result)

  } catch (error) {

    console.error(error)

    return res.status(500).json({
      valid: false,
      error: "verification failed"
    })

  }

}