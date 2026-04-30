import { Request, Response, NextFunction } from 'express';
import { ApiResponse, AppError } from '../types';
import { campaignService } from '../services/campaign.service';
import { identityService } from '../services/identity.service';
import { inviteHistoryService } from '../services/invite-history.service';

function viewerOwnsQueryWallet(req: Request, queryAddress?: string): boolean {
  const authed = req.user?.address?.toLowerCase();
  const q = queryAddress?.toLowerCase();
  return !!(authed && q && authed === q);
}

export class CampaignController {
  async getLayout(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await campaignService.getLayout();
      res.json({ success: true, data } as ApiResponse);
    } catch (error) {
      next(error);
    }
  }

  async getBootstrap(req: Request, res: Response, next: NextFunction) {
    try {
      const address = typeof req.query.address === 'string' ? req.query.address.trim() : undefined;
      const viewerIsOwner = viewerOwnsQueryWallet(req, address);

      const campaignsList = await campaignService.getCampaigns();
      const campaignsWithProgress = await campaignService.enrichCampaignListWithViewer(
        campaignsList,
        address,
      );

      const [
        identity,
        xp,
        daily,
        leaderboard,
        inviteSlice,
        gateConfig,
        layout,
        xPresets,
        xpRewards,
      ] = await Promise.all([
        campaignService.getIdentity(address),
        campaignService.getXp(address),
        address
          ? campaignService.getDailyState(address)
          : Promise.resolve({
              today: '',
              checkinClaimed: false,
              spinClaimed: false,
              streak: { count: 0, lastDate: null },
            }),
        campaignService.getLeaderboard('season', 25),
        campaignService.getInviteBootstrapSlice(address, viewerIsOwner),
        campaignService.getGateConfig(),
        campaignService.getLayout(),
        campaignService.getXRulePresets(),
        campaignService.getXpRewardsConfig(),
      ]);

      const presetId = campaignService.pickXSharePresetIdFromLayout(layout);
      const list = Array.isArray(xPresets) ? xPresets : [];
      const preset = list.find((p: { id?: string }) => p?.id === presetId) ?? list[0];
      const effectivePresetId = preset?.id || presetId;

      const xMission = await campaignService.getXMissionHubState(address, preset, effectivePresetId);

      const base = campaignService.buildBootstrap(
        identity,
        xp,
        daily,
        campaignsWithProgress,
        leaderboard,
        inviteSlice,
        address,
        gateConfig,
      );

      const data = {
        ...base,
        xpRewards,
        xTaskRules: {
          ...(preset?.rules || {}),
          presetId: effectivePresetId,
          label: preset?.label || 'Daily X Mission',
        },
        xMission,
      };
      res.json({ success: true, data } as ApiResponse);
    } catch (error) {
      next(error);
    }
  }

  async verifyXMission(req: Request, res: Response, next: NextFunction) {
    try {
      const address = req.user?.address;
      if (!address) throw new AppError(401, 'Authentication required');
      const presetId =
        typeof req.body?.presetId === 'string' && req.body.presetId.trim()
          ? req.body.presetId.trim()
          : undefined;
      const result = await campaignService.verifyAndCreditXMission(address, presetId);
      if (!result.ok) {
        if (result.error === 'twitterapi_unconfigured') {
          throw new AppError(503, result.message);
        }
        throw new AppError(400, result.message);
      }
      res.json({ success: true, data: result } as ApiResponse);
    } catch (error) {
      next(error);
    }
  }

  async validateInvite(req: Request, res: Response, next: NextFunction) {
    try {
      const code = typeof req.body?.code === 'string' ? req.body.code : '';
      const result = await campaignService.validateInvitePreflight(code);
      if (!result.ok) {
        throw new AppError(400, result.message);
      }
      res.json({ success: true, data: { code: result.code, proof: result.proof } } as ApiResponse);
    } catch (error) {
      next(error);
    }
  }

  async redeemInvite(req: Request, res: Response, next: NextFunction) {
    try {
      const address = req.user?.address;
      if (!address) throw new AppError(401, 'Authentication required');
      const code = typeof req.body?.code === 'string' ? req.body.code : '';
      const proof = typeof req.body?.proof === 'string' ? req.body.proof : '';
      const result = await campaignService.redeemInviteCode(address, code, proof);
      if (!result.ok) {
        throw new AppError(400, result.message);
      }
      res.json({ success: true, data: result } as ApiResponse);
    } catch (error) {
      next(error);
    }
  }

  async getMyInviteHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const address = req.user?.address;
      if (!address) throw new AppError(401, 'Authentication required');
      const history = await inviteHistoryService.getWalletHistory(address);
      res.json({
        success: true,
        data: {
          ...history,
          ledgerEnabled: inviteHistoryService.isEnabled(),
        },
      } as ApiResponse);
    } catch (error) {
      next(error);
    }
  }

  async rotateInviteBatch(req: Request, res: Response, next: NextFunction) {
    try {
      const address = req.user?.address;
      if (!address) throw new AppError(401, 'Authentication required');
      const result = await campaignService.rotateInviteBatch(address);
      if (!result.ok) {
        throw new AppError(400, result.message);
      }
      res.json({ success: true, data: result } as ApiResponse);
    } catch (error) {
      next(error);
    }
  }

  async verifyOnchainCampaign(req: Request, res: Response, next: NextFunction) {
    try {
      const address = req.user?.address;
      if (!address) throw new AppError(401, 'Authentication required');
      const campaignId =
        typeof req.params.campaignId === 'string' ? req.params.campaignId.trim() : '';
      if (!campaignId) throw new AppError(400, 'campaignId required');

      const result = await campaignService.verifyOnchainCampaign(address, campaignId);
      if (result.ok) {
        res.json({ success: true, data: result } as ApiResponse);
        return;
      }
      res.json({
        success: false,
        data: result,
        message: result.message,
      } as ApiResponse);
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

  async getLeaderboard(req: Request, res: Response, next: NextFunction) {
    try {
      const scope = req.query.scope === 'lifetime' ? 'lifetime' : 'season';
      const limit = Math.min(100, Number(req.query.limit) || 25);
      const data = await campaignService.getLeaderboard(scope, limit);
      res.json({ success: true, data } as ApiResponse);
    } catch (error) {
      next(error);
    }
  }

  async refreshBaseBalance(req: Request, res: Response, next: NextFunction) {
    try {
      const address = req.user?.address;
      if (!address) throw new AppError(401, 'Authentication required');
      const data = await identityService.refreshBaseBalance(address);
      res.json({ success: true, data } as ApiResponse);
    } catch (error) {
      next(error);
    }
  }
}

export const campaignController = new CampaignController();
