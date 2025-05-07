// Job: kicks off the app

import React from "react";
import { createRoot } from "react-dom/client";
import { getAccessToken, getCookie } from "./server-requests.jsx";
import App from "./components/App.jsx";

async function main(token) {
    // this script kicks off the React App:
    // const username = "caleb";
    // const token = await getAccessToken(username, "password");
    const rootEl = document.getElementById("app");
    const root = createRoot(rootEl);
    root.render(<App token={token} />);
}

// main();

/**************************************************************
 * Authentication
 **************************************************************
 * There are two authentication pathways handled here:
 * 1. The hasCsrfToken() pathway is used if React is being
 *    served on the same server as the REST API (and uses the
 *    Flask server-side login form). For production deployment
 *    only.
 *
 * 2. The setAccessTokenCookie() pathway is used if you have
 *    created a stand-alone react app that is interacting with
 *    the REST API on another server. This one is the one used
 *    for testing (when using npm start).
 **************************************************************
 */

 async function getAccessTokenAndRenderApp() {
    // this initializes the app after the access token is set.
    const csrf = getCookie("csrf_access_token");
    if (csrf && window.location.port !== "5173") {
        // this executes if the app is run within flask:
        console.log("Authentication handled via CSRF + Http-only cookie.");
        main();
    } else {
        console.log(window.location.port === "5173");
        // this executes if the app is run via npm start
        const token = await getAccessToken("webdev", "password");
        main(token);
    }
}

getAccessTokenAndRenderApp();

