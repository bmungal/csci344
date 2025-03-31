const users = [
    { id: 1, name: "Alice", age: 25, isActive: true, role: "admin" },
    { id: 2, name: "Bob", age: 30, isActive: false, role: "user" },
    { id: 3, name: "Charlie", age: 22, isActive: true, role: "moderator" },
    { id: 4, name: "David", age: 35, isActive: true, role: "user" },
    { id: 5, name: "Eve", age: 28, isActive: false, role: "admin" },
    { id: 6, name: "Frank", age: 40, isActive: true, role: "moderator" },
];

// 1.1. Use map to create an array of names from the users array.
//      Then output the array of names to the console.

const names = users.map((user) => user.name);
console.log(names);


// 1.2. Use filter to create an array of only active users from the users array.
//      Then output the array of active users to the console.

const actUsers = users.filter((user) => user.isActive);
console.log(actUsers);

