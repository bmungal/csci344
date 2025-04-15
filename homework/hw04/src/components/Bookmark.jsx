import React, {useState} from "react";

import { postDataToServer, deleteDataFromServer } from "../server-requests";
/**
 * 
 * Job:
 * 
 *  1. Renders the bookmark reflecting 
 *      whether current user has bookmarked
 *  2. Create/ delete bookmarks 
 * 
 */

export default function Bookmark({ token, bookmarkId, postId }) {
    //console.log(bookmarkId);
    const [stateBookmarkId, setStateBookmarkId] = useState(bookmarkId);

    async function createBookmark() {
        const sendData = {
            post_id: postId,
        };
        console.log("creating a bookmark...")
        // send an HTTP post request to create a bookmark 
        const responseData = await postDataToServer(
            token,
            "/api/bookmarks",
            sendData
        );
        console.log(responseData);
        setStateBookmarkId(responseData.id);
    }

    async function deleteBookmark() {
        const url = '/api/bookmarks/' + stateBookmarkId;
        console.log("deletting a bookmark...")
        // send an HTTP post request to delete a bookmark 
        const responseData = await deleteDataFromServer(
            token,
            url
        );
        console.log(responseData);
        setStateBookmarkId(null);
    }

    if (stateBookmarkId) {
        return (
        // filled in if already bookmarked
            <button
                aria-Label="Unbookmark This post"
                aria-Checked="true"
                ariaRole= "toggle"
                onClick={deleteBookmark}
            >
            <i className="fas fa-bookmark"></i>
        </button>
        );
    } else {
        return (
        // empty bc not bookmarked
            <button
                aria-Label="Bookmark This post"
                aria-Checked="false"
                ariaRole="toggle"
                onClick={createBookmark}
            >
            <i className="far fa-bookmark"></i>
        </button>
    );
    }
    
    // return <button>Bookmark</button>
}