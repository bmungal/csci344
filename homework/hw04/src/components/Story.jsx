import React from "react";

export default function Story({ data }) {

    return (
        <div className="flex flex-col justify-center items-center">
            <img src={data.user.thumb_url}
                alt={data.user.thumb_url}
                className="rounded-full border-4 border-gray-300" />
            <p className="text-xs text-gray-500">{data.user.username}</p>
        </div>
    );

}