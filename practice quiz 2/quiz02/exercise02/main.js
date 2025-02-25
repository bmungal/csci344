const canvasWidth = window.innerWidth;
const canvasHeight = window.innerHeight;

function setup() {
  createCanvas(canvasWidth, canvasHeight);

  // function invocations goes here:
  drawMonster(100, 100, 150, "#0bc9cd", false);
  drawMonster(300, 200, 75, "#8093f1", true);
  drawMonster(100, 325, 100, "#8093f1", false);
  drawMonster(250, 375, 125, "#7fb285", true);
  drawMonster(550, 200, 250, "#7fb285", false);
  drawGrid(canvasWidth, canvasHeight);
}

// function definition goes here:
function drawMonster(x, y, size, color, isSurprised) {
  // if (isSurprised) {

  // }
  rectMode(CENTER);
  fill(color);
  rect(x, y, size, size);
  fill("white");
  const eyeLeft = x - size / 3;
  const eyeRight = x + size / 3;
  const eyeY = y - size / 4;
  const eyeBallWidth = size / 5;
  const pupilWidth = size / 10;

  // left eye:
  rect(eyeLeft, eyeY, eyeBallWidth, eyeBallWidth);

  // right eye
  rect();
  rect(eyeRight, eyeY, eyeBallWidth, eyeBallWidth);

  fill("black");
  //left pupil

  //right pupil
}
