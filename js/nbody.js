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
// Simulation constants
//
// Every physics update will simulate this many seconds
// Note: the way the physics are calculated leads to inaccurate results
// when the time step is high
let targetTimeStep = 3.5 * minute;
// Try to calculate physics every this many milliseconds
const updateInterval = 0;
// Gravitational constant (Nm^2/kg^2)
const gamma = 6.67430e-11;
// Camera distance (with dynamic zoom becomes default value)
let camDistance = 5e8;
// Set true to fit all objects in camera fov
let dynamicZoom = true;
// Camera FOV
const cameraFov = 75;
// How many trajectory segments to keep before removing the oldest one
const maxSegments = 1000;
// Target graphics frame rate
// Lower values increase performance
const frameRate = 24;

function init (createDefautltBodies) {
  // Create bodies
  // Size is radius

  // -----
  // Default body creation
  // -----
  if (createDefautltBodies) {
    // Earth, The Moon, and a small satellite in lunar orbit
    //
    // Earth
    createNewBody({
      size: 6371000,
      mass: 5.972e24,
      positionX: 0,
      positionY: 0,
      positionZ: 0,
      frozen: false,
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
      positionY: -earthRadius - (800 * kilometer),
      positionX: 0,
      positionZ: 0,
      color: 0xffffff,
      velocityX: -10417,
      velocityY: -500,
      velocityZ: 200,
      name: 'Spacecraft'
    });
  }
  // -----
  // End bodies
  // -----

  // Call first physics update
  physicsUpdate();
}

// Store a list of all bodies
const allBodies = {};

// Store timestamp of last physics update
let lastUpdate = Date.now();

// Store elapsed physics updates
let timeElapsed = 0;

// Track average performance
const frameTimes = [0];

// Track time step
let timeStep = targetTimeStep;

// -----
// Utility
// -----

const average = (array) => array.reduce((a, b) => a + b) / array.length;

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
  const size = Number(prompt('Radius (meters)', moonRadius)); // eslint-disable-line
  const positionX = Number(prompt('Position X (meters, relative to center)', 385000000)); // eslint-disable-line
  const positionY = Number(prompt('Position Y (meters, relative to center)', 0)); // eslint-disable-line
  const positionZ = Number(prompt('Position Z (meters, relative to center)', 0)); // eslint-disable-line
  const color = Number(prompt('Color (hex)', '0xa3a3a3')); // eslint-disable-line
  const mass = Number(prompt('Mass (kilograms)', moonMass)); // eslint-disable-line
  const velocityX = Number(prompt('Velocity X (m/s)', 0)); // eslint-disable-line
  const velocityY = Number(prompt('Velocity Y (m/s)', -1000)); // eslint-disable-line
  const velocityZ = Number(prompt('Velocity Z (m/s)', 0)); // eslint-disable-line
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

function changeTimeStep () { // eslint-disable-line
  targetTimeStep = Number(prompt('Time step (seconds)', timeStep)); // eslint-disable-line
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

function physicsUpdate () {
  // This function runs all physics calculations
  // Call gravity force calculations for each body,
  // then calculate new position and velocity

  timeStep = targetTimeStep;
  document.getElementById('step').innerHTML = `Time step is ${timeStep} s`;
  for (const body in allBodies) {
    // If body is frozen, skip physics
    if (allBodies[body].frozen) {
      continue;
    }
    const acceleration = calculateAcceleration(body);
    // Calculate new velocity components using formula
    // v = v_0 + at
    allBodies[body].velocityX = allBodies[body].velocityX + acceleration.x * timeStep;
    allBodies[body].velocityY = allBodies[body].velocityY + acceleration.y * timeStep;
    allBodies[body].velocityZ = allBodies[body].velocityZ + acceleration.z * timeStep;

    // Calculate new positions for body using formula
    // x = x_0 + v_0t + 1/2 at^2
    allBodies[body].positionX = allBodies[body].positionX + allBodies[body].velocityX * timeStep + (1 / 2) * acceleration.x * (timeStep ^ 2);
    allBodies[body].positionY = allBodies[body].positionY + allBodies[body].velocityY * timeStep + (1 / 2) * acceleration.y * (timeStep ^ 2);
    allBodies[body].positionZ = allBodies[body].positionZ + allBodies[body].velocityZ * timeStep + (1 / 2) * acceleration.z * (timeStep ^ 2);

    // TODO: Check for collisions
    // Physics calculations complete for body
  }
  // All physics done
  // Display time taken to perform calculations
  const physicsTime = Date.now() - lastUpdate;
  frameTimes.push(physicsTime);
  document.getElementById('physics').innerHTML = `Physics took ${physicsTime} ms`;
  document.getElementById('average').innerHTML = `Physics average time: ${average(frameTimes)} ms`;
  if (frameTimes > 3000) {
    frameTimes.shift();
  }
  lastUpdate = Date.now();

  // Display total time elapsed
  timeElapsed++;
  const parsedTime = parseTime(timeElapsed * timeStep);
  document.getElementById('time').innerHTML = `Simulated time elapsed: ${parsedTime.a} a ${parsedTime.d} d ${parsedTime.h} h ${parsedTime.m} m ${parsedTime.s} s`;

  // Set timeout to call next update
  setTimeout(function () { physicsUpdate(); }, updateInterval - physicsTime);
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
  const date = new Date(null);
  date.setSeconds(input);
  const seconds = date.toISOString().substr(17, 2);
  const minutes = date.toISOString().substr(14, 2);
  let hours = date.toISOString().substr(11, 2);
  let days = 0;
  let years = 0;

  if (hours > 23) {
    days += Math.floor(hours / 24);
    hours -= Math.floor(hours / 24) * 24;
  }
  if (days > 364) {
    years += Math.floor(days / 365);
    days -= Math.floor(days / 365) * 365;
  }

  // Make fixed length
  days = ('000' + days).substr(-3);
  years = ('000' + years).substr(-3);
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
    // Measure time spent on graphics
    const graphicsTimer = Date.now();

    // FPS limiter
    setTimeout(function () { requestAnimationFrame(animate); }, 1000 / frameRate) // eslint-disable-line

    // Animation
    // Update position
    sphere.position.set(allBodies[name].positionX, allBodies[name].positionY, allBodies[name].positionZ);
    sprite.position.set(300 / (camera.position.z - allBodies[name].positionZ) * allBodies[name].positionX + 10, 300 / (camera.position.z - allBodies[name].positionZ) * allBodies[name].positionY + 10, camera.position.z - 300);
    // Draw trajectory if not frozen
    if (!allBodies[name].frozen) {
      const points = [];
      points.push(new THREE.Vector3(lastpos.x, lastpos.y, lastpos.z)); // eslint-disable-line
      points.push(new THREE.Vector3(allBodies[name].positionX, allBodies[name].positionY, allBodies[name].positionZ)); // eslint-disable-line
      const lineGeometry = new THREE.BufferGeometry().setFromPoints(points); // eslint-disable-line
      let line;

      // Check if going over the escape velocity, use appropriate color
      const delta = {
        x: allBodies[allBodies[name].primaryBody].positionX - allBodies[name].positionX,
        y: allBodies[allBodies[name].primaryBody].positionY - allBodies[name].positionY,
        z: allBodies[allBodies[name].primaryBody].positionZ - allBodies[name].positionZ
      };
      const distanceVector = new p5.Vector(delta.x, delta.y, delta.z); // eslint-disable-line
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
    document.getElementById('graphics').innerHTML = `Graphics took ${Date.now() - graphicsTimer} ms`;
  };

  animate();
}

if (confirm('Create default bodies?')) { // eslint-disable-line
  init(true);
} else {
  init(false);
}
