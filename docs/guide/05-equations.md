---
title: Equations and numerics
---
Every single-cell and circuit model solves the compartmental cable equation on the reconstruction. For compartment *i* with neighbours *j*:

```latex
C_i \frac{dV_i}{dt} = -\sum_{\mathrm{ion}} g_{\mathrm{ion},i}(V_i,t)\,(V_i - E_{\mathrm{ion}}) - g_{L,i}(V_i - E_L) + \sum_{j} g_{ij}\,(V_j - V_i) + I_{\mathrm{inj},i}(t) + I_{\mathrm{syn},i}(t)
```

Channel conductances follow gating variables; for Hodgkin–Huxley Na⁺ and K⁺:

```latex
g_{\mathrm{Na}} = \bar g_{\mathrm{Na}}\, m^3 h, \qquad g_{\mathrm{K}} = \bar g_{\mathrm{K}}\, n^4, \qquad \frac{dx}{dt} = \frac{x_\infty(V) - x}{\tau_x(V)}, \quad x \in \{m, h, n\}
```

The population model is a leaky integrate-and-fire network (Brunel 2000):

```latex
\tau \frac{dV_k}{dt} = -V_k + R I_k(t), \qquad V_k > \theta \Rightarrow \text{spike},\; V_k \leftarrow V_r \text{ for } \tau_{rp}
```

| Step | Method |
| --- | --- |
| Discretization | Hodgkin–Huxley (`hs-cable.js`): compartments ≤ 20 µm along unbranched paths; soma = one compartment with sphere area. Migliore, research, circuit (NGC): 20–25 µm compartments; a 200 µm axon stub when no axon is traced |
| Voltage | Backward Euler, solved exactly on the tree by Hines elimination (O(N) per step), as NEURON's default |
| Gates | Exponential Euler with rate tables (−120 to +80 mV) |
| Time step | 0.025 ms (HH, Migliore), 0.05 ms (research model, circuit), 0.1 ms (population, exact LIF decay) |
| Spikes | Soma crossing 0 mV, counted during the stimulus window |
| Synapses | Double-exponential conductances; NMDA with Mg²⁺ block (Jahr & Stevens 1990) |
| Units | mV, ms, nA, µS, nF, µm |

The NGC engine (Migliore, research model, circuit) is copied unchanged from the lab's Little Neural Guide at build time (`site/hs-ngc.js`), so the Simulate panel and the Neuron lab run identical code.
