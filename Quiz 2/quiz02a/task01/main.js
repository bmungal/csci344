// your function here
function toggleDarkMode() {
  element = document.body;
  element.classList.toggle("dark-mode");
}

const button = document.getElementById("Toggle Dark Mode");
button.addEventListener("click", toggleDarkMode());
