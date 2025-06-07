// Define sensor-specific data
const sensorData = {
    "SENSOR 1": {
        connect: "VCC 5V<br>GND GND<br>SDA A4<br>SCL A5",
        arduino: `// Arduino code for Sensor 1\n#include <Wire.h>\nvoid setup() { Serial.begin(9600); }\nvoid loop() { Serial.println(1); delay(100); }`,
        p5: `function setup() { createCanvas(400, 200); background('red'); } function draw() { }`,
        useCase: "Sensor 1 is used to detect basic distance measurements.",
    },
    "SENSOR 2": {
        arduino: `// Arduino code for Sensor 2\nvoid setup() { pinMode(LED_BUILTIN, OUTPUT); }\nvoid loop() { digitalWrite(LED_BUILTIN, HIGH); delay(500); digitalWrite(LED_BUILTIN, LOW); delay(500); }`,
        p5: `function setup() { createCanvas(400, 200); background('blue'); } function draw() { }`,
        useCase: "Sensor 2 is used for ambient light detection.",
    },
};

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
                if (sensorName === 'Sensor 8' || sensorName === 'Sensor 16') {
                    thumbnail.style.transformOrigin = 'top right';
                    thumbnail.style.justifySelf = 'end';
                } else {
                    thumbnail.style.transformOrigin = 'top left';
                }
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
            demoOverlay.style.width = '120px';
            demoOverlay.style.zIndex = '101';
            demoOverlay.style.display = 'flex';
            demoOverlay.style.flexDirection = 'column';

            const paddedWrapper = document.createElement('div');
            paddedWrapper.style.paddingLeft = '5px';
            paddedWrapper.style.paddingRight = '0px';
            paddedWrapper.style.paddingTop = '0px';
            paddedWrapper.style.display = 'flex';
            paddedWrapper.style.flexDirection = 'column';
            paddedWrapper.style.gap = '5px';

            const labelWrapper = document.createElement('div');
            labelWrapper.style.display = 'flex';
            labelWrapper.style.justifyContent = 'space-between';
            labelWrapper.style.alignItems = 'center';
            labelWrapper.style.width = '120px';

            const labelText = document.createElement('span');
            labelText.className = 'toggle-label-text';
            labelText.textContent = 'DEMO/PROTOTYPE       ';

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
            gif.src = `assets/demonstration${index + 1}.gif`;
            gif.alt = `Demonstration for ${name}`;
            gif.style.width = '120px';
            gif.style.height = '120px';
            gif.style.objectFit = 'cover';
            gif.style.display = toggleState ? 'block' : 'none';

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
                        iframe.src = `sketches/sketch${index + 1}.html`;
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

            detailSection.innerHTML = `
                <div class="sensor_image" style="background:#fff000; height: 200px; grid-column: span 1;">
                  <img src="assets/thumbnail1.png" alt="${name}" style="height: 100%; width: auto; object-fit: contain;">
                </div>
                <div class="detail-block" style="grid-column: span 1;">
                  <div class="block-title">CONNECT</div>
                  <div class="connect">${data.connect}</div>
                </div>
                <div class="detail-block" style="grid-column: span 2;">
                  <div class="block-title">ARDUINO IDE</div>
                  <div class="arduino-code">
                    <textarea class="arduino-editor">${data.arduino}</textarea>
                  </div>
                </div>
                <div class="detail-block" style="grid-column: span 2;">
                  <div class="block-title">P5.JS</div>
                  <div class="p5-code">
                    <textarea class="p5-editor">${data.p5}</textarea>
                  </div>
                </div>
                <div class="detail-block" style="grid-column: span 2;">
                  <div class="block-title">GRAPHIC TRANSLATION</div>
                  <div class="sensor-use-case">${data.useCase}</div>
                </div>
            `;

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
