import React, { useState } from "react";
import { postDataToServer, deleteDataFromServer } from "../server-requests";

export default function Like({ likeId, id, token }) {
    const [stateLike, setStateLike] = useState(likeId);
    const [isLoading, setIsLoading] = useState(false);

    const isLiked = Boolean(stateLike);

    async function toggleLike() {
        setIsLoading(true);

        try {
            if (isLiked) {
                console.log("deleting like...");
                const url = `/api/likes/${stateLike}`;
                await deleteDataFromServer(token, url);
                setStateLike(null);
            } else {
                console.log("creating like...");
                const sendData = { post_id: id };
                const responseData = await postDataToServer(token, "/api/likes/", sendData);
                setStateLike(responseData.id);
            }
        } catch (error) {
            console.error("Error:", error);
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <button
            aria-label={isLiked ? "liked" : "unliked"}
            aria-checked={isLiked}
            onClick={toggleLike}
            disabled={isLoading}
        >
            <i className={`${isLiked ? "fas text-red-700" : "far"} fa-heart`}></i>
        </button>
    );
}
