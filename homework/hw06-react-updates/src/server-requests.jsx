// gets an access token:
export async function getAccessToken(username, password) {
    const postData = {
        username: username,
        password: password,
    };
    const endpoint = `/api/token/`;
    console.log('Attempting to get access token...');
    const response = await fetch(endpoint, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(postData),
    });
    console.log('Response headers:', [...response.headers.entries()]);
    const data = await response.json();
    console.log('Access token response:', data);
    return data.access_token;
}

// Issues an HTTP GET request:
export async function getDataFromServer(token, url) {
    const response = await fetch(url, {
        headers: getHeaders(token),
    });
    const data = await response.json();
    //console.log(data);
    return data;
}

// Issues an HTTP DELETE request:
export async function deleteDataFromServer(token, url) {
    const response = await fetch(url, {
        method: "DELETE",
        headers: getHeaders(token),
    });
    const data = await response.json();
    //console.log(data);
    return data;
}

// Issues an HTTP POST request:
export async function postDataToServer(token, url, postData) {
    const response = await fetch(url, {
        method: "POST",
        headers: getHeaders(token),
        body: JSON.stringify(postData),
    });
    const data = await response.json();
    //console.log(data);
    return data;
}
export function getCookie(key) {
    let name = key + "=";
    let decodedCookie = decodeURIComponent(document.cookie);
    let ca = decodedCookie.split(";");
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === " ") {
            c = c.substring(1);
        }
        if (c.indexOf(name) === 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
}

export function getHeaders(token) {
    const csrf_access_token = getCookie("csrf_access_token");
    console.log('Current cookies:', document.cookie);
    console.log('CSRF token from cookie:', csrf_access_token);
    let headers;
    if (csrf_access_token) {
        headers = {
            "Content-Type": "application/json",
            "X-CSRF-TOKEN": csrf_access_token,
        };
    } else if (token) {
        headers = {
            "Content-Type": "application/json",
            Authorization: "Bearer " + token,
        };
    } else {
        console.error("Neither token nor csrf_access_token found");
    }
    console.log('Generated headers:', headers);
    return headers;
}

