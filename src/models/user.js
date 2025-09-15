import mongoose, { Mongoose } from "mongoose";

const userSchema = new mongoose.Schema({
    name: {
        type: String,
    },
    role: {
        type: String,
        enum: ['Customer', 'Admin' ,'DeliveryPartner'],
        required: true,
    },
    isActivated : {
        type: Boolean,
        default: false,
    }
})

const customerSchema = new mongoose.Schema({
    ...userSchema.obj,
    phone: {
        type: String,
        required: true,
        unique: true,
    },
    address: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Address',
    }],
    liveLocation: {
        latitude: { type: Number }, // Fixed typo: latitute -> latitude
        longitude: { type: Number },
    },
    role : {
        type: String,
        enum: ['Customer'],
        default: 'Customer',
    },
    
    email:{
        type: String,
        lowercase: true,
        trim: true,
    },
    // Security features
    isSubscription: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

const deliveryPartnerSchema = new mongoose.Schema({
    ...userSchema.obj,
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    password: {
        type: String,
        required: true,
    },
    liveLocation: {
        latitude: { type: Number },
        longitude: { type: Number },
    },
    phone: {
        type: String,
        required: true,
        unique: true,
    },
    address: {
        type: String,
    },
    branch: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Branch',
    },
    role : {
        type: String,
        enum: ['DeliveryPartner'],
        default: 'DeliveryPartner',
    },
    // Security features
    accountLocked: {
        type: Boolean,
        default: false,
    },
}, {
    timestamps: true,
});

const adminSchema = new mongoose.Schema({
    ...userSchema.obj,
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    role : {
        type: String,
        enum: ['Admin'],
        default: 'Admin',
    },
});
   
export const Customer = mongoose.model('Customer', customerSchema);
export const DeliveryPartner = mongoose.model('DeliveryPartner', deliveryPartnerSchema);
export const Admin = mongoose.model('Admin', adminSchema);
export const User = mongoose.model('User', userSchema);