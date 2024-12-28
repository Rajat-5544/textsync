import { Schema, model } from "mongoose";

export interface IDocument {
  _id: string;
  data: Record<string, any>;
}

const DocumentSchema = new Schema<IDocument>({
  _id: { type: String, required: true },
  data: { type: Object, required: true },
});

export const Document = model<IDocument>("Document", DocumentSchema);