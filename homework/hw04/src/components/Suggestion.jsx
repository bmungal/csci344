import React from "react";

export default function Suggestion({ data }) {

    return (
        <section className="flex justify-between items-center mb-4 gap-2">
            <img src={data.thumb_url} alt={data.thumb_url} className="rounded-full" />
            <div className="w-[180px]">
                <p className="font-bold text-sm">{data.username}</p>
                <p className="text-gray-600 text-xs">suggested for you</p>
            </div>
            <button className="text-blue-600 text-sm py-2">follow</button>
        </section>
    );
}