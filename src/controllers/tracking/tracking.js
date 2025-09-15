import { Customer , DeliveryPartner } from '../../models/user.js';


export const updateUser = async (req, res) => {

    try {
        const { userId } = req.params;  
        //const { userId } = req.user;
        const updateData = req.body;
        let user=await Customer.findById(userId) || await DeliveryPartner.findById(userId) ;

        // Check if user exists
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Update user data
        let UserModel;

        if(user.role === 'Customer') {
            UserModel = Customer;
        }
        else if(user.role === 'DeliveryPartner') {
            UserModel = DeliveryPartner;
        }
        else {
            return res.status(400).json({ message: "Invalid user role" });
        }

        const updatedUser = await UserModel.findByIdAndUpdate(
            userId,
            { $set: updateData },
            { new: true, runValidators: true }
        );

        // Check if update was successful
        if (!updatedUser) {
            return res.status(404).json({ message: "User not found or update failed" });
        }

        return res.status(200).json({
            message: "User updated successfully",
            user: updatedUser
        });
    } catch (error) {
        console.error("Update user error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}