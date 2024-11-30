const BACKGROUD_COLOR = "#3e109c";
const NEON_PURPLE_COLOR = "#8A00C4";
const DEFAULT_TILE_COLOR_DARK = "#100c13";
const DEFAULT_TILE_COLOR_LIGHT = "#621f6b";
const SCALE = 100;
const WIDTH_OF_LANDSCAPE = 2800;
const HEIGHT_OF_LANDSCAPE = 2000;
const HEIGHT_MIN = -150;
const HEIGHT_MAX = 300;
const X_OFFSET_INCREMENT = 0.15;
const Y_OFFSET_INCREMENT = 0.15;
const TOP_OF_THE_SUN_COLOR = "#fe9707";
const BOTTOM_OF_THE_SUN_COLOR = "#ff0563";
const SUN_SIZE = 400;
const SPEED = 0.002;
const PI = Math.PI;
const LANDSCAPE_ANGLE = (4 / 9) * PI;

const CELESTIAL_BODIES = Object.freeze({
  SUN: 0,
  MOON: 1,
  SATURN: 2,
});

let sunStrength = 0.5;

let mesh;
let sun;
let timer = 0;

let currentCelestialBody = CELESTIAL_BODIES.SUN;

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);
  ellipseMode(CENTER);
  rectMode(CENTER);
  sun = new Sun();
  mesh = new Landscape();
}

function draw() {
  background(BACKGROUD_COLOR);
  drawUniverseBackground();
  sun.draw();
  mesh.generateTerrain().draw();
}

class Landscape {
  constructor() {
    this.widthSegments = WIDTH_OF_LANDSCAPE / SCALE;
    this.heightSegments = HEIGHT_OF_LANDSCAPE / SCALE;
    this.heights = Array.from({ length: this.widthSegments }, () =>
      Array.from({ length: this.heightSegments }, () => 0)
    );
  }

  generateTerrain() {
    const centerOfLandscapeX = WIDTH_OF_LANDSCAPE / 2;
    const timeOffset = millis() * SPEED;

    for (let y = 0; y < this.heightSegments; y++) {
      for (let x = 0; x < this.widthSegments; x++) {
        const distanceFromCenter = Math.abs(x * SCALE - centerOfLandscapeX);
        const easedOutHeightAtTheCenter =
          distanceFromCenter < SCALE * 3
            ? 0.1
            : map(distanceFromCenter, 0, centerOfLandscapeX, 0.2, 2);

        const noiseValue = noise(
          x * X_OFFSET_INCREMENT,
          y * Y_OFFSET_INCREMENT - timeOffset
        );
        const heightValue =
          map(noiseValue, 0, 1, HEIGHT_MIN, HEIGHT_MAX) *
          easedOutHeightAtTheCenter;

        this.heights[x][y] = heightValue;
      }
    }
    return this;
  }

  draw() {
    push();
    rotateX(LANDSCAPE_ANGLE);
    translate(-WIDTH_OF_LANDSCAPE / 2, -HEIGHT_OF_LANDSCAPE / 2 - 200);

    const sunX = WIDTH_OF_LANDSCAPE / 2;
    const sunY = 0;

    for (let y = 0; y < HEIGHT_OF_LANDSCAPE - SCALE; y += SCALE) {
      beginShape(QUAD_STRIP);
      stroke(color(NEON_PURPLE_COLOR));
      strokeWeight(1);

      for (let x = 0; x < WIDTH_OF_LANDSCAPE - SCALE; x += SCALE) {
        const height1 = this.heights[x / SCALE][y / SCALE];
        const height2 = this.heights[x / SCALE][y / SCALE + 1];

        const distance1 = dist(x, y, sunX, sunY);
        const distance2 = dist(x, y + SCALE, sunX, sunY);

        const brightnessFactor1 =
          sunStrength *
          map(distance1, 0, HEIGHT_OF_LANDSCAPE * 0.8, 1, 0.3) *
          map(height1, HEIGHT_MAX, HEIGHT_MIN, 1, -0.2);
        const brightnessFactor2 =
          sunStrength *
          map(distance2, 0, HEIGHT_OF_LANDSCAPE * 0.8, 1, 0.3) *
          map(height2, HEIGHT_MAX, HEIGHT_MIN, 1.5, -0.2);
        const color1 = lerpColor(
          color(DEFAULT_TILE_COLOR_DARK),
          color(DEFAULT_TILE_COLOR_LIGHT),
          brightnessFactor1
        );
        const color2 = lerpColor(
          color(DEFAULT_TILE_COLOR_DARK),
          color(DEFAULT_TILE_COLOR_LIGHT),
          brightnessFactor2
        );

        fill(color1);
        vertex(x, y, height1);
        fill(color2);
        vertex(x, y + SCALE, height2);
      }
      endShape();
    }
    pop();
  }
}

class Sun {
  constructor() {
    this.radius = SUN_SIZE;
    this.sunStripes = [];
  }

  drawLight() {
    push();
    // behind the sun
    translate(0, -400, -1201);
    let c = color("#f72ad2");
    c.setAlpha(75);
    fill(c);
    circle(0, 0, map(sunStrength, 0.1, 1, 2.2, 2.4) * this.radius);
    filter(BLUR, 6);
    pop();
  }

  draw() {
    this.drawLight();
    push();
    clip(
      () => {
        this.sunStripes.forEach((stripe) => stripe.draw());
      },
      { invert: true }
    );
    if (millis() >= 1500 + timer) {
      if (this.sunStripes.length > 10) {
        this.sunStripes.shift();
      }
      this.sunStripes.push(new SunStripes());
      timer = millis();
    }

    translate(0, -400, -1200);
    const topColor = color(TOP_OF_THE_SUN_COLOR);
    const bottomColor = color(BOTTOM_OF_THE_SUN_COLOR);
    const gradient = 1;
    for (let y = -this.radius; y <= this.radius; y += gradient) {
      const inter = map(y, -this.radius, this.radius, 0, 1);
      const c = lerpColor(topColor, bottomColor, inter);
      stroke(c);
      line(
        -sqrt(this.radius * this.radius - y * y),
        y,
        sqrt(this.radius * this.radius - y * y),
        y
      );
    }
    pop();
    // filter(BLUR, 1);
  }
}

class SunStripes {
  constructor() {
    this.width = SUN_SIZE * 2.1; // + 0.1 to include even the blur effect of the sun
    this.height = 0; // for now
  }

  draw() {
    push();
    translate(0, -500 + this.height * 20, -1200);
    noStroke();
    // rect(0, 0, this.width, this.height);
    box(this.width, this.height, 0);
    pop();
    this.height += 0.05;
  }
}

function drawUniverseBackground() {
  const topColor = color("#060147");
  const bottomColor = color("#3e109c");
  push();
  translate(-width / 2, -height / 2 - 600, -1202);
  for (let y = 0; y <= height; y++) {
    const inter = map(y, 0, height, 0, 1);
    const c = lerpColor(topColor, bottomColor, inter);
    stroke(c);
    line(-0.77 * width, y, 1.77 * width, y);
  }
  pop();
}

function keyPressed() {
  if (keyCode === RIGHT_ARROW) {
    sunStrength += 0.1;
  } else if (keyCode === LEFT_ARROW) {
    sunStrength -= 0.1;
  }
  sunStrength = constrain(sunStrength, 0.1, 1);
}
