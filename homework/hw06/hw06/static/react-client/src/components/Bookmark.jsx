import React, { useState } from "react";
import { postDataToServer, deleteDataFromServer } from "../server-requests";

export default function Bookmark({ bookmarkId, id, token }) {

    const [stateBookmarkId, setStateBookmarkId] = useState(bookmarkId);

    async function createBookmark() {

        console.log("creating bookmark...");
        const sendData = {
            "post_id": id,
        };
        const responseData = await postDataToServer(token, "/api/bookmarks/", sendData);
        console.log(responseData);
        setStateBookmarkId(responseData.id);

    }

    async function deleteBookmark() {
        console.log("deleting bokmark...");
        const url = `/api/bookmarks/${stateBookmarkId}`;
        const responseData = await deleteDataFromServer(token, url);
        console.log(responseData);
        setStateBookmarkId(null);
    }

    if (stateBookmarkId) {
        return (<button aria-label="bookmark button" aria-checked="true" onClick={deleteBookmark}><i className="fas fa-bookmark"></i></button>);
    } else {
        return (<button aria-checked="false" aria-label="remove bookmark" onClick={createBookmark}><i className="far fa-bookmark"></i></button>);
    }


}


