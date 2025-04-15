import React, { useState, useEffect } from "react";
import { getDataFromServer } from "../server-requests";
import Story from "./Story";

export default function Stories({ token }) {
    // return (
    //     <header className="flex gap-6 bg-white border p-2 overflow-hidden mb-6">
    //         Stories go here. Fetch data from /api/stories
    //     </header>
    // );
     const [stories, setStories] = useState([]);

    async function fetchStories() {
        const data = await getDataFromServer(token, "/api/stories/");
        console.log(data);
        setStories(data);
    }

    useEffect(() => {
        fetchStories();
    }, []); 

   function outputStories(story) {
           return <Story data = {story} key={story.id} />
       }
   
       return (<header className="flex gap-6 bg-white border p-2 overflow-hidden mb-6">
               {
                   stories.map(outputStories)
           }
       </header>);
}
