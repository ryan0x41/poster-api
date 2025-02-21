const express = require('express');
const router = express.Router();
const authenticateAuthHeader = require('../middleware/authenticateAuthHeader');
const { Report, ContentType } = require('../models/Report')

const { createReport, getReports, processReport } = require('../services/reportService')

router.post('/create', authenticateAuthHeader, async (req, res) => {
    try {
        const { type, idToReport, userMessage } = req.body;

        if (!type || !idToReport || !userMessage) {
            return res.status(400).json({ error: "type, idToReport, and userMessage are required" });
        }

        // validate
        if (!Object.values(ContentType).includes(type)) {
            return res.status(400).json({ error: `invalid type: ${type}. must be one of ${Object.values(ContentType).join(", ")}` });
        }
        
        const reportedBy = req.user.id;

        // create new report
        const report = new Report({ idToReport, type, userMessage, reportedBy });

        const { message } = await createReport(report);

        res.status(201).json({ message, reportId: report.reportId });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

router.post('/process', authenticateAuthHeader, async (req, res) => {
    try {
        if(!req.user.isAdmin) {
            return res.status(401).json({ message: "only admins can process reports!" });
        }

        const { reportId, action } = req.body;
        const { message } = await processReport(reportId, action);

        return res.status(200).json({ message });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

router.get('/all/:pageNumber?', authenticateAuthHeader, async (req, res) => {
    try {
        if(!req.user.isAdmin) {
            return res.status(401).json({ message: "only admins can view reports!" });
        }

        const { pageNumber } = req.params;

        const reports = await getReports(
            pageNumber && Number.isInteger(Number(pageNumber)) && Number(pageNumber) > 0
                ? Number(pageNumber)
                : undefined
        );

        res.status(200).json({ message: "reports fetched successfully", reports });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;