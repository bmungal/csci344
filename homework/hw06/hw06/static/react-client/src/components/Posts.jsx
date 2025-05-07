import React, { useState, useEffect } from "react";
import { getDataFromServer } from "../server-requests";
import Post from "./Post";

export default function Posts({ token }) {
    const [posts, setPosts] = useState([]);

    async function getPosts() {
        const data = await getDataFromServer(token, "/api/posts/");
        console.log(data);
        setPosts(data);
    }

    useEffect(() => {
        getPosts();
    }, []);


    return (<div>
        {
            posts.map(post => (
                <Post postData={post} token={token} key={post.id} />
            ))
        }
    </div>);
}
