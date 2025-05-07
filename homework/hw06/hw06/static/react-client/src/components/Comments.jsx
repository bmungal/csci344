import React from "react";

export default function Comments({ comments }) {

    if (comments.length > 1) {

        const lastComment = comments[comments.length - 1];

        return (
            <>
                <button> view all {comments.length} comments </button>
                <p className="text-sm mb-3"><strong>{lastComment.user.username}</strong>{" "}{lastComment.text}</p>
            </>);

    }
    if (comments.length == 1) {

        return (
            <>
                <p className="text-sm mb-3"><strong> {comments[0].user.username}</strong>{" "}{comments[0].text}</p>
            </>);

    } else {
        return <></>
    }
}