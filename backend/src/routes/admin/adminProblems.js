const { AuthoringError, createProblemAuthoringService } = require('../../services/admin/problemAuthoring');
const express = require('express');

function createProblemAuthoringRouters(options) {
    const service = createProblemAuthoringService(options);
    const adminRouter = express.Router();
    const assetRouter = express.Router();

    function fail(res, error) {
        if (error instanceof AuthoringError) return res.status(error.status).json({ error: error.message });
        console.error('Problem authoring failed:', error.message);
        return res.status(500).json({ error: '문제를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.' });
    }

    adminRouter.post('/groups/:groupId/problems', async (req, res) => {
        try { return res.status(201).json(await service.create(req.params.groupId, req.body)); }
        catch (error) { return fail(res, error); }
    });
    adminRouter.get('/groups/:groupId/problems', async (req, res) => {
        try { return res.json(await service.list(req.params.groupId, req.query.userId)); }
        catch (error) { return fail(res, error); }
    });
    adminRouter.patch('/groups/:groupId/problems/:problemId', async (req, res) => {
        try { return res.json(await service.update(req.params.groupId, req.params.problemId, req.body)); }
        catch (error) { return fail(res, error); }
    });
    assetRouter.get('/problems/:problemId/assets/:filename', async (req, res) => {
        try {
            const asset = await service.publicAsset(req.params.problemId, req.params.filename);
            return res.set({ 'Content-Type': asset.mimeType, 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store' }).send(asset.data);
        } catch (error) { return fail(res, error); }
    });
    function jsonErrorHandler(error, req, res, next) {
        if (error.type === 'entity.too.large') return res.status(413).json({ error: '업로드한 문제와 이미지의 전체 크기가 너무 큽니다.' });
        if (error.type === 'entity.parse.failed') return res.status(400).json({ error: '업로드 요청을 읽을 수 없습니다.' });
        return next(error);
    }
    return { adminRouter, assetRouter, jsonErrorHandler, service };
}

module.exports = { createProblemAuthoringRouters };
