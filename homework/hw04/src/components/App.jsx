import React from "react";

// custom components:
import NavBar from "./NavBar";
import Profile from "./Profile";
import Suggestions from "./Suggestions";
import Stories from "./Stories";
import Posts from "./Posts";

export default function App({ username, token }) {
    return (
        <>
            {/* Navbar (already implemented for you ) */}
            <NavBar username={username} />

            {/* Main Panel */}
            <main className="mt-[100px] md:max-w-[61vw] md:mr-[50px] px-6 md:pl-[5vw] lg:pl-[10vw]">
                {/* Stories Panel */}
                <Stories token={token} />

                {/* Posts */}
                <Posts token={token} />
            </main>

            {/* Right Panel */}
            <aside className="fixed top-[100px] left-[63vw] w-70 hidden md:block max-w-[300px]">
                {/* Profile Panel */}
                <Profile token={token} />

                {/* Suggestions Panel */}
                <Suggestions token={token} />
            </aside>
        </>
    );
}
