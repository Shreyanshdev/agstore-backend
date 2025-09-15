import AdminJS from "adminjs";
import AdminJSExpress from "@adminjs/express";
import *  as AdminJSMongoose from "@adminjs/mongoose";
import * as Models from "../models/index.js";
import { COOKIE_SECRET , sessionStore } from "./config.js";
import {dark , light ,noSidebar} from "@adminjs/themes";
import { Admin } from "../models/user.js";

AdminJS.registerAdapter(AdminJSMongoose);

export const admin = new AdminJS({
    resources:[
        {
            resource:Models.Customer,
            options:{
                listProperties:['phone','role', 'isActivated', 'isSubscription'],
                filterProperties:['phone','role', 'isSubscription']
            }
        },
        {
            resource:Models.DeliveryPartner,
            options:{
                listProperties:['email','role', 'isActivated'],
                filterProperties:['email','role']
            }
        },
        {
            resource:Models.Admin,
            options:{
                listProperties:['email','role', 'isActivated'],
                filterProperties:['email','role']
            }
        },
        {resource:Models.Branch},
        {resource:Models.Product},
        {resource:Models.Category},
        {resource:Models.Order},
        {resource:Models.Counter},
        {resource:Models.Address},
    ],
    branding:{
        companyName: "AgStore",
        withMadeWithLove: false,
    },
    defaultTheme:dark.id,
    availableThemes:[dark, light, noSidebar],
    rootPath: "/admin",
});

export const buildAdminRouter = () => {
    const router = AdminJSExpress.buildAuthenticatedRouter(
        admin, {
            authenticate: async (email , password) => {
                const user = await Admin.findOne({ email });
                if(!user) {
                    return false;
                }
                if(user.password === password) { 
                    return user;
                }else{
                    return false;
                }
            },
            cookiePassword: COOKIE_SECRET,
            cookieName: "adminjs",
        },
        null,
        {
            resave: false,
            saveUninitialized: false,
            store: sessionStore,
            secret: COOKIE_SECRET,
        }
    );
    return router;
};

// export const adminRouter = AdminJSExpress.buildRouter(admin);
// export const adminRouter = AdminJSExpress.buildAuthenticatedRouter(admin, {
//     authenticate: async (email, password) => {
//         const user = await User.findOne({ email });

//         if (user) {
//             const matched = await bcrypt.compare(password, user.password);
//             if (matched) {
//                 return user;
//             }
//         }
//         return false;
//     },
//     cookiePassword: 'some-secret-password-used-to-secure-cookie',
// }, null, {
//     resave: false,
//     saveUninitialized: false,
// });