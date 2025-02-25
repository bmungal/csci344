// Your code here.

const toggleButton = document.getElementById("menu-toggle");
const navLinks = document.getElementById("nav-links");

function toggleMenu() {
  toggleButton.classList.toggle("active");
  navLinks.classList.toggle("active");
}
toggleButton.addEventListener("click", toggleMenu());
