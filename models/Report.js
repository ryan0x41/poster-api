const { v4: uuidv4 } = require('uuid');

const ContentType = Object.freeze({
    POST: "post",
    COMMENT: "comment"
});

class Report {
    constructor({ idToReport, type, userMessage, reportedBy }) {
        if (!idToReport || !type || !userMessage || !reportedBy) {
            throw new Error('all fields (idToReport, type, userMessage, reportedBy) are required to make a report');
        }

        // ensure type is either comment or post
        if (!Object.values(ContentType).includes(type)) {
            throw new Error(`invalid type: ${type}. must be one of ${Object.values(ContentType).join(", ")}`);
        }

        this.reportId = uuidv4();
        this.idToReport = idToReport;
        this.type = type;
        this.userMessage = userMessage;
        this.reportedBy = reportedBy;
    }
}

module.exports = { Report, ContentType };
