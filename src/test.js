// hawkes_process_demo.js
// Single-file demo of a Hawkes process with exponential kernel in Node.js
// - Simulates events (fictitious opportunities)
// - For each event prints the current intensity and
//   the probability of a new event in the next H seconds.

// ====================== CONFIG ======================

// Baseline intensity (events per second)
const MU = 0.01;

// Self-excitation jump added by each event
const ALPHA = 0.03;

// Decay rate of excitation (1/second). Typically alpha / beta < 1.
const BETA = 0.2;

// Total simulation time in seconds
const SIMULATION_HORIZON = 3600; // 1 hour

// Horizon to compute probability of at least one event in the future
const HORIZON_PROB_SECONDS = 60; // next 60 seconds

// ====================== HAWKES FILTER (ONLINE) ======================

class HawkesFilter {
  constructor(mu, alpha, beta) {
    this.mu = mu;
    this.alpha = alpha;
    this.beta = beta;

    this.g = 0; // excitation term at lastTime
    this.lastTime = 0;
    this.initialized = false;
  }

  // Move state forward in time, decaying excitation
  updateToTime(t) {
    if (!this.initialized) {
      this.lastTime = t;
      this.initialized = true;
      return;
    }
    const dt = t - this.lastTime;
    if (dt > 0) {
      this.g *= Math.exp(-this.beta * dt);
      this.lastTime = t;
    }
  }

  // Register a new event at time t
  addEvent(t) {
    this.updateToTime(t);
    this.g += this.alpha;
  }

  // Intensity at time t: lambda(t) = mu + g(t)
  intensityAt(t) {
    this.updateToTime(t);
    return this.mu + this.g;
  }

  // Probability of at least one event in [t, t + H]
  probEventInHorizon(t, H) {
    this.updateToTime(t);
    const gNow = this.g;

    // Integral of intensity over [t, t+H]:
    // ∫ (mu + gNow * exp(-beta * (u - t))) du
    // = mu * H + gNow * (1 - exp(-beta * H)) / beta
    const lambdaIntegral =
      this.mu * H +
      (gNow * (1 - Math.exp(-this.beta * H))) / this.beta;

    // Poisson with mean = lambdaIntegral: P(no events) = exp(-lambdaIntegral)
    // => P(at least one) = 1 - exp(-lambdaIntegral)
    const prob = 1 - Math.exp(-lambdaIntegral);
    return prob;
  }
}

// ====================== HAWKES SIMULATOR (OGATA) ======================

// Simulate event times for Hawkes(mu, alpha, beta) on [0, T]
function simulateHawkes(mu, alpha, beta, T) {
  const events = [];
  let t = 0;
  let g = 0; // excitation term at current time t

  while (t < T) {
    const lambdaStar = mu + g; // upper bound on intensity (decays between events)
    if (lambdaStar <= 0) break;

    // Sample candidate waiting time from Exp(lambdaStar)
    const u1 = Math.random();
    const w = -Math.log(u1) / lambdaStar;
    const tCandidate = t + w;
    if (tCandidate >= T) break;

    // Decay g during w seconds
    const gCandidate = g * Math.exp(-beta * w);
    const lambdaCandidate = mu + gCandidate;

    // Accept with probability lambdaCandidate / lambdaStar
    const u2 = Math.random();
    if (u2 <= lambdaCandidate / lambdaStar) {
      // Accept
      t = tCandidate;
      g = gCandidate + alpha;
      events.push(t);
    } else {
      // Reject; just move time and excitation
      t = tCandidate;
      g = gCandidate;
    }
  }

  return events;
}

// ====================== DEMO ======================

function runDemo() {
  console.log('Simulating Hawkes process (fictitious opportunities)...');
  console.log(`Parameters: mu=${MU}, alpha=${ALPHA}, beta=${BETA}`);
  console.log(`Simulation horizon: ${SIMULATION_HORIZON} seconds\n`);

  const events = simulateHawkes(MU, ALPHA, BETA, SIMULATION_HORIZON);

  console.log(`Generated ${events.length} events in ${SIMULATION_HORIZON} seconds.`);
  if (events.length === 0) {
    console.log('No events generated with these parameters. Increase MU or ALPHA.');
    return;
  }

  const filter = new HawkesFilter(MU, ALPHA, BETA);

  console.log(
    '\nEvent timeline with realtime intensity and probability of new event:'
  );
  console.log(
    'time(s)\tintensity(t)\tP(event in next ' +
      HORIZON_PROB_SECONDS +
      's)'
  );

  for (let i = 0; i < events.length; i++) {
    const t = events[i];

    // New opportunity observed at time t
    filter.addEvent(t);

    const lambdaNow = filter.intensityAt(t);
    const probNextH = filter.probEventInHorizon(t, HORIZON_PROB_SECONDS);

    console.log(
      `${t.toFixed(2)}\t${lambdaNow.toFixed(4)}\t\t${probNextH.toFixed(4)}`
    );
  }

  // Show what happens some time after the last event
  const lastEventTime = events[events.length - 1];
  const queryTime = lastEventTime + 120; // 2 minutes after last event
  const lambdaLater = filter.intensityAt(queryTime);
  const probLater = filter.probEventInHorizon(
    queryTime,
    HORIZON_PROB_SECONDS
  );

  console.log('\nAfter some time without events:');
  console.log(
    `At t = ${queryTime.toFixed(
      2
    )} (2min after last event): intensity = ${lambdaLater.toFixed(
      4
    )}, P(event in next ${HORIZON_PROB_SECONDS}s) = ${probLater.toFixed(4)}`
  );
}

runDemo();
