/**
 * syamsulhudauul.github.io — Smooth micro-animations & interactive architecture
 * Zero external dependencies. High performance (requestAnimationFrame / IntersectionObserver).
 */

document.addEventListener("DOMContentLoaded", () => {
  initSpotlight();
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

/* 2. Scroll-Triggered Reveal with Stagger */
function initScrollReveal() {
  // Automatically tag key elements for smooth entrance
  const elementsToReveal = document.querySelectorAll(
    ".hero h1, .hero .lede, .hero .btn-row, .proof, .sec-title, .sec-sub, .card, .service, .process li, .interactive-pipeline"
  );

  elementsToReveal.forEach((el, index) => {
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

/* 3. Interactive Live AI Agent Pipeline Simulation */
function initPipelineSimulator() {
  const pipeline = document.getElementById("agentPipeline");
  if (!pipeline) return;

  const steps = pipeline.querySelectorAll(".pipeline-step");
  const logBox = pipeline.querySelector(".pipeline-live-log");
  const triggerBtn = pipeline.querySelector("#runTraceBtn");

  const traces = [
    {
      query: "Cari kopi arabika gayo 250g beans",
      guard: "Prompt Guard: Safe (0 injection detected)",
      route: "Go ReAct Agent: parallel tool dispatch [search_catalog, check_stock]",
      search: "Hybrid ES: BM25 + kNN HNSW (RRF rank, p50: 28ms, NDCG: 0.82)",
      llm: "LiteLLM Gateway: Gemini / Claude routing (latency: 1.1s, cost: $0.0004)",
      eval: "CI Eval Gate: 100% assertions satisfied"
    },
    {
      query: "Susu oatmilk barista 1 liter ada promo?",
      guard: "Prompt Guard: Safe (e-commerce intent verified)",
      route: "Go ReAct Agent: [search_catalog, fetch_active_promos, check_inventory]",
      search: "Hybrid ES: Custom Indonesian verb analyzer, p50: 31ms",
      llm: "LiteLLM Gateway: Stream tokens (TTFT: 240ms, total: 920ms)",
      eval: "CI Eval Gate: Relevance score 94/100"
    }
  ];

  let traceIndex = 0;
  let isRunning = false;

  async function runTrace() {
    if (isRunning) return;
    isRunning = true;
    if (triggerBtn) triggerBtn.disabled = true;

    const t = traces[traceIndex % traces.length];
    traceIndex++;

    // Reset steps
    steps.forEach((s) => {
      s.classList.remove("active", "done");
    });

    if (logBox) logBox.innerHTML = `<span class="trace-query">&gt; Incoming: "${t.query}"</span>`;

    const sequence = [
      { step: 0, text: t.guard, delay: 350 },
      { step: 1, text: t.route, delay: 450 },
      { step: 2, text: t.search, delay: 500 },
      { step: 3, text: t.llm, delay: 600 },
      { step: 4, text: t.eval, delay: 400 }
    ];

    for (let i = 0; i < sequence.length; i++) {
      const item = sequence[i];
      if (steps[item.step]) {
        steps[item.step].classList.add("active");
      }
      if (logBox) {
        const line = document.createElement("div");
        line.className = "trace-log-line";
        line.innerHTML = `<span>[Phase ${item.step + 1}]</span> ${item.text}`;
        logBox.appendChild(line);
        logBox.scrollTop = logBox.scrollHeight;
      }
      await new Promise((r) => setTimeout(r, item.delay));
      if (steps[item.step]) {
        steps[item.step].classList.remove("active");
        steps[item.step].classList.add("done");
      }
    }

    if (logBox) {
      const doneLine = document.createElement("div");
      doneLine.className = "trace-success";
      doneLine.innerHTML = `✔ Turn complete. Deterministic, low-latency response dispatched.`;
      logBox.appendChild(doneLine);
    }

    isRunning = false;
    if (triggerBtn) triggerBtn.disabled = false;
  }

  // Trigger on click
  if (triggerBtn) {
    triggerBtn.addEventListener("click", runTrace);
  }

  // Run automatically once when pipeline enters view
  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        runTrace();
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.3 });

  observer.observe(pipeline);
}
