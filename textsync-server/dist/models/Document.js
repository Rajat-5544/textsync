"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Document = void 0;
const mongoose_1 = require("mongoose");
const DocumentSchema = new mongoose_1.Schema({
    _id: { type: String, required: true },
    data: { type: Object, required: true },
});
exports.Document = (0, mongoose_1.model)("Document", DocumentSchema);
