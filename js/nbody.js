// Initialize on startup
//
// Global constants
// Units are all SI
//
// Shorthands
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
// Simulation constants
//
// Every physics update will simulate this many seconds
const targetTimeStep = 5 * minute;
// Try to calculate physics every this many milliseconds
const updateInterval = 0;
// Gravitational constant (Nm^2/kg^2)
const gamma = 6.67430e-11;
// Camera distance (with dynamic zoom becomes default value)
const camDistance = 5e8;
// Set true to fit all objects in camera fov
let dynamicZoom = true;
// Camera FOV
const cameraFov = 75;
// How many trajectory segments to keep before removing the oldest one
const maxSegments = 1000;
// Slow down time when bodies are close together
const adaptiveTime = false;
// Adaptive time activation range
const adaptiveTimeRange = 7 * jupiterRadius;
// How much can adaptive time slow down the simulation
const adaptiveTimeMaxFactor = 12;
// Target graphics frame rate
// Lower values increase performance
const frameRate = 30;

function init () {
  // Create bodies
  // Size is radius

  // -----
  // Place body creation here
  // -----
  // Earth, The Moon, and a small satellite in lunar orbit
  //
  // Earth
  createNewBody({
    size: 6371000,
    mass: 5.972e24,
    positionX: 0,
    positionY: 0,
    positionZ: 0,
    frozen: true,
    name: 'Earth'
  });
  // Moon
  createNewBody({
    size: 1737100,
    mass: 7.34767309e22,
    positionX: -385000000,
    positionY: 0,
    positionZ: 0,
    color: 0xa3a3a3,
    velocityX: 0,
    velocityY: 1000,
    velocityZ: 0,
    name: 'Moon'
  });
  // Spacecraft
  createNewBody({
    size: 10,
    mass: 700,
    positionY: -earthRadius + -(800 * kilometer),
    positionX: 0,
    positionZ: 0,
    color: 0xffffff,
    velocityX: -10356.8,
    velocityY: -300,
    velocityZ: 200,
    name: 'Spacecraft'
  });

  // -----
  // End bodies
  // -----

  // Call first physics update
  physicsUpdate();
}

// Store a list of all bodies
let allBodies = {};

// Store timestamp of last physics update
let lastUpdate = Date.now();

// Store elapsed physics updates
let timeElapsed = 0;

// Track average performance
let frameTimes = [0];

// Track if adaptive time is being used
let adaptiveTimeActive = false;

// Track time step
let timeStep = targetTimeStep;
document.getElementById('step').innerHTML = `Time step is ${timeStep} s`;

// -----
// Utility
// -----

let average = (array) => array.reduce((a, b) => a + b) / array.length;

// -----
// Physics
// -----

function moveCam (pos) {
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
  }

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

function physicsUpdate () {
  // This function runs all physics calculations
  // Call gravity force calculations for each body,
  // then calculate new position and velocity

  adaptiveTimeActive = false;
  timeStep = targetTimeStep;
  for (const body in allBodies) {
    // If body is frozen, skip physics
    if (allBodies[body].frozen) {
      continue;
    }
    let acceleration = calculateAcceleration(body);
    // Calculate new velocity components using formula
    // v = v_0 + at
    allBodies[body].velocityX = allBodies[body].velocityX + acceleration.x * timeStep;
    allBodies[body].velocityY = allBodies[body].velocityY + acceleration.y * timeStep;
    allBodies[body].velocityZ = allBodies[body].velocityZ + acceleration.z * timeStep;

    // Calculate new positions for body using formula
    // x = x_0 + v_0t + 1/2 at^2
    allBodies[body].positionX = allBodies[body].positionX + allBodies[body].velocityX * timeStep + (1/2) * acceleration.x * (timeStep^2);
    allBodies[body].positionY = allBodies[body].positionY + allBodies[body].velocityY * timeStep + (1/2) * acceleration.y * (timeStep^2);
    allBodies[body].positionZ = allBodies[body].positionZ + allBodies[body].velocityZ * timeStep + (1/2) * acceleration.z * (timeStep^2);

    // TODO: Check for collisions
    // Physics calculations complete for body
  }
  // All physics done
  // Display time taken to perform calculations
  let physicsTime = Date.now() - lastUpdate;
  frameTimes.push(physicsTime);
  document.getElementById('physics').innerHTML = `Physics took ${physicsTime} ms`;
  document.getElementById('average').innerHTML = `Physics average time: ${average(frameTimes)} ms`;
  if (frameTimes > 3000) {
    frameTimes.shift();
  }
  lastUpdate = Date.now();

  // Display total time elapsed
  timeElapsed++;
  let parsedTime = parseTime(timeElapsed * timeStep);
  document.getElementById('time').innerHTML = `Simulated time elapsed: ${parsedTime.a} a ${parsedTime.d} d ${parsedTime.h} h ${parsedTime.m} m ${parsedTime.s} s`

  // Set timeout to call next update
  setTimeout(function () { physicsUpdate(); }, updateInterval - physicsTime);
}

function calculateAcceleration (body) {
  // Calculates acceleration caused by gravity
  // Returns xyz components of net acceleration in m/s

  // This will store the total force applied on the body
  let force = {
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

    let delta = {
      x: allBodies[target].positionX - allBodies[body].positionX,
      y: allBodies[target].positionY - allBodies[body].positionY,
      z: allBodies[target].positionZ - allBodies[body].positionZ
    }
    let distanceVector = new p5.Vector(delta.x, delta.y, delta.z);
    let dvMag = distanceVector.mag();
    // Adaptive time handling
    if (adaptiveTime) {
      if (dvMag < adaptiveTimeRange) {
        adaptiveTimeActive = true;
        timeStep = Math.round(Math.max(dvMag / adaptiveTimeRange * targetTimeStep, targetTimeStep / adaptiveTimeMaxFactor));
      }
      document.getElementById('step').innerHTML = `Time step is ${timeStep} s`;
    }

    // Calculate force using formula
    // F = gamma * (m_1 * m_2 / r^2)
    let totalForce = gamma * (allBodies[body].mass * allBodies[target].mass / distanceVector.magSq());
    // Check if body should be primary body
    if (totalForce > pbForce) {
      pb = target;
      pbForce = totalForce;
    }
    // Calculate xyz components of force:
    // Multiply distance vector so that its magnitude is equal to total force,
    // then xyz components are equal to force xyz components
    let forceVector = distanceVector.mult(totalForce / dvMag);
    // Add components to total force applied on body
    force.x += forceVector.x;
    force.y += forceVector.y;
    force.z += forceVector.z;
  }

  allBodies[body].primaryBody = pb;
  // From force, calculate acceleration using formula
  // a = F/m
  let acceleration = {
    x: force.x / allBodies[body].mass,
    y: force.y / allBodies[body].mass,
    z: force.z / allBodies[body].mass
  };
  return acceleration;
}

function parseTime (input) {
  // Takes time input in seconds,
  // outputs appropriate format
  let seconds = input;
  let minutes = 0;
  let hours = 0;
  let days = 0;
  let years = 0;
  if (seconds > 59) {
    minutes += Math.floor(seconds / 60);
    seconds -= Math.floor(seconds / 60) * 60;
  }
  if (minutes > 59) {
    hours += Math.floor(minutes / 60);
    minutes -= Math.floor(minutes / 60) * 60;
  }
  if (hours > 23) {
    days += Math.floor(hours / 24);
    hours -= Math.floor(hours / 24) * 24;
  }
  if (days > 364) {
    years += Math.floor(days / 365);
    days -= Math.floor(days / 365) * 365;
  }
  if (seconds < 10) {
    seconds = '0' + seconds;
  }
  if (minutes < 10) {
    minutes = '0' + minutes;
  }
  if (hours < 10) {
    hours = '0' + hours;
  }
  if (days < 10) {
    days = '0' + days;
  }
  if (days < 100) {
    days = '0' + days;
  }
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
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(cameraFov, window.innerWidth / window.innerHeight, 0.1, 10e200);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

camera.position.set(0, 0, camDistance);

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
  const geometry = new THREE.SphereGeometry(size, 32, 32);
  const material = new THREE.MeshBasicMaterial({color: color});
  const sphere = new THREE.Mesh(geometry, material);
  scene.add(sphere);
  sphere.position.set(positionX, positionY, positionZ);

  // Name label
  let sprite = new THREE.TextSprite({
    text: name,
    alignment: 'left',
    fontFamily: 'Arial, Helvetica, sans-serif',
    fontSize: 6,
    color: '#ffffff',
  });
  scene.add(sprite);
  sprite.position.set(300 / (camera.position.z - allBodies[name].positionZ) * allBodies[name].positionX + 10, 300 / (camera.position.z - allBodies[name].positionZ) * allBodies[name].positionY + 10, camera.position.z - 300);
  // Color for sub-escape velocity trajectories
  const orbitMaterial = new THREE.LineBasicMaterial({color: 0x00ff00});
  // Color for escape velocity trajectories
  const escapeMaterial = new THREE.LineBasicMaterial({color: 0xff4433});

  // Store last position for drawing trajectory lines
  let lastpos = {
    x: positionX,
    y: positionY,
    z: positionZ
  }
  // Store trajectory segments for removal at a later time
  let segments = [];

  if (dynamicZoom && !dynamicZoomInterval) {
    dynamicZoomInterval = setInterval(function () {
      // Handle dynamic zoom
      if (!dynamicZoom) {
        return;
      }
      camera.position.z = camDistance;
      for (currentBody in allBodies) {
        // Check if body fits in camera picture
        // x axis
        if (Math.tan(cameraFov / 2 * Math.PI / 180) * camera.position.z - allBodies[currentBody].positionZ < Math.abs(allBodies[currentBody].positionX))
        {
          // Does not fit, zoom to fit
          camera.position.z = Math.tan((90 - cameraFov / 2) * Math.PI / 180) * Math.abs(allBodies[currentBody].positionX) * 1.1;
        }
        // y axis
        if (Math.tan(cameraFov / 2 * Math.PI / 180) * camera.position.z - allBodies[currentBody].positionZ < Math.abs(allBodies[currentBody].positionY))
        {
          // Does not fit, zoom to fit
          camera.position.z = Math.tan((90 - cameraFov / 2) * Math.PI / 180) * Math.abs(allBodies[currentBody].positionY) * 1.1;
        }
      }
    }, 100);
  }

  const animate = function () {
    // Measure time spent on graphics
    let graphicsTimer = Date.now();

    // FPS limiter
    setTimeout(function () { requestAnimationFrame(animate); }, 1000 / frameRate)

    // Animation
    // Update position
    sphere.position.set(allBodies[name].positionX, allBodies[name].positionY, allBodies[name].positionZ)
    sprite.position.set(300 / (camera.position.z - allBodies[name].positionZ) * allBodies[name].positionX + 10, 300 / (camera.position.z - allBodies[name].positionZ) * allBodies[name].positionY + 10, camera.position.z - 300);
    // Draw trajectory if not frozen
    if (!allBodies[name].frozen) {
      const points = [];
      points.push(new THREE.Vector3(lastpos.x, lastpos.y, lastpos.z));
      points.push(new THREE.Vector3(allBodies[name].positionX, allBodies[name].positionY, allBodies[name].positionZ));
      const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
      let line;

      // Check if going over the escape velocity, use appropriate color
      let delta = {
        x: allBodies[allBodies[name].primaryBody].positionX - allBodies[name].positionX,
        y: allBodies[allBodies[name].primaryBody].positionY - allBodies[name].positionY,
        z: allBodies[allBodies[name].primaryBody].positionZ - allBodies[name].positionZ
      }
      let distanceVector = new p5.Vector(delta.x, delta.y, delta.z);
      if (new p5.Vector(allBodies[name].velocityX - allBodies[allBodies[name].primaryBody].velocityX, allBodies[name].velocityY - allBodies[allBodies[name].primaryBody].velocityY, allBodies[name].velocityZ - allBodies[allBodies[name].primaryBody].velocityZ).magSq() > (2 * gamma * allBodies[allBodies[name].primaryBody].mass / distanceVector.mag())) {
        line = new THREE.Line(lineGeometry, escapeMaterial);
      } else {
        line = new THREE.Line(lineGeometry, orbitMaterial);
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
      }
    }

    renderer.render(scene, camera);
    document.getElementById('graphics').innerHTML = `Graphics took ${Date.now() - graphicsTimer} ms`;

  };

  animate();
}

init();
