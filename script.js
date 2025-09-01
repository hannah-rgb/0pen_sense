// Define sensor-specific data
const sensorData = {
    "ACCELEROMETER" :{
    connect: "VCC 3.3V<br>GND GND<br>SDA A4<br>SCL A5",
    arduino: `#include <Wire.h>\nconst byte MMA8452Q_ADDR = 0x1C;\nvoid setup() {\n  Serial.begin(9600);\n  Wire.begin();\n  Wire.beginTransmission(MMA8452Q_ADDR);\n  Wire.write(0x2A);\n  Wire.write(0x01);\n  Wire.endTransmission();\n  delay(100);\n}\nvoid loop() {\n  int16_t ax, ay, az;\n  Wire.beginTransmission(MMA8452Q_ADDR);\n  Wire.write(0x01);\n  Wire.endTransmission(false);\n  Wire.requestFrom(MMA8452Q_ADDR, 6);\n  if (Wire.available() == 6) {\n    ax = (Wire.read() << 8) | Wire.read();\n    ay = (Wire.read() << 8) | Wire.read();\n    az = (Wire.read() << 8) | Wire.read();\n    ax >>= 2;\n    ay >>= 2;\n    az >>= 2;\nSerial.print(ax); Serial.print(","); \nSerial.print(ay); Serial.print(","); \nSerial.println(az);\n  }\n  delay(100);\n}\n`,
    p5: `let serial;\nlet latestData = "waiting...";\nlet x = 0, y = 0, z = 0;\nlet smoothedX = 0, smoothedY = 0, smoothedZ = 0;\nlet smoothing = 0.1;\nfunction setup() {\n createCanvas(500, 500, WEBGL);\n  serial = new p5.SerialPort();\n  serial.open('/dev/tty.usbmodemxxxxxz142401');\n  serial.on('data', serialEvent);\n}\nfunction draw() {\n  background(255);\n  smoothedX = lerp(smoothedX, x, smoothing);\n  smoothedY = lerp(smoothedY, y, smoothing);\n  smoothedZ = lerp(smoothedZ, z, smoothing);\n  ambientLight(0);\n  rotateX(radians(map(smoothedY, -1024, 1024, -180, 180)));\n  rotateY(radians(map(smoothedX, -1024, 1024, -180, 180)));\n  rotateZ(radians(map(smoothedZ, -1024, 1024, -180, 180)));\n  box(150);\n  resetMatrix();\n  camera();\n  noLights();\n  fill(0);\n  textSize(16);\n  textAlign(LEFT, BOTTOM);\n  text("Distance: " + latestData + " mm", -width / 2 + 20, height / 2 - 20);\n}\nfunction serialEvent() {\n  let data = serial.readLine().trim();\n  if (data.length > 0) {\n    let values = split(data, ',');\n    if (values.length === 3) {\n      x = int(values[0]);\n      y = int(values[1]);\n      z = int(values[2]);\n    }\n  }\n}`,
    useCase: "ACCELEROMETER is used to detect the x, y, z cordinates of the object."
},
   "AIR QUALITY SENSOR": {
    model:"ENS160",
    connect: "VCC_3.3V<br>GND_GND<br>SDA_A4<br>SCL_A5",
    arduino: `In Arduino IDE → Tools → Manage Libraries… → install “ENS160 – Adafruit Fork<br>#include <Wire.h>
#include "ScioSense_ENS160.h"

// Adafruit breakout defaults to 0x53:
ScioSense_ENS160 ens160(ENS160_I2CADDR_1); // use ENS160_I2CADDR_0 for 0x52

void setup() {
  Serial.begin(9600);
  Wire.begin();

  if (!ens160.begin()) {
    // If not found, keep p5.js happy with zeros
    while (1) { Serial.println(0); delay(500); }
  }

  // Standard algorithm mode: gives TVOC & eCO2
  ens160.setMode(ENS160_OPMODE_STD);  // aka OPMODE_STANDARD in docs
}

void loop() {
  // Wait for a fresh reading (up to ~1s)
  if (ens160.measure(true)) {
    uint16_t tvoc_ppb = ens160.getTVOC();  // TVOC in ppb
    Serial.println(tvoc_ppb);              // ONE number per line
  } else {
    Serial.println(0);
  }
    delay(200);}`,
    p5: `  const AQ_MIN = 0, AQ_MAX = 150;  // adjust to your sensor
  function setup() { createCanvas(500, 500); noStroke(); rectMode(CENTER); }
  function draw() {
    background(255);
    const aq = map(mouseY, 0, height, AQ_MIN, AQ_MAX);  // ← replace with your sensor value
    const n = constrain((aq - AQ_MIN) / (AQ_MAX - AQ_MIN), 0, 1);
    const cell = lerp(4, 40, n);                        // clean → small cells, dirty → big
    const R = 160;
    fill(0);
    for (let y = cell/2; y < height; y += cell) {
      for (let x = cell/2; x < width; x += cell) {
        const dx = x - width/2, dy = y - height/2;
        if (dx*dx + dy*dy < R*R) rect(x, y, cell*0.9, cell*0.9, 2);
      }
    }
    }`,
    useCase: "Smoggy data causes blur, pixelation, or haze overlays in visual system"
  },
   "CO2 SENSOR": {
    model:"SCD40",
    connect: "VCC_3.3V<br>GND_GND<br>SDA_A4<br>SCL_A5",
    arduino: `#include <Wire.h>
#include "ScioSense_ENS160.h"

// 0x53 on Adafruit breakout; use ENS160_I2CADDR_0 for 0x52
ScioSense_ENS160 ens160(ENS160_I2CADDR_1);

void setup() {
  Serial.begin(9600);
  Wire.begin();
  if (!ens160.begin()) {
    while (1) { Serial.println(400); delay(500); } // safe default
  }
  ens160.setMode(ENS160_OPMODE_STD);  // standard algorithm mode
}

void loop() {
  if (ens160.measure(true)) {
    uint16_t eco2_ppm = ens160.geteCO2(); // "equivalent CO2" in ppm
    Serial.println(eco2_ppm);             // ONE number per line
  } else {
    Serial.println(400);
  }
  delay(200);
}
    `,
    p5: `const CO2_MIN = 400, CO2_MAX = 2000;    // clamp/normalize range
  let co2 = 800;                           // smoothed ppm shown
  let latest = null;                       // most recent raw ppm from serial

  // Web Serial state
  let port, reader, serialBuffer = "";

  function setup(){
    createCanvas(500,500);
    noStroke();
    document.getElementById('btn').onclick = connectSerial;
    textFont('monospace'); textSize(12);
  }

  function draw(){
    background(255);

    // Smooth incoming value for stability
    if (latest !== null) co2 = lerp(co2, latest, 0.12);

    // Normalize to 0..1
    const n = constrain((co2 - CO2_MIN) / (CO2_MAX - CO2_MIN), 0, 1);

    // Spike parameters
    const points = floor(lerp(5, 16, n));
    const outerR = 160;
    const innerR = outerR * lerp(0.85, 0.30, n);   // higher ppm → sharper
    const rot    = frameCount * lerp(0.02, 0.005, n); // higher ppm → slower

    translate(width/2, height/2);
    rotate(rot);
    fill(0);
    beginShape();
    const steps = points * 2;
    for (let i = 0; i < steps; i++){
      const a = TWO_PI * i / steps;
      const r = (i % 2 === 0) ? outerR : innerR;
      vertex(cos(a)*r, sin(a)*r);
    }
    endShape(CLOSE);

    // HUD
    resetMatrix();
    fill(0);
  }

  // ---- Minimal Web Serial: expects ONE number (ppm) per line ----
  async function connectSerial(){
    if (!('serial' in navigator)) { alert('Web Serial not supported'); return; }
    try {
      port = await navigator.serial.requestPort();
      await port.open({ baudRate: 9600 });
      reader = port.readable.getReader();
      const dec = new TextDecoder();
      while (true){
        const { value, done } = await reader.read();
        if (done) break;
        if (value){
          serialBuffer += dec.decode(value);
          const lines = serialBuffer.split(/\r?\n/);
          serialBuffer = lines.pop();
          for (const ln of lines){
            const v = parseFloat(ln.trim());
            if (!isNaN(v)) latest = v;     // ppm
          }
        }
      }
    } catch(e){ console.error(e); }
    finally { reader && reader.releaseLock(); }
    }`,
    useCase: "Higher CO₂ makes letters or shapes complexify, suffocate or shrink. Emphasize presence and air density"
  },
   "CLOCK SENSOR": {
    connect: "Battery mounted",
    arduino: `int pirPin = 2;\nvoid setup() {\n  pinMode(pirPin, INPUT);\n  Serial.begin(9600);\n}\nvoid loop() {\n  int motion = digitalRead(pirPin);\n  Serial.println(motion);\n  delay(100);\n}`,
    p5: `let serial;\nlet hours = 0, minutes = 0, seconds = 0;\nlet lastSecond = -1;\nlet circleSize = 10;\nlet baseSize = 10;\nlet maxSize = 250;\nfunction setup() {\n  createCanvas(500, 500);\n  serial = new p5.SerialPort();\n  // Replace this with your actual port name from serialcontrol\n  serial.open('/dev/tty.usbmodemxxxxxz142401');\n  serial.on('data', serialEvent);\n  serial.on('error', err => print("Serial error:", err));\n  textFont('monospace');\n  textAlign(CENTER, CENTER);\n  angleMode(DEGREES);\n}\nfunction draw() {\n  background(255);\nlet grayscale = map(seconds % 10, 0, 9, 255, 0);\n fill(grayscale);\nnoStroke();\n  // Reset circle size at the start of each new second\n  if (seconds !== lastSecond) {\n    lastSecond = seconds;\n    circleSize = baseSize;\n  }\n  // Grow size from 10 to 250 within the current second\n  let t = (millis() % 1000) / 1000;\n  circleSize = lerp(baseSize, maxSize, t);\n  // Draw circle\n  ellipse(width / 2, height / 2, circleSize);\n  // Draw current time\n  fill(0);\ntextSize(20);\n  text(nf(hours, 2) + ":" + nf(minutes, 2) + ":" + nf(seconds, 2), width / 2, height - 40);\n}\nfunction serialEvent() {\n  let raw = serial.readLine().trim();\n  print("RAW DATA:", raw); // Diagnostic log\nif (raw.length > 0) {\n    let parts = split(raw, ":");\n    print("Parts:", parts); // Show parsed parts\n    if (parts.length === 3) {\n      hours = int(parts[0]);\n      minutes = int(parts[1]);\n      seconds = int(parts[2]);\n      print("✅ Parsed:", hours, minutes, seconds);\n    } else {\n      print("⚠️ Unexpected format:", raw);\n    }\n  }\n}\n`,
    useCase: "Time-based animation or type changes throughout the day (e.g. time of day affects color)"
  },
   "DISTANCE SENSOR 1": {
    model: "VL53L0X",
    connect: "VCC 5V<br>GND GND<br>SDA A4<br>SCL A5",
    arduino: `#include <Wire.h>\n#include <Adafruit_VL53L0X.h>\nAdafruit_VL53L0X lox = Adafruit_VL53L0X();\n\nvoid setup() {\n  Serial.begin(9600);\n  Wire.begin();\n  if (!lox.begin()) {\n    Serial.println(\"Sensor not found\");\n    while (1);\n  }\n}\nvoid loop() {\n  VL53L0X_RangingMeasurementData_t measure;\n  lox.rangingTest(&measure, false);\n  if (measure.RangeStatus != 4) {\n    Serial.println(measure.RangeMilliMeter);\n  } else {\n    Serial.println(\"0\");\n  }\n  delay(50);\n}`,
    p5: `let serial;\nlet latestData = \"waiting for data\";\nfunction setup() {\n  createCanvas(500, 500);\n  serial = new p5.SerialPort();\n  serial.on('data', gotData);\n  serial.open('/dev/tty.usbmodemxxxxxx');\n}\nfunction gotData() {\n  let currentString = serial.readLine().trim();\n  if (currentString.length > 0) {\n    latestData = currentString;\n  }\n}\nfunction draw() {\n  background(255);\n  let d = int(latestData);\n  d = constrain(d, 50, 500);\n  let size = map(d, 50, 500, 500, 50);\n  fill(0);\n  ellipse(width / 2, height / 2, size, size);\n  fill(0);\n  textSize(16);\n  text(\"Distance: \" + latestData + \" mm\", 20, height - 20);\n}`,
    useCase: "DISTANCE SENSOR is used to detect basic distance(a few 10s of cm up to ~1–2 m) measurements. <br> \u2022 You can RESIZE, REARRANGE OR ANIMATES graphic of posters(color, typography, image) based on the distance to engage passersby and encourage closer interaction, surprise, or narrative.<br> \u2022 With multiple distance sensors, you can measure presence density of crowd, turning environmental data into ambient visual communication or data visualization"
  },
    "DISTANCE SENSOR 2": {
    model: "HC-TOF10120",
    connect: "VCC 5V<br>GND GND<br>SDA A4<br>SCL A5",
    arduino: `#include <Wire.h>
#include <VL53L1X.h>

VL53L1X sensor;

void setup() {
  Serial.begin(9600);
  Wire.begin();

  if (!sensor.init()) {
    // If not found, keep outputting 0 so p5 stays alive
    while (1) { Serial.println(0); delay(200); }
  }

  sensor.setTimeout(500);
  sensor.setDistanceMode(VL53L1X::Long);        // Long range (use Short/Medium if you want)
  sensor.setMeasurementTimingBudget(50000);     // 50 ms timing budget
  sensor.startContinuous(50);                   // 20 Hz
}

void loop() {
  uint16_t mm = sensor.read();                  // distance in mm
  if (sensor.timeoutOccurred()) {
    Serial.println(0);
  } else {
    Serial.println(mm);
  }
  // no extra delay; we're in continuous mode
}
`,
    p5: `const MIN_MM = 50, MAX_MM = 8000; // TOF long range
  const BEADS = 12;

  let serial;
  let latestLine = "800"; // default ppm to start with something visible

  function setup(){
    createCanvas(500, 500);
    noStroke();
    textFont('monospace'); textSize(14);

    serial = new p5.SerialPort();
    serial.on('data', gotData);
    // ↓ change to your actual port (check Arduino Tools → Port)
    serial.open('/dev/tty.usbmodemxxxxxx');
  }

  function gotData(){
    const s = serial.readLine().trim();
    if (s.length > 0) latestLine = s;
  }

  function draw(){
    background(255);

    // Distance from sensor (mm)
    let d = parseInt(latestLine, 10);
    if (isNaN(d) || d <= 0) d = 800;           // simple fallback
    d = constrain(d, MIN_MM, MAX_MM);
    const n = (d - MIN_MM) / (MAX_MM - MIN_MM);

    // Map distance → visuals (tweak to taste)
    const ringR    = lerp(20, 180, n);         // ring radius grows with distance
    const baseSize = lerp(4, 26, n);           // bead base size grows with distance
    const amp      = lerp(2, 12, n);           // pulsing amplitude
    const speed    = lerp(0.02, 0.14, n);      // loop speed grows with distance

    const cx = width/2, cy = height/2;
    const t = frameCount * speed;
    const step = TWO_PI / BEADS;

    fill(0);
    for (let i = 0; i < BEADS; i++){
      const a = i * step;
      const x = cx + cos(a) * ringR;
      const y = cy + sin(a) * ringR;
      const s = Math.max(0, baseSize + Math.sin(t + i * step) * amp);
      circle(x, y, s);
    }

    fill(0);
}
`,
    useCase: "DISTANCE SENSOR 2 is used to detect farther(reach several meters and lets you pick Short/Medium/Long modes) distance measurements. <br> \u2022 You can RESIZE, REARRANGE OR ANIMATES graphic of posters(color, typography, image) based on the distance to engage passersby and encourage closer interaction, surprise, or narrative.<br> \u2022 With multiple distance sensors, you can measure presence density of crowd, turning environmental data into ambient visual communication or data visualization"
  },
  "GAS SENSOR": {
    model:"MQ-2",
    connect: "VCC_5V<br>GND_GND<br>A0_A0",
    arduino: `const int AO = A0;

void setup() {
  Serial.begin(9600);
  pinMode(AO, INPUT);
}

void loop() {
  int raw = analogRead(AO);   // 0..1023
  Serial.println(raw);        // ONE number per line for p5
  delay(50);                  // ~20 Hz
}
`,
    p5: `const GAS_MIN = 0;     // analogRead lower bound
  const GAS_MAX = 1023;  // analogRead upper bound

  let serial, latestLine = "0";
  let gas = 0, gasSmooth = 0;

  function setup(){
    createCanvas(500, 500);
    noStroke();
    textFont('monospace'); textSize(14);

    serial = new p5.SerialPort();
    serial.on('data', gotData);
    serial.open('/dev/tty.usbmodemxxxxxx');
  }

  function gotData(){
    const s = serial.readLine().trim();
    if (s.length > 0) latestLine = s;
  }

  function draw(){
    background(255);

    // Parse and clamp incoming value (0..1023 from analogRead)
    let v = parseInt(latestLine, 10);
    if (!isNaN(v)) gas = v;
    gas = constrain(gas, GAS_MIN, GAS_MAX);

    // Smooth to reduce flicker
    gasSmooth = lerp(gasSmooth, gas, 0.15);

    // Normalize 0..1
    const n = (gasSmooth - GAS_MIN) / (GAS_MAX - GAS_MIN);

    // Visual mapping
    const base  = lerp(255, 40, n);   // overall darkness
    const depth = lerp(0,   140, n);  // gradient depth

    // Draw vertical gradient
    for (let y = 0; y < height; y++){
      const shade = base - (y / height) * depth;
      stroke(shade);
      line(0, y, width, y);
    }

    // Subtle pulse overlay intensifies with gas
    const pulse = map(Math.sin(millis() * 0.02), -1, 1, 0, 40) * n;
    noStroke(); fill(0, pulse);
    rect(0, 0, width, height);

    // HUD
    fill(base > 120 ? 0 : 255);
  }`,
    useCase: "Darken of veil the poster as air gets heavier, drive concentric “bubble” rings that grow and pulse with intensity, or trigger a full-screen strobe when levels spike. With multiple sensors, darken zones independently to map local pockets. Smooth the analog value, set a baseline after warm-up, and treat it as indicative—not safety-critical."
  },
   "GPS SENSOR": {
    model: "",
    connect: "VCC_5V<br>GND_GND<br>TX_D4<br>RX_D3",
    arduino: `#include <TinyGPSPlus.h>
#include <SoftwareSerial.h>

// GPS wired: GPS TX -> D4 (Arduino RX), GPS RX -> D3 (optional)
SoftwareSerial gpsSerial(4, 3);
TinyGPSPlus gps;

void setup() {
  Serial.begin(9600);     // to p5.js
  gpsSerial.begin(9600);  // GPS default baud
}

void loop() {
  while (gpsSerial.available()) {
    gps.encode(gpsSerial.read());
  }

  if (gps.location.isValid() && gps.course.isValid() && gps.speed.isValid()) {
    // course over ground (0..360, 0 = North, clockwise) and speed in km/h
    float heading = gps.course.deg();
    float speed   = gps.speed.kmph();
    if (heading < 0 || heading > 360) heading = -1;  // sanity
    Serial.print(heading, 1);
    Serial.print(',');
    Serial.println(speed, 1);
  } else if (gps.course.isValid()) {
    // sometimes speed/location may be invalid; still send heading
    Serial.print(gps.course.deg(), 1);
    Serial.println(",0.0");
  } else {
    // no valid course yet (e.g., stationary or no fix)
    Serial.println("-1,0.0");
  }

  delay(100); // ~10 Hz output
}
`,
    p5: `let rot = 0;
const N = 32;        // spokes
const STROKE_W = 2;  // thickness
const LEN = 140;     // length of each spoke

// --- serial state ---
let serial, latestLine = "";
let headingDeg = 0;         // last good heading (0..359)
let smoothHeading = 0;      // smoothed/animated heading
let speedKmh = 0;           // last speed (km/h)

function setup(){
  createCanvas(500, 500);
  textFont('monospace'); textSize(12);

  serial = new p5.SerialPort();
  serial.on('data', onSerial);
  serial.open('/dev/tty.usbmodemxxxxxx');
}

function onSerial(){
  const s = serial.readLine().trim();
  if (!s) return;
  latestLine = s;

  // Accept lines like "123.4,5.6" (heading,speed) or just "123.4"
  const parts = s.split(/[,\s]+/);
  const h = parseFloat(parts[0]);
  if (!isNaN(h) && h >= 0 && h <= 360) headingDeg = h;
  if (parts.length > 1) {
    const v = parseFloat(parts[1]);
    if (!isNaN(v)) speedKmh = v;
  }
}

function draw(){
  background(255);

  // Smooth wrap-around to avoid 359→0 jumps
  let diff = ((headingDeg - smoothHeading + 540) % 360) - 180;
  smoothHeading = (smoothHeading + diff * 0.12 + 360) % 360;

  const headingRad = radians(smoothHeading) - HALF_PI; // 0° = up
  // Focus from speed (0..30 km/h → broad..tight). Clamp as you like.
  const focus = map(constrain(speedKmh, 0, 30), 0, 30, 0.6, 2.0);

  // If you prefer mouseY to control focus instead, replace the line above with:
  // const focus = map(mouseY, 0, height, 0.6, 2.0);

  const cx = width/2, cy = height/2;
  const pad = 1;
  const Rmax = min(width, height)/2 - pad;
  const r1 = Rmax * 0.65;
  const r0 = r1 - LEN;

  const step = TWO_PI / N;
  rot += 0.01;

  strokeWeight(STROKE_W);
  for (let i = 0; i < N; i++){
    const a = i * step + rot;
    const d = angleDiff(a, headingRad);
    const w = pow((cos(d) + 1) * 0.5, focus);   // 0..1 peak at heading
    const alpha = 12 + 243 * w;

    stroke(0, alpha);
    line(
      cx + cos(a) * r0, cy + sin(a) * r0,
      cx + cos(a) * r1, cy + sin(a) * r1
    );
  }

  // tiny HUD
  noStroke(); fill(0);
}

// shortest signed angle difference [-PI, PI]
function angleDiff(a, b){
  let d = (a - b) % (TWO_PI);
  if (d >  PI) d -= TWO_PI;
  if (d < -PI) d += TWO_PI;
  return d;
}`,
    useCase: "Location-based content changes; different graphics shown in different geographies"
  },
    "HUMIDITY SENSOR": {
    model:"DHT 8",
    connect: "VCC_3.3/5V<br>GND_GND<br>DATA_D2<br>(pull-up resistor)",
    arduino: `#include "DHT.h"

#define DHTPIN 2
#define DHTTYPE DHT22   // change to DHT11 if that's your sensor

DHT dht(DHTPIN, DHTTYPE);

void setup() {
  Serial.begin(9600);
  dht.begin();
}

void loop() {
  float h = dht.readHumidity();   // 0..100 (%RH)
  if (isnan(h)) {
    // keep p5 happy if read failed
    Serial.println(-1);
  } else {
    Serial.println(h, 1);         // one number per line
  }
  delay(1000); // DHT is slow; ~1 Hz is reasonable
}
`,
    p5: `let bubbles = [], lastHum = 0;

// --- Tank geometry (inside the square) ---
const cx = 250, cy = 250; // center
const R  = 150;           // tank radius
const margin = 50;        // inner padding

// --- Bubble + physics params (your settings) ---
const BUB_R = 20;         // ONE size
const GRAV  = 0.12;
const AIR   = 0.995;
const COLLISION_DAMP = 0.4;
const MAX_BUBBLES = 220;

// --- Serial state ---
let serial, latest = "0";
let hum = 0, humSmooth = 0; // 0..1

function setup(){
  createCanvas(500, 500);
  noStroke();

  serial = new p5.SerialPort();
  serial.on('data', onData);
  serial.open('/dev/tty.usbmodemxxxxxx');
}

function onData(){
  const s = serial.readLine().trim();
  if (s.length) latest = s;
}

function draw(){
  background(255);

  // Parse humidity (expects 0–100). Smooth to avoid flicker.
  const h = parseFloat(latest);
  if (!isNaN(h)) hum = constrain(h / 100, 0, 1);
  humSmooth = lerp(humSmooth, hum, 0.15);
  const dry = 1 - humSmooth;

  // (optional) faint tank ring
  // noFill(); stroke(0,40); strokeWeight(1); circle(cx, cy, R*2 - margin*0.2); noStroke();

  // Spawn rate / fall speed scale with humidity (your ranges)
  const spawnProb = lerp(0.01, 0.10, humSmooth);
  const fallBoost = lerp(0.10, 0.50, humSmooth);

  // Spawn near inside-top boundary
  if (random() < spawnProb && countAlive() < MAX_BUBBLES) {
    const x = random(cx - (R - margin), cx + (R - margin));
    const dx = x - cx;
    const yTop = cy - sqrt(max(0, R*R - dx*dx)) + margin + random(0, 6);
    const b = new Bubble(x, yTop);
    b.vy = random(0.2, 0.6) * fallBoost;
    bubbles.push(b);
  }

  // Physics
  for (const b of bubbles) b.integrate(humSmooth, fallBoost);
  for (const b of bubbles) clampInsideCircle(b);
  resolveCollisions();
  for (const b of bubbles) {
    b.considerSettled();
    if (random() < dry * 0.02) b.popNow();
  }

  // Pop a handful on sudden drying
  if (humSmooth < lastHum - 0.05) {
    for (let k = 0; k < 10; k++) {
      const i = floor(random(bubbles.length));
      bubbles[i]?.popNow();
    }
  }
  lastHum = humSmooth;

  // Draw & prune
  for (let i = bubbles.length-1; i >= 0; i--){
    bubbles[i].draw();
    if (bubbles[i].done) bubbles.splice(i, 1);
  }
}

function countAlive(){ let n=0; for (const b of bubbles) if (b.state!=='pop') n++; return n; }

class Bubble {
  constructor(x, y){
    this.x=x; this.y=y; this.vx=random(-0.15,0.15); this.vy=0.3;
    this.state='fall'; this.popT=0; this.done=false;
  }
  integrate(hum, fallBoost){
    if (this.state==='fall'){
      this.vy += GRAV * fallBoost;
      this.vx += sin(frameCount*0.02 + this.y*0.01) * 0.0015;
      this.vx *= AIR; this.vy *= AIR;
      this.x += this.vx; this.y += this.vy;
    } else if (this.state==='pop'){
      this.popT++; if (this.popT>14) this.done=true;
    }
  }
  considerSettled(){
    if (this.state!=='fall') return;
    const slow = (abs(this.vx)+abs(this.vy)) < 0.15;
    const yBottom = bottomYAtX(this.x) - BUB_R - 0.5;
    const onFloor = this.y >= yBottom - 0.5;
    let supported = false;
    for (const o of bubbles){
      if (o===this || o.state==='pop') continue;
      const dx=o.x-this.x, dy=o.y-this.y, minD=(BUB_R*2)-0.5;
      if (dx*dx+dy*dy>0 && dx*dx+dy*dy < minD*minD && o.y > this.y-0.1){ supported=true; break; }
    }
    if (slow && (onFloor || supported)){ this.state='settled'; this.vx=0; this.vy=0; }
  }
  popNow(){ if (this.state!=='pop'){ this.state='pop'; this.vx=0; this.vy=0; this.popT=0; } }
  draw(){
    if (this.state!=='pop'){ fill(0,220); circle(this.x, this.y, BUB_R*2); }
    else { noFill(); stroke(0); strokeWeight(2); circle(this.x, this.y, BUB_R*2 + this.popT*2); noStroke(); }
  }
}

// Geometry helpers
function bottomYAtX(x){
  const dx = x - cx, innerR = R - margin;
  return cy + sqrt(max(0, innerR*innerR - dx*dx));
}
function clampInsideCircle(b){
  const innerR = R - margin - BUB_R;
  const dx=b.x-cx, dy=b.y-cy, d=sqrt(dx*dx+dy*dy);
  if (d > innerR){
    const a=atan2(dy,dx);
    b.x = cx + cos(a)*innerR; b.y = cy + sin(a)*innerR;
    b.vx*=0.5; b.vy*=0.5;
  }
}
function resolveCollisions(){
  for (let i=0;i<bubbles.length;i++){
    const a=bubbles[i]; if (a.state==='pop') continue;
    for (let j=i+1;j<bubbles.length;j++){
      const b=bubbles[j]; if (b.state==='pop') continue;
      let dx=b.x-a.x, dy=b.y-a.y, minD=BUB_R*2, d2=dx*dx+dy*dy;
      if (d2>0 && d2<minD*minD){
        const d=sqrt(d2), ov=(minD-d)+0.01, nx=dx/d, ny=dy/d;
        a.x-=nx*ov*0.5; a.y-=ny*ov*0.5; b.x+=nx*ov*0.5; b.y+=ny*ov*0.5;
        const avn=a.vx*nx+a.vy*ny, bvn=b.vx*nx+b.vy*ny;
        a.vx-=nx*avn*COLLISION_DAMP; a.vy-=ny*avn*COLLISION_DAMP;
        b.vx-=nx*bvn*COLLISION_DAMP; b.vy-=ny*bvn*COLLISION_DAMP;
      }
    }
  }
}`,
    useCase: "Influence texture dry: crisp, wet: smeared/misty. Evoke atmosphere in visuals"
  },
  "ILLUMINATION SENSOR": {
    model:"BH1750",
    connect: "VCC_3.3V/5V<br>GND_GND<br>SDA_A4<br>SCL_A5",
    arduino: `#include <Wire.h>
#include <BH1750.h>

BH1750 lightMeter;  // default address 0x23; if ADDR tied high, it’s 0x5C

void setup() {
  Serial.begin(9600);
  Wire.begin();

  // Start in continuous high-res mode (1 lx resolution)
  if (!lightMeter.begin(BH1750::CONTINUOUS_HIGH_RES_MODE)) {
    // If init fails, keep sending 0 so p5 doesn't stall
    while (1) { Serial.println(0); delay(200); }
  }
}

void loop() {
  float lux = lightMeter.readLightLevel(); // lux
  if (lux < 0) lux = 0;                    // safety
  Serial.println(lux, 1);                  // ONE number per line
  delay(200);                              // ~5 Hz
}
`,
    p5: `const N=16, PAD=34;
let serial, latest="0";
let lux=10, luxSmooth=10;

// tune these after you see real numbers
const LUX_MIN = 1;      // ~very dark
const LUX_MAX = 5000;   // bright room→overcast daylight (you can raise to 20000+)

function setup(){
  createCanvas(500,500); noStroke();
  serial = new p5.SerialPort();
  serial.on('data', onData);
  serial.open('/dev/tty.usbmodemxxxxxx');
}

function onData(){
  const s = serial.readLine().trim();
  if (s) latest = s;
}

function draw(){
  background(255);
  const cx=width/2, cy=height/2, outerR=min(width,height)/2 - PAD;

  const v = parseFloat(latest);
  if (!isNaN(v) && v >= 0) lux = v;
  luxSmooth = lerp(luxSmooth, lux, 0.12);

  // Log-normalize lux → 0..1 so wide ranges feel good
  const n = normLux(luxSmooth, LUX_MIN, LUX_MAX);

  // Aperture radius grows with brightness
  const r = lerp(outerR*0.08, outerR*0.78, n);
  const halfW = 0.12;

  fill(0);
  for (let i=0;i<N;i++){
    const a = i * TWO_PI / N;
    const b1 = a - halfW, b2 = a + halfW;
    const bx1 = cx + cos(b1)*outerR, by1 = cy + sin(b1)*outerR;
    const bx2 = cx + cos(b2)*outerR, by2 = cy + sin(b2)*outerR;
    const ax  = cx + cos(a)*r,       ay  = cy + sin(a)*r;
    triangle(bx1,by1, bx2,by2, ax,ay);
  }

  // minimal HUD
  noStroke(); fill(0); textFont('monospace'); textSize(12);
}

function normLux(x, minLux, maxLux){
  const lo = Math.log(Math.max(minLux, 1));
  const hi = Math.log(Math.max(maxLux, minLux+1));
  const lx = Math.log(Math.max(x, 1));
  return constrain((lx - lo) / (hi - lo), 0, 1);
}`,
    useCase: "Switch between light/dark themes; adjust contrast or glow dynamically"
  },
  "PIR MOTION SENSOR": {
    connect: "VCC 5V<br>GND GND<br>OUT D2 \n (Digital Pin 2)",
    arduino: `int pirPin = 2;\nvoid setup() {\n  pinMode(pirPin, INPUT);\n  Serial.begin(9600);\n}\nvoid loop() {\n  int motion = digitalRead(pirPin);\n  Serial.println(motion);\n  delay(100);\n}`,
    p5: `let latestData = \"waiting for data\";\nlet serial;\nfunction setup() {\n  createCanvas(500, 500);\n  serial = new p5.SerialPort();\n  serial.list();\n  serial.open('/dev/tty.usbmodemxxxxxz142401');\n  serial.on('data', () => {\n    let data = serial.readLine().trim();\n    if (data.length > 0) {\n      latestData = data;\n    }\n  });\n}\nfunction draw() {\n  background(255);\n  if (latestData === \"1\") {\n    fill(0);\n  } else {\n    fill(255);\n  }\n  rect(150, 150, 125, 125);\n  fill(0);\n  textSize(20);\n  text(\"Motion: \" + latestData, 20, height - 20);\n}`,
    useCase: "PIR MOTION SENSOR is used to detect motion through infrared changes."
  },
  "SOUND SENSOR": {
    connect: "00 D2 <br>G GND<br>A0 A0<br>+ 5V<br>",
    arduino: `void setup() {\n  Serial.begin(9600);\n}\nvoid loop() {\n  int sound = analogRead(A0);\n  Serial.println(sound);\n  delay(200);\n}\n`,
    p5: `let serial;\nlet soundLevel = 0;\nlet circles = [];\nlet clapDetected = false;\n\nfunction setup() {\n  createCanvas(500, 500);\n  ellipseMode(RADIUS);\n\n  serial = new p5.SerialPort();\n  serial.open('/dev/tty.usbmodemxxxxxz142401'); // Replace with your port\n  serial.on('data', serialEvent);\n  circles.push({ x: width / 2, y: height / 2, r: 200 });\n}\n\nfunction draw() {\n  background(255);\n  fill(0);\n  noStroke();\n\n  for (let c of circles) {\n    ellipse(c.x, c.y, c.r, c.r);\n  }\n\\n  if (!clapDetected && soundLevel >= 502) {\n    splitCircles(); // Only once per peak\n    clapDetected = true;\n  }\n\n\n  if (soundLevel <= 501) {\n    clapDetected = false;\n  }\n}\n\nfunction serialEvent() {\n  let raw = serial.readLine().trim();\n  if (raw.length > 0) {\n    soundLevel = int(raw);\n    print("Sound Level:", soundLevel);\n  }\n}\n\nfunction splitCircles() {\n    let newCircles = [];\n  \n    for (let c of circles) {\n      let r = c.r / 2;\n      if (r > 2) {
        newCircles.push({ x: c.x - r, y: c.y, r: r });\n        newCircles.push({ x: c.x + r, y: c.y, r: r });\n      }\n    }\n  \n    if (newCircles.length === 0) {\n      circles = [{ x: width / 2, y: height / 2, r: 50 }];\n    } else {\n      circles = newCircles;\n    }\n  }`,
    useCase: "SOUND SENSOR can receive 0 and 1 data of sound."
  },

    "ULTRA SONIC SENSOR": {
    model: "HC-SR04",
    connect: "VCC_5V<br>GND_GND<br>TRIG_D2<br>ECHO_D3d",
    arduino: `// HC-SR04 on D9 (TRIG), D10 (ECHO) -> prints cm once per loop
const int TRIG = 9;
const int ECHO = 10;

// timeouts (us)
const unsigned long PULSE_TIMEOUT = 30000UL; // ~5 m @ 340 m/s round-trip

// simple smoothing
float cmSmooth = 50.0;
const float ALPHA = 0.25; // 0..1

void setup() {
  Serial.begin(9600);
  pinMode(TRIG, OUTPUT);
  pinMode(ECHO, INPUT);
  digitalWrite(TRIG, LOW);
}

float readCM() {
  // send 10 µs pulse
  digitalWrite(TRIG, LOW); delayMicroseconds(2);
  digitalWrite(TRIG, HIGH); delayMicroseconds(10);
  digitalWrite(TRIG, LOW);

  // read echo pulse
  unsigned long dur = pulseIn(ECHO, HIGH, PULSE_TIMEOUT);
  if (dur == 0) return -1; // timeout / out of range

  // convert to cm (sound speed: 343 m/s -> 29.1 µs/cm round trip, ~58 µs/cm for full trip)
  float cm = dur / 58.0; // typical formula
  return cm;
}

void loop() {
  float cm = readCM();
  if (cm < 0 || cm > 400) {
    // print 0 on invalid so p5 keeps running
    Serial.println(0);
  } else {
    // smooth a bit to calm jitter
    cmSmooth = cmSmooth + ALPHA * (cm - cmSmooth);
    Serial.println(cmSmooth, 1); // one number per line
  }
  delay(50); // ~20 Hz
}
`,
    p5: `const PAD = 40;             // keep visuals inside canvas
const PING_EVERY = 900;     // ms between pings
const TRAVEL_MS = 900;      // ms for ping to reach outer radius
const HIT_THICK = 7;        // how close the dot must be to "hit"
const MAX_CM = 400;         // HC-SR04 typical max
const DEAD_CM = 5;          // blind spot

let serial, latest = "0";
let cm = 50, cmSmooth = 50;

let pings = [];
let lastPing = 0;

function setup(){
  createCanvas(500,500);
  noFill();

  serial = new p5.SerialPort();
  serial.on('data', onData);
  serial.open('/dev/tty.usbmodemxxxxxx');
}

function onData(){
  const s = serial.readLine().trim();
  if (s) latest = s;
}

function draw(){
  background(255);

  // parse & smooth distance (expects one number per line, cm)
  const v = parseFloat(latest);
  if (!isNaN(v) && v >= 0) cm = v;
  cm = constrain(cm, DEAD_CM, MAX_CM);
  cmSmooth = lerp(cmSmooth, cm, 0.18);

  // geometry: quarter arc from bottom-left corner, shooting up-right (45°)
  const ox = PAD, oy = height - PAD;                 // arc origin (bottom-left)
  const outerR = min(width - PAD - ox, oy - PAD);    // max radius inside canvas

  // map cm to target radius
  const hitR = map(cmSmooth, DEAD_CM, MAX_CM, 0, outerR);

  // launch pings on a cadence
  const now = millis();
  if (now - lastPing > PING_EVERY){ pings.push({t0: now}); lastPing = now; }

  // draw thin “wall” arc at the measured distance
  stroke(0); strokeWeight(2);
  arc(ox, oy, hitR*2, hitR*2, -HALF_PI, 0);

  // direction unit vector along 45°
  const dirX = 1/Math.sqrt(2), dirY = -1/Math.sqrt(2);

  // draw pings
  for (let i = pings.length - 1; i >= 0; i--){
    const t = now - pings[i].t0;
    const u = t / TRAVEL_MS;           // 0..1
    if (u >= 1){ pings.splice(i,1); continue; }

    const r = u * outerR;
    const px = ox + dirX * r;
    const py = oy + dirY * r;

    const near = Math.abs(r - hitR) < HIT_THICK;

    // the dot
    noStroke(); fill(0);
    circle(px, py, near ? 14 : 8);

    // flash thicker arc on hit
    if (near){
      noFill(); stroke(0); strokeWeight(6);
      arc(ox, oy, r*2, r*2, -HALF_PI, 0);
    }
  }
}`,
    useCase: "Animate based on proximity, trigger changes in layout or type as someone approaches"
  },
  "TEMPERATURE SENSOR": {
    connect: "Battery mounted",
    arduino: `void setup() {
  Serial.begin(9600);
}

void loop() {
  int tempValue = analogRead(A0);  // From your Keyes sensor
  Serial.println(tempValue);
  delay(300);
}
`,
    p5: `let serial;
let tempValue = 0;
let smoothedTemp = 0;
let baseline = null;

function setup() {
  createCanvas(500, 500);
  serial = new p5.SerialPort();
  serial.open('/dev/tty.usbmodem142101'); // Replace with your actual port
  serial.on('data', serialEvent);

  textAlign(CENTER, CENTER);
  textFont('monospace');
}

function draw() {
  background(255);

  // Smooth noise
  smoothedTemp = lerp(smoothedTemp, tempValue, 0.1);

  // Calibrate baseline on first frame or with 'r' key
  if (baseline === null) {
    fill(0);
    textSize(16);
    text("Press 'r' to calibrate baseline", width / 2, 40);
    return;
  }

  // Compute change from baseline
  let delta = baseline - smoothedTemp;

  // Map to grayscale
  let gray = map(delta, 0, 10, 255, 0); // 10 units of warmth
  gray = constrain(gray, 0, 255);

  fill(gray);
  noStroke();
  ellipse(width / 2, height / 2, 200);

  // Display values
  fill(0);
  textSize(14);
  text("Raw: " + tempValue + 
       "  Smoothed: " + nf(smoothedTemp, 1, 1) +
       "  Change: " + nf(delta, 1, 1), width / 2, height - 30);
}

function serialEvent() {
  let raw = serial.readLine().trim();
  if (raw.length > 0 && !isNaN(raw)) {
    tempValue = int(raw);
  }
}
`,
    useCase: "Temperature changes affect warm/cool color palette, melt/stretch visual effects"
  },
  "PHOTORESISTOR": {
    model: "CDS",
    connect: "One leg to 5V,<br>other leg to A0<br>with 10kΩ to<br>GND",
    arduino: `const int PIN_TL = A0;
const int PIN_TR = A1;
const int PIN_BL = A2;
const int PIN_BR = A3;

float sTL=0, sTR=0, sBL=0, sBR=0;
const float ALPHA = 0.3;   // smoothing 0..1

void setup(){
  Serial.begin(9600);
}

void loop(){
  int rTL = analogRead(PIN_TL);
  int rTR = analogRead(PIN_TR);
  int rBL = analogRead(PIN_BL);
  int rBR = analogRead(PIN_BR);

  // simple EMA smoothing
  sTL += ALPHA * (rTL - sTL);
  sTR += ALPHA * (rTR - sTR);
  sBL += ALPHA * (rBL - sBL);
  sBR += ALPHA * (rBR - sBR);

  Serial.print((int)sTL); Serial.print(',');
  Serial.print((int)sTR); Serial.print(',');
  Serial.print((int)sBL); Serial.print(',');
  Serial.println((int)sBR);

  delay(30);
}
`,
    p5: `const SIZE = 100;          // your square size
const BRIGHT_CAP = 0.5;    // match your mouse version’s 0..0.5 max brightness

// ---- serial + mapping ----
let serial, latest = "0,0,0,0";
let tl=0, tr=0, bl=0, br=0;     // smoothed corner brightness (0..1)

// adjust after you see real numbers in Serial Monitor:
const RAW_MIN = 50, RAW_MAX = 900; // clamp & map raw 0..1023
const INVERT  = false;             // set true if more light => LOWER raw value
const SMOOTH  = 0.20;              // 0..1 (higher = snappier)

function setup(){
  createCanvas(500,500);
  pixelDensity(1);
  noStroke();

  serial = new p5.SerialPort();
  serial.on('data', onData);
  serial.open('/dev/tty.usbmodemxxxxxx');
}

function onData(){
  const s = serial.readLine().trim();
  if (s) latest = s;
}

function draw(){
  background(255);

  // parse "TL,TR,BL,BR"
  const p = latest.split(/[,\s]+/).map(Number);
  if (p.length >= 4) {
    let [a,b,c,d] = p;
    [a,b,c,d] = [a,b,c,d].map(mapRaw01);
    tl = lerp(tl, a, SMOOTH);
    tr = lerp(tr, b, SMOOTH);
    bl = lerp(bl, c, SMOOTH);
    br = lerp(br, d, SMOOTH);
  }

  // centered square
  const x0 = (width  - SIZE) >> 1;
  const y0 = (height - SIZE) >> 1;

  // cap brightness to match your 0..0.5 look
  drawGradientSquare(
    x0, y0, SIZE, SIZE,
    tl*BRIGHT_CAP, tr*BRIGHT_CAP, bl*BRIGHT_CAP, br*BRIGHT_CAP
  );
}

function mapRaw01(v){
  let m = (v - RAW_MIN) / (RAW_MAX - RAW_MIN);
  m = constrain(m, 0, 1);
  return INVERT ? (1 - m) : m;
}

// fast grayscale bilinear gradient into the square
function drawGradientSquare(x,y,w,h,tl,tr,bl,br){
  loadPixels();
  for (let j=0; j<h; j++){
    const v = j/(h-1);
    const L = tl*(1-v) + bl*v;
    const R = tr*(1-v) + br*v;
    for (let i=0; i<w; i++){
      const u = i/(w-1);
      const g = L*(1-u) + R*u;     // 0..1
      const c = (g*255) | 0;
      const idx = ((y+j)*width + (x+i)) * 4;
      pixels[idx] = pixels[idx+1] = pixels[idx+2] = c;
      pixels[idx+3] = 255;
    }
  }
  updatePixels();
}`,
    useCase: "Graphic brightness, gradient, texture recreation or layering"
  },
  "MICROPHONE SENSOR": {
    model: "KY-038",
    connect: "VCC_5V<br>GND_GND<br>OUT_A0",
    arduino: `// KY-038 mic on A0 -> stream "freq,amp" at ~30ms windows
// Works on 5V Arduino Uno/Nano

const int MIC_PIN = A0;

// Zero-cross parameters
const unsigned long WINDOW_MS = 30;  // analysis window
const int HYST = 6;                  // hysteresis around mid to avoid noise flaps

// Run-time mid (DC bias) tracker
float midEstimate = 512.0;

void setup() {
  Serial.begin(9600);
  analogReadResolution(10); // for boards that support it; ignored on Uno
}

void loop() {
  unsigned long t0 = millis();
  int vmin = 1023;
  int vmax = 0;

  int last = analogRead(MIC_PIN);
  int lastSide = 0; // -1 below, +1 above, 0 unknown
  unsigned int crossings = 0;

  // Use fixed mid during each window (copy of smoothed estimate)
  const int mid = (int)midEstimate;

  while (millis() - t0 < WINDOW_MS) {
    int v = analogRead(MIC_PIN);
    if (v < vmin) vmin = v;
    if (v > vmax) vmax = v;

    int side = (v > mid + HYST) ? +1 : (v < mid - HYST) ? -1 : lastSide; // hysteresis
    if (side != lastSide) {
      // count only transitions through the hysteresis band
      if (lastSide != 0) crossings++;
      lastSide = side;
    }
  }

  // Update mid estimate slowly toward current mid
  int midNow = (vmin + vmax) / 2;
  midEstimate = 0.95f * midEstimate + 0.05f * midNow;

  // Peak-to-peak amplitude
  int amp = vmax - vmin;
  if (amp < 0) amp = 0;

  // Each full cycle ~ two crossings
  float freq = (crossings / 2.0f) / (WINDOW_MS / 1000.0f);

  // Sanity clamp: ignore silly values (print 0)
  if (freq < 0 || freq > 4000) freq = 0;

  Serial.print(freq, 1);
  Serial.print(',');
  Serial.println(amp);
  // ~33 Hz update rate
}
`,
    p5: `let rects = [];
let currentRect = null;

let pitchTolerance = 50;  // same as before
let scrollSpeed = 2;

// ---- Serial data coming from Arduino as "freq,amp"
let serial, latest = "";
let pitchHz = 0, pitchSmooth = 0;  // Hz
let amp = 0;

// ---- Speech recognition (unchanged)
let recognition;
let currentTranscript = "";
let customFont;

function preload() {
  // customFont = loadFont("/your font directory");
}

function setup() {
  createCanvas(500, 500);
  if (customFont) textFont(customFont);

  // Serial setup
  serial = new p5.SerialPort();
  serial.on('data', onSerial);
  serial.open('/dev/tty.usbmodemxxxxxx');

  startSpeechRecognition();
}

function onSerial(){
  const s = serial.readLine().trim();
  if (!s) return;
  latest = s;
  // Expect "freq,amp" (e.g., "210.4,135")
  const parts = s.split(/[,\s]+/);
  const f = parseFloat(parts[0]);
  const a = parts.length > 1 ? parseFloat(parts[1]) : NaN;

  if (!isNaN(f) && f >= 40 && f <= 2000) pitchHz = f;  // keep plausible voice/instrument range
  if (!isNaN(a)) amp = a;
}

function draw() {
  background(255);

  // Smooth pitch to reduce flicker
  pitchSmooth = lerp(pitchSmooth, pitchHz, 0.15);

  const pitch = pitchSmooth; // use this instead of FFT centroid
  // Map pitch to Y similar to your old mapping
  const y = map(constrain(pitch, 100, 1000), 100, 1000, height - 50, 50);

  // Start or extend current rectangle
  if (pitch > 80 && pitch < 2000) {
    if (currentRect === null) {
      currentRect = { x: width, y, w: 40, h: 40, pitch, word: currentTranscript };
    } else {
      if (abs(pitch - currentRect.pitch) > pitchTolerance) {
        rects.push(currentRect);
        currentRect = { x: width, y, w: 40, h: 40, pitch, word: currentTranscript };
      } else {
        currentRect.w += scrollSpeed;
      }
    }
  }

  // Scroll & draw previous rectangles
  for (let i = rects.length - 1; i >= 0; i--) {
    rects[i].x -= scrollSpeed;
    fill(0);
    rect(rects[i].x, rects[i].y, rects[i].w, rects[i].h);
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(20);
    text(rects[i].word, rects[i].x + rects[i].w/2, rects[i].y + rects[i].h/2);
    if (rects[i].x + rects[i].w < 0) rects.splice(i, 1);
  }

  // Draw current growing rectangle
  if (currentRect) {
    currentRect.x -= scrollSpeed;
    fill(0);
    rect(currentRect.x, currentRect.y, currentRect.w, currentRect.h);
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(20);
    text(currentRect.word, currentRect.x + currentRect.w/2, currentRect.y + currentRect.h/2);
  }

  // HUD
  fill(0); textSize(14); textAlign(CENTER);
}

// ---- Speech-to-text (unchanged)
function startSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.continuous = true;
  recognition.interimResults = false;

  recognition.onresult = (event) => {
    const result = event.results[event.results.length - 1];
    currentTranscript = result[0].transcript.trim().toUpperCase();
  };
  recognition.onerror = (event) => { console.error("Speech error:", event.error); };
  recognition.start();
}`,
    useCase: "Create responsive waveforms, distort images or letters based on ambient sounds including people's talk or music."
  },
  "RGB LIGHT SENSOR": {
    connect: "VCC_3.3V<br>GND_GND<br>SDA_A4<br>SCL_A5",
    arduino: `int pirPin = 2;\nvoid setup() {\n  pinMode(pirPin, INPUT);\n  Serial.begin(9600);\n}\nvoid loop() {\n  int motion = digitalRead(pirPin);\n  Serial.println(motion);\n  delay(100);\n}`,
    p5: `let serial;\nlet hours = 0, minutes = 0, seconds = 0;\nlet lastSecond = -1;\nlet circleSize = 10;\nlet baseSize = 10;\nlet maxSize = 250;\nfunction setup() {\n  createCanvas(500, 500);\n  serial = new p5.SerialPort();\n  // Replace this with your actual port name from serialcontrol\n  serial.open('/dev/tty.usbmodemxxxxxz142401');\n  serial.on('data', serialEvent);\n  serial.on('error', err => print("Serial error:", err));\n  textFont('monospace');\n  textAlign(CENTER, CENTER);\n  angleMode(DEGREES);\n}\nfunction draw() {\n  background(255);\nlet grayscale = map(seconds % 10, 0, 9, 255, 0);\n fill(grayscale);\nnoStroke();\n  // Reset circle size at the start of each new second\n  if (seconds !== lastSecond) {\n    lastSecond = seconds;\n    circleSize = baseSize;\n  }\n  // Grow size from 10 to 250 within the current second\n  let t = (millis() % 1000) / 1000;\n  circleSize = lerp(baseSize, maxSize, t);\n  // Draw circle\n  ellipse(width / 2, height / 2, circleSize);\n  // Draw current time\n  fill(0);\ntextSize(20);\n  text(nf(hours, 2) + ":" + nf(minutes, 2) + ":" + nf(seconds, 2), width / 2, height - 40);\n}\nfunction serialEvent() {\n  let raw = serial.readLine().trim();\n  print("RAW DATA:", raw); // Diagnostic log\nif (raw.length > 0) {\n    let parts = split(raw, ":");\n    print("Parts:", parts); // Show parsed parts\n    if (parts.length === 3) {\n      hours = int(parts[0]);\n      minutes = int(parts[1]);\n      seconds = int(parts[2]);\n      print("✅ Parsed:", hours, minutes, seconds);\n    } else {\n      print("⚠️ Unexpected format:", raw);\n    }\n  }\n}\n`,
    useCase: "Background or type color shifts based on ambient light; simulate adaptation"
  },
  "RGB PROXIMITY SENSOR": {
    connect: "",
    arduino: `int pirPin = 2;\nvoid setup() {\n  pinMode(pirPin, INPUT);\n  Serial.begin(9600);\n}\nvoid loop() {\n  int motion = digitalRead(pirPin);\n  Serial.println(motion);\n  delay(100);\n}`,
    p5: `let serial;\nlet hours = 0, minutes = 0, seconds = 0;\nlet lastSecond = -1;\nlet circleSize = 10;\nlet baseSize = 10;\nlet maxSize = 250;\nfunction setup() {\n  createCanvas(500, 500);\n  serial = new p5.SerialPort();\n  // Replace this with your actual port name from serialcontrol\n  serial.open('/dev/tty.usbmodemxxxxxz142401');\n  serial.on('data', serialEvent);\n  serial.on('error', err => print("Serial error:", err));\n  textFont('monospace');\n  textAlign(CENTER, CENTER);\n  angleMode(DEGREES);\n}\nfunction draw() {\n  background(255);\nlet grayscale = map(seconds % 10, 0, 9, 255, 0);\n fill(grayscale);\nnoStroke();\n  // Reset circle size at the start of each new second\n  if (seconds !== lastSecond) {\n    lastSecond = seconds;\n    circleSize = baseSize;\n  }\n  // Grow size from 10 to 250 within the current second\n  let t = (millis() % 1000) / 1000;\n  circleSize = lerp(baseSize, maxSize, t);\n  // Draw circle\n  ellipse(width / 2, height / 2, circleSize);\n  // Draw current time\n  fill(0);\ntextSize(20);\n  text(nf(hours, 2) + ":" + nf(minutes, 2) + ":" + nf(seconds, 2), width / 2, height - 40);\n}\nfunction serialEvent() {\n  let raw = serial.readLine().trim();\n  print("RAW DATA:", raw); // Diagnostic log\nif (raw.length > 0) {\n    let parts = split(raw, ":");\n    print("Parts:", parts); // Show parsed parts\n    if (parts.length === 3) {\n      hours = int(parts[0]);\n      minutes = int(parts[1]);\n      seconds = int(parts[2]);\n      print("✅ Parsed:", hours, minutes, seconds);\n    } else {\n      print("⚠️ Unexpected format:", raw);\n    }\n  }\n}\n`,
    useCase: "Use gestures for navigation; proximity alters layout/intensity of visuals"
  },
    "TWO DISTANCE SENSORS": {
    model: "LDR",
    connect: "",
    arduino: `int pirPin = 2;\nvoid setup() {\n  pinMode(pirPin, INPUT);\n  Serial.begin(9600);\n}\nvoid loop() {\n  int motion = digitalRead(pirPin);\n  Serial.println(motion);\n  delay(100);\n}`,
    p5: `let serial;\nlet hours = 0, minutes = 0, seconds = 0;\nlet lastSecond = -1;\nlet circleSize = 10;\nlet baseSize = 10;\nlet maxSize = 250;\nfunction setup() {\n  createCanvas(500, 500);\n  serial = new p5.SerialPort();\n  // Replace this with your actual port name from serialcontrol\n  serial.open('/dev/tty.usbmodemxxxxxz142401');\n  serial.on('data', serialEvent);\n  serial.on('error', err => print("Serial error:", err));\n  textFont('monospace');\n  textAlign(CENTER, CENTER);\n  angleMode(DEGREES);\n}\nfunction draw() {\n  background(255);\nlet grayscale = map(seconds % 10, 0, 9, 255, 0);\n fill(grayscale);\nnoStroke();\n  // Reset circle size at the start of each new second\n  if (seconds !== lastSecond) {\n    lastSecond = seconds;\n    circleSize = baseSize;\n  }\n  // Grow size from 10 to 250 within the current second\n  let t = (millis() % 1000) / 1000;\n  circleSize = lerp(baseSize, maxSize, t);\n  // Draw circle\n  ellipse(width / 2, height / 2, circleSize);\n  // Draw current time\n  fill(0);\ntextSize(20);\n  text(nf(hours, 2) + ":" + nf(minutes, 2) + ":" + nf(seconds, 2), width / 2, height - 40);\n}\nfunction serialEvent() {\n  let raw = serial.readLine().trim();\n  print("RAW DATA:", raw); // Diagnostic log\nif (raw.length > 0) {\n    let parts = split(raw, ":");\n    print("Parts:", parts); // Show parsed parts\n    if (parts.length === 3) {\n      hours = int(parts[0]);\n      minutes = int(parts[1]);\n      seconds = int(parts[2]);\n      print("✅ Parsed:", hours, minutes, seconds);\n    } else {\n      print("⚠️ Unexpected format:", raw);\n    }\n  }\n}\n`,
    useCase: "Use gestures for navigation; proximity alters layout/intensity of visuals"
  },

}
// ====== KEEP sensorData ABOVE THIS LINE ======

document.addEventListener('DOMContentLoaded', () => {
  const thumbnails          = Array.from(document.querySelectorAll('.thumbnail'));
  const thumbnailsContainer = document.querySelector('.thumbnails');
  const infoSection         = document.querySelector('.info');  // visible when idle
  const detailSection       = document.querySelector('.detail');
  const detailTitle         = document.querySelector('.detail_title');
  const logo                = document.querySelector('.logo-img');
  const aboutLink           = document.querySelector('.about a');

  const COLS = 8;
  let selectedIndex = null;
  let demoOverlay   = null;
  let toggleState   = true; // true=DEMO gif, false=PROTOTYPE iframe

  function gridMetrics() {
    const cs = getComputedStyle(thumbnailsContainer);
    const gap = parseFloat(cs.gridColumnGap || cs.columnGap || '0') || 0;
    const contRect = thumbnailsContainer.getBoundingClientRect();
    const colW = (contRect.width - gap * (COLS - 1)) / COLS;
    return { gap, colW, contRect };
  }
  function currentColumn(el) {
    const { gap, colW, contRect } = gridMetrics();
    const elLeft = el.getBoundingClientRect().left - contRect.left;
    const col = Math.floor((elLeft + 0.5) / (colW + gap)) + 1; // 1..COLS
    return Math.max(1, Math.min(COLS, col));
  }
  function rowBoundsForIndex(index) {
    const start = Math.floor(index / COLS) * COLS;
    const end   = Math.min(start + COLS, thumbnails.length);
    return { start, end };
  }

  // Guarantee focused tile stays on its row; pack neighbors
  // 1) replace the whole function with this:
function relayoutRowForSelection(focusIdx, expandLeft) {
  const { start, end } = rowBoundsForIndex(focusIdx);
  const focusEl = thumbnails[focusIdx];
  const colNow  = currentColumn(focusEl);
  const rowStart = Math.floor(focusIdx / COLS) + 1; // lock everything to this row

  // 2-wide start col:
  //  - for cols 7/8, expand LEFT into (col-1, col), and reserve a 1-col GAP on the left.
  //  - otherwise expand RIGHT from current col.
  const startCol = expandLeft
    ? Math.max(2, Math.min(COLS - 1, colNow - 1)) // >=2 to allow a gap at (startCol-1)
    : Math.max(1, Math.min(COLS - 1, colNow));

  const gapCol = expandLeft ? (startCol - 1) : null; // leave this column empty if expanding left

  // Collect row items (DOM order = left→right)
  const rowItems = [];
  for (let i = start; i < end; i++) if (i !== focusIdx) rowItems.push(i);

  // Reset + pin everything in this row to the same row
  for (const i of rowItems) {
    const t = thumbnails[i];
    t.style.gridRow = `${rowStart} / span 1`;
    t.style.gridColumn = '';         // will set below
    t.style.justifySelf = 'stretch';
    t.style.zIndex = '1';
  }

  // Phase A: fill LEFT side up to the boundary (leaving gapCol empty if needed)
  let colPtr = 1;
  while (colPtr < startCol) {
    if (expandLeft && colPtr === gapCol) { colPtr++; continue; } // keep the 1-col gap
    if (!rowItems.length) break;
    const idx = rowItems.shift();
    const t = thumbnails[idx];
    t.style.gridColumn = `${colPtr} / span 1`;
    t.style.gridRow = `${rowStart} / span 1`;
    colPtr++;
  }

  // Phase B: place the focused tile (always 2-wide on this row)
  focusEl.style.gridRow    = `${rowStart} / span 2`;
  focusEl.style.gridColumn = `${startCol} / span 2`;
  focusEl.style.justifySelf = expandLeft ? 'end' : 'start';
  focusEl.style.zIndex = '10';

  // Phase C: place remaining items on the RIGHT side of the focused tile
  colPtr = startCol + 1;
  while (rowItems.length && colPtr <= COLS) {
    const idx = rowItems.shift();
    const t = thumbnails[idx];
    t.style.gridColumn = `${colPtr} / span 1`;
    t.style.gridRow    = `${rowStart} / span 1`;
    colPtr++;
  }

  // Any leftovers from this row (if colPtr > COLS) will naturally go to the next row,
  // but the focus + gap + left/right are now locked on the correct row.
}

  function removeAllIframes() {
    document.querySelectorAll('.inline-replace-iframe').forEach(iframe => iframe.remove());
    thumbnails.forEach(t => {
      delete t.dataset.iframeInjected;
      delete t.dataset.iframeId;
    });
  }
  function clearDetail() {
    if (detailTitle) { detailTitle.innerHTML = ''; detailTitle.style.display = 'none'; }
    if (detailSection) {
      detailSection.innerHTML = '';
      detailSection.style.opacity = '0';
      detailSection.style.pointerEvents = 'none';
      detailSection.style.display = 'none';
    }
  }
  function renderDetail(name) {
    if (!detailSection || !detailTitle) return;
    const data = sensorData[name] || {};
    const sanitizedName = name.toLowerCase().replace(/\s+/g, '_');

    detailTitle.innerHTML = `<div class="sensor-name">${name}</div>`;
    detailTitle.style.display = 'block';

    const sensorImageHTML = `
      <div class="sensor_image" style="background:#ffffff; height:200px; grid-column: span 1;">
        <img id="sensor-image" src="assets/si_${sanitizedName}.png" alt="${sanitizedName}" style="height:100%; width:90%; object-fit:contain;">
      </div>
    `;
    detailSection.innerHTML = `
      ${sensorImageHTML}
      <div class="detail-block" style="grid-column: span 1;">
        <div class="block-title">MODEL</div>
        <div class="model">${data.model || ''}</div>
        <br>
        <div class="block-title">CONNECT</div>
        <div class="connect">${data.connect || ''}</div>
      </div>
      <div class="detail-block" style="grid-column: span 2;">
        <div class="block-title">ARDUINO IDE</div>
        <div class="arduino-code">
          <textarea class="arduino-editor">${data.arduino || ''}</textarea>
        </div>
      </div>
      <div class="detail-block" style="grid-column: span 2;">
        <div class="block-title">P5.JS</div>
        <div class="p5-code">
          <textarea class="p5-editor">${data.p5 || ''}</textarea>
        </div>
      </div>
      <div class="detail-block" style="grid-column: span 2;">
        <div class="block-title">GRAPHIC TRANSLATION</div>
        <div class="sensor-use-case">${data.useCase || ''}</div>
      </div>
    `;
    const sensorImage = document.getElementById('sensor-image');
    if (sensorImage) sensorImage.onerror = () => { sensorImage.src = 'assets/si_placeholder.png'; };

    detailSection.style.display = 'grid';
    detailSection.style.opacity = '1';
    detailSection.style.pointerEvents = 'auto';
  }
  function deselectAll() {
    removeAllIframes();
    if (demoOverlay) demoOverlay.remove();
    clearDetail();

    thumbnailsContainer.classList.remove('has-selection');
    thumbnails.forEach(t => {
      t.classList.remove('active');
      t.style.opacity     = '1';
      t.style.gridColumn  = '';
      t.style.gridRow     = '';
      t.style.justifySelf = 'stretch';
      t.style.zIndex      = '1';
    });

    // show idle .info when nothing hovered/selected
    if (infoSection) infoSection.style.display = 'block';

    selectedIndex = null;
  }

  // ----- Hover: ONLY show detail; hide .info while hovering -----
  thumbnails.forEach((thumbnail) => {
    thumbnail.addEventListener('mouseenter', () => {
      if (selectedIndex !== null) return;
      const name = thumbnail.dataset.sensorName;
      if (!name) return;
      if (infoSection) infoSection.style.display = 'none';
      renderDetail(name);
    });
    thumbnail.addEventListener('mouseleave', () => {
      if (selectedIndex !== null) return;
      clearDetail();
      if (infoSection) infoSection.style.display = 'block';
    });
  });

  // ----- Click: enlarge + detail; overlay one column away -----
  thumbnails.forEach((thumbnail, index) => {
    thumbnail.addEventListener('click', () => {
      if (selectedIndex !== null) {
        if (selectedIndex === index) { deselectAll(); return; }
        deselectAll(); return;
      }

      selectedIndex = index;
      thumbnailsContainer.classList.add('has-selection');

      if (infoSection) infoSection.style.display = 'none';

      // dim others
      thumbnails.forEach(t => {
        t.classList.remove('active');
        t.style.opacity = '0.1';
        t.style.gridColumn = '';
        t.style.gridRow = '';
        t.style.justifySelf = 'stretch';
        t.style.zIndex = '1';
      });

      const name = thumbnail.dataset.sensorName;
      const sanitizedName = name.toLowerCase().replace(/\s+/g, '_');

      // enlarge selected
      const col = currentColumn(thumbnail);
      const expandLeft = (col >= 7);
      thumbnail.classList.add('active');
      thumbnail.style.opacity = '1';
      relayoutRowForSelection(index, expandLeft);

      renderDetail(name);

      // ---- DEMO/PROTOTYPE overlay: ONE column away ----
      if (demoOverlay) demoOverlay.remove();
      demoOverlay = document.createElement('div');
      demoOverlay.className = 'demo-toggle-wrapper';
      demoOverlay.style.position = 'absolute';
      demoOverlay.style.zIndex = '101';
      demoOverlay.style.display = 'flex';
      demoOverlay.style.flexDirection = 'column';

      const { gap, colW } = gridMetrics();
      const oneColOffset = gap;                 // ← exactly ONE column away
      const r = thumbnail.getBoundingClientRect();
      const overlayWidth = colW;
      const baseTop  = window.scrollY + r.top;
      const baseLeft = window.scrollX + r.left;

      const placeLeft = expandLeft;                    // left for cols 7/8
      demoOverlay.style.top  = baseTop + 'px';
      demoOverlay.style.left = placeLeft
        ? (baseLeft - overlayWidth - oneColOffset) + 'px'
        : (baseLeft + r.width + oneColOffset) + 'px';
      demoOverlay.style.width = overlayWidth + 'px';

      const paddedWrapper = document.createElement('div');
      paddedWrapper.style.padding = '5px 0 0 5px';
      paddedWrapper.style.display = 'flex';
      paddedWrapper.style.flexDirection = 'column';
      paddedWrapper.style.gap = '5px';

      const labelWrapper = document.createElement('div');
      labelWrapper.style.display = 'flex';
      labelWrapper.style.justifyContent = 'space-between';
      labelWrapper.style.alignItems = 'center';
      labelWrapper.style.width = colW;

      const labelText = document.createElement('span');
      labelText.className = 'toggle-label-text';
      labelText.textContent = 'DEMO/PROTOTYPE';

      const toggleWrapper = document.createElement('label');
      toggleWrapper.className = 'switch';
      const toggle = document.createElement('input');
      toggle.type = 'checkbox';
      toggle.checked = toggleState;
      const slider = document.createElement('span');
      slider.className = 'slider';
      toggleWrapper.appendChild(toggle);
      toggleWrapper.appendChild(slider);

      labelWrapper.appendChild(labelText);
      labelWrapper.appendChild(toggleWrapper);

      const gif = document.createElement('img');
      gif.src = `assets/demo_${sanitizedName}.gif`;
      gif.alt = '';
      gif.style.width = '215px';
      gif.style.height = '215px';
      gif.style.objectFit = 'cover';
      gif.style.display = toggleState ? 'block' : 'none';

      thumbnails[index].dataset.hasDemo = '1';
      gif.addEventListener('error', () => {
        thumbnails[index].dataset.hasDemo = '0';
        gif.removeAttribute('src');
        gif.remove();
      });

      const stack = document.createElement('div');
      stack.style.display = 'flex';
      stack.style.flexDirection = 'column';
      stack.style.gap = '6px';
      stack.appendChild(labelWrapper);
      stack.appendChild(gif);
      
      paddedWrapper.appendChild(stack);
      demoOverlay.appendChild(paddedWrapper);
      document.body.appendChild(demoOverlay);

      // keep selection when using overlay
      [demoOverlay, paddedWrapper, labelWrapper, toggleWrapper, toggle, slider, gif].forEach(el => {
        if (!el) return;
        el.addEventListener('pointerdown', e => e.stopPropagation());
        el.addEventListener('click',       e => e.stopPropagation());
      });

      // start in PROTOTYPE? inject iframe
      if (!toggleState) {
        requestAnimationFrame(() => {
          setTimeout(() => {
            const r2 = thumbnail.getBoundingClientRect();
            const iframe = document.createElement('iframe');
            iframe.setAttribute('sandbox', 'allow-scripts');
            iframe.src = `sketches/sketch_${sanitizedName}.html`;
            iframe.style.position = 'absolute';
            iframe.style.top = window.scrollY + r2.top + 'px';
            iframe.style.left = window.scrollX + r2.left + 'px';
            iframe.style.width = r2.width + 'px';
            iframe.style.height = r2.height + 'px';
            iframe.style.zIndex = '100';
            iframe.style.border = 'none';
            iframe.style.pointerEvents = 'auto';
            iframe.className = 'inline-replace-iframe';
            document.body.appendChild(iframe);
            thumbnails[index].dataset.iframeInjected = 'true';
            const ifid = `iframe-${index}`;
            thumbnails[index].dataset.iframeId = ifid;
            iframe.id = ifid;
          }, 0);
        });
      }

      toggle.addEventListener('change', (e) => {
        e.stopPropagation();
        toggleState = toggle.checked;

        const hasDemo = thumbnails[index].dataset.hasDemo !== '0';
        if (toggleState && !hasDemo) {
          e.preventDefault();
          toggle.checked = false;
          toggleState = false;
          return;
        }

        const prevIframeId = thumbnails[index].dataset.iframeId;
        if (toggleState) {
          if (prevIframeId) {
            const oldIframe = document.getElementById(prevIframeId);
            if (oldIframe) oldIframe.remove();
            delete thumbnails[index].dataset.iframeInjected;
            delete thumbnails[index].dataset.iframeId;
          }
          if (gif && hasDemo) gif.style.display = 'block';
        } else {
          if (gif) gif.style.display = 'none';
          if (!thumbnails[index].dataset.iframeInjected) {
            requestAnimationFrame(() => {
              setTimeout(() => {
                const r3 = thumbnail.getBoundingClientRect();
                const iframe = document.createElement('iframe');
                iframe.setAttribute('sandbox', 'allow-scripts');
                iframe.src = `sketches/sketch_${sanitizedName}.html`;
                iframe.style.position = 'absolute';
                iframe.style.top = window.scrollY + r3.top + 'px';
                iframe.style.left = window.scrollX + r3.left + 'px';
                iframe.style.width = r3.width + 'px';
                iframe.style.height = r3.height + 'px';
                iframe.style.zIndex = '100';
                iframe.style.border = 'none';
                iframe.style.pointerEvents = 'auto';
                iframe.className = 'inline-replace-iframe';
                document.body.appendChild(iframe);
                thumbnails[index].dataset.iframeInjected = 'true';
                const ifid = `iframe-${index}`;
                thumbnails[index].dataset.iframeId = ifid;
                iframe.id = ifid;
              }, 0);
            });
          }
        }
      });
    });
  });

  // Click anywhere else to clear selection & show .info again
  document.addEventListener('click', (e) => {
    if (selectedIndex === null) return;
    if (e.target.closest('.thumbnail')) return;
    if (e.target.closest('.demo-toggle-wrapper')) return;
    deselectAll();
  });

  // Optional: Logo/About
  if (logo) logo.addEventListener('click', (e) => { e.preventDefault(); deselectAll(); });
  if (aboutLink) {
    aboutLink.addEventListener('click', (e) => {
      e.preventDefault();
      deselectAll();
      if (infoSection) infoSection.style.display = 'block';
      thumbnailsContainer.style.display = 'none';
    });
  }
});
