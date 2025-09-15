import Product from "../../models/product.js";

// Helper function to format product pricing based on user subscription
const formatProductPricing = (product, isSubscriber) => {
  const obj = product.toObject();
  const retailUnitPrice = obj.discountPrice || obj.basePrice;
  
  const response = {
    _id: obj._id,
    name: obj.name,
    brand: obj.brand,
    images: obj.images,
    quantityValue: obj.quantityValue,
    quantityUnit: obj.quantityUnit,
    category: obj.category,
    stock: obj.stock,
    description: obj.description,
    basePrice: obj.basePrice,
    discountPrice: obj.discountPrice,
    retail: { unitPrice: retailUnitPrice },
    subscriptionPrice: obj.subscriptionPrice,
    unitPerSubscription: obj.unitPerSubscription,
    tags: obj.tags,
    lowStockThreshold: obj.lowStockThreshold,
  };

  // Only show wholesale pricing to subscribed users
  if (isSubscriber && obj.subscriptionPrice && obj.unitPerSubscription) {
    response.wholesale = {
      bundlePrice: obj.subscriptionPrice,
      unitsPerBundle: obj.unitPerSubscription,
      unitPrice: obj.subscriptionPrice / obj.unitPerSubscription
    };
  }

  return response;
};

// Get products by category ID
export const getProductByCategoryId = async (req, res) => {
  const { categoryId } = req.params;
  const { page = 1, limit = 20, sort = 'createdAt', order = 'desc' } = req.query;

  try {
    const sortOrder = order === 'desc' ? -1 : 1;
    const skip = (page - 1) * limit;

    const products = await Product.find({
      category: categoryId,
      $or: [{ status: 'active' }, { status: { $exists: false } }]
    })
    .populate('category', 'name')
    .populate('relatedProducts', 'name images basePrice discountPrice')
    .sort({ [sort]: sortOrder })
    .skip(skip)
    .limit(parseInt(limit))
    .exec();

    const total = await Product.countDocuments({
      category: categoryId,
      $or: [{ status: 'active' }, { status: { $exists: false } }]
    });

    const isSubscriber = !!req.user?.isSubscription;
    const filtered = products.map(p => formatProductPricing(p, isSubscriber));

    return res.status(200).json({
      products: filtered,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalProducts: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error("Error fetching products by category ID:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Get all products with filtering and pagination
export const getAllProducts = async (req, res) => {
  const {
    page = 1,
    limit = 20,
    sort = 'createdAt',
    order = 'desc',
    featured,
    trending,
    bestseller,
    brand,
    minPrice,
    maxPrice,
    search
  } = req.query;

  try {
    const sortOrder = order === 'desc' ? -1 : 1;
    const skip = (page - 1) * limit;

    const filter = { $or: [{ status: 'active' }, { status: { $exists: false } }] };

    if (featured === 'true') filter.featured = true;
    if (trending === 'true') filter.trending = true;
    if (bestseller === 'true') filter.bestseller = true;
    if (brand) filter.brand = new RegExp(brand, 'i');
    
    if (minPrice || maxPrice) {
      filter.basePrice = {};
      if (minPrice) filter.basePrice.$gte = parseFloat(minPrice);
      if (maxPrice) filter.basePrice.$lte = parseFloat(maxPrice);
    }

    let query = Product.find(filter)
      .populate('category', 'name')
      .populate('relatedProducts', 'name images basePrice discountPrice')
      .sort({ [sort]: sortOrder })
      .skip(skip)
      .limit(parseInt(limit));

    if (search) {
      query = Product.find({
        ...filter,
        $text: { $search: search }
      })
      .populate('category', 'name')
      .populate('relatedProducts', 'name images basePrice discountPrice')
      .sort({ score: { $meta: 'textScore' }, [sort]: sortOrder })
      .skip(skip)
      .limit(parseInt(limit));
    }

    const products = await query.exec();
    const total = await Product.countDocuments(filter);

    const isSubscriber = !!req.user?.isSubscription;
    const filtered = products.map(p => formatProductPricing(p, isSubscriber));

    return res.status(200).json({
      products: filtered,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalProducts: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error("Error fetching all products:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Get product by ID with full details
export const getProductById = async (req, res) => {
  const { productId } = req.params;

  try {
    const product = await Product.findById(productId)
      .populate('category', 'name description')
      .populate('relatedProducts', 'name images basePrice discountPrice shortDescription tags')
      .exec();

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const isSubscriber = !!req.user?.isSubscription;
    const response = formatProductPricing(product, isSubscriber);
    
    // Add additional details for single product view
    response.tags = product.tags;
    response.sku = product.sku;
    response.manufacturer = product.manufacturer;
    response.lowStockThreshold = product.lowStockThreshold;

    return res.status(200).json(response);
  } catch (error) {
    console.error("Error fetching product by ID:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Get wholesale products (subscribed users only)
export const getWholesaleProducts = async (req, res) => {
  const { page = 1, limit = 20 } = req.query;

  try {
    const skip = (page - 1) * limit;

    const products = await Product.find({
      subscriptionPrice: { $exists: true, $ne: null },
      unitPerSubscription: { $exists: true, $ne: null },
      status: 'active'
    })
    .select("name images subscriptionPrice unitPerSubscription category brand basePrice discountPrice")
    .populate("category", "name")
    .skip(skip)
    .limit(parseInt(limit));

    const total = await Product.countDocuments({
      subscriptionPrice: { $exists: true, $ne: null },
      status: 'active'
    });

    const isSubscriber = !!req.user?.isSubscription;
    const filtered = products.map(p => formatProductPricing(p, isSubscriber));

    return res.status(200).json({
      products: filtered,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalProducts: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error("Error fetching wholesale products:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Search products by tags and text
export const searchProducts = async (req, res) => {
  const {
    q,
    tags,
    category,
    page = 1,
    limit = 20,
    sort = 'createdAt',
    order = 'desc'
  } = req.query;

  try {
    const sortOrder = order === 'desc' ? -1 : 1;
    const skip = (page - 1) * limit;

    let filter = { status: 'active' };

    if (q) {
      filter.$text = { $search: q };
    }

    if (tags) {
      const tagArray = tags.split(',').map(tag => tag.trim().toLowerCase());
      filter.tags = { $in: tagArray };
    }

    if (category) {
      filter.category = category;
    }

    let query = Product.find(filter)
      .populate('category', 'name')
      .populate('relatedProducts', 'name images basePrice discountPrice')
      .sort(q ? { score: { $meta: 'textScore' } } : { [sort]: sortOrder })
      .skip(skip)
      .limit(parseInt(limit));

    const products = await query.exec();
    const total = await Product.countDocuments(filter);

    const isSubscriber = !!req.user?.isSubscription;
    const filtered = products.map(p => formatProductPricing(p, isSubscriber));

    return res.status(200).json({
      products: filtered,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalProducts: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error("Error searching products:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Get featured products
export const getFeaturedProducts = async (req, res) => {
  const { limit = 10 } = req.query;

  try {
    const products = await Product.find({
      featured: true,
      $or: [{ status: 'active' }, { status: { $exists: false } }]
    })
    .populate('category', 'name')
    .select('name images basePrice discountPrice ratings featured stock')
    .sort({ createdAt: -1 })
    .limit(parseInt(limit));

    return res.status(200).json(products);
  } catch (error) {
    console.error("Error fetching featured products:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Fixed getProductVariants - Only show actual saved variants
export const getProductVariants = async (req, res) => {
  try {
    const { productId } = req.params;
    const product = await Product.findById(productId);
    
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Only return products that are specifically saved as variants
    if (!product.variants || product.variants.length === 0) {
      return res.status(200).json([]); // Return empty array if no variants saved
    }

    const variants = await Product.find({
      _id: { $in: product.variants }, // Only fetch saved variants
      $or: [{ status: 'active' }, { status: { $exists: false } }]
    })
    .select('name images basePrice discountPrice quantityValue quantityUnit stock featured')
    .limit(10);

    return res.status(200).json(variants);
  } catch (error) {
    console.error("Error fetching product variants:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Fixed getRelatedProducts - Made fallback optional
export const getRelatedProducts = async (req, res) => {
  const { productId } = req.params;
  const { limit = 8, fallback = 'false' } = req.query; // Add fallback parameter

  try {
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    let relatedProducts = [];
    
    // First, get specifically saved related products
    if (product.relatedProducts && product.relatedProducts.length > 0) {
      relatedProducts = await Product.find({
        _id: { $in: product.relatedProducts },
        $or: [{ status: 'active' }, { status: { $exists: false } }]
      })
      .select('name images basePrice discountPrice shortDescription ratings')
      .limit(parseInt(limit));
    }

    // Only fallback to category products if explicitly requested
    if (fallback === 'true' && relatedProducts.length < parseInt(limit)) {
      const additionalProducts = await Product.find({
        category: product.category,
        _id: { $ne: productId },
        $or: [{ status: 'active' }, { status: { $exists: false } }]
      })
      .select('name images basePrice discountPrice shortDescription ratings')
      .limit(parseInt(limit) - relatedProducts.length);

      relatedProducts = [...relatedProducts, ...additionalProducts];
    }

    return res.status(200).json(relatedProducts);
  } catch (error) {
    console.error("Error fetching related products:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Get all available tags
export const getAllTags = async (req, res) => {
  try {
    const tags = await Product.distinct('tags', { $or: [{ status: 'active' }, { status: { $exists: false } }] });
    return res.status(200).json(tags);
  } catch (error) {
    console.error("Error fetching tags:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Get all brands
export const getAllBrands = async (req, res) => {
  try {
    const brands = await Product.distinct('brand', {
      $or: [{ status: 'active' }, { status: { $exists: false } }],
      brand: { $exists: true, $ne: null }
    });
    return res.status(200).json(brands);
  } catch (error) {
    console.error("Error fetching brands:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
