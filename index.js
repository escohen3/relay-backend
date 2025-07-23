import Rive from '@rive-app/canvas';

window.addEventListener("DOMContentLoaded", () => {
  const crowCanvas = document.getElementById("crow");
  const wasmUrl = chrome.runtime.getURL('canvas_advanced.wasm');
  const rivPath = chrome.runtime.getURL('images/crow_header.riv');

  Rive.RuntimeLoader.setWasmUrl(wasmUrl);
  Rive.RuntimeLoader.loadRuntime();

  const checkLoaded = setInterval(() => {
    if (Rive.RuntimeLoader.isLoaded) {
      clearInterval(checkLoaded);

      new Rive({
        src: rivPath,
        canvas: crowCanvas,
        autoplay: true,
        artboard: "newHeader",
        stateMachines: "State Machine 1",
        onLoad: () => console.log("✅ crow_header.riv loaded")
      });
    }
  }, 100);
});


/*
let crowOverInput = null;
let crowIsReady = false;

// Set the correct WASM path for local use
rive.RuntimeLoader.setWasmUrl('canvas_advanced.wasm');
rive.RuntimeLoader.loadRuntime();

// Wait until runtime is ready before initializing animations
function initRiveAnimations() {
  const crowCanvas = document.getElementById("crow");
  const crowLandingCanvas = document.getElementById("crowLanding");
  const bigCircleCanvas = document.querySelector('#main-view #bigCircle');

  // Header crow
  if (crowCanvas) {
    new rive.Rive({
      src: "images/crow_header.riv",
      canvas: crowCanvas,
      autoplay: true,
      artboard: "newHeader",
      stateMachines: "State Machine 1",
      onLoad: () => {
        console.log("✅ crow_header.riv loaded");
      }
    });
  }

  // Landing crow
  if (crowLandingCanvas) {
    const rlanding = new rive.Rive({
      src: "images/crow_header.riv",
      canvas: crowLandingCanvas,
      autoplay: true,
      artboard: "rl_headerLanding",
      stateMachines: "State Machine 1",
      onLoad: () => {
        rlanding.resizeDrawingSurfaceToCanvas();
      }
    });
  }

  // Big Circle detail
  if (bigCircleCanvas) {
    new rive.Rive({
      src: "images/bigCircle.riv",
      fit: rive.Fit.Cover,
      canvas: bigCircleCanvas,
      autoplay: true,
      artboard: "bigCircle",
      stateMachines: ["State Machine 1"]
    });
  }
}

// Use a polling approach to ensure runtime is ready before execution
function waitForRiveRuntime(callback, maxWait = 1000) {
  const start = performance.now();
  (function check() {
    if (rive?.RuntimeLoader?.isLoaded) {
      callback();
    } else if (performance.now() - start < maxWait) {
      requestAnimationFrame(check);
    } else {
      console.warn("⏰ Rive runtime load timed out.");
    }
  })();
}

waitForRiveRuntime(initRiveAnimations);
*/
