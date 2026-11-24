/**
 * syamsulhudauul.github.io — Smooth micro-animations & interactive architecture
 * Zero external dependencies. High performance (requestAnimationFrame / IntersectionObserver).
 */

document.addEventListener("DOMContentLoaded", () => {
  initSpotlight();
  initSignalMap();
  initScrollReveal();
  initPipelineSimulator();
});

/* 1. Dynamic Cursor Spotlight on Cards & Surfaces */
function initSpotlight() {
  const targets = document.querySelectorAll(".card, .service, .proof > div, .interactive-pipeline, .btn-primary");
  
  targets.forEach((el) => {
    el.addEventListener("mousemove", (e) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      el.style.setProperty("--mouse-x", `${x}px`);
      el.style.setProperty("--mouse-y", `${y}px`);
    });
  });
}

/* 2. Low-cost, accessible hero signal map; CSS handles motion, no frame loop. */
function initSignalMap() {
  const visual = document.getElementById("signalVisual");
  const button = document.getElementById("signalToggle");
  const status = document.getElementById("signalStatus");
  if (!visual || !button || !status) return;

  button.hidden = false;
  button.addEventListener("click", () => {
    const scattered = button.getAttribute("aria-pressed") !== "true";
    visual.classList.toggle("is-scattered", scattered);
    button.setAttribute("aria-pressed", String(scattered));
    button.textContent = scattered ? "Reconnect signals" : "Spread signals";
    status.textContent = scattered ? "The signals are spread apart." : "The signals are connected.";
  });

  if (!("IntersectionObserver" in window)) {
    visual.classList.add("is-in-view");
    return;
  }
  const observer = new IntersectionObserver(([entry]) => {
    visual.classList.toggle("is-in-view", entry.isIntersecting);
  }, { threshold: 0.05 });
  observer.observe(visual);
}

/* 3. Scroll-Triggered Reveal with Stagger */
function initScrollReveal() {
  // Automatically tag key elements for smooth entrance
  if (!("IntersectionObserver" in window) || matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const elementsToReveal = document.querySelectorAll(
    ".hero h1, .hero .lede, .hero .btn-row, .signal-visual, .proof, .sec-title, .sec-sub, .card, .service, .process li, .interactive-pipeline"
  );

  elementsToReveal.forEach((el) => {
    el.classList.add("reveal");
  });

  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          obs.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
  );

  elementsToReveal.forEach((el) => observer.observe(el));
}

/* 4. Example request through the commerce architecture */
function initPipelineSimulator() {
  const pipeline = document.getElementById("agentPipeline");
  if (!pipeline) return;

  const steps = pipeline.querySelectorAll(".pipeline-step");
  const log = pipeline.querySelector(".pipeline-live-log");
  const button = pipeline.querySelector("#runTraceBtn");
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const messages = [
    "The gateway accepts the request and opens a streaming connection.",
    "The orchestrator asks the model which catalogue tool to call.",
    "The MCP bridge validates the tool arguments and calls the commerce backend.",
    "The search and inventory services return product and stock information.",
    "The gateway streams the answer back to the shopper."
  ];

  button.hidden = false;
  button.addEventListener("click", async () => {
    if (button.getAttribute("aria-disabled") === "true") return;
    button.setAttribute("aria-disabled", "true");
    log.hidden = false;
    log.textContent = 'Example query: “Susu oatmilk barista 1 liter ada promo?”';
    steps.forEach(step => step.classList.remove("active", "done"));

    for (const [index, step] of steps.entries()) {
      step.classList.add("active");
      const line = document.createElement("div");
      line.textContent = messages[index];
      log.append(line);
      if (!reducedMotion.matches) {
        await new Promise(resolve => setTimeout(resolve, 350));
      }
      step.classList.replace("active", "done");
    }

    button.removeAttribute("aria-disabled");
  });
}
