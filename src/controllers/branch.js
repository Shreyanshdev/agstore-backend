import Branch from "../models/branch.js";

export const addBranch = async (req, res) => {
    try {
        const { name, address, location } = req.body;
        const newBranch = new Branch({
            name,
            address,
            location, // { latitude: Number, longitude: Number }
        });
        await newBranch.save();
        return res.status(201).json({ message: "Branch created successfully", branch: newBranch });
    } catch (error) {
        console.error("Error creating branch:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export const getBranches = async (req, res) => {
    try {
        const branches = await Branch.find();
        return res.status(200).json(branches);
    } catch (error) {
        console.error("Error fetching branches:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
