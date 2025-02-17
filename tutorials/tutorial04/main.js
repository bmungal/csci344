let canvasWidth = window.innerWidth;
let canvasHeight = window.innerHeight;

// in p5.js, the function runs on page load:
function setup() {
  createCanvas(canvasWidth, canvasHeight);

  // invoke any drawing functions inside of setup.
  // functions should all go between "createCanvas()" and "drawGrid()"
  //draw5Circles();
  //draw5RedSquares();
  //   draw5CirclesWhile();
  //   draw5CirclesFor();
  //   drawNCirclesFlexible(30, 25, 400, 0);
  //   drawNCirclesFlexible(4, 100, 100, 200);
  //   drawNCirclesFlexible(8, 50, 700, 100);
  //   drawnNShapesFlexible(30, 30, 335, 0, "square");
  //   drawnNShapesFlexible(4, 100, 120, 200, "circle");
  //   drawnNShapesFlexible(8, 50, 725, 25, "square");
  drawNShapesDirectionFlexible(30, 30, 335, 0, "square", "column");
  drawNShapesDirectionFlexible(4, 100, 120, 200, "circle", "row");
  drawNShapesDirectionFlexible(8, 50, 725, 425, "circle", "row");
  drawGrid(canvasWidth, canvasHeight);
}

// my first function
function draw5Circles() {
  noFill();
  //fill("red");
  circle(100, 200, 50); // centerX, centerY, radius
  circle(100, 250, 50);
  circle(100, 300, 50);
  circle(100, 350, 50);
  circle(100, 400, 50);
}

function draw5RedSquares() {
  fill("red");
  square(320, 200, 50); // topLeftX, topLeftY, width
  square(320, 250, 50);
  square(320, 300, 50);
  square(320, 350, 50);
  square(320, 400, 50);
}

function draw5CirclesWhile() {
  let x = 100,
    y = 200,
    z = 50;
  let count = 0;

  while (count < 5) {
    circle(x, 200 + 50 * count, z);
    count++;
  }
}

function draw5CirclesFor() {
  let x = 200,
    y = 200,
    z = 50;
  //   fill("red");
  for (let i = 0; i < 5; i++) {
    circle(x, 200 + 50 * i, z);
  }
}

function drawNCirclesFlexible(n, size, x, y) {
  for (let i = 0; i < n; i++) {
    circle(x, y + size * i, size);
  }
}

function drawnNShapesFlexible(n, size, x, y, shape) {
  fill("purple");
  if (shape === "circle") {
    for (let i = 0; i < n; i++) {
      circle(x, y + size * i, size);
    }
  } else {
    for (let i = 0; i < n; i++) {
      square(x, y + size * i, size);
    }
  }
}

function drawNShapesDirectionFlexible(n, size, x, y, shape, direction) {
  fill("purple");
  if (shape === "circle" && direction === "column") {
    for (let i = 0; i < n; i++) {
      circle(x, y + size * i, size);
    }
  } else if (shape === "circle" && direction === "row") {
    for (let i = 0; i < n; i++) {
      circle(x + size * i, y, size);
    }
  } else if (shape === "square" && direction === "row") {
    for (let i = 0; i < n; i++) {
      circle(x + size * i, y, size);
    }
  } else if (shape === "square" && direction === "column") {
    for (let i = 0; i < n; i++) {
      circle(x, y + size * i, size);
    }
  }
}
