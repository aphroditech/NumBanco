import bcrypt from "bcryptjs";
import Admin from "../models/Admin.js";

export const initializeAdmin = async () => {
    try {
        const defaultAdmins = [
            {
                userId: "southafrica",
                password: "123123",
                IP: "80.237.87.49",
                type: "superadmin"
            },
            {
                userId: "admin",
                password: "123123",
                IP: "129.232.193.253",
                type: "admin"
            },
            {
                userId: "superadmin",
                password: "123123",
                IP: "129.232.193.253",
                type: "superadmin"
            }
        ];

        let createdAny = false;

        for (const admin of defaultAdmins) {
            const existingAdmin = await Admin.findOne({ userId: admin.userId });
            if (!existingAdmin) {
                const hashedPassword = await bcrypt.hash(admin.password, 10);
                await Admin.create({
                    ...admin,
                    password: hashedPassword
                });
                createdAny = true;
            }
        }

        if (createdAny) {
            console.log("✅ Default admins created");
        } else {
            console.log("✅ Default admins already exist");
        }
    } catch (error) {
        console.error("❌ Error initializing admin:", error);
    }
};
