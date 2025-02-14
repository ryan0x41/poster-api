const { connectDB } = require('./db');

async function createReport(report) {
    const db = await connectDB();
    const reportCollection = db.collection('reports');

    const existingReport = await reportCollection.findOne({ idToReport: report.idToReport });

    if (existingReport) {
        const updateResult = await reportCollection.updateOne(
            { idToReport: report.idToReport },
            { $inc: { priority: 1 } }
        );

        if (updateResult.modifiedCount === 0) {
            throw new Error("failed to update report priority");
        }

        return { message: "existing report found. increased priority by 1" };
    }

    const result = await reportCollection.insertOne(report);
    if (!result.acknowledged || !result.insertedId) {
        throw new Error("failed to insert report into the database.");
    }

    return { message: "report created successfully" };
}

async function getReports(page = 1, pageSize = 50) {
    const db = await connectDB();
    const reportCollection = db.collection('reports');

    // page should be at least 1
    page = Math.max(1, page);
    
    // number of docs to skip in collection
    const skip = (page - 1) * pageSize;

    // grab reports, hide _id
    const reports = await reportCollection
        .find({}, { projection: { _id: 0 } })
        .sort({ priority: -1 }) // sort by descending priority
        .skip(skip)
        .limit(pageSize)
        .toArray();

    // total number of reports
    const totalReports = await reportCollection.countDocuments();

    // calculate total pages
    const totalPages = Math.ceil(totalReports / pageSize);

    return {
        page,
        totalPages,
        totalReports,
        reports
    };
}

async function dismissReport(reportId) {
    const db = await connectDB();
    const reportCollection = db.collection('reports');

    const result = await reportCollection.deleteOne({ reportId: reportId });
    if (result.deletedCount === 0) {
        return { message: "report not found" };
    }

    return { message: "report dismissed successfully" };
}

// helper, aargh
async function getAssociatedUser(reportType, idToReport) {
    const db = await connectDB();
    if (reportType === "post") {
        const postCollection = db.collection('post');
        const post = await postCollection.findOne(
            { postId: idToReport },
            { projection: { _id: 0, author: 1 } }
        );
        return post ? post.author : null;
    } else if (reportType === "comment") {
        const commentCollection = db.collection('comments');
        const comment = await commentCollection.findOne(
            { commentId: idToReport },
            { projection: { _id: 0, author: 1 } }
        );
        return comment ? comment.author : null;
    }
    return null;
}

async function warnAssociatedUser(reportId) {
    const db = await connectDB();
    const reportCollection = db.collection('reports');

    const report = await reportCollection.findOne(
        { reportId },
        { projection: { _id: 0, type: 1, idToReport: 1 } }
    );

    if (!report) {
        return { message: "report not found" };
    }

    const associatedUserId = await getAssociatedUser(report.type, report.idToReport);
    if (!associatedUserId) {
        return { message: "user not found" };
    }

    const userCollection = db.collection('users');
    const updateResult = await userCollection.updateOne(
        { id: associatedUserId },
        { $inc: { warnings: 1 } }
    );
    if (updateResult.modifiedCount === 0) {
        return { message: "failed to increment warnings for the user" };
    }

    await dismissReport(reportId);
    await deleteAssociatedContent(reportId);

    return { message: "user warned successfully" };
}

async function banAssociatedUser(reportId) {
    const db = await connectDB();
    const reportCollection = db.collection('reports');

    const report = await reportCollection.findOne(
        { reportId },
        { projection: { _id: 0, type: 1, idToReport: 1 } }
    );

    if (!report) {
        return { message: "report not found" };
    }

    const associatedUserId = await getAssociatedUser(report.type, report.idToReport);
    if (!associatedUserId) {
        return { message: "user not found" };
    }

    const userCollection = db.collection('users');
    const deleteResult = await userCollection.deleteOne({ id: associatedUserId });
    if (deleteResult.deletedCount === 0) {
        return { message: "failed to ban user" };
    }

    await dismissReport(reportId);
    await deleteAssociatedContent(reportId);

    return { message: "user banned successfully" };
}

async function deleteComment(commentId) {
    const db = await connectDB();
    const commentCollection = db.collection('comments');

    const result = await commentCollection.deleteOne({ commentId });
    if (result.deletedCount === 0) {
        return { message: "error deleting comment" };
    }

    return { message: "comment deleted successfully" };
}

async function deletePost(postId) {
    const db = await connectDB();
    const postCollection = db.collection('post');

    const result = await postCollection.deleteOne({ postId });
    if (result.deletedCount === 0) {
        return { message: "error deleting post" };
    }
}

async function deleteAssociatedContent(reportId) {
    const db = await connectDB();
    const reportCollection = db.collection('reports');

    const report = await reportCollection.findOne(
        { reportId },
        { projection: { _id: 0, type: 1, idToReport: 1 } }
    );

    if (!report) {
        return { message: "no report found" };
    }

    switch (report.type) {
        case "comment":
            await deleteComment(report.idToReport);
            break;
        case "post":
            await deletePost(report.idToReport);
            break;
        default:
            return { message: "report type in mongo invalid, how did you manage that?" }
    }
    
    await dismissReport(reportId);

    return { message: "associated content deleted successfully" };
}

async function processReport(reportId, action) {
    switch (action) {
        case "dismiss":
            return dismissReport(reportId);
        case "ban":
            return banAssociatedUser(reportId);
        case "warn":
            return warnAssociatedUser(reportId);
        case "delete":
            return deleteAssociatedContent(reportId);
        default:
            throw new Error("invalid action");
    }
}

module.exports = { createReport, getReports, processReport };
