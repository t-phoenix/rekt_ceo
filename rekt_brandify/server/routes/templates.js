import express from 'express';
import {
  listTemplates,
  getTemplate,
  readTemplateBuffer,
  mimeFromFilename,
} from '../services/memeTemplates.js';

const router = express.Router();

/** x402: GET /api/templates — catalog */
router.get('/', (req, res) => {
  try {
    const data = listTemplates({
      category: req.query.category ? String(req.query.category) : undefined,
      q: req.query.q ? String(req.query.q) : undefined,
      limit: req.query.limit != null ? Number(req.query.limit) : 100,
      offset: req.query.offset != null ? Number(req.query.offset) : 0,
    });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** x402: GET /api/templates/:templateId — detail */
router.get('/:templateId', (req, res) => {
  try {
    if (req.params.templateId === 'variations') {
      return res.status(404).json({ error: 'Not found' });
    }
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
        imagePath: `/api/templates/${tpl.id}/image`,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** x402: GET /api/templates/:templateId/image — binary */
router.get('/:templateId/image', (req, res) => {
  try {
    const { buffer, mimeType, template } = readTemplateBuffer(req.params.templateId);
    res.setHeader('Content-Type', mimeType || mimeFromFilename(template.filename));
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.setHeader('Content-Disposition', `inline; filename="${template.filename}"`);
    res.send(buffer);
  } catch (err) {
    res.status(404).json({ success: false, error: err.message });
  }
});

export default router;
