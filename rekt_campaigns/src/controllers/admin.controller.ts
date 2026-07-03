import { Request, Response, NextFunction } from 'express';
import { ApiResponse, AppError } from '../types';
import { campaignService } from '../services/campaign.service';
import { inviteHistoryService } from '../services/invite-history.service';
import { analyticsService } from '../services/analytics.service';
import { parseValidatedCampaignPut } from '../schemas/campaign-def.schema';
import { supabaseSync } from '../services/supabase-sync.service';
import { recoveryService } from '../services/recovery.service';

export class AdminController {
  async getLayout(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await campaignService.getLayout();
      res.json({ success: true, data } as ApiResponse);
    } catch (error) {
      next(error);
    }
  }

  async setLayout(req: Request, res: Response, next: NextFunction) {
    try {
      const layout = req.body;
      if (!layout || !Array.isArray(layout.blocks)) {
        throw new AppError(400, 'layout.blocks must be an array');
      }
      const data = await campaignService.setLayout(layout);
      res.json({ success: true, data } as ApiResponse);
    } catch (error) {
      next(error);
    }
  }

  async getCampaigns(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await campaignService.getCampaigns();
      res.json({ success: true, data } as ApiResponse);
    } catch (error) {
      next(error);
    }
  }

  async setCampaigns(req: Request, res: Response, next: NextFunction) {
    try {
      let parsedArray: unknown[];
      try {
        parsedArray = parseValidatedCampaignPut(req.body).campaigns;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Validation failed';
        throw new AppError(400, msg);
      }
      const data = await campaignService.setCampaigns(parsedArray);
      res.json({ success: true, data } as ApiResponse);
    } catch (error) {
      next(error);
    }
  }

  async getXRulePresets(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await campaignService.getXRulePresets();
      res.json({ success: true, data } as ApiResponse);
    } catch (error) {
      next(error);
    }
  }

  async setXRulePresets(req: Request, res: Response, next: NextFunction) {
    try {
      const presets = req.body?.presets;
      if (!Array.isArray(presets)) {
        throw new AppError(400, 'presets must be an array');
      }
      const data = await campaignService.setXRulePresets(presets);
      res.json({ success: true, data } as ApiResponse);
    } catch (error) {
      next(error);
    }
  }

  async getGateConfig(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await campaignService.getGateConfig();
      res.json({ success: true, data } as ApiResponse);
    } catch (error) {
      next(error);
    }
  }

  async setGateConfig(req: Request, res: Response, next: NextFunction) {
    try {
      const patch = req.body?.gateConfig ?? req.body;
      if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
        throw new AppError(400, 'gateConfig must be an object');
      }
      const data = await campaignService.setGateConfig(patch);
      res.json({ success: true, data } as ApiResponse);
    } catch (error) {
      next(error);
    }
  }

  async mintInviteCode(req: Request, res: Response, next: NextFunction) {
    try {
      const label = typeof req.body?.label === 'string' ? req.body.label : undefined;
      const out = await campaignService.adminMintInviteCode({ label });
      if ('error' in out) {
        throw new AppError(503, 'Could not mint invite code (Redis or collision).');
      }
      res.json({ success: true, data: out } as ApiResponse);
    } catch (error) {
      next(error);
    }
  }

  async getAnalyticsSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const from = typeof req.query.from === 'string' ? req.query.from : undefined;
      const to = typeof req.query.to === 'string' ? req.query.to : undefined;
      const slowDailyScan =
        req.query.slowDailyScan === '1' ||
        req.query.slowDailyScan === 'true' ||
        req.query.slow_daily_scan === '1';
      const data = await analyticsService.getSummary(from, to, { slowDailyScan });
      res.json({ success: true, data } as ApiResponse);
    } catch (error) {
      next(error);
    }
  }

  async getAdminUser(req: Request, res: Response, next: NextFunction) {
    try {
      const raw = typeof req.params.address === 'string' ? req.params.address.trim() : '';
      if (!/^0x[a-fA-F0-9]{40}$/i.test(raw)) {
        throw new AppError(400, 'Invalid EVM address');
      }
      const data = await campaignService.getAdminUserProfile(raw);
      res.json({ success: true, data } as ApiResponse);
    } catch (error) {
      next(error);
    }
  }

  async getAdminLeaderboard(req: Request, res: Response, next: NextFunction) {
    try {
      const scope = req.query.scope === 'lifetime' ? 'lifetime' : 'season';
      const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
      const data = await campaignService.getLeaderboard(scope, limit, { adminDetail: true });
      res.json({ success: true, data } as ApiResponse);
    } catch (error) {
      next(error);
    }
  }

  async getInviteLedger(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = Math.min(500, Number(req.query.limit) || 100);
      const data = await inviteHistoryService.adminGlobalRecent(limit);
      res.json({
        success: true,
        data: {
          ...data,
          ledgerEnabled: inviteHistoryService.isEnabled(),
        },
      } as ApiResponse);
    } catch (error) {
      next(error);
    }
  }

  async getXpRewards(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await campaignService.getXpRewardsConfig();
      res.json({ success: true, data } as ApiResponse);
    } catch (error) {
      next(error);
    }
  }

  async setXpRewards(req: Request, res: Response, next: NextFunction) {
    try {
      const body = req.body?.xpRewards ?? req.body;
      if (!body || typeof body !== 'object' || Array.isArray(body)) {
        throw new AppError(400, 'xpRewards must be an object');
      }
      const data = await campaignService.setXpRewardsConfig(body);
      res.json({ success: true, data } as ApiResponse);
    } catch (error) {
      next(error);
    }
  }

  async triggerSnapshot(req: Request, res: Response, next: NextFunction) {
    try {
      await supabaseSync.runDailySnapshot();
      res.json({ success: true, message: 'Snapshot triggered' } as ApiResponse);
    } catch (error) {
      next(error);
    }
  }

  async triggerSeasonReset(req: Request, res: Response, next: NextFunction) {
    try {
      const { currentSeason, newSeason } = req.body;
      if (!currentSeason || !newSeason) {
        throw new AppError(400, 'currentSeason and newSeason required in body');
      }
      const data = await supabaseSync.performSeasonReset(currentSeason, newSeason);
      res.json({ success: true, data } as ApiResponse);
    } catch (error) {
      next(error);
    }
  }

  async triggerRedisRecovery(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await recoveryService.rebuildRedisFromSupabase();
      res.json({ success: true, data } as ApiResponse);
    } catch (error) {
      next(error);
    }
  }
}

export const adminController = new AdminController();
