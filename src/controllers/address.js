import Address from "../models/address.js";
import { Customer } from "../models/user.js";
import { geocodeAddress } from '../utils/geocode.js';

export const addAddress = async (req, res) => {
  try {
    // Get userId from authenticated user (from JWT token)
    const userId = req.user._id || req.user.userId;
    
    if (!userId) {
      return res.status(400).json({ message: "User ID not found in token" });
    }

    const { addressLine1, addressLine2, city, state, zipCode, isDefault, latitude, longitude } = req.body;

    // If latitude and longitude are provided, use them; otherwise, geocode the address
    let finalLatitude = latitude || 0;
    let finalLongitude = longitude || 0;
    
    if (!latitude || !longitude) {
      // Build full address string for geocoding
      const addressString = [addressLine1, addressLine2, city, state, zipCode].filter(Boolean).join(', ');
      
      try {
        const geo = await geocodeAddress(addressString);
        finalLatitude = geo.latitude;
        finalLongitude = geo.longitude;
      } catch (geoErr) {
        console.warn("Geocoding failed, using provided coordinates or defaults:", geoErr.message);
        // Keep the provided coordinates or defaults (0,0)
      }
    }

    const newAddress = new Address({
      userId,
      addressLine1,
      addressLine2,
      city,
      state,
      zipCode,
      isDefault,
      latitude: finalLatitude,
      longitude: finalLongitude,
    });

    await newAddress.save();

    // Add the address to the customer's address array
    await Customer.findByIdAndUpdate(userId, { $push: { address: newAddress._id } });

    return res.status(201).json({ 
      message: "Address added successfully", 
      address: newAddress,
      coordinates: {
        latitude: finalLatitude,
        longitude: finalLongitude
      }
    });
  } catch (error) {
    console.error("Error adding address:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};


export const getAddresses = async (req, res) => {
    try {
        // Get userId from authenticated user (from JWT token)
        const userId = req.user._id || req.user.userId;

        if (!userId) {
            return res.status(400).json({ message: "User ID not found in token" });
        }

        console.log(`📍 Fetching addresses for user: ${userId}`);

        const addresses = await Address.find({ userId });
        console.log(`📍 Found ${addresses.length} addresses for user ${userId}`);

        return res.status(200).json({ 
            message: "Addresses fetched successfully",
            addresses: addresses 
        });
    } catch (error) {
        console.error("Error fetching addresses:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export const updateAddress = async (req, res) => {
    try {
        const { addressId } = req.params;
        const { addressLine1, addressLine2, city, state, zipCode, isDefault, latitude, longitude } = req.body;
        
        // If latitude and longitude are provided, use them; otherwise, geocode the address
        let finalLatitude = latitude || 0;
        let finalLongitude = longitude || 0;
        
        if (!latitude || !longitude) {
            // Build full address string for geocoding
            const addressString = [addressLine1, addressLine2, city, state, zipCode].filter(Boolean).join(', ');
            
            try {
                const geo = await geocodeAddress(addressString);
                finalLatitude = geo.latitude;
                finalLongitude = geo.longitude;
            } catch (geoErr) {
                console.warn("Geocoding failed during update, using provided coordinates or defaults:", geoErr.message);
                // Keep the provided coordinates or defaults (0,0)
            }
        }
        
        const updatedAddress = await Address.findByIdAndUpdate(
            addressId,
            { 
                addressLine1, 
                addressLine2, 
                city, 
                state, 
                zipCode, 
                isDefault, 
                latitude: finalLatitude, 
                longitude: finalLongitude 
            },
            { new: true }
        );
        
        if (!updatedAddress) {
            return res.status(404).json({ message: "Address not found" });
        }
        
        return res.status(200).json({ 
            message: "Address updated successfully", 
            address: updatedAddress,
            coordinates: {
                latitude: finalLatitude,
                longitude: finalLongitude
            }
        });
    } catch (error) {
        console.error("Error updating address:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export const deleteAddress = async (req, res) => {
    try {
        const { addressId } = req.params;
        const deletedAddress = await Address.findByIdAndDelete(addressId);
        if (!deletedAddress) {
            return res.status(404).json({ message: "Address not found" });
        }

        // Remove the address from the customer's address array
        await Customer.findByIdAndUpdate(deletedAddress.userId, { $pull: { address: addressId } });

        return res.status(200).json({ message: "Address deleted successfully" });
    } catch (error) {
        console.error("Error deleting address:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export const getAddressById = async (req, res) => {
    try {
        const { addressId } = req.params;
        const address = await Address.findById(addressId);
        if (!address) {
            return res.status(404).json({ message: "Address not found" });
        }
        return res.status(200).json(address);
    } catch (error) {
        console.error("Error fetching address by ID:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

