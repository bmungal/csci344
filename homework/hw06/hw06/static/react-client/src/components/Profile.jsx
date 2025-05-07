import React, { useState, useEffect } from "react";
import { getDataFromServer } from "../server-requests";

export default function Profile({ token }) {

    const [userData, setUserData] = useState(null);

    useEffect(() => {
        async function getProfile() {
            const data = await getDataFromServer(token, "/api/profile/");
            console.log(data);
            setUserData(data);
        }
        getProfile();
    }, [token]);

    if (!userData) return null;

    return (
        <header className="flex gap-4 items-center">
            <img src={userData.image_url} alt={userData.image_url} className="rounded-full w-16" />
            <h2 className="font-Comfortaa font-bold text-2xl">{userData.username}</h2>
        </header>
    );
}
