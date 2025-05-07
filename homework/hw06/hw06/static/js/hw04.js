/*************
 * For simplicity's sake, I've put all of the answers in
 * one file. This file is organized as follows:
 *   - Utilities
 *   - Display posts
 *   - Display individual post detail (using a modal)
 *   - Display stories
 *   - Display user profile
 *   - Display suggestions
 *   - Following / unfollowing functionality
 *   - Add / remove bookmark functionality
 *   - Like / remove like functionality
 *   - Add comment functionality
 */

/**********************
 * UTILITIES / HELPERS
 **********************/
const html2Element = (html) => {
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = html;
    return tempDiv.firstElementChild;
};

const KeyCodes = {
    BACKSPACE: 8,
    TAB: 9,
    RETURN: 13,
    SHIFT: 16,
    ESC: 27,
    SPACE: 32,
    PAGE_UP: 33,
    PAGE_DOWN: 34,
    END: 35,
    HOME: 36,
    LEFT: 37,
    UP: 38,
    RIGHT: 39,
    DOWN: 40,
    DELETE: 46,
};

const initPage = () => {
    displayPosts();
    displayStories();
    displayProfile();
    displaySuggestions();

    // escape key for modal window:
    document.addEventListener("keyup", handleEscape);
};

/***************
 * Display Posts
 ****************/
const post2Html = (post) => {
    return `
    <section class="card" id="post-${post.id}">
        <div class="header">
            <h3>${post.user.username}</h3>
            <i class="fa fa-dots"></i>
        </div>
        <img src="${post.image_url}" alt="Image posted by ${
        post.user.username
    }" width="300" height="300">
        <div class="info">
            <div class="buttons">
                <div>
                    <button 
                        class="like" 
                        data-post-id="${post.id}" 
                        data-like-id="${post.current_user_like_id || ""}" 
                        aria-label="Like Button" 
                        aria-checked="${
                            post.current_user_like_id ? "true" : "false"
                        }" 
                        onclick="toggleLike(event)">
                        <i class="${
                            post.current_user_like_id ? "fas" : "far"
                        } fa-heart"></i>                        
                    </button>
                    <i class="far fa-comment"></i>
                    <i class="far fa-paper-plane"></i>
                </div>
                <div>
                <button 
                    class="bookmark" 
                    data-post-id="${post.id}" 
                    data-bookmark-id="${post.current_user_bookmark_id || ""}" 
                    aria-label="Bookmark Button" 
                    aria-checked="${
                        post.current_user_bookmark_id ? "true" : "false"
                    }" 
                    onclick="toggleBookmark(event)">
                    <i class="${
                        post.current_user_bookmark_id ? "fas" : "far"
                    } fa-bookmark"></i>
                </button>
                </div>
            </div>
            <p id="likes-${post.id}" class="likes"><strong>${
        post.likes.length
    } ${post.likes.length === 1 ? "like" : "likes"}</strong></p>
            <div class="caption">
                <p>
                    <strong>${post.user.username}</strong> 
                    ${escapeHtml(post.caption)}
                </p>
                <p class="timestamp">${post.display_time}</p>
            </div>
            <div id="comments-${post.id}" class="comments">
                ${comments2Html(post.comments)}
            </div>
        </div>
        
        <div class="add-comment">
            <div class="input-holder">
                <input class="comment-textbox" 
                    data-post-id="${post.id}" type="text" 
                    aria-label="Add a comment" 
                    placeholder="Add a comment..." 
                    onkeyup="addComment(event)" />
            </div>
            <button class="link" onclick="addComment(event)">Post</button>
        </div>
    </section>
    `;
};

const comments2Html = (comments) => {
    let html = "";
    if (comments.length > 1) {
        const postId = comments[0].post_id;
        html += `<p>
                <button id="post-detail-${postId}" class="link" 
                    onclick="showPostDetail(event)"
                    data-post-id="${postId}">
                        View all ${comments.length} comments
                </button>
            </p>`;
    }

    const listWithLastComment = comments.slice(
        comments.length - 1,
        comments.length
    );
    html += listWithLastComment
        .map((comment) => {
            return `
            <p>
                <strong>${comment.user.username}</strong> 
                ${escapeHtml(comment.text)}
            </p>
            <p class="timestamp">${comment.display_time}</p>
        `;
        })
        .join("\n");
    return html;
};

// fetch data from your API endpoint:
const displayPosts = () => {
    fetch("/api/posts")
        .then((response) => response.json())
        .then((posts) => {
            const html = posts.map(post2Html).join("\n");
            document.querySelector("#posts").innerHTML = html;
        });
};

/************************************************
 * Display Individual Post Detail (Using a Modal)
 ************************************************/
const getModalTemplate = (returnId, post) => {
    return `
    <div id="modal" class="modal-bg" 
        onclick="hideModal(event);" aria-hidden="false" data-return-id="${returnId}">
        <button 
            id="close" 
            class="close" 
            aria-label="Close Button"
            onclick="hideModal(event);" 
            data-return-id="${returnId}"><i class="fas fa-times"></i></button>
        <div class="modal" role="dialog" aria-live="assertive">
            ${getPostDetailTemplate(post)}
        </div>
    </div>
    `;
};

const showPostDetail = (ev) => {
    postId = ev.currentTarget.dataset.postId;
    const id = ev.currentTarget.id;
    const parentElement = document.querySelector(`#post-${postId}`);
    console.log(postId);

    fetch(`/api/posts/${postId}`)
        .then((response) => response.json())
        .then((post) => {
            console.log(post);
            // const elem = html2Element(getModalTemplate(id, post));
            parentElement.insertAdjacentHTML(
                "beforeend",
                getModalTemplate(id, post)
            );
            document.body.style.overflowY = "hidden";

            // set the focus on the close button:
            document.querySelector("#close").focus();
        });
};

const hideModal = (ev) => {
    if (
        !ev ||
        ev.target.id === "modal" ||
        ev.target.id === "close" ||
        ev.target.classList.contains("fa-times")
    ) {
        // reset the focus and scroll position to the previously selected post:
        document.body.style.overflowY = "auto";
        const elem = document.querySelector("#close");
        anchor = document.getElementById(elem.dataset.returnId);
        const y = anchor.getBoundingClientRect().top + window.pageYOffset - 100;
        window.scrollTo({ top: y, behavior: "smooth" });

        document.querySelector("#modal").remove();
        anchor.focus();
        if (ev) {
            ev.stopPropagation();
        }
    }
};

document.addEventListener(
    "focus",
    function (event) {
        console.log("focus");
        const modalElement = document.querySelector(".modal-bg");
        console.log(modalElement, event.target);
        if (modalElement && !modalElement.contains(event.target)) {
            console.log("back to top!");
            event.stopPropagation();
            document.querySelector("#close").focus();
        }
    },
    true
);

const handleEscape = (ev) => {
    const key = ev.which || ev.keyCode;
    const isModalOpen =
        document.querySelector("#modal") &&
        !document.querySelector("#modal").classList.contains("hidden");
    if (key === KeyCodes.ESC && isModalOpen) {
        hideModal();
        ev.stopPropagation();
    }
};

const getPostDetailTemplate = (post) => {
    return `
        <div class="featured-image" style="background-image:url('${escapeHtml(
            post.image_url
        )}')"></div>
        <div class="container">
            <h3>
            <img class="pic" src="${post.user.thumb_url}" /> ${
        post.user.username
    }</h3>
            <div class="body">
                ${getCommentDetailTemplate(
                    post.user.thumb_url,
                    post.user.username,
                    post.caption,
                    post.display_time
                )}
                ${post.comments
                    .map((comment) => {
                        return getCommentDetailTemplate(
                            comment.user.thumb_url,
                            comment.user.username,
                            comment.text,
                            comment.display_time
                        );
                    })
                    .join("")}

            </div>
        </div>
    `;
};

const getCommentDetailTemplate = (imageURL, username, text, timestamp) => {
    text = escapeHtml(text);
    return `<div class="comment">
        <img class="pic" src="${imageURL}" />
        <div>
            <p>
                <strong>${username}</strong> ${text}
            </p>
            <span>${timestamp}</span>
        </div>
        <button><i class="far fa-heart"></i></button>
    </div>`;
};

/*****************
 * Display Stories
 *****************/
const story2Html = (story) => {
    return `
        <div>
            <img src="${story.user.thumb_url}" class="pic" alt="profile pic for ${story.user.username}" />
            <p>${story.user.username}</p>
        </div>
    `;
};

// fetch data from your API endpoint:
const displayStories = () => {
    fetch("/api/stories")
        .then((response) => response.json())
        .then((stories) => {
            const html = stories.map(story2Html).join("\n");
            document.querySelector(".stories").innerHTML = html;
        });
};

/*****************
 * Display Profile
 *****************/

const user2Html = (user) => {
    return `
        <img src="${user.thumb_url}" 
            class="pic" 
            alt="Profile pic for ${user.username}" />
        <h2> ${user.username}</h2>
    `;
};

// fetch data from your API endpoint:
const displayProfile = () => {
    // query the profile endpoint to get data about the current user:
    fetch("/api/profile")
        .then((response) => response.json())
        .then((user) => {
            document.querySelector("aside header").innerHTML = user2Html(user);
        });
};

/*********************
 * Display Suggestions
 *********************/

const suggestion2Html = (user) => {
    return `
        <section>
            <img src="${user.thumb_url}" class="pic" alt="Profile pic for ${user.username}" />
            <div>
                <p>${user.username}</p>
                <p>suggested for you</p>
            </div>
            <div>
                <button 
                    class="link following" 
                    id="follow-${user.id}" 
                    data-username="${user.username}" 
                    data-user-id="${user.id}" 
                    aria-checked="false" 
                    aria-label="Follow ${user.username}" 
                    onclick="toggleFollow(event)">follow
                </button>
            </div>
        </section>
    `;
};

// fetch data from your API endpoint:
const displaySuggestions = () => {
    fetch("/api/suggestions")
        .then((response) => response.json())
        .then((suggestedUsers) => {
            document.querySelector(".suggestions > div").innerHTML =
                suggestedUsers.map(suggestion2Html).join("\n");
        });
};

/**************************
 * FOLLOWING / UNFOLLOWING
 **************************/
const toggleFollow = (ev) => {
    const elem = ev.currentTarget;
    const userId = elem.dataset.userId;
    if (elem.getAttribute("aria-checked").trim() === "false") {
        follow(userId);
    } else {
        const followingId = elem.dataset.followingId;
        unfollow(followingId, userId);
    }
};

const follow = (userId) => {
    console.log("follow", userId);
    fetch(`/api/following/`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-CSRF-TOKEN": getCookie("csrf_access_token"),
        },
        credentials: "include",
        body: JSON.stringify({ user_id: userId }),
    })
        .then((response) => response.json())
        .then((data) => {
            console.log(data);
            const elem = document.querySelector(`#follow-${data.following.id}`);
            elem.innerHTML = "unfollow";
            elem.classList.add("active");
            elem.setAttribute("aria-checked", "true");
            elem.setAttribute(
                "aria-label",
                "Unfollow " + elem.dataset.username
            );
            elem.setAttribute("data-following-id", data.id);
        });
};

const unfollow = (followingId, userId) => {
    console.log("unfollow", followingId, userId);
    fetch(`/api/following/${followingId}`, {
        method: "DELETE",
        headers: {
            "Content-Type": "application/json",
            "X-CSRF-TOKEN": getCookie("csrf_access_token"),
        },
        credentials: "include",
    })
        .then((response) => response.json())
        .then((data) => {
            console.log(data);
            const elem = document.querySelector(`#follow-${userId}`);
            elem.innerHTML = "follow";
            elem.classList.remove("active");
            elem.removeAttribute("data-following-id");
            elem.setAttribute("aria-checked", "false");
            elem.setAttribute("aria-label", "Follow " + elem.dataset.username);
        });
};

/*************
 * BOOKMARKING
 *************/
const toggleBookmark = (ev) => {
    const elem = ev.currentTarget;
    const postId = elem.dataset.postId;
    const bookmarkId = elem.dataset.bookmarkId;
    const isBookmarked = bookmarkId != "";

    if (!isBookmarked) {
        addBookmark(postId);
    } else {
        removeBookmark(bookmarkId, postId);
    }
};

const addBookmark = (postId) => {
    fetch(`/api/bookmarks/`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-CSRF-TOKEN": getCookie("csrf_access_token"),
        },
        credentials: "include",
        body: JSON.stringify({ post_id: postId }),
    })
        .then((response) => response.json())
        .then((data) => {
            console.log(data);
            updatePost(postId, () => {
                const elem = document.querySelector(`#post-${postId}`);
                elem.querySelector(".bookmark").focus();
            });
            // set focus on like button
            const elem = document.querySelector(`#post-${postId}`);
            elem.querySelector(".bookmark").focus();
        });
};

const removeBookmark = (bookmarkId, postId) => {
    fetch(`/api/bookmarks/${bookmarkId}`, {
        method: "DELETE",
        headers: {
            "Content-Type": "application/json",
            "X-CSRF-TOKEN": getCookie("csrf_access_token"),
        },
        credentials: "include",
    })
        .then((response) => response.json())
        .then((data) => {
            console.log(data);
            updatePost(postId, () => {
                const elem = document.querySelector(`#post-${postId}`);
                elem.querySelector(".bookmark").focus();
            });
        });
};

/*******************
 * LIKING / UNLIKING
 *******************/

const toggleLike = (ev) => {
    const elem = ev.currentTarget;
    const postId = elem.dataset.postId;
    const likeId = elem.dataset.likeId;
    const isLiked = likeId != "";

    if (!isLiked) {
        addLike(postId);
    } else {
        removeLike(likeId, postId);
    }
};

const addLike = (postId) => {
    fetch(`/api/likes/`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-CSRF-TOKEN": getCookie("csrf_access_token"),
        },
        credentials: "include",
        body: JSON.stringify({ post_id: postId }),
    })
        .then((response) => response.json())
        .then((data) => {
            console.log(data);
            updatePost(postId, () => {
                const elem = document.querySelector(`#post-${postId}`);
                elem.querySelector(".like").focus();
            });
        });
};

const removeLike = (likeId, postId) => {
    fetch(`/api/likes/${likeId}`, {
        method: "DELETE",
        headers: {
            "Content-Type": "application/json",
            "X-CSRF-TOKEN": getCookie("csrf_access_token"),
        },
        credentials: "include",
    })
        .then((response) => response.json())
        .then((data) => {
            console.log(data);
            updatePost(postId, () => {
                const elem = document.querySelector(`#post-${postId}`);
                elem.querySelector(".like").focus();
            });
        });
};

/*************
 * ADD COMMENT
 *************/

const addComment = (ev) => {
    const elem = ev.currentTarget;
    let inputElement = elem;
    ev.preventDefault();

    if (elem.tagName.toUpperCase() === "INPUT") {
        if (ev.keyCode !== KeyCodes.RETURN) {
            return;
        }
    } else {
        // it's a button:
        inputElement = elem.previousElementSibling.querySelector("input");
    }
    const comment = inputElement.value;
    if (comment.length === 0) {
        return;
    }
    const postId = inputElement.dataset.postId;
    const postData = {
        post_id: postId,
        text: comment,
    };
    console.log(postData);

    fetch("/api/comments", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-CSRF-TOKEN": getCookie("csrf_access_token"),
        },
        credentials: "include",
        body: JSON.stringify(postData),
    })
        .then((response) => response.json())
        .then((comment) => {
            updatePost(comment.post_id, () => {
                // refocus on input
                const elem = document.querySelector(`#post-${postId}`);
                elem.querySelector(".comment-textbox").focus();
            });
        });
};

const updatePost = (postId, callback) => {
    fetch(`/api/posts/${postId}`)
        .then((response) => response.json())
        .then((post) => {
            const elem = document.querySelector(`#post-${post.id}`);
            const node = html2Element(post2Html(post));
            elem.replaceWith(node);
            if (callback) {
                callback();
            }
        });
};

/**********************************
 * And finally: initialize the page
 **********************************/
initPage();
