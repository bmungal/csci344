import React, { useState } from "react";
import { postDataToServer, deleteDataFromServer } from "../server-requests";

export default function Like({ likeId, id, token }) {

    const [stateLike, setStateLike] = useState(likeId);

    async function createLike() {

        console.log("creating like...");
        const sendData = {
            "post_id": id,
        };
        const responseData = await postDataToServer(token, "/api/likes/", sendData);
        console.log(responseData);
        setStateLike(responseData.id);

    }

    async function deleteLike() {
        console.log("deleting like...");
        const url = `/api/likes/${stateLike}`;
        const responseData = await deleteDataFromServer(token, url);
        console.log(responseData);
        setStateLike(null);
    }

    if (stateLike) {
        return (<button aria-label="like button" aria-checked="true" onClick={deleteLike}><i className="fas text-red-700 fa-heart"></i></button>);
    } else {
        return (<button aria-label="unlike button" aria-checked="false" onClick={createLike}><i className="far fa-heart"></i></button>);
    }

}