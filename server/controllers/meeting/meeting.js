const Meeting = require('../../model/schema/meeting')
const mongoose = require('mongoose');

const add = async (req, res) => {
    const {
        agenda,
        attendes,
        attendesLead,
        location,
        related,
        dateTime,
        notes,
        createBy
    } = req.body;

    // Validate required fields
    if (!agenda || !createBy) {
        return res.status(400).json({
            error: 'Agenda and createBy are required fields'
        });
    }

    // Validate ObjectId formats
    if (createBy && !mongoose.Types.ObjectId.isValid(createBy)) {
        return res.status(400).json({
            error: 'Invalid createBy value'
        });
    }

    try {
        const meetingData = {
            agenda,
            location,
            related,
            dateTime,
            notes,
            createBy,
            timestamp: new Date()
        };

        // Handle array fields
        if (attendes?.length > 0) {
            meetingData.attendes = attendes.map(id =>
                mongoose.Types.ObjectId(id)
            );
        }
        if (attendesLead?.length > 0) {
            meetingData.attendesLead = attendesLead.map(id =>
                mongoose.Types.ObjectId(id)
            );
        }

        const result = new Meeting(meetingData);
        await result.save();
        res.status(200).json(result);
    } catch (err) {
        console.error('Failed to create meeting:', err);
        res.status(400).json({
            error: 'Failed to create meeting : ',
            err
        });
    }
}

const index = async (req, res) => {
    const query = { ...req.query, deleted: false };
    // Convert string IDs to ObjectId
    if (query.attendes) {
        query.attendes = mongoose.Types.ObjectId(query.attendes);
    }
    if (query.attendesLead) {
        query.attendesLead = mongoose.Types.ObjectId(query.attendesLead);
    }
    if (query.createBy) {
        query.createBy = mongoose.Types.ObjectId(query.createBy);
    }


    try {
        let result = await Meeting.aggregate([
            { $match: query },
            {
                $lookup: {
                    from: 'Contacts',
                    localField: 'attendes',
                    foreignField: '_id',
                    as: 'attendes'
                }
            },
            {
                $lookup: {
                    from: 'Leads',
                    localField: 'attendesLead',
                    foreignField: '_id',
                    as: 'attendesLead'
                }
            },
            {
                $lookup: {
                    from: 'User',
                    localField: 'createBy',
                    foreignField: '_id',
                    as: 'users'
                }
            },
            {
                $unwind: {
                    path: '$users',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $unwind: {
                    path: '$attendes',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $unwind: {
                    path: '$attendesLead',
                    preserveNullAndEmptyArrays: true
                }
            },
            { $match: { 'users.deleted': false } },
            {
                $addFields: {
                    createByName: '$users.username',
                    attendesName: '$attendes.firstName',
                    attendesLeadName: '$attendesLead.leadName'
                }
            },
            {
                $project: {
                    users: 0,
                    'attendes.password': 0,
                    'attendesLead.password': 0
                }
            }
        ]);

        res.send(result);
    } catch (error) {
        console.error("Error:", error);
        res.status(500).send("Internal Server Error");
    }
}

const view = async (req, res) => {
    try {
        let response = await Meeting.findOne({ _id: req.params.id })
        if (!response) return res.status(404).json({
            message: "Meeting not found."
        })

        let result = await Meeting.aggregate([
            { $match: { _id: response._id } },
            {
                $lookup: {
                    from: 'Contacts',
                    localField: 'attendes',
                    foreignField: '_id',
                    as: 'attendes'
                }
            },
            {
                $lookup: {
                    from: 'Leads',
                    localField: 'attendesLead',
                    foreignField: '_id',
                    as: 'attendesLead'
                }
            },
            {
                $lookup: {
                    from: 'User',
                    localField: 'createBy',
                    foreignField: '_id',
                    as: 'users'
                }
            },
            {
                $unwind: {
                    path: '$users',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $unwind: {
                    path: '$attendes',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $unwind: {
                    path: '$attendesLead',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $addFields: {
                    createByName: '$users.username',
                    attendesName: '$attendes.firstName',
                    attendesLeadName: '$attendesLead.leadName'
                }
            },
            {
                $project: {
                    users: 0,
                    'attendes.password': 0,
                    'attendesLead.password': 0
                }
            }
        ])

        res.status(200).json(result[0]);
    } catch (err) {
        console.log('Error:', err);
        res.status(400).json({ Error: err });
    }
}

const deleteData = async (req, res) => {
    try {
        const result = await Meeting.findByIdAndUpdate(req.params.id, { deleted: true });
        res.status(200).json({ message: "Meeting marked as deleted", result })
    } catch (err) {
        res.status(404).json({ message: "error", err })
    }
}

const deleteMany = async (req, res) => {
    try {
        const result = await Meeting.updateMany({
            _id: { $in: req.body }
        }, {
            $set: { deleted: true }
        });

        if (result?.matchedCount > 0 && result?.modifiedCount > 0) {
            return res.status(200).json({
                message: "Meetings Removed successfully",
                result
            });
        } else {
            return res.status(404).json({
                success: false,
                message: "Failed to remove meetings"
            });
        }
    } catch (err) {
        return res.status(404).json({
            success: false,
            message: "error",
            err
        });
    }
}

module.exports = { add, index, view, deleteData, deleteMany }