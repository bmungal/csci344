/*
    ------------
    Instructions
    ------------
    Open styles.css and scroll down to ~line 70.
    You will see three classes -- ocean, desert, and high-contrast --
    which correspond to three different themes. If you apply any of these 
    classes to the <body></body> tag and preview your HTML, you will see 
    that the theme changes. Try it out! You job is to make the buttons 
    dynamically change the theme of the web page.

    Hints:
    1. Create a single function called changeClass() that has one parameter.
       This paremeter will store the name of the class as a string.
    2. Within the changeClass() function body, set the body's class attribute
       the name of the class passed into the function.
    3. Attach your changeClass() function to the click event of each button. Make
       sure you're passing in the correct argument.
    4. Use the cheatsheet associated with this tutorial to figure out how to adjust
       the class.
*/

function changeClass(className) {
  document.body.className = className;
}

const defaultButton = document.getElementById("default");
const desertButton = document.getElementById("desert");
const oceanButton = document.getElementById("ocean");
const highContrastButton = document.getElementById("high-contrast");

defaultButton.addEventListener("click", function () {
  changeClass("default");
});

desertButton.addEventListener("click", function () {
  changeClass("desert");
});

oceanButton.addEventListener("click", function () {
  changeClass("ocean");
});

highContrastButton.addEventListener("click", function () {
  changeClass("high-contrast");
});
