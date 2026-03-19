import React from 'react';
import Info from "views/Profile/ProfileItem/ProfileTabItem/Tabs/Info";
import UserAvatar from "views/Profile/ProfileItem/ProfileTabItem/Tabs/UserAvatar";
import Password from "views/Profile/ProfileItem/ProfileTabItem/Tabs/Password";
import Security from "views/Profile/ProfileItem/ProfileTabItem/Tabs/Security";
import Activity from "views/Profile/ProfileItem/ProfileTabItem/Tabs/Activity";


export const ProfileTabItems = [
    { 
        title: "Info", 
        content:  
            <Info />
    },
    { 
        title: "My Activity", 
        content:  
            <Activity />
    },
    { 
        title: "Profile Picture", 
        content:      
            <UserAvatar />
    },
    { 
        title: "Password", 
        content:      
            <Password />
    },
    {
        title: "Security",
        content:
            <Security />
    }
];