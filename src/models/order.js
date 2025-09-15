import mongoose from "mongoose";
import Counter from "./counter.js";

const orderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    unique: true,
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Customer",
    required: true,
  },
  deliveryPartner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "DeliveryPartner",
  },
  branch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Branch",
    required: true,
  },
  items: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    // Snapshot fields (frozen at order time)
    name: { type: String, required: true },
    brand: { type: String },
    quantityValue: { type: String },
    quantityUnit: { type: String },
    
    // FINAL PRICING STRUCTURE
    mode: {
      type: String,
      enum: ["retail", "wholesale"],
      required: true,
      description: "Pricing mode applied"
    },
    unitsBought: {
      type: Number,
      required: true,
      description: "Total units purchased"
    },
    unitPrice: {
      type: Number,
      required: true,
      description: "Effective price per unit at order time"
    },
    totalPrice: {
      type: Number,
      required: true,
      description: "unitPrice × unitsBought"
    },
    bundlesBought: {
      type: Number,
      default: 0,
      description: "Number of wholesale bundles bought (wholesale mode only)"
    },
    // Snapshot pricing (for order history)
    basePrice: { type: Number },
    discountPrice: { type: Number },
    subscriptionPrice: { type: Number },
    unitPerSubscription: { type: Number }
  }],
  
  deliveryLocation: {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    address: { type: String, required: true },
  },
  pickupLocation: {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    address: { type: String, required: true },
  },
  deliveryPersonLocation: {
    latitude: { type: Number },
    longitude: { type: Number },
    address: { type: String, required: true },
    timestamp: { type: Date },
    accuracy: { type: Number },
    speed: { type: Number },
    heading: { type: Number },
    isFinalLocation: { type: Boolean, default: false },
    deliveredAt: { type: Date }
  },
  
  // Route and tracking data (unchanged)
  routeData: {
    overviewPolyline: { type: String },
    coordinates: [{ latitude: Number, longitude: Number }],
    bounds: {
      northeast: { latitude: Number, longitude: Number },
      southwest: { latitude: Number, longitude: Number }
    },
    distance: {
      text: { type: String },
      value: { type: Number }
    },
    duration: {
      text: { type: String },
      value: { type: Number }
    },
    durationInTraffic: {
      text: { type: String },
      value: { type: Number }
    },
    steps: [{
      distance: { text: { type: String }, value: { type: Number } },
      duration: { text: { type: String }, value: { type: Number } },
      end_location: { latitude: Number, longitude: Number },
      html_instructions: { type: String },
      maneuver: { type: String },
      polyline: { type: String },
      start_location: { latitude: Number, longitude: Number },
      travel_mode: { type: String }
    }],
    summary: { type: String },
    warnings: [{ type: String }],
    copyrights: { type: String },
    routeType: { type: String, enum: ['branch-to-partner', 'partner-to-customer', 'branch-to-customer'] },
    origin: { latitude: Number, longitude: Number, address: String },
    destination: { latitude: Number, longitude: Number, address: String },
    lastUpdated: { type: Date },
    isActive: { type: Boolean, default: true }
  },
  
  routeHistory: [{
    routeType: { type: String, enum: ['branch-to-partner', 'partner-to-customer', 'branch-to-customer'] },
    coordinates: [{ latitude: Number, longitude: Number }],
    distance: { text: String, value: Number },
    duration: { text: String, value: Number },
    createdAt: { type: Date, default: Date.now }
  }],
  
  status: {
    type: String,
    enum: ["pending", "accepted", "in-progress", "awaitconfirmation", "delivered", "cancelled"],
    default: "pending",
  },
  deliveryStatus: {
    type: String,
    enum: ["Assigning Partner", "Partner Assigned", "On The Way", "Delivered", "Cancelled"],
    default: "Assigning Partner",
  },
  totalPrice: {
    type: Number,
    required: true,
  },
  deliveryFee: {
    type: Number,
    required: true,
  },
  
  // Payment tracking (unchanged)
  paymentStatus: {
    type: String,
    enum: ["pending", "verified", "failed", "refunded", "completed"],
    default: "pending",
  },
  paymentDetails: {
    razorpayOrderId: { type: String },
    razorpayPaymentId: { type: String },
    razorpaySignature: { type: String },
    verifiedAt: { type: Date },
    amount: { type: Number },
    currency: { type: String, default: "INR" },
    method: { type: String },
    refundId: { type: String },
    refundedAt: { type: Date },
    refundAmount: { type: Number },
    refundReason: { type: String }
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

async function generateOrderId() {
  const counter = await Counter.findOneAndUpdate(
    { name: "orderId" },
    { $inc: { sequenceValue: 1 } },
    { new: true, upsert: true }
  );
  return `ORD-${counter.sequenceValue.toString().padStart(5, '0')}`;
}

orderSchema.pre("save", async function (next) {
  if (this.isNew) {
    this.orderId = await generateOrderId();
  }
  this.updatedAt = Date.now();
  next();
});

const Order = mongoose.model("Order", orderSchema);

export default Order;
