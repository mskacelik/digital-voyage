const BACKGROUD_COLOR = "#3e109c";
const NEON_PURPLE_COLOR = "#8A00C4";
const DEFAULT_TILE_COLOR_DARK = "#100c13";
const DEFAULT_TILE_COLOR_LIGHT = "#621f6b";
const TOP_UNIVERSE_COLOR = "#060147";
const SCALE = 100;
const WIDTH_OF_LANDSCAPE = 4000;
const HEIGHT_OF_LANDSCAPE = 2000;
const HEIGHT_MIN = -150;
const HEIGHT_MAX = 300;
const X_OFFSET_INCREMENT = 0.15;
const Y_OFFSET_INCREMENT = 0.15;
const SUN_SIZE = 400;
const SPEED = 0.002;
const PI = Math.PI;
const LANDSCAPE_ANGLE = (4 / 9) * PI;

// ----- stars ----
const STAR_CHANCE = 1 / 15000;
const BACKGROUND_COLOR = "#1b0043";
const LARGE_STARS = []; // three frames of animation
const MEDIUM_STARS = []; // two frames of animation
const SMALL_STARS = []; // only one frame (dot)
const METEOR_TAIL_LENGTH = 60;
const METEOR_SIZE_MAX = 20;
const METEOR_SIZE_MIN = 8;
const STARS_AND_METEOR_COLOR = "#ffffff";
const CHANCE_FOR_METEOR = 1 / 100;

const Y_POS_OF_UNIVERSE = 800; // move if you have empty space above the universe
const SIZE_OF_NON_RENDERED_CORNERS = 1250;
const FULLSCREEN_HEIGHT_EXTENDED = 146;

let activeMeteor = null;
let starTimer = 0;
let globalFramePointer = 0;
// ----------------
// music
let music1, music2, music3, music4, music5;
let currentMusic;

//

const CELESTIAL_BODIES_PHASES = Object.freeze({
  SUN: Object.freeze({
    strokeColor: NEON_PURPLE_COLOR,
    tileColorLight: DEFAULT_TILE_COLOR_LIGHT,
    tileColorDark: DEFAULT_TILE_COLOR_DARK,
    brightnessColor: "#a02ad2",
    topColor: "#fe9707",
    bottomColor: "#ff0563",
    bottomUniverseColor: "#3e109c",
  }),
  MOON: Object.freeze({
    strokeColor: "cyan",
    tileColorLight: "#0b5fe3",
    tileColorDark: "#021f4d",
    brightnessColor: "#64aaf5",
    topColor: "#00B8FF",
    bottomColor: "#001eff",
    bottomUniverseColor: "darkblue",
  }),
  SATURN: Object.freeze({
    strokeColor: "lime",
    tileColorLight: "#47b552",
    tileColorDark: "#0f2b12",
    brightnessColor: "#001eff",
    topColor: "#00ff9f",
    bottomColor: "#39c4b6",
    bottomUniverseColor: "darkgreen",
  }),
});
// ----------
let currentCelestialBody = CELESTIAL_BODIES_PHASES.SUN;
let colorTransition = 0;
let currentStrokeColor = currentCelestialBody.strokeColor;
let currentTileColorLight = currentCelestialBody.tileColorLight;
let currentTileColorDark = currentCelestialBody.tileColorDark;
let currentBrightnessColor = currentCelestialBody.brightnessColor;
let currentCelestialBodyTopColor = currentCelestialBody.topColor;
let currentCelestialBodyBottomColor = currentCelestialBody.bottomColor;
let currentCelestialBodyBottomUniverseColor =
  currentCelestialBody.bottomUniverseColor;
// ----------

let celestialBodyStrength = 0.5;
let volumeOfMusic = 0.5;

let mesh;
let sun;
let timer = 0;

function preload() {
  music1 = loadSound("music/music1.mp3");
  music2 = loadSound("music/music2.mp3");
  music3 = loadSound("music/music3.mp3");
  music4 = loadSound("music/music4.mp3");
  music5 = loadSound("music/music5.mp3");
}

function setup() {
  createCanvas(windowWidth, windowHeight + FULLSCREEN_HEIGHT_EXTENDED, WEBGL);
  ellipseMode(CENTER);
  rectMode(CENTER);
  for (let y = 0; y <= height; y++) {
    for (let x = -0.77 * width; x <= 1.77 * width; x++) {
      if (floor(random(1 / STAR_CHANCE)) === 0) {
        SMALL_STARS.push(new SmallStar(x, y));
      } else if (floor(random(1 / STAR_CHANCE)) === 0) {
        MEDIUM_STARS.push(new MediumStar(x, y));
      } else if (floor(random(1 / STAR_CHANCE)) === 0) {
        LARGE_STARS.push(new LargeStar(x, y));
      }
    }
  }
  sun = new Sun();
  mesh = new Landscape();
  currentMusic = music1;
  currentMusic.stop();
  fft = new p5.FFT();
}

function draw() {
  let waveform = fft.waveform();
  let sumOfWaveform = 0;
  for (let i = 0; i < waveform.length; i++) {
    sumOfWaveform += abs(waveform[i]);
  }
  celestialBodyStrength = map(sumOfWaveform, 0, waveform.length, 0.1, 4);
  musicHandler();
  background(currentCelestialBodyBottomUniverseColor);
  drawUniverseBackground();

  mesh.generateTerrain().draw();
  SMALL_STARS.forEach((smallStar) => smallStar.draw());
  MEDIUM_STARS.forEach((mediumStar) => mediumStar.draw());
  LARGE_STARS.forEach((largeStar) => largeStar.draw());
  if (activeMeteor) {
    activeMeteor.draw();
  }
  if (millis() > starTimer + 200) {
    globalFramePointer = (globalFramePointer + 1) % 4;
    starTimer = millis();
    if (!activeMeteor && floor(random(1 / CHANCE_FOR_METEOR)) === 0) {
      activeMeteor = new MeteorAgent(random(METEOR_SIZE_MIN, METEOR_SIZE_MAX));
    }
  }
  sun.draw();
  colorTransition += 0.0001;
  colorTransition = constrain(colorTransition, 0, 1);
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
            : map(
                distanceFromCenter,
                0,
                centerOfLandscapeX,
                0.2,
                2 * volumeOfMusic
              );

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
    const centerColumnStart = WIDTH_OF_LANDSCAPE / 2 - 3 * SCALE;
    const centerColumnEnd = WIDTH_OF_LANDSCAPE / 2 + 3 * SCALE;

    currentStrokeColor = lerpColor(
      color(currentStrokeColor),
      color(currentCelestialBody.strokeColor),
      colorTransition
    );
    currentTileColorLight = lerpColor(
      color(currentTileColorLight),
      color(currentCelestialBody.tileColorLight),
      colorTransition
    );
    currentTileColorDark = lerpColor(
      color(currentTileColorDark),
      color(currentCelestialBody.tileColorDark),
      colorTransition
    );

    for (let y = 0; y < HEIGHT_OF_LANDSCAPE - SCALE; y += SCALE) {
      beginShape(QUAD_STRIP);
      stroke(currentStrokeColor);
      strokeWeight(1);
      for (let x = 0; x < WIDTH_OF_LANDSCAPE - SCALE; x += SCALE) {
        if (
          isCloseToLeftCornerOfThePlane(x, y) ||
          isCloseToRightCornerOfThePlane(x, y)
        ) {
          continue;
        }
        const height1 = this.heights[x / SCALE][y / SCALE];
        const height2 = this.heights[x / SCALE][y / SCALE + 1];

        const distance1 = dist(x, y, sunX, sunY);
        const distance2 = dist(x, y + SCALE, sunX, sunY);

        let brightnessFactor1 = 0;
        let brightnessFactor2 = 0;

        if (x >= centerColumnStart && x <= centerColumnEnd) {
          brightnessFactor1 =
            celestialBodyStrength *
            map(distance1, 0, HEIGHT_OF_LANDSCAPE, 1, 0);
          brightnessFactor2 =
            celestialBodyStrength *
            map(distance2, 0, HEIGHT_OF_LANDSCAPE, 1, 0);
        }

        const color1 = lerpColor(
          color(currentTileColorDark),
          color(currentTileColorLight),
          brightnessFactor1
        );
        const color2 = lerpColor(
          color(currentTileColorDark),
          color(currentTileColorLight),
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
    currentBrightnessColor = lerpColor(
      color(currentBrightnessColor),
      color(currentCelestialBody.brightnessColor),
      colorTransition
    );
    push();
    // behind the sun
    translate(0, -400, -1202);
    let baseColor = currentBrightnessColor;
    let baseAlpha = 100;
    let maxDiameter = map(celestialBodyStrength, 0.1, 1, 2.2, 3) * this.radius;
    let step = 20; // Step size for each iteration

    for (let diameter = 0; diameter <= maxDiameter; diameter += step) {
      let alpha = map(diameter, 0, maxDiameter, baseAlpha, 0);
      baseColor.setAlpha(diameter <= 2 * this.radius ? 100 : alpha);
      fill(baseColor);
      noStroke();
      circle(0, 0, diameter);
    }
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

    currentCelestialBodyTopColor = lerpColor(
      color(currentCelestialBodyTopColor),
      color(currentCelestialBody.topColor),
      colorTransition
    );

    currentCelestialBodyBottomColor = lerpColor(
      color(currentCelestialBodyBottomColor),
      color(currentCelestialBody.bottomColor),
      colorTransition
    );

    translate(0, -400, -1200);
    const gradient = 1;
    for (let y = -this.radius; y <= this.radius; y += gradient) {
      const inter = map(y, -this.radius, this.radius, 0, 1);
      const c = lerpColor(
        currentCelestialBodyTopColor,
        currentCelestialBodyBottomColor,
        inter
      );
      stroke(c);
      line(
        -sqrt(this.radius * this.radius - y * y),
        y,
        sqrt(this.radius * this.radius - y * y),
        y
      );
    }
    pop();
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
  currentCelestialBodyBottomUniverseColor = lerpColor(
    color(currentCelestialBodyBottomUniverseColor),
    color(currentCelestialBody.bottomUniverseColor),
    colorTransition
  );
  const topColor = color(TOP_UNIVERSE_COLOR);
  const bottomColor = currentCelestialBodyBottomUniverseColor;
  push();
  translate(-width / 2, -height / 2 - 810, -1202);
  for (let y = 0; y <= height; y++) {
    const inter = map(y, 0, height, 0, 1);
    const c = lerpColor(topColor, bottomColor, inter);
    stroke(c);
    line(-0.77 * width, y, 1.77 * width, y);
  }
  pop();
}

class SmallStar {
  constructor(x, y) {
    this.position = createVector(x, y);
  }

  draw() {
    this.drawFirstFrame();
  }

  drawFirstFrame() {
    push();
    translate(
      -width / 2 + this.position.x,
      -height / 2 + this.position.y - Y_POS_OF_UNIVERSE,
      -1202
    );
    stroke(STARS_AND_METEOR_COLOR);
    strokeWeight(0.1);
    point(0, 0, 0);
    pop();
  }
}

class MediumStar extends SmallStar {
  constructor(x, y) {
    super(x, y);
    this.timeChart = [1, 2, 2, 2];
  }

  draw() {
    switch (this.timeChart[globalFramePointer]) {
      case 2:
        this.drawThirdFrame();
        break;
      default:
        this.drawSecondFrame();
    }
  }

  drawSecondFrame() {
    this.drawFirstFrame();
    push();
    translate(
      -width / 2 + this.position.x,
      -height / 2 + this.position.y - Y_POS_OF_UNIVERSE,
      -1202
    );
    stroke(STARS_AND_METEOR_COLOR);
    strokeWeight(0.1);
    point(0, 1, 0);
    point(0, -1, 0);
    point(1, 0, 0);
    point(-1, 0, 0);
    pop();
  }

  drawThirdFrame() {
    this.drawSecondFrame();
    push();
    translate(
      -width / 2 + this.position.x,
      -height / 2 + this.position.y - Y_POS_OF_UNIVERSE,
      -1202
    );
    stroke(STARS_AND_METEOR_COLOR);
    strokeWeight(0.9);
    point(0, 2, 0);
    point(0, -2, 0);
    point(2, 0, 0);
    point(-2, 0, 0);
    pop();
  }
}

class LargeStar extends MediumStar {
  constructor(x, y) {
    super(x, y);
    this.timeChart = [1, 2, 1, 0];
  }

  draw() {
    switch (this.timeChart[globalFramePointer]) {
      case 2:
        this.drawThirdFrame();
        break;
      case 1:
        this.drawSecondFrame();
        break;
      default: // 0
        this.drawFirstFrame();
    }
  }
}

class MeteorAgent {
  constructor(size) {
    this.size = size;
    const sizeRatio = map(this.size, METEOR_SIZE_MIN, METEOR_SIZE_MAX, 0.4, 1);
    this.velocity = createVector(
      floor(random(2)) === 0 ? 1 : -1 * sizeRatio,
      sizeRatio
    );
    this.position = createVector(
      this.velocity.x >= 0
        ? random(-0.77 * width, width / 2)
        : random(width / 2, 1.77 * width),
      -100
    );
  }

  draw() {
    this.carefulDestroy();
    push();
    translate(-width / 2, -height / 2 - Y_POS_OF_UNIVERSE, -1202);
    noStroke();
    fill(STARS_AND_METEOR_COLOR);
    for (let i = 0; i < METEOR_TAIL_LENGTH; i++) {
      let iterationOfMeteor = p5.Vector.add(
        this.position,
        p5.Vector.mult(this.velocity, i)
      );
      circle(iterationOfMeteor.x, iterationOfMeteor.y, (this.size * i) / 100);
    }
    pop();
    this.position.add(this.velocity);
  }

  carefulDestroy() {
    if (this.position.y >= height + 200) {
      activeMeteor = null;
    }
  }
}

function keyPressed() {
  if (keyCode === UP_ARROW) {
    volumeOfMusic += 0.1;
  } else if (keyCode === DOWN_ARROW) {
    volumeOfMusic -= 0.1;
  } else if (keyCode === 32) {
    currentMusic.stop();
    musicHandler();
  }
  volumeOfMusic = constrain(volumeOfMusic, 0, 1);
  currentMusic.setVolume(volumeOfMusic);
}

function isCloseToLeftCornerOfThePlane(x, y) {
  const leftCorner = createVector(0, HEIGHT_OF_LANDSCAPE);
  const distance = dist(x, y, leftCorner.x, leftCorner.y);
  return distance < SIZE_OF_NON_RENDERED_CORNERS;
}

function isCloseToRightCornerOfThePlane(x, y) {
  const right_corner = createVector(WIDTH_OF_LANDSCAPE, HEIGHT_OF_LANDSCAPE);
  const distance = dist(x, y, right_corner.x, right_corner.y);
  return distance < SIZE_OF_NON_RENDERED_CORNERS;
}

function musicHandler() {
  if (currentMusic.isPlaying() || !startedFlag) {
    return;
  }
  if (currentMusic === music1) {
    currentMusic = music2;
  } else if (currentMusic === music2) {
    currentMusic = music3;
  } else if (currentMusic === music3) {
    currentMusic = music4;
  } else if (currentMusic === music4) {
    currentMusic = music5;
  } else if (currentMusic === music5) {
    currentMusic = music1;
  }

  switch (currentCelestialBody) {
    case CELESTIAL_BODIES_PHASES.MOON:
      currentCelestialBody = CELESTIAL_BODIES_PHASES.SATURN;
      break;
    case CELESTIAL_BODIES_PHASES.SATURN:
      currentCelestialBody = CELESTIAL_BODIES_PHASES.SUN;
      break;
    case CELESTIAL_BODIES_PHASES.SUN:
      currentCelestialBody = CELESTIAL_BODIES_PHASES.MOON;
      break;
  }
  colorTransition = 0;
  currentMusic.play();
}

let startedFlag = false;
function mouseClicked() {
  if (!startedFlag) {
    currentMusic.play();
    startedFlag = true;
    let fs = fullscreen();
    fullscreen(!fs);
  }
}
