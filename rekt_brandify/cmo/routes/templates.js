import express from 'express';
import { requireAdmin } from '../middleware/adminAuth.js';
import {
  listTemplates,
  getTemplate,
  readTemplateBuffer,
  mimeFromFilename,
} from '../../server/services/memeTemplates.js';

const router = express.Router();

/** Free for admin workshop — browse meme template library */
router.get('/templates', requireAdmin, (req, res) => {
  try {
    const data = listTemplates({
      category: req.query.category ? String(req.query.category) : undefined,
      q: req.query.q ? String(req.query.q) : undefined,
      limit: req.query.limit != null ? Number(req.query.limit) : 120,
      offset: req.query.offset != null ? Number(req.query.offset) : 0,
    });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/templates/:templateId', requireAdmin, (req, res) => {
  try {
    const tpl = getTemplate(req.params.templateId);
    if (!tpl) return res.status(404).json({ success: false, error: 'Template not found' });
    res.json({
      success: true,
      data: {
        id: tpl.id,
        name: tpl.name,
        category: tpl.category,
        filename: tpl.filename,
        relativePath: tpl.relativePath,
        exists: tpl.exists,
        imagePath: `/api/cmo/templates/${tpl.id}/image`,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** Free admin preview of template image (no x402) */
router.get('/templates/:templateId/image', requireAdmin, (req, res) => {
  try {
    const { buffer, mimeType, template } = readTemplateBuffer(req.params.templateId);
    res.setHeader('Content-Type', mimeType || mimeFromFilename(template.filename));
    res.setHeader('Cache-Control', 'private, max-age=600');
    res.setHeader('Content-Disposition', `inline; filename="${template.filename}"`);
    res.send(buffer);
  } catch (err) {
    res.status(404).json({ success: false, error: err.message });
  }
});

export default router;
