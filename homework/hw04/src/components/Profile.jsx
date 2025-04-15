import React, { useState, useEffect } from "react";
import { getDataFromServer } from "../server-requests";

//import Profile from "./Profile";

export default function Profile({ token }) {
    const [profile, setProfile] = useState(null);

    async function fetchProfile() {
        const data = await getDataFromServer(token, "/api/profile/");
        console.log(data);
        setProfile(data);
    }

    useEffect(() => {
        fetchProfile();
    }, []); 

    if (!profile) {
        return null;
    } else {
        return (
        <header className="flex gap-4 items-center">
            <img
                src={profile.image_url}
                alt={`${profile.username}'s screen name`}
                className="rounded-full w-16"
            />
            <h2 className="font-Comfortaa font-bold text-2xl">{profile.username}</h2>
        </header>
    );
    }

    
}
    //     function outputProfile(profObj) {
    //         //return <Post key={postObj.id} />
    //         return <Profile token = {token} key={user.id} profData={profObj} />
    //     }
    
    // if(!userData)
   

