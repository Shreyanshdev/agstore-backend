import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    description: "Product name"
  },
  description: {
    type: String,
    description: "Detailed product description"
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category",
    required: true,
    description: "Product category"
  },
  brand: {
    type: String,
    description: "Product brand name"
  },
//   manufacturer: {
//     type: String,
//     description: "Manufacturer name"
//   },
  images: [{
    type: String,
    required: true,
    description: "Array of product image URLs"
  }],
  quantityValue: {
    type: String,
    required: true,
    description: "Product quantity with unit (e.g., '1 Litre', '500 ml', '1 Dozen')"
  },
  quantityUnit: {
    type: String,
    required: true,
    enum: ['L', 'ml', 'Dozen', 'Piece', 'Kg', 'g', 'Pack', 'Box', 'pcs', 'Set'],
    description: "Unit of measurement"
  },
//   sku: {
//     type: String,
//     unique: true,
//     sparse: true,
//     description: "Stock Keeping Unit"
//   },
  
  // FINAL PRICING STRUCTURE
  basePrice: {
    type: Number,
    required: true,
    description: "Base retail price"
  },
  discountPrice: {
    type: Number,
    description: "Optional retail discount price"
  },
  subscriptionPrice: {
    type: Number,
    description: "Wholesale bundle price for subscribed users"
  },
  unitPerSubscription: {
    type: Number,
    default: 1,
    description: "Number of retail units per wholesale bundle"
  },
  
  stock: {
    type: Number,
    required: true,
    default: 0,
    description: "Total available stock"
  },
  lowStockThreshold: {
    type: Number,
    default: 10,
    description: "Threshold for low stock alerts"
  },
  tags: [{
    type: String,
    lowercase: true,
    trim: true,
    description: "Search tags"
  }],
  variants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    description: "Array of related product IDs"
  }],
  relatedProducts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    description: "Array of related product IDs for cross-selling"
  }],
  featured: {
    type: Boolean,
    default: false,
    description: "Whether product is featured"
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active',
    description: "Product availability status"
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for discount percentage
productSchema.virtual('discountPercentage').get(function() {
  if (this.discountPrice && this.basePrice) {
    return Math.round(((this.basePrice - this.discountPrice) / this.basePrice) * 100);
  }
  return 0;
});

// Pre-save middleware to update timestamps
productSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Indexes for better search performance
productSchema.index({ name: 'text', description: 'text', tags: 'text' });
productSchema.index({ category: 1 });
productSchema.index({ brand: 1 });
productSchema.index({ tags: 1 });
productSchema.index({ featured: 1 });
productSchema.index({ sku: 1 });

const Product = mongoose.model("Product", productSchema);

export default Product;
