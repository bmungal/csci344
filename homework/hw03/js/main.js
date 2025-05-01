import { getAccessToken } from "./utilities.js";
const rootURL = "https://photo-app-secured.herokuapp.com";
let token = null;
let username = "brian";
let password = "password";

async function initializeScreen() {
  token = await getToken();
  showNav();
  showProfile();
  suggestionsPanel();
  showStories();
  getPosts();
}

async function getToken() {
  return await getAccessToken(rootURL, username, password);
}

function showNav() {
  document.querySelector("#nav").innerHTML = `
    <nav class="flex justify-between py-5 px-9 bg-white border-b fixed w-full top-0">
            <h1 class="font-Comfortaa font-bold text-2xl">Photo App</h1>
            <ul class="flex gap-4 text-sm items-center justify-center">
                <li><span>${username}</span></li>
                <li><button class="text-blue-700 py-2">Sign out</button></li>
            </ul>
        </nav>
    `;
}

// implement remaining functionality below:
//await / async syntax:
async function getPosts() {
  const response = await fetch(
    "https://photo-app-secured.herokuapp.com/api/posts/?limit=20",
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    }
  );
  const data = await response.json();
  console.log(data);
  //renderPosts(data);
  showPosts(data);
}

function showPosts(posts) {
  const doc = document.querySelector("main");

  posts.forEach((post) => {
    const template = `
      <section class="bg-white border mb-10">
          <div class="p-4 flex justify-between">
              <h3 class="text-lg font-Comfortaa font-bold">${
                post.user.username
              }</h3>
              <button class="icon-button"><i class="fas fa-ellipsis-h"></i></button>
          </div>
          <img src="${post.image_url}" alt="${
      post.alt_text
    }" width="300" height="300"
              class="w-full bg-cover">
          <div class="p-4">
              <div class="flex justify-between text-2xl mb-3">
                  <div>
                      ${getLikeButton(post)}
                      <button aria-label="comment button"><i class="far fa-comment"></i></button>
                      <button aria-label="send button"><i class="far fa-paper-plane"></i></button>
                  </div>
                  <div>
                      ${getBookmarkButton(post)}
                  </div>
              </div>
              <p class="font-bold mb-3">${post.likes.length} like(s)</p>
              <div class="text-sm mb-3">
                  <p>
                     <strong>${post.user.username}</strong>
                     ${post.caption}
                  </p>
              </div>
              ${showComments(post.comments)}
              <p class="uppercase text-gray-500 text-xs">${
                post.display_time
              }</p>
          </div>
          <div class="flex justify-between items-center p-3">
              <div class="flex items-center gap-3 min-w-[80%]">
                  <i class="far fa-smile text-lg"></i>
                  <input type="text" class="min-w-[80%] focus:outline-none" placeholder="Add a comment...">
              </div>
              <button class="text-blue-500 py-2">Post</button>
          </div>
      </section>`;
    doc.insertAdjacentHTML("beforeend", template);
  });
}

// function renderPosts(postListJSON) {
//   postListJSON.forEach(renderPost);
// }
// after all of the functions are defined, invoke initialize at the bottom:

//input : comments
//return: HTML represetation of the comments
function showComments(comments){

    if (comments.length > 1){

        const lastComment = comments[comments.length-1];

        return `
        <button> view all ${comments.length} comments </button>
        <p class="text-sm mb-3"><strong>${lastComment.user.username}</strong> ${lastComment.text}</p>
        `;
    }

    if (comments.length == 1){
       return `
       <p class="text-sm mb-3"><strong> ${comments[0].user.username}</strong> ${comments[0].text}</p>
       `;

    }

    return ``;
}

/**
 * Task: Add, Remove, and render a Like
 * 1) Add; POST
 * 2) Remove; DELETE
 * 3)Render
 */

//Add a Like to a post
window.addLike = async function (postId){

    const postData = {
        "post_id": postId
    };
    const response = await fetch("https://photo-app-secured.herokuapp.com/api/likes/", {
        method: "POST",
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(postData)
    });
    const data = await response.json();
    console.log(data);
    
}

window.deleteLike = async function (likeId) {
  const response = await fetch(
    `https://photo-app-secured.herokuapp.com/api/likes/${likeId}`,
    {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    }
  );
  const data = await response.json();
  console.log(data);
};

//Display Like Button
function getLikeButton(post){

    if (post.current_user_like_id){
        return `<button onClick="deleteLike(${post.current_user_like_id})" aria-label="like button">
        <i class="fa-solid text-red-700 fa-heart"></i>
        </button>`;
    }else{
        return `<button onClick="addLike(${post.id})" aria-label="like button">
        <i class="far fa-heart"></i>
        </button>`;
    }

}

/**
 * Task: Add, remove, and render like button
 */

//Display correct bookmark
function getBookmarkButton(post){

    if (post.current_user_bookmark_id){
        //already bookmakred; give option for unbookmarking
        return `<button onclick="deleteBookmark(${post.current_user_bookmark_id})" aria-label="bookmark button">
        <i class="fa-solid fa-bookmark"></i>
        </button>`;
    }else{
        //not bookmarked
        return `
        <button onclick="createBookmark(${post.id})" aria-label="bookmark button">
        <i class="far fa-bookmark"></i>
        </button>
        `;

    }
    
}

//Delete Bookmark
window.deleteBookmark = async function (bookmarkId){
    const response = await fetch(`https://photo-app-secured.herokuapp.com/api/bookmarks/${bookmarkId}`, {
        method: "DELETE",
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    });
    const data = await response.json();
    console.log(data);
}

//Create Bookmark
window.createBookmark = async function (postId){
    const postData = {
        "post_id": postId
    };
    
    //await / async syntax:
    const response = await fetch(
        "https://photo-app-secured.herokuapp.com/api/bookmarks/", 
        {
            method: "POST",
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(postData)
    });
    const data = await response.json();
    console.log(data);
    
}

/**
 * Render Right Panel
 * 1) Get user information; transition to HTML
 * 2) get suggestions; transition to HTML
 */

//Step 1
async function showProfile(){
    const response = await fetch("https://photo-app-secured.herokuapp.com/api/profile/", {
        method: "GET",
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    });

    const user = await response.json();

    const profileBar = document.querySelector("aside");

    const template = `
            <header class="flex gap-4 items-center">
            <img src="${user.image_url}" class="rounded-full w-16" alt="${user.username} ${user.id}"/>
            <h2 class="font-Comfortaa font-bold text-2xl">${user.username}</h2>
            </header>
    `;

    profileBar.insertAdjacentHTML("afterbegin", template);
}

//Step 2
async function suggestionsPanel(){

    const response = await fetch("https://photo-app-secured.herokuapp.com/api/suggestions/", {
        method: "GET",
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    });

    const data = await response.json();

    const panel = document.querySelector("aside > div");

    data.forEach(suggestion =>{
        const template = `
        <section class="flex justify-between items-center mb-4 gap-2">
                <img src=${suggestion.thumb_url} class="rounded-full"  alt="${suggestion.first_name} ${suggestion.last_name}"/>
                <div class="w-[180px]">
                    <p class="font-bold text-sm">${suggestion.username}</p>
                    <p class="oklch(0.278 0.033 256.848) text-xs">suggested for you</p>
                </div>
                <button class="text-sky-500 text-sm py-2" aria-label="follow button">follow</button>
            </section>
        `;
        panel.insertAdjacentHTML("beforeend", template);
    })
}

/**
 * Render Stories
 * 1) Grab stories from API
 * 2) format in hTML
 */

async function showStories(){
    const response = await fetch("https://photo-app-secured.herokuapp.com/api/stories/", {
        method: "GET",
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    });
    const data = await response.json();
    console.log(data);

    const stories = document.querySelector("main > header");

    data.forEach(story => {
        const template = `
        <div class="flex flex-col justify-center items-center">
                <img src="${story.user.thumb_url}" alt ="${story.first_name} ${story.id}" class="rounded-full border-4 border-gray-300" />
                <p class="text-xs text-gray-500">${story.user.username}</p>
        </div>
        `;

        stories.insertAdjacentHTML("beforeend", template);
    });
}
initializeScreen();
