import mongoose from "mongoose";
import { DeliveryPartner } from "./user.js";

const branchSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
    },
    address: {
        type: String,
    },
    deliveryPartners: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "DeliveryPartner",
    }],
    location: {
        latitude: { type: Number, required: true },
        longitude: { type: Number, required: true },
    },
    phone:{
        type: String,
        unique: true,
        sparse: true,
    }
});

const Branch = mongoose.model("Branch", branchSchema);
export default Branch;