// Initialize on startup
//
// Global constants
// Units are all SI
//
// Various units
/* eslint-disable */
// ^ can't be arsed to configure properly
// Time
const minute = 60;
const hour = 60 * minute;
const day = 24 * hour;
// Distance
const kilometer = 1000;
const earthRadius = 6371 * kilometer;
const moonRadius = 1737.1 * kilometer;
const jupiterRadius = 69911 * kilometer;
const sunRadius = 696340 * kilometer;
const astronomicalUnit = 149597871 * kilometer;
// Mass
const moonMass = 7.34767309e22;
const earthMass = 5.972e24;
const jupiterMass = 1.898e27;
const sunMass = 1.989e30;
/* eslint-enable */
// Simulation variables
//
// Desired simulation rate (times real speed)
let targetSpeed = 15000;
// Gravitational constant (Nm^2/kg^2)
const gamma = 6.67430e-11
// Minimum force limit for physics (N). If body interaction results in less force than this limit, it will be ignored
const minForce = 0.1;
// Camera distance (with dynamic zoom becomes default value)
let camDistance = 2.7e9;
// Set true to fit all objects in camera fov
let dynamicZoom = true;
// Camera FOV
const cameraFov = 75;
// How many trajectory segments to keep before removing the oldest one
const maxSegments = 200;
// Minimum length for a trajectory segment.
const minSegmentLength = 1.75 * earthRadius;
// Target graphics frame rate
// Lower values increase performance
let frameRate = 60;
// Maximum fps that will not be exceeded even with extra performance available.
const maxFrameRate = 100;
// Track how many physics iterations could be performed in 1 ms to calculate average physics calculation time.
let physicsIterations = 0;
// Store a list of all bodies
const allBodies = {};
// Store timestamp of last physics update
let physicsStart = window.performance.now();
// Store elapsed physics updates
let timeElapsed = 0;
// Track average performance
const frameTimes = [0];
// Track time in ms it takes to complete physics calculations.
let physicsTime = 0.01;
// Track time step in seconds
let timeStep = 1;
// Start slowing down simulation speed when a body is going over this speed (m/s)
const speedLimit = 4000;
// Maximum slow down will be achieved when a body moves at this speed (m/s)
const speedLimitCap = 20000;
// Track speed of fastest moving body, based on which speed reduction will be applied (m/s)
let fastestSpeed = 0;
// Speed reduction will be capped to this factor.
const maxSlowDown = 5/6;
// Animation functions that will be called on repaint will be placed here.
const animationCallbackQueue = [];


function init (createDefautltBodies) {
  // Create bodies
  // Size is radius

  // -----
  // Default body creation
  // -----
  if (createDefautltBodies) {
    // Jupiter and Galilean moons.
    //
    // Jupiter
    createNewBody({
      size: jupiterRadius,
      mass: jupiterMass,
      positionX: 0,
      positionY: 0,
      positionZ: 0,
      color: 0xd07c37,
      frozen: true,
      name: 'Jupiter'
    });
    // Io
    createNewBody({
      size: 1821.6 * kilometer,
      mass: 8.931938e22,
      positionY: jupiterRadius + 421700 * kilometer,
      velocityX: -15634,
      color: 0xf0e397,
      frozen: false,
      name: 'Io'
    });
    // Europa
    createNewBody({
      size: 1560.8 * kilometer,
      mass: 4.799844e22,
      positionY: -jupiterRadius - 670900 * kilometer,
      velocityX: 13143.36,
      color: 0xe7e7e7,
      frozen: false,
      name: 'Europa'
    });
    // Ganymede
    createNewBody({
      size: 2634.1 * kilometer,
      mass: 1.4819e23,
      positionY: jupiterRadius + 1070400 * kilometer,
      velocityX: -10880,
      color: 0xbababa,
      frozen: false,
      name: 'Ganymede'
    });
    // Callisto
    createNewBody({
      size: 2410.3 * kilometer,
      mass: 1.075938e23,
      positionY: jupiterRadius + 1882700 * kilometer,
      velocityX: -8204,
      color: 0x797979,
      frozen: false,
      name: 'Callisto'
    });
    // Spacecraft
    createNewBody({
      size: 3,
      mass: 100,
      positionY: -jupiterRadius - 670900 * kilometer - 600 * kilometer,
      velocityX: 12140,
      color: 0xe7e7e7,
      frozen: false,
      name: 'Spacecraft'
    });
  }
  // -----
  // End bodies
  // -----

  // Call first physics update
  physicsUpdate();
}

// -----
// Utility
// -----

const average = (array) => array.reduce((a, b) => a + b) / array.length;

function parseUnits (input) {
  // Replaces units such as 'jupiterMass' or 'earthRadius' with numbers.
  const units = {
    minute,
    hour,
    day,
    // Distance
    kilometer,
    earthRadius,
    moonRadius,
    jupiterRadius,
    sunRadius,
    astronomicalUnit,
    // Mass
    moonMass,
    earthMass,
    jupiterMass,
    sunMass
  }

  let split = input.split(' ')
  for (let i = 0; i < split.length; i++) {
    if (units[split[i]]) split[i] = units[split[i]]
    else {
      split[i] = Number(split[i]);
      if (split[i].toString() === NaN.toString()) {
        split[i] = 1;
        alert('Failed to parse value!')
      }
    }
  }
  return split.reduce((a, b) => a * b)
}

// -----
// Physics
// -----

function moveCam (pos) { // eslint-disable-line
  if (pos === 'top') {
    camera.position.set(0, 0, camDistance);
    camera.lookAt(0, 0, 0);
    dynamicZoom = true;
  } else if (pos === 'side') {
    dynamicZoom = false;
    camera.position.set(0, camDistance, 0);
    camera.lookAt(0, 0, 0);
  }
}

function setDistance () { // eslint-disable-line
  // Changes camera default distance
  camDistance = Number(prompt('Set distance (in meters)', camDistance)); // eslint-disable-line
}

function promptNewBody () { // eslint-disable-line
  // Lets user add a new body at runtime
  const size = parseUnits(prompt('Radius (meters)', moonRadius)); // eslint-disable-line
  const positionX = parseUnits(prompt('Position X (meters, relative to center)', 385000000)); // eslint-disable-line
  const positionY = parseUnits(prompt('Position Y (meters, relative to center)', 0)); // eslint-disable-line
  const positionZ = parseUnits(prompt('Position Z (meters, relative to center)', 0)); // eslint-disable-line
  const color = parseUnits(prompt('Color (hex)', '0xa3a3a3')); // eslint-disable-line
  const mass = parseUnits(prompt('Mass (kilograms)', moonMass)); // eslint-disable-line
  const velocityX = parseUnits(prompt('Velocity X (m/s)', 0)); // eslint-disable-line
  const velocityY = parseUnits(prompt('Velocity Y (m/s)', -1000)); // eslint-disable-line
  const velocityZ = parseUnits(prompt('Velocity Z (m/s)', 0)); // eslint-disable-line
  let frozen = prompt('Frozen? (true/false)', 'false'); // eslint-disable-line
  const name = prompt('Name', `Body ${Object.keys(allBodies).length + 1}`); // eslint-disable-line
  if (frozen === 'true') {
    frozen = true;
  } else {
    frozen = false;
  }
  createNewBody({
    size: size,
    mass: mass,
    positionX: positionX,
    positionY: positionY,
    positionZ: positionZ,
    color: color,
    velocityX: velocityX,
    velocityY: velocityY,
    velocityZ: velocityZ,
    name: name
  });
}

function changeSimulationSpeed () { // eslint-disable-line
  targetSpeed = Number(prompt('Simulation speed multiplier.', targetSpeed)); // eslint-disable-line
}

function createNewBody ({
  size = 1,
  positionX = 0,
  positionY = 0,
  positionZ = 0,
  color = 0xffff00,
  mass = 10,
  velocityX = 0,
  velocityY = 0,
  velocityZ = 0,
  frozen = false,
  name = `Body ${Object.keys(allBodies).length + 1}`
} = {}) {
  // Creates a new body with given properties
  // Add body to list of all bodies after checking name is not duplicate
  if (allBodies[name]) {
    name = `Body ${Object.keys(allBodies).length + 1}`;
  }

  allBodies[name] = {
    size,
    positionX,
    positionY,
    positionZ,
    color,
    mass,
    velocityX,
    velocityY,
    velocityZ,
    frozen,
    primaryBody: name,
    name
  };

  // Create graphics for the new body
  createBodyGraphics({
    size,
    positionX,
    positionY,
    positionZ,
    color,
    name
  });
}

async function physicsUpdate () {
  // This function runs all physics calculations
  // Call gravity force calculations for each body,
  // then calculate new position and velocity
  // Set time step to be time it takes to calculate physics times desired speed multiplier.

  // Calculate time step reduction due to fast bodies.
  let speedFactor = 0;
  if (fastestSpeed > speedLimit) speedFactor = (fastestSpeed - speedLimit) / (speedLimitCap - speedLimit) * maxSlowDown;
  // Target average speed.
  timeStep = average(frameTimes) / 1000 * targetSpeed * (1 - speedFactor);
  function doPhysicsForBody (body) {
    // If body is frozen, skip physics
    if (allBodies[body].frozen) {
      return;
    }
    const acceleration = calculateAcceleration(body);
    // Calculate new velocity components using formula
    // v = v_0 + at
    allBodies[body].velocityX = allBodies[body].velocityX + acceleration.x * timeStep;
    allBodies[body].velocityY = allBodies[body].velocityY + acceleration.y * timeStep;
    allBodies[body].velocityZ = allBodies[body].velocityZ + acceleration.z * timeStep;

    // Update fastest body velocity.
    const speed = new p5.Vector(allBodies[body].velocityX, allBodies[body].velocityY, allBodies[body].velocityZ).mag();
    if (speed > fastestSpeed) fastestSpeed = speed;

    // Calculate new positions for body using formula
    // x = x_0 + v_0t + 1/2 at^2
    allBodies[body].positionX = allBodies[body].positionX + allBodies[body].velocityX * timeStep + (1 / 2) * acceleration.x * (timeStep ^ 2);
    allBodies[body].positionY = allBodies[body].positionY + allBodies[body].velocityY * timeStep + (1 / 2) * acceleration.y * (timeStep ^ 2);
    allBodies[body].positionZ = allBodies[body].positionZ + allBodies[body].velocityZ * timeStep + (1 / 2) * acceleration.z * (timeStep ^ 2);
    // Physics calculations complete for body
  }

  // Process physics in parallel,
  const promises = [];
  for (const body in allBodies) {
    const promise = new Promise((resolve) => {
      doPhysicsForBody(body);
      resolve();
    })
    promises.push(promise);
  }
  await Promise.all(promises);

  // All physics done
  // Display time taken to perform calculations
  physicsIterations++;
  const now = window.performance.now()
  if (now > physicsStart) {
    physicsTime = Math.min(250, (now - physicsStart) / physicsIterations);
    frameTimes.push(physicsTime);
    physicsIterations = 0;
    physicsStart = now;
  }
  document.getElementById('physics').innerHTML = `Physics took ${physicsTime} ms`;
  document.getElementById('average').innerHTML = `Physics average time: ${average(frameTimes).toFixed(2)} ms`;
  // Calculate speed multiplier.
  let speed = Math.round(timeStep * 1000 / physicsTime)
  // Format.
  if (speed >= 1e9) speed = speed / 1e9 + 'B'
  else if (speed >= 1e6 && speed < 1e9) speed = speed / 1e6 + 'M'
  else if (speed >= 1e3 && speed < 1e6) speed = speed / 1e3 + 'K'
  document.getElementById('step').innerHTML = `${speed} x real time speed.`;
  if (frameTimes > 3000) {
    frameTimes.shift();
  }

  // Display total time elapsed
  timeElapsed += timeStep;
  const parsedTime = parseTime(timeElapsed);
  document.getElementById('time').innerHTML = `Simulated time elapsed: ${parsedTime.a} a ${parsedTime.d} d ${parsedTime.h} h ${parsedTime.m} m ${parsedTime.s} s`;

  // Queue next physics update.
  setTimeout(() => { physicsUpdate(); }, 1)
}

function calculateAcceleration (body) {
  // Calculates acceleration caused by gravity
  // Returns xyz components of net acceleration in m/s

  // This will store the total force applied on the body
  const force = {
    x: 0,
    y: 0,
    z: 0
  };

  // Track body that is causing the largest force on this body
  let pbForce = 0;
  let pb;

  // Check force applied on body by every other body
  for (const target in allBodies) {
    // Ignore self
    if (target === body) {
      continue;
    }

    const delta = {
      x: allBodies[target].positionX - allBodies[body].positionX,
      y: allBodies[target].positionY - allBodies[body].positionY,
      z: allBodies[target].positionZ - allBodies[body].positionZ
    };

    const distanceVector = new p5.Vector(delta.x, delta.y, delta.z); // eslint-disable-line
    const dvMag = distanceVector.mag();

    // Calculate force using formula
    // F = gamma * (m_1 * m_2 / r^2)
    const totalForce = gamma * (allBodies[body].mass * allBodies[target].mass / distanceVector.magSq());
    // Optimize by ignoring weak interactions.
    if (totalForce < minForce) {
      continue;
    }
    // Check if body should be primary body
    if (totalForce > pbForce) {
      pb = target;
      pbForce = totalForce;
    }
    // Calculate xyz components of force:
    // Multiply distance vector so that its magnitude is equal to total force,
    // then xyz components are equal to force xyz components
    const forceVector = distanceVector.mult(totalForce / dvMag);
    // Add components to total force applied on body
    force.x += forceVector.x;
    force.y += forceVector.y;
    force.z += forceVector.z;
  }

  allBodies[body].primaryBody = pb;
  // From force, calculate acceleration using formula
  // a = F/m
  const acceleration = {
    x: force.x / allBodies[body].mass,
    y: force.y / allBodies[body].mass,
    z: force.z / allBodies[body].mass
  };
  return acceleration;
}

function parseTime (input) {
  // Takes time input in seconds,
  // outputs appropriate format
  const date = new Date(input * 1000);
  date.setSeconds(input);
  const seconds = date.getSeconds()
  const minutes = date.getMinutes()
  const hours = date.getHours()
  const years = Math.floor(date.getTime() / 31556926000)
  const days = Math.floor(date.getTime() / 86400000) - years * 365
  return {
    s: seconds,
    m: minutes,
    h: hours,
    d: days,
    a: years
  };
}

// -----
// Graphics
// -----

// Basic three.js graphics initialization
const scene = new THREE.Scene(); // eslint-disable-line
const camera = new THREE.PerspectiveCamera(cameraFov, window.innerWidth / window.innerHeight, 0.1, 10e200); // eslint-disable-line

const renderer = new THREE.WebGLRenderer(); // eslint-disable-line
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

camera.position.set(0, 0, camDistance);

// Call first animation frame.
requestAnimationFrame(animator)

// Init done

let dynamicZoomInterval;

function createBodyGraphics ({
  size = 1,
  positionX = 0,
  positionY = 0,
  positionZ = 0,
  color = 0xffff00,
  name = 'Body'
} = {}) {
  // Create graphics for a given body
  const geometry = new THREE.SphereGeometry(size, 32, 32); // eslint-disable-line
  const material = new THREE.MeshBasicMaterial({color: color}); // eslint-disable-line
  const sphere = new THREE.Mesh(geometry, material); // eslint-disable-line
  scene.add(sphere);
  sphere.position.set(positionX, positionY, positionZ);

  // Name label
  const sprite = new THREE.TextSprite({ // eslint-disable-line
    text: name,
    alignment: 'left',
    fontFamily: 'Arial, Helvetica, sans-serif',
    fontSize: 6,
    color: '#ffffff'
  });
  scene.add(sprite);
  sprite.position.set(300 / (camera.position.z - allBodies[name].positionZ) * allBodies[name].positionX + 10, 300 / (camera.position.z - allBodies[name].positionZ) * allBodies[name].positionY + 10, camera.position.z - 300);
  // Color for sub-escape velocity trajectories
  const orbitMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00 }); // eslint-disable-line
  // Color for escape velocity trajectories
  const escapeMaterial = new THREE.LineBasicMaterial({ color: 0xff4433 }); // eslint-disable-line

  // Store last position for drawing trajectory lines
  let lastpos = {
    x: positionX,
    y: positionY,
    z: positionZ
  };

  // Store trajectory segments for removal at a later time
  const segments = [];

  if (dynamicZoom && !dynamicZoomInterval) {
    dynamicZoomInterval = setInterval(function () {
      // Handle dynamic zoom
      if (!dynamicZoom) {
        return;
      }
      camera.position.z = camDistance;
      /* eslint-disable */
      for (currentBody in allBodies) {
        // Check if body fits in camera picture
        // x axis
        if (Math.tan(cameraFov / 2 * Math.PI / 180) * camera.position.z - allBodies[currentBody].positionZ < Math.abs(allBodies[currentBody].positionX)) {
          // Does not fit, zoom to fit
          camera.position.z = Math.tan((90 - cameraFov / 2) * Math.PI / 180) * Math.abs(allBodies[currentBody].positionX) * 1.1;
        }
        // y axis
        if (Math.tan(cameraFov / 2 * Math.PI / 180) * camera.position.z - allBodies[currentBody].positionZ < Math.abs(allBodies[currentBody].positionY)) {
          // Does not fit, zoom to fit
          camera.position.z = Math.tan((90 - cameraFov / 2) * Math.PI / 180) * Math.abs(allBodies[currentBody].positionY) * 1.1;
        }
      }
      /* eslint-enable */
    }, 100);
  }

  const animate = function () {
    // Animation
    // Update position
    sphere.position.set(allBodies[name].positionX, allBodies[name].positionY, allBodies[name].positionZ);
    sprite.position.set(300 / (camera.position.z - allBodies[name].positionZ) * allBodies[name].positionX + 10, 300 / (camera.position.z - allBodies[name].positionZ) * allBodies[name].positionY + 10, camera.position.z - 300);
    // Draw trajectory if not frozen
    if (!allBodies[name].frozen) {
      // Check that primary body is set.
      if (!allBodies[name].primaryBody) allBodies[name].primaryBody = name;
      // Calculate distance to primary body.
      const delta = {
        x: allBodies[allBodies[name].primaryBody].positionX - allBodies[name].positionX,
        y: allBodies[allBodies[name].primaryBody].positionY - allBodies[name].positionY,
        z: allBodies[allBodies[name].primaryBody].positionZ - allBodies[name].positionZ
      };
      const distanceVector = new p5.Vector(delta.x, delta.y, delta.z); // eslint-disable-line
      // Check if segment is long enough.
      const segmentLength = new p5.Vector(allBodies[name].positionX - lastpos.x, allBodies[name].positionY - lastpos.y, allBodies[name].positionZ - lastpos.z)
      if (segmentLength.mag() < minSegmentLength) {
        renderer.render(scene, camera);
        return;
      }
      const points = [];
      points.push(new THREE.Vector3(lastpos.x, lastpos.y, lastpos.z)); // eslint-disable-line
      points.push(new THREE.Vector3(allBodies[name].positionX, allBodies[name].positionY, allBodies[name].positionZ)); // eslint-disable-line
      const lineGeometry = new THREE.BufferGeometry().setFromPoints(points); // eslint-disable-line
      let line;

      // Check if going over the escape velocity, use appropriate color
      
      if (new p5.Vector(allBodies[name].velocityX - allBodies[allBodies[name].primaryBody].velocityX, allBodies[name].velocityY - allBodies[allBodies[name].primaryBody].velocityY, allBodies[name].velocityZ - allBodies[allBodies[name].primaryBody].velocityZ).magSq() > (2 * gamma * allBodies[allBodies[name].primaryBody].mass / distanceVector.mag())) { // eslint-disable-line
        line = new THREE.Line(lineGeometry, escapeMaterial); // eslint-disable-line
      } else {
        line = new THREE.Line(lineGeometry, orbitMaterial); // eslint-disable-line
      }
      scene.add(line);
      segments.push(line);

      // Remove old segments
      if (segments.length > maxSegments) {
        scene.remove(segments[0]);
        segments.shift();
      }

      // Update last position
      lastpos = {
        x: allBodies[name].positionX,
        y: allBodies[name].positionY,
        z: allBodies[name].positionZ
      };
    }

    renderer.render(scene, camera);
  };

  animationCallbackQueue.push(animate);
}

async function animator () {
  // This will call animation functions for each simulated body.
  const graphicsTimer = window.performance.now()
  const promises = [] // Array will store promises for animation functions so they can be done in parallel.
  animationCallbackQueue.forEach(f => {
    promises.push(new Promise((resolve) => {
      f();
      resolve();
    }));
  })
  await Promise.all(promises)
  const frameTime = window.performance.now() - graphicsTimer
  const targetFrameTime = 1000 / frameRate;
  const wait = Math.round(Math.max(0, targetFrameTime - frameTime))
  document.getElementById('graphics').innerHTML = `FPS: ${Math.floor(1000 / (frameTime + wait))}. Graphics took ${frameTime} ms. (Idle for ${wait} ms.)`;
  // Call next frame.
  // Adjust frame target to reduce graphics load.
  if (frameTime >= 1.5 * targetFrameTime) frameRate *= 0.75;
  if (frameTime <= 0.5 * targetFrameTime) frameRate = Math.min(frameRate * 2, maxFrameRate);
  setTimeout(() => { animator() }, wait)
}

if (confirm('Create default bodies?')) { // eslint-disable-line
  init(true);
} else {
  init(false);
}
