import { Customer, DeliveryPartner } from "../models/user.js";


export const getUserProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    console.log('Decoded userId:', userId);

    const user = await Customer.findById(userId).lean();
    console.log('User found:', user);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json({
      name: user.name,
      email:user.email,
      phone: user.phone,
      address: user.address,
      isActivated: user.isActivated,
    });
    
  } catch (error) {
    console.error("Profile fetch error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const updateUserProfile = async (req, res) => {
    try {
      const userId = req.user._id;
      const { name, email, address } = req.body;
  
      const user = await Customer.findById(userId);
  
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
  
      if (name) user.name = name;
      if (email) user.email = email;
      if (address) user.address = address;
  
      await user.save();
  
      return res.json({ message: "Profile updated successfully" });
    } catch (error) {
      console.error("Profile update error:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  };

export const getDeliveryPartnerById = async (req, res) => {
  try {
    const { id } = req.params;
    const deliveryPartner = await DeliveryPartner.findById(id).select('-password'); // Exclude password

    if (!deliveryPartner) {
      return res.status(404).json({ message: "Delivery Partner not found" });
    }

    return res.status(200).json(deliveryPartner);
  } catch (error) {
    console.error("Get delivery partner by ID error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Admin: Toggle subscription flag for a customer
export const toggleCustomerSubscription = async (req, res) => {
  try {
    const { customerId, isSubscription } = req.body;
    if (!customerId || typeof isSubscription !== 'boolean') {
      return res.status(400).json({ message: 'customerId and isSubscription(boolean) are required' });
    }
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }
    customer.isSubscription = isSubscription;
    await customer.save();
    return res.status(200).json({ message: 'Subscription flag updated', customerId, isSubscription });
  } catch (error) {
    console.error('Toggle subscription error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};