let currentPosition = 0;
let gap = 10;
const slideWidth = 400;

// define the function moveCarousel that accepts a direction parameter (mimics how the functionis called in the index.html)
// define a variable that holds the images/ items in the carousel under the class name .carousel-item
// if statements: forward and backwards were defined in the index.html
// current position is 0 (sets bounds for carousel)
// because 2 images are alread displayed, you account for that in the count, otherwise you move the current position forward.
// else moves it backwards or doesn't move the carousel

// the last bit is a little confusing, but I'm assuming it moves the carousel forward and backwards depending on the current
// position based on the calculated offset
function moveCarousel(direction) {
  const items = document.querySelectorAll(".carousel-item");

  if (direction == "forward") {
    // minus 2 b/c first 2 slides already showing
    if (currentPosition >= items.length - 2) {
      return false;
    }
    currentPosition++;
  } else {
    if (currentPosition == 0) {
      return false;
    }
    currentPosition--;
  }

  const offset = (slideWidth + gap) * currentPosition;

  for (const item of items) {
    item.style.transform = `translateX(-${offset}px)`;
  }
}
