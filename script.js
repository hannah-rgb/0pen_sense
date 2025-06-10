// Define sensor-specific data
const sensorData = {
  "DISTANCE SENSOR": {
    connect: "VCC 5V<br>GND GND<br>SDA A4<br>SCL A5",
    arduino: `#include <Wire.h>\n#include <Adafruit_VL53L0X.h>\nAdafruit_VL53L0X lox = Adafruit_VL53L0X();\n\nvoid setup() {\n  Serial.begin(9600);\n  Wire.begin();\n  if (!lox.begin()) {\n    Serial.println(\"Sensor not found\");\n    while (1);\n  }\n}\nvoid loop() {\n  VL53L0X_RangingMeasurementData_t measure;\n  lox.rangingTest(&measure, false);\n  if (measure.RangeStatus != 4) {\n    Serial.println(measure.RangeMilliMeter);\n  } else {\n    Serial.println(\"0\");\n  }\n  delay(50);\n}`,
    p5: `let serial;\nlet latestData = \"waiting for data\";\nfunction setup() {\n  createCanvas(500, 500);\n  serial = new p5.SerialPort();\n  serial.on('data', gotData);\n  serial.open('/dev/tty.usbmodem142401');\n}\nfunction gotData() {\n  let currentString = serial.readLine().trim();\n  if (currentString.length > 0) {\n    latestData = currentString;\n  }\n}\nfunction draw() {\n  background(255);\n  let d = int(latestData);\n  d = constrain(d, 50, 500);\n  let size = map(d, 50, 500, 500, 50);\n  fill(0);\n  ellipse(width / 2, height / 2, size, size);\n  fill(0);\n  textSize(16);\n  text(\"Distance: \" + latestData + \" mm\", 20, height - 20);\n}`,
    useCase: "DISTANCE SENSOR is used to detect basic distance measurements. <br> \u2022 You can RESIZE, REARRANGE OR ANIMATES graphic of posters(color, typography, image) based on the distance to engage passersby and encourage closer interaction, surprise, or narrative.<br> \u2022 With multiple distance sensors, you can measure presence density of crowd, turning environmental data into ambient visual communication or data visualization"
  },
  "PIR MOTION SENSOR": {
    connect: "VCC 5V<br>GND GND<br>OUT D2 \n (Digital Pin 2)",
    arduino: `int pirPin = 2;\nvoid setup() {\n  pinMode(pirPin, INPUT);\n  Serial.begin(9600);\n}\nvoid loop() {\n  int motion = digitalRead(pirPin);\n  Serial.println(motion);\n  delay(100);\n}`,
    p5: `let latestData = \"waiting for data\";\nlet serial;\nfunction setup() {\n  createCanvas(500, 500);\n  serial = new p5.SerialPort();\n  serial.list();\n  serial.open('/dev/tty.usbmodem142401');\n  serial.on('data', () => {\n    let data = serial.readLine().trim();\n    if (data.length > 0) {\n      latestData = data;\n    }\n  });\n}\nfunction draw() {\n  background(255);\n  if (latestData === \"1\") {\n    fill(0);\n  } else {\n    fill(255);\n  }\n  rect(150, 150, 125, 125);\n  fill(0);\n  textSize(20);\n  text(\"Motion: \" + latestData, 20, height - 20);\n}`,
    useCase: "PIR MOTION SENSOR is used to detect motion through infrared changes."
  },
  "ACCELEROMETER" :{
    connect: "VCC 3.3V<br>GND GND<br>SDA A4<br>SCL A5",
    arduino: `#include <Wire.h>
\nconst byte MMA8452Q_ADDR = 0x1C;
\nvoid setup() {\n  Serial.begin(9600);\n  Wire.begin();
\n  Wire.beginTransmission(MMA8452Q_ADDR);\n  Wire.write(0x2A);\n  Wire.write(0x01);\n  Wire.endTransmission();\n  delay(100);\n}\nvoid loop() {\n  int16_t ax, ay, az;\n  Wire.beginTransmission(MMA8452Q_ADDR);\n  Wire.write(0x01);\n  Wire.endTransmission(false);\n  Wire.requestFrom(MMA8452Q_ADDR, 6);\n  if (Wire.available() == 6) {\n    ax = (Wire.read() << 8) | Wire.read();\n    ay = (Wire.read() << 8) | Wire.read();\n    az = (Wire.read() << 8) | Wire.read();\n    ax >>= 2;\n    ay >>= 2;\n    az >>= 2;\nSerial.print(ax); Serial.print(","); \nSerial.print(ay); Serial.print(","); \nSerial.println(az);\n  }\n  delay(100);\n}\n`,
    p5: `let serial;\nlet latestData = "waiting...";\nlet x = 0, y = 0, z = 0;\nlet smoothedX = 0, smoothedY = 0, smoothedZ = 0;\nlet smoothing = 0.1;\nfunction setup() {\n createCanvas(500, 500, WEBGL);\n  serial = new p5.SerialPort();\n  serial.open('/dev/tty.usbmodem142401');\n  serial.on('data', serialEvent);\n}
\nfunction draw() {\n  background(255);\n  smoothedX = lerp(smoothedX, x, smoothing);\n  smoothedY = lerp(smoothedY, y, smoothing);\n  smoothedZ = lerp(smoothedZ, z, smoothing);\n  ambientLight(0);\n  rotateX(radians(map(smoothedY, -1024, 1024, -180, 180)));\n  rotateY(radians(map(smoothedX, -1024, 1024, -180, 180)));\n  rotateZ(radians(map(smoothedZ, -1024, 1024, -180, 180)));\n  box(150);
\n  resetMatrix();\n  camera();\n  noLights();\n  fill(0);\n  textSize(16);\n  textAlign(LEFT, BOTTOM);\n  text("Distance: " + latestData + " mm", -width / 2 + 20, height / 2 - 20);\n}\nfunction serialEvent() {\n  let data = serial.readLine().trim();\n  if (data.length > 0) {\n    let values = split(data, ',');\n    if (values.length === 3) {\n      x = int(values[0]);\n      y = int(values[1]);\n      z = int(values[2]);\n    }\n  }\n}`,
    useCase: "ACCELEROMETER is used to detect the x, y, z cordinates of the object."
},
  "SOUND SENSOR": {
    connect: "00 D2 <br>G GND<br>A0 A0<br>+ 5V<br>",
    arduino: `void setup() {\n  Serial.begin(9600);\n}\nvoid loop() {\n  int sound = analogRead(A0);\n  Serial.println(sound);\n  delay(200);\n}\n`,
    p5: `let serial;\nlet soundLevel = 0;\nlet circles = [];\nlet clapDetected = false;\n\nfunction setup() {\n  createCanvas(500, 500);\n  ellipseMode(RADIUS);\n\n  serial = new p5.SerialPort();\n  serial.open('/dev/tty.usbmodem142401'); // Replace with your port\n  serial.on('data', serialEvent);\n  circles.push({ x: width / 2, y: height / 2, r: 200 });\n}\n\nfunction draw() {\n  background(255);\n  fill(0);\n  noStroke();\n\n  for (let c of circles) {\n    ellipse(c.x, c.y, c.r, c.r);\n  }\n\\n  if (!clapDetected && soundLevel >= 502) {\n    splitCircles(); // Only once per peak\n    clapDetected = true;\n  }\n\n\n  if (soundLevel <= 501) {\n    clapDetected = false;\n  }\n}\n\nfunction serialEvent() {\n  let raw = serial.readLine().trim();\n  if (raw.length > 0) {\n    soundLevel = int(raw);\n    print("Sound Level:", soundLevel);\n  }\n}\n\nfunction splitCircles() {\n    let newCircles = [];\n  \n    for (let c of circles) {\n      let r = c.r / 2;\n      if (r > 2) {
        newCircles.push({ x: c.x - r, y: c.y, r: r });\n        newCircles.push({ x: c.x + r, y: c.y, r: r });\n      }\n    }\n  \n    if (newCircles.length === 0) {\n      circles = [{ x: width / 2, y: height / 2, r: 50 }];\n    } else {\n      circles = newCircles;\n    }\n  }`,
    useCase: "SOUND SENSOR can receive 0 and 1 data of sound."
  },
    "CLOCK SENSOR": {
    connect: "Battery mounted",
    arduino: `int pirPin = 2;\nvoid setup() {\n  pinMode(pirPin, INPUT);\n  Serial.begin(9600);\n}\nvoid loop() {\n  int motion = digitalRead(pirPin);\n  Serial.println(motion);\n  delay(100);\n}`,
    p5: `let serial;
let hours = 0, minutes = 0, seconds = 0;
let lastSecond = -1;
let circleSize = 10;
let baseSize = 10;
let maxSize = 250;

function setup() {
  createCanvas(500, 500);
  serial = new p5.SerialPort();

  // Replace this with your actual port name from serialcontrol
  serial.open('/dev/tty.usbmodem142401');

  serial.on('data', serialEvent);
  serial.on('error', err => print("Serial error:", err));

  textFont('monospace');
  textAlign(CENTER, CENTER);
  angleMode(DEGREES);
}

function draw() {
  background(255);
let grayscale = map(seconds % 10, 0, 9, 255, 0);


  fill(grayscale);
  noStroke();

  // Reset circle size at the start of each new second
  if (seconds !== lastSecond) {
    lastSecond = seconds;
    circleSize = baseSize;
  }

  // Grow size from 10 to 250 within the current second
  let t = (millis() % 1000) / 1000;
  circleSize = lerp(baseSize, maxSize, t);

  // Draw circle
  ellipse(width / 2, height / 2, circleSize);

  // Draw current time
  fill(0);
  textSize(20);
  text(nf(hours, 2) + ":" + nf(minutes, 2) + ":" + nf(seconds, 2), width / 2, height - 40);
}

function serialEvent() {
  let raw = serial.readLine().trim();
  print("RAW DATA:", raw); // Diagnostic log

  if (raw.length > 0) {
    let parts = split(raw, ":");
    print("Parts:", parts); // Show parsed parts
    if (parts.length === 3) {
      hours = int(parts[0]);
      minutes = int(parts[1]);
      seconds = int(parts[2]);
      print("✅ Parsed:", hours, minutes, seconds);
    } else {
      print("⚠️ Unexpected format:", raw);
    }
  }
}

`,
    useCase: "CLOCK SENSOR calculates time by miliseconds."
  },

}

// Full DOM Interaction Logic
// ==========================
document.addEventListener('DOMContentLoaded', () => {
  const thumbnails = document.querySelectorAll('.thumbnail');
  const infoSection = document.querySelector('.info');
  const infoText = infoSection.querySelector('a');
  const detailSection = document.querySelector('.detail');
  const detailTitle = document.querySelector('.detail_title');
  const stylehr = document.getElementById('header-divider');
  const logo = document.querySelector('.logo-img');
  const aboutLink = document.querySelector('.about a');
  const thumbnailsContainer = document.querySelector('.thumbnails');
  const defaultText = infoText.textContent;

  let demoOverlay = null;
  let toggleState = true;

  function removeAllIframes() {
    document.querySelectorAll('.inline-replace-iframe').forEach(iframe => iframe.remove());
    thumbnails.forEach(t => {
      delete t.dataset.iframeInjected;
      delete t.dataset.iframeId;
    });
  }

  thumbnails.forEach((thumbnail, index) => {
    thumbnail.addEventListener('mouseenter', () => {
      if (infoSection.style.display !== 'none') {
        infoText.textContent = thumbnail.dataset.sensorName;
      }
      if (!thumbnail.classList.contains('active')) {
        thumbnail.style.zIndex = '10';
        thumbnail.style.gridColumn = 'span 2';
        thumbnail.style.gridRow = 'span 2';
        const sensorName = thumbnail.dataset.sensorName;
        thumbnail.style.transformOrigin = (sensorName === 'Sensor 8' || sensorName === 'Sensor 16') ? 'top right' : 'top left';
      }
    });

    thumbnail.addEventListener('mouseleave', () => {
      if (infoSection.style.display !== 'none') {
        infoText.textContent = defaultText;
      }
      if (!thumbnail.classList.contains('active')) {
        thumbnail.style.zIndex = '1';
        thumbnail.style.gridColumn = 'span 1';
        thumbnail.style.gridRow = 'span 1';
        thumbnail.style.transformOrigin = '';
        thumbnail.style.justifySelf = 'stretch';
      }
    });

    thumbnail.addEventListener('click', () => {
      removeAllIframes();
      const name = thumbnail.dataset.sensorName;
      const data = sensorData[name];
      const sanitizedName = name.toLowerCase().replace(/\s+/g, '_');
      const imageSrc = `assets/si_${sanitizedName}.gif`;

      infoSection.style.display = 'none';
      thumbnailsContainer.style.display = 'grid';

      thumbnails.forEach(t => {
        t.classList.remove('active');
        t.style.opacity = '0.1';
        t.style.gridColumn = 'span 1';
        t.style.gridRow = 'span 1';
        t.style.justifySelf = 'stretch';
        t.style.zIndex = '1';
        t.style.transformOrigin = '';
      });

      thumbnail.classList.add('active');
      thumbnail.style.opacity = '1';
      const columnIndex = (index + 1) % 8;
      thumbnail.style.gridColumn = 'span 2';
      thumbnail.style.gridRow = 'span 2';
      thumbnail.style.justifySelf = (columnIndex === 0 || columnIndex === 7) ? 'end' : 'start';

      if (demoOverlay) demoOverlay.remove();

      demoOverlay = document.createElement('div');
      demoOverlay.className = 'demo-toggle-wrapper';
      demoOverlay.style.position = 'absolute';
      demoOverlay.style.top = thumbnail.offsetTop + 'px';
      demoOverlay.style.left = (thumbnail.offsetLeft + thumbnail.offsetWidth) + 'px';
      demoOverlay.style.width = '161.25px';
      demoOverlay.style.zIndex = '101';
      demoOverlay.style.display = 'flex';
      demoOverlay.style.flexDirection = 'column';

      const paddedWrapper = document.createElement('div');
      paddedWrapper.style.padding = '5px 0 0 5px';
      paddedWrapper.style.display = 'flex';
      paddedWrapper.style.flexDirection = 'column';
      paddedWrapper.style.gap = '5px';

      const labelWrapper = document.createElement('div');
      labelWrapper.style.display = 'flex';
      labelWrapper.style.justifyContent = 'space-between';
      labelWrapper.style.alignItems = 'center';
      labelWrapper.style.width = '161.25px';

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
      gif.alt = `Demonstration for ${name}`;
      gif.style.width = '215px';
      gif.style.height = '215px';
      gif.style.objectFit = 'cover';
      gif.style.display = toggleState ? 'block' : 'none';
      gif.onerror = () => { gif.src = 'assets/demo_placeholder.gif'; };

      paddedWrapper.appendChild(labelWrapper);
      paddedWrapper.appendChild(gif);
      demoOverlay.appendChild(paddedWrapper);
      document.body.appendChild(demoOverlay);

      if (!toggleState) {
        requestAnimationFrame(() => {
          setTimeout(() => {
            const rect = thumbnail.getBoundingClientRect();
            const iframe = document.createElement('iframe');
            iframe.setAttribute('sandbox', 'allow-scripts');
            iframe.src = `sketches/sketch_${sanitizedName}.html`;
            iframe.style.position = 'absolute';
            iframe.style.top = window.scrollY + rect.top + 'px';
            iframe.style.left = window.scrollX + rect.left + 'px';
            iframe.style.width = rect.width + 'px';
            iframe.style.height = rect.height + 'px';
            iframe.style.zIndex = '100';
            iframe.style.border = 'none';
            iframe.style.pointerEvents = 'auto';
            iframe.className = 'inline-replace-iframe';
            document.body.appendChild(iframe);
            thumbnail.dataset.iframeInjected = 'true';
            thumbnail.dataset.iframeId = `iframe-${index}`;
            iframe.id = `iframe-${index}`;
          }, 0);
        });
      }

      toggle.addEventListener('change', () => {
        toggleState = toggle.checked;
        const prevIframeId = thumbnail.dataset.iframeId;
        if (prevIframeId) {
          const oldIframe = document.getElementById(prevIframeId);
          if (oldIframe) oldIframe.remove();
          delete thumbnail.dataset.iframeInjected;
          delete thumbnail.dataset.iframeId;
        }
        demoOverlay.remove();
        thumbnail.click();
      });

      detailTitle.innerHTML = `<div class="sensor-name">${name}</div>`;
      detailTitle.style.display = 'block';

      const sensorImageHTML = `
        <div class="sensor_image" style="background:#ffffff; height: 200px; grid-column: span 1;">
          <img id="sensor-image" src="assets/si_${sanitizedName}.png" alt="${sanitizedName}" style="height: 100%; width: 90%; object-fit: contain;">
        </div>
      `;

      detailSection.innerHTML = `
        ${sensorImageHTML}
        <div class="detail-block" style="grid-column: span 1;">
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
      sensorImage.onerror = () => {
        sensorImage.src = 'assets/si_placeholder.png';
      };

      detailSection.style.display = 'grid';
      detailSection.style.opacity = '1';
      detailSection.style.pointerEvents = 'auto';
    });
  });

  logo.addEventListener('click', () => {
    removeAllIframes();
    infoSection.style.display = 'block';
    infoText.textContent = defaultText;
    detailTitle.innerHTML = '';
    detailTitle.style.display = 'none';
    detailSection.innerHTML = '';
    detailSection.style.opacity = '0';
    detailSection.style.pointerEvents = 'none';
    if (demoOverlay) demoOverlay.remove();

    thumbnailsContainer.style.display = 'grid';
    thumbnails.forEach(t => {
      t.classList.remove('active');
      t.style.opacity = '1';
      t.style.gridColumn = 'span 1';
      t.style.gridRow = 'span 1';
      t.style.justifySelf = 'stretch';
      t.style.zIndex = '1';
      t.style.transformOrigin = '';
    });
  });

  aboutLink.addEventListener('click', (e) => {
    e.preventDefault();
    removeAllIframes();
    infoSection.style.display = 'block';
    infoText.innerHTML = `This research repositions the urban poster as a responsive interface...`;
    stylehr.style.display = 'none';
    detailTitle.innerHTML = '';
    detailTitle.style.display = 'none';
    detailSection.innerHTML = '';
    detailSection.style.display = 'none';
    if (demoOverlay) demoOverlay.remove();
    thumbnailsContainer.style.display = 'none';
  });
});
