const tracks = [
    {
        id: "3AhXZa8sUQht0UEdBJgpGc",
        name: "Like a Rolling Stone",
        album: {
            id: "6YabPKtZAjxwyWbuO9p4ZD",
            name: "Highway 61 Revisited",
            image_url:
                "https://i.scdn.co/image/ab67616d0000b27341720ef0ae31e10d39e43ca2",
        },
        artist: { id: "74ASZWbe4lXaubB36ztrGX", name: "Bob Dylan" },
    },
    {
        id: "0Z7nGFVCLfixWctgePsRk9",
        name: "TEXAS HOLD 'EM",
        album: {
            id: "6BzxX6zkDsYKFJ04ziU5xQ",
            name: "COWBOY CARTER",
            image_url:
                "https://i.scdn.co/image/ab67616d0000b2731572698fff8a1db257a53599",
        },
        artist: { id: "6vWDO969PvNqNYHIOW5v0m", name: "Beyoncé" },
    },
    {
        id: "0K9tfzrxJyCQIf7oAlPwaK",
        name: "YA YA",
        album: {
            id: "6BzxX6zkDsYKFJ04ziU5xQ",
            name: "COWBOY CARTER",
            image_url:
                "https://i.scdn.co/image/ab67616d0000b2731572698fff8a1db257a53599",
        },
        artist: {
            id: "6vWDO969PvNqNYHIOW5v0m",
            name: "Beyoncé",
        },
    },
    {
        id: "1QEEqeFIZktqIpPI4jSVSF",
        name: "More Than a Feeling",
        album: {
            id: "2QLp07RO6anZHmtcKTEvSC",
            name: "Boston",
            image_url:
                "https://i.scdn.co/image/ab67616d0000b2738c1fadcc997a65384f34d694",
        },
        artist: { id: "29kkCKKGXheHuoO829FxWK", name: "Boston" },
    },
    {
        id: "0870QNicMawQH2cnzBVZ3P",
        name: "Hitch a Ride",
        album: {
            id: "2QLp07RO6anZHmtcKTEvSC",
            name: "Boston",
            image_url:
                "https://i.scdn.co/image/ab67616d0000b2738c1fadcc997a65384f34d694",
        },
        artist: {
            id: "29kkCKKGXheHuoO829FxWK",
            name: "Boston",
        },
    },
    {
        id: "39C5FuZ8C8M0QI8CrMsPkR",
        name: "Foreplay / Long Time",
        album: {
            id: "2QLp07RO6anZHmtcKTEvSC",
            name: "Boston",
            image_url:
                "https://i.scdn.co/image/ab67616d0000b2738c1fadcc997a65384f34d694",
        },
        artist: {
            id: "29kkCKKGXheHuoO829FxWK",
            name: "Boston",
        },
    },
    {
        id: "1vrd6UOGamcKNGnSHJQlSt",
        name: "Love Story",
        album: {
            id: "2dqn5yOQWdyGwOpOIi9O4x",
            name: "Fearless",
            image_url:
                "https://i.scdn.co/image/ab67616d0000b2737b25c072237f29ee50025fdc",
        },
        artist: { id: "06HL4z0CvFAxyc27GXpf02", name: "Taylor Swift" },
    },
    {
        id: "5xTtaWoae3wi06K5WfVUUH",
        name: "Shake It Off",
        album: {
            id: "2QJmrSgbdM35R67eoGQo4j",
            name: "1989",
            image_url:
                "https://i.scdn.co/image/ab67616d0000b2739abdf14e6058bd3903686148",
        },
        artist: {
            id: "06HL4z0CvFAxyc27GXpf02",
            name: "Taylor Swift",
        },
    },
    {
        id: "1BxfuPKGuaTgP7aM0Bbdwr",
        name: "Cruel Summer",
        album: {
            id: "1NAmidJlEaVgA3MpcPFYGq",
            name: "Lover",
            image_url:
                "https://i.scdn.co/image/ab67616d0000b273e787cffec20aa2a396a61647",
        },
        artist: {
            id: "06HL4z0CvFAxyc27GXpf02",
            name: "Taylor Swift",
        },
    },
    {
        id: "6WK9dVrRABMkUXFLNlgWFh",
        name: "Enjoy the Silence",
        album: {
            id: "61h3VS8XDROIpvQznjTPTT",
            name: "The Singles 86-98",
            image_url:
                "https://i.scdn.co/image/ab67616d0000b2730a7d45a345534966a4ad2c39",
        },
        artist: { id: "762310PdDnwsDxAQxzQkfX", name: "Depeche Mode" },
    },
    {
        id: "0Mb20VmqR2lvtgbEermW2v",
        name: "Policy of Truth",
        album: {
            id: "0Tg76MY2wNK4j37iCb6qyH",
            name: "Violator (Deluxe)",
            image_url:
                "https://i.scdn.co/image/ab67616d0000b273234bbbad4dce31cd2950af3e",
        },
        artist: {
            id: "762310PdDnwsDxAQxzQkfX",
            name: "Depeche Mode",
        },
    },
    {
        id: "3QqONU0GW4byIClquChyf0",
        name: "Never Let Me Down Again",
        album: {
            id: "61h3VS8XDROIpvQznjTPTT",
            name: "The Singles 86-98",
            image_url:
                "https://i.scdn.co/image/ab67616d0000b2730a7d45a345534966a4ad2c39",
        },
        artist: {
            id: "762310PdDnwsDxAQxzQkfX",
            name: "Depeche Mode",
        },
    },
    {
        id: "5YqpHuXpFjDVZ7tY1ClFll",
        name: "Heartbeats",
        album: {
            id: "2e0BYdQ7VJlzSNHafdmfrl",
            name: "Veneer",
            image_url:
                "https://i.scdn.co/image/ab67616d0000b2731017779b8f5fe0ccd77bf886",
        },
        artist: { id: "6xrCU6zdcSTsG2hLrojpmI", name: "José González" },
    },
    {
        id: "0oxYB9GoOIDrdzniNdKC44",
        name: "When the Sun Hits",
        album: {
            id: "53eHm1f3sFiSzWMaKOl98Z",
            name: "Souvlaki",
            image_url:
                "https://i.scdn.co/image/ab67616d0000b273f6e31941d10e4819d290af41",
        },
        artist: { id: "72X6FHxaShda0XeQw3vbeF", name: "Slowdive" },
    },
    {
        id: "0WQiDwKJclirSYG9v5tayI",
        name: "There Is a Light That Never Goes Out - 2011 Remaster",
        album: {
            id: "5Y0p2XCgRRIjna91aQE8q7",
            name: "The Queen Is Dead",
            image_url:
                "https://i.scdn.co/image/ab67616d0000b273ada101c2e9e97feb8fae37a9",
        },
        artist: { id: "3yY2gUcIsjMr8hjo51PoJ8", name: "The Smiths" },
    },
    {
        id: "03yOjwHoOPDlTUg0NRxN6t",
        name: "Cemetry Gates - 2011 Remaster",
        album: {
            id: "5Y0p2XCgRRIjna91aQE8q7",
            name: "The Queen Is Dead",
            image_url:
                "https://i.scdn.co/image/ab67616d0000b273ada101c2e9e97feb8fae37a9",
        },
        artist: {
            id: "3yY2gUcIsjMr8hjo51PoJ8",
            name: "The Smiths",
        },
    },
];

console.log(tracks);

// Your function below. This activity is extra credit:
