import React, { useState, useEffect } from "react";
import { getDataFromServer } from "../server-requests";

import Post from "./Post"

// job:
// 1. to fetch post data from server
// 2. iterate thru each element and draw a post 
export default function Posts({ token }) {
    
    // setting a state variable: every time a state variable get's set, it
    // redraws the component
    const [posts, setPosts] = useState([]);

    async function getPosts() {
        // fetches data from https://photo-app-secured.herokuapp.com/api/posts/
        const data = await getDataFromServer(token, "/api/posts");
        
        //printing that data to the screen:
        console.log(data);

        // setting a state variable 
        setPosts(data);
    }
    
    // useeffect is a built-in function designed to handle "side effects" when the page
    // first loads:

    useEffect(() => {
        getPosts();
    }, []);

    function outputPost(postObj) {
        //return <Post key={postObj.id} />
        return <Post token = {token} key={postObj.id} postData={postObj} />
    }

    return (
        <div>
            {
                posts.map(outputPost)
            }

        </div>
        
    );
}
