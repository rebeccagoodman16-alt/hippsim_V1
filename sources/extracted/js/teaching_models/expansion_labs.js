/* Extracted from Little Neural Guide expansion-labs.js */
defineLab(24,'Follow attenuation along a passive cable',[
param('length_constant','Length constant λ (µm)',100,700,25,300,'A larger electrical length constant lets a DC deflection spread farther.'),param('source_voltage','Source deflection (mV)',1,15,0.5,10,'Voltage relative to rest at the source.')],['Distance (µm)','Voltage deflection (mV)'],'Does doubling λ change the attenuation at the same physical distance?','The ratio x/λ determines attenuation in this ideal cable. Larger λ means less loss per micrometer.','Uniform semi-infinite passive cable at steady state; V(x)=V0 exp(−x/λ). Branching, boundaries and active currents omitted.',p=>({'Cable profile':sequence(0,1000).map(x=>[x,p.source_voltage*Math.exp(-x/p.length_constant)])}),`    points = []
    for step in range(201):
        distance = 1000 * step / 200
        voltage = source_voltage * math.exp(-distance / length_constant)
        points.append([distance, voltage])
    return {"Cable profile": points}`,{length_constant:600});
defineLab(25,'Connect a dendrite to a soma',[
param('axial_coupling','Axial coupling (nS)',0,20,0.5,5,'Moves current between the compartments according to their voltage difference.'),param('dendritic_input','Dendritic current (pA)',0,150,5,100,'Only the dendritic compartment receives external current.')],['Time (ms)','Deflection from rest (mV)'],'Which compartment responds when coupling is zero?','Dendritic drive changes local voltage first; coupling carries current to the soma. Stronger coupling reduces the voltage difference.','Two passive compartments, each C=100 pF and leak=5 nS. dVs/dt=[−5Vs+gc(Vd−Vs)]/100; dVd/dt=[I−5Vd−gc(Vd−Vs)]/100. Euler dt=0.05 ms.',p=>{let s=0,d=0,a=[],b=[];for(let k=0;k<=4000;k++){if(k%10===0){a.push([k*.05,s]);b.push([k*.05,d])}let axial=p.axial_coupling*(d-s),ds=(-5*s+axial)/100,dd=(p.dendritic_input-5*d-axial)/100;s+=.05*ds;d+=.05*dd}return {'Somatic deflection':a,'Dendritic deflection':b}},`    soma, dendrite = 0.0, 0.0
    soma_points, dendrite_points = [], []
    for step in range(4001):
        if step % 10 == 0:
            soma_points.append([step * 0.05, soma])
            dendrite_points.append([step * 0.05, dendrite])
        axial_current = axial_coupling * (dendrite - soma)
        soma_slope = (-5 * soma + axial_current) / 100
        dendrite_slope = (dendritic_input - 5 * dendrite - axial_current) / 100
        soma += 0.05 * soma_slope
        dendrite += 0.05 * dendrite_slope
    return {"Somatic deflection": soma_points, "Dendritic deflection": dendrite_points}`,{axial_coupling:0});
defineLab(26,'Scale area without changing membrane densities',[
param('area_scale','Relative membrane area',0.5,4,0.25,1,'Scales total capacitance and leak together.'),param('total_current','Fixed total input (pA)',10,150,5,100,'Keep this fixed to distinguish total current from current density.')],['Time (ms)','Deflection (mV)'],'Can response amplitude change while the time constant stays fixed?','Here C and g scale together, so C/g stays fixed. With fixed total current, increased area lowers the final voltage deflection.','Reference C=100 pF, g=10 nS; both multiply by area scale. Passive step response from rest, no active channels.',p=>({'Voltage deflection':sequence(0,100).map(t=>[t,p.total_current/(10*p.area_scale)*(1-Math.exp(-t/10))])}),`    total_capacitance = 100 * area_scale
    total_leak = 10 * area_scale
    time_constant = total_capacitance / total_leak
    points = []
    for step in range(201):
        time = 100 * step / 200
        deflection = (total_current / total_leak) * (1 - math.exp(-time / time_constant))
        points.append([time, deflection])
    return {"Voltage deflection": points}`,{area_scale:2});
defineLab(27,'Compare a local and transferred response',[
param('dendritic_leak','Dendritic leak (nS)',2,25,0.5,5,'Local membrane escape pathways affect both responses.'),param('dendritic_input','Dendritic input (pA)',10,150,5,100,'A fixed current enters the dendrite.')],['Axial coupling gc (nS)','Steady deflection (mV)'],'Does a small somatic response imply a small local response?','Weak coupling can leave a large local deflection but little somatic transfer. Recording both sites helps separate those effects.','Steady two-compartment passive solution, gs=5 nS. Coupling is swept directly; it is not calibrated to anatomical distance.',p=>{let a=[],b=[];for(const g of sequence(0,20)){let D=5*p.dendritic_leak+g*(5+p.dendritic_leak);a.push([g,g*p.dendritic_input/D]);b.push([g,(5+g)*p.dendritic_input/D])}return {'Somatic deflection':a,'Local dendritic deflection':b}},`    soma_points, dendrite_points = [], []
    for step in range(201):
        coupling = 20 * step / 200
        denominator = 5 * dendritic_leak + coupling * (5 + dendritic_leak)
        soma = coupling * dendritic_input / denominator
        dendrite = (5 + coupling) * dendritic_input / denominator
        soma_points.append([coupling, soma])
        dendrite_points.append([coupling, dendrite])
    return {"Somatic deflection": soma_points, "Local dendritic deflection": dendrite_points}`,{dendritic_leak:20});
defineLab(28,'Compare opposite activation tendencies',[
param('h_midpoint','H-like activation midpoint (mV)',-100,-60,2,-80,'The illustrative H-like activation rises at more negative voltages.'),param('m_midpoint','M-like activation midpoint (mV)',-70,-30,2,-50,'The illustrative M-like activation rises with depolarization.')],['Voltage (mV)','Steady activation (0–1)'],'At one held voltage, could the two currents have very different activation states?','The two curves move in opposite voltage directions. Their roles also depend on kinetics, driving force and channel density, which this activation-only plot omits.','Unfitted illustrative sigmoids: ah=1/[1+exp((V−Vh)/12)] and aM=1/[1+exp(−(V−VM)/8)]. These are not published CA1 parameter fits.',p=>({'H-like activation':sequence(-110,-20).map(v=>[v,sigmoid(-(v-p.h_midpoint)/12)]),'M-like activation':sequence(-110,-20).map(v=>[v,sigmoid((v-p.m_midpoint)/8)])}),`    h_points, m_points = [], []
    for step in range(201):
        voltage = -110 + 90 * step / 200
        h_activation = 1 / (1 + math.exp((voltage - h_midpoint) / 12))
        m_activation = 1 / (1 + math.exp(-(voltage - m_midpoint) / 8))
        h_points.append([voltage, h_activation])
        m_points.append([voltage, m_activation])
    return {"H-like activation": h_points, "M-like activation": m_points}`,{h_midpoint:-60});
defineLab(29,'Measure response timing across frequency',[
param('restorative_strength','Restorative strength (nS)',0,40,1,20,'An effective delayed feedback strength, not a fitted channel density.'),param('restorative_tau','Restorative time constant (ms)',20,300,10,100,'Changes the frequency-dependent phase relationship.')],['Frequency (Hz)','Voltage phase (degrees)'],'Can a restorative process change phase as well as magnitude?','Phase is the argument of impedance. Here positive means voltage leads current under the chosen sinusoidal convention; negative means it lags.','Y=10+iωC+gS/(1+iωτS), C=200 pF. Z=1/Y. φ=−atan2(ImY,ReY), with ms converted to seconds.',p=>({'Restorative phase':sequence(.1,30).map(f=>{let w=2*Math.PI*f,q=w*p.restorative_tau/1000,re=10+p.restorative_strength/(1+q*q),im=w*.2-p.restorative_strength*q/(1+q*q);return [f,-Math.atan2(im,re)*180/Math.PI]}),'Passive phase':sequence(.1,30).map(f=>[f,-Math.atan2(2*Math.PI*f*.2,10)*180/Math.PI])}),`    active_points, passive_points = [], []
    for step in range(201):
        frequency = 0.1 + 29.9 * step / 200
        omega = 2 * math.pi * frequency
        delay_factor = omega * restorative_tau / 1000
        real_part = 10 + restorative_strength / (1 + delay_factor**2)
        imaginary_part = omega * 0.2 - restorative_strength * delay_factor / (1 + delay_factor**2)
        active_phase = -math.atan2(imaginary_part, real_part) * 180 / math.pi
        passive_phase = -math.atan2(omega * 0.2, 10) * 180 / math.pi
        active_points.append([frequency, active_phase])
        passive_points.append([frequency, passive_phase])
    return {"Restorative phase": active_points, "Passive phase": passive_points}`,{restorative_strength:0});
defineLab(30,'Inject a chirp into a linear cell',[
param('chirp_amplitude','Chirp amplitude (pA)',1,20,1,10,'Current amplitude, not voltage amplitude.'),param('final_frequency','Final frequency (Hz)',5,30,1,20,'Frequency rises linearly from 0.5 Hz over four seconds.'),param('restorative_strength','Restorative strength (nS)',0,40,1,20,'Adds delayed restoring current in the linear toy.')],['Time (s)','Voltage deflection (mV)'],'If the input doubles, should the linear response double?','The response contains both the changing stimulus and transient dynamics. A chirp envelope is not automatically a steady-state impedance estimate.','C=200 pF, gL=10 nS; C dv/dt=I−10v−gS w, 100 dw/dt=v−w, with t in ms. Euler dt=0.2 ms. No spikes, gate nonlinearity or fitted CA1 parameters.',p=>{let v=0,w=0,a=[],b=[];for(let k=0;k<=20000;k++){let sec=k*.0002,I=p.chirp_amplitude*Math.sin(2*Math.PI*(.5*sec+(p.final_frequency-.5)*sec*sec/8));if(k%20===0){a.push([sec,v]);b.push([sec,I])}let dv=(I-10*v-p.restorative_strength*w)/200,dw=(v-w)/100;v+=.2*dv;w+=.2*dw}return {'Voltage response':a,'Injected current':b}},`    voltage, restorative_state = 0.0, 0.0
    voltage_points, current_points = [], []
    for step in range(20001):
        seconds = step * 0.0002
        phase = 2 * math.pi * (0.5 * seconds + (final_frequency - 0.5) * seconds**2 / 8)
        current = chirp_amplitude * math.sin(phase)
        if step % 20 == 0:
            voltage_points.append([seconds, voltage])
            current_points.append([seconds, current])
        voltage_slope = (current - 10 * voltage - restorative_strength * restorative_state) / 200
        restorative_slope = (voltage - restorative_state) / 100
        voltage += 0.2 * voltage_slope
        restorative_state += 0.2 * restorative_slope
    return {"Voltage response": voltage_points, "Injected current": current_points}`,{chirp_amplitude:20});
defineLab(31,'Calculate impedance with consistent amplitudes',[
param('test_frequency','Sinusoid frequency (Hz)',1,20,1,5,'The phase and gain are fixed for each steady sinusoid.'),param('test_amplitude','Current amplitude (pA)',5,50,5,10,'The linear voltage amplitude scales with this input.')],['Time (s)','Voltage (mV)'],'Does changing input amplitude change this linear impedance?','Voltage and current amplitudes scale together. Convert mV/pA to MΩ by multiplying by 1000; phase must be measured separately.','Synthetic steady sinusoids generated from the linear admittance model: C=200 pF, gL=10 nS, gS=20 nS, τS=100 ms. Five cycles, no transient or recording noise.',p=>{let w=2*Math.PI*p.test_frequency,q=w*.1,re=10+20/(1+q*q),im=w*.2-20*q/(1+q*q),gain=1/Math.hypot(re,im),phase=-Math.atan2(im,re),a=[],b=[];for(const t of sequence(0,5/p.test_frequency,501)){a.push([t,p.test_amplitude*gain*Math.sin(w*t+phase)]);b.push([t,p.test_amplitude*Math.sin(w*t)])}return {'Voltage sinusoid':a,'Current sinusoid':b}},`    omega = 2 * math.pi * test_frequency
    delay_factor = omega * 0.1
    real_part = 10 + 20 / (1 + delay_factor**2)
    imaginary_part = omega * 0.2 - 20 * delay_factor / (1 + delay_factor**2)
    gain = 1 / math.hypot(real_part, imaginary_part)  # mV/pA
    phase = -math.atan2(imaginary_part, real_part)
    voltage_points, current_points = [], []
    for step in range(501):
        time = (5 / test_frequency) * step / 500
        voltage = test_amplitude * gain * math.sin(omega * time + phase)
        current = test_amplitude * math.sin(omega * time)
        voltage_points.append([time, voltage])
        current_points.append([time, current])
    return {"Voltage sinusoid": voltage_points, "Current sinusoid": current_points}`,{test_amplitude:30});
defineLab(32,'Watch a trajectory spiral in state space',[
param('damping','Damping a',0,0.5,0.025,0.1,'Positive damping shrinks the trajectory toward the origin.'),param('angular_speed','Angular speed ω',0.5,3,0.25,1,'Rotation speed in this dimensionless linear model.'),param('initial_radius','Starting radius',0.5,2,0.25,1,'Sets the initial state distance from the origin.')],['State x','State y'],'Does a closed trajectory necessarily attract its neighbors?','With positive damping the radius shrinks. At zero damping every initial radius persists, so the closed orbits are not attracting limit cycles.','Exact solution of dx/dt=−ax−ωy and dy/dt=ωx−ay, starting at (r0,0), over 20 time units.',p=>({'State trajectory':sequence(0,20,801).map(t=>[p.initial_radius*Math.exp(-p.damping*t)*Math.cos(p.angular_speed*t),p.initial_radius*Math.exp(-p.damping*t)*Math.sin(p.angular_speed*t)])}),`    points = []
    for step in range(801):
        time = 20 * step / 800
        radius = initial_radius * math.exp(-damping * time)
        x = radius * math.cos(angular_speed * time)
        y = radius * math.sin(angular_speed * time)
        points.append([x, y])
    return {"State trajectory": points}`,{damping:0});
defineLab(33,'Create and remove fixed points',[
param('bifurcation_mu','Control parameter μ',-1,2,0.1,1,'Positive μ allows two roots; negative μ allows none in this normal form.')],['State x','dx/dt'],'When μ crosses below zero, can the system still rest at a fixed point in this normal form?','The derivative’s zero crossings mark fixed points. For μ>0, +√μ is locally stable and −√μ is unstable. At μ=0 the root is nonhyperbolic.','Saddle-node normal form dx/dt=μ−x², not a fitted neuron. This shows a derivative-versus-state graph, not time evolution.',p=>({'Vector-field slope':sequence(-2.5,2.5).map(x=>[x,p.bifurcation_mu-x*x]),'Stable root':p.bifurcation_mu>0?[[Math.sqrt(p.bifurcation_mu),0]]:[],'Unstable root':p.bifurcation_mu>0?[[-Math.sqrt(p.bifurcation_mu),0]]:[]}),`    field_points = []
    for step in range(201):
        state = -2.5 + 5 * step / 200
        slope = bifurcation_mu - state**2
        field_points.append([state, slope])
    stable_root, unstable_root = [], []
    if bifurcation_mu > 0:
        stable_root = [[math.sqrt(bifurcation_mu), 0]]
        unstable_root = [[-math.sqrt(bifurcation_mu), 0]]
    return {"Vector-field slope": field_points, "Stable root": stable_root, "Unstable root": unstable_root}`,{bifurcation_mu:-.5});
defineLab(34,'See a stable oscillation radius emerge',[
param('hopf_mu','Control parameter μ',-0.5,1,0.05,-0.2,'Crossing zero changes the stability of the origin in this normal form.'),param('initial_radius','Starting radius',0.05,1.5,0.05,0.5,'Different positive starts can approach the same stable radius.')],['Time (model units)','Oscillation radius'],'For μ>0, do different positive starts approach the same radius?','In this supercritical normal form, the stable radius is √μ above zero. Below zero the radius decays toward the resting state.','dr/dt=μr−r³; dθ/dt=1. Euler dt=0.01 for radius, exact phase. A mechanism illustration, not a classification of your CA1 model.',p=>{let r=p.initial_radius,a=[],b=[];for(let k=0;k<=5000;k++){let t=k*.01;if(k%10===0){a.push([t,r]);b.push([r*Math.cos(t),r*Math.sin(t)])}r+=.01*(p.hopf_mu*r-r**3)}return {'Radius over time':a,'State trajectory':b}},`    radius = initial_radius
    radius_points, state_points = [], []
    for step in range(5001):
        time = step * 0.01
        if step % 10 == 0:
            radius_points.append([time, radius])
            state_points.append([radius * math.cos(time), radius * math.sin(time)])
        radius_slope = hopf_mu * radius - radius**3
        radius += 0.01 * radius_slope
    return {"Radius over time": radius_points, "State trajectory": state_points}`,{hopf_mu:.5});
defineLab(35,'Compare numerical and exact decay',[
param('integration_step','Euler step Δt (ms)',0.5,50,0.5,5,'A solver choice; it does not change the underlying equation.'),param('decay_time','True decay time τ (ms)',5,50,5,20,'The continuous model is stable for every positive τ.')],['Time (ms)','Voltage deflection (mV)'],'Could coarse stepping make a stable system look unstable?','Euler multiplies the state by 1−Δt/τ each step. For Δt/τ>2, the numerical magnitude grows although the exact solution decays.','Passive scalar decay, initial deflection 10 mV. Numerical points shown at actual Euler steps; exact reference sampled finely. This is not a recommendation to use Euler in a detailed CA1 simulation.',p=>{let v=10,a=[];for(let k=0;k<=Math.floor(200/p.integration_step);k++){a.push([k*p.integration_step,v]);v+=p.integration_step*(-v/p.decay_time)}return {'Euler approximation':a,'Exact decay':sequence(0,200,401).map(t=>[t,10*Math.exp(-t/p.decay_time)])}},`    voltage = 10.0
    numerical_points = []
    for step in range(math.floor(200 / integration_step) + 1):
        numerical_points.append([step * integration_step, voltage])
        voltage += integration_step * (-voltage / decay_time)
    exact_points = []
    for step in range(401):
        time = 200 * step / 400
        exact_points.append([time, 10 * math.exp(-time / decay_time)])
    return {"Euler approximation": numerical_points, "Exact decay": exact_points}`,{integration_step:45});
defineLab(36,'Fit the shape of a synthetic transient',[
param('fit_amplitude','Model amplitude (mV)',2,18,0.5,8,'Controls the long-time response size.'),param('fit_tau','Model time constant (ms)',5,60,1,35,'Controls the speed of approach.')],['Time (ms)','Voltage deflection (mV)'],'Can you improve the fit by changing only one parameter?','Amplitude mainly sets the asymptote; time constant sets approach speed. A good fit to one noiseless synthetic protocol is not biological validation.','Synthetic reference: 10[1−exp(−t/20)] mV, sampled at 21 times. No noise, optimization algorithm or real recordings. MSE is evaluated at those same samples.',p=>({'Model curve':sequence(0,100).map(t=>[t,p.fit_amplitude*(1-Math.exp(-t/p.fit_tau))]),'Synthetic reference':sequence(0,100,21).map(t=>[t,10*(1-Math.exp(-t/20))])}),`    model_points, reference_points = [], []
    for step in range(201):
        time = 100 * step / 200
        voltage = fit_amplitude * (1 - math.exp(-time / fit_tau))
        model_points.append([time, voltage])
    for step in range(21):
        time = 100 * step / 20
        reference_points.append([time, 10 * (1 - math.exp(-time / 20))])
    return {"Model curve": model_points, "Synthetic reference": reference_points}`,{fit_amplitude:10,fit_tau:20});
defineLab(37,'Perturb a parameter and estimate sensitivity',[
param('reference_leak','Leak conductance g (nS)',2,25,0.5,10,'The operating value around which sensitivity is evaluated.'),param('relative_perturbation','Relative perturbation ε/g',0.005,0.2,0.005,0.1,'A numerical perturbation size, not a biological measurement error.')],['Time (ms)','Sensitivity ∂V/∂g (mV/nS)'],'Does a smaller perturbation bring the finite difference closer to the analytic derivative?','Compare the two calculations. Sensitivity changes with time and the chosen operating conductance; it is specific to this observable and protocol.','Passive step V=100/g[1−exp(−tg/100)], with C=100 pF and I=100 pA. Central difference around g; both perturbed conductances remain positive.',p=>{let a=[],b=[],g=p.reference_leak,e=g*p.relative_perturbation;for(const t of sequence(0,100)){let response=h=>100/h*(1-Math.exp(-t*h/100)),finite=(response(g+e)-response(g-e))/(2*e),exact=-100/g**2*(1-Math.exp(-t*g/100))+t/g*Math.exp(-t*g/100);a.push([t,finite]);b.push([t,exact])}return {'Finite difference':a,'Analytic derivative':b}},`    finite_points, analytic_points = [], []
    perturbation = reference_leak * relative_perturbation
    for step in range(201):
        time = 100 * step / 200
        upper_g = reference_leak + perturbation
        lower_g = reference_leak - perturbation
        upper_voltage = 100 / upper_g * (1 - math.exp(-time * upper_g / 100))
        lower_voltage = 100 / lower_g * (1 - math.exp(-time * lower_g / 100))
        finite_difference = (upper_voltage - lower_voltage) / (2 * perturbation)
        decay = math.exp(-time * reference_leak / 100)
        analytic = -100 / reference_leak**2 * (1 - decay) + time / reference_leak * decay
        finite_points.append([time, finite_difference])
        analytic_points.append([time, analytic])
    return {"Finite difference": finite_points, "Analytic derivative": analytic_points}`,{relative_perturbation:.01});
defineLab(38,'Change two parameters without changing one observation',[
param('parameter_scale','Shared scale for C and g',0.5,4,0.25,1,'Multiplies both capacitance and conductance, keeping their ratio fixed.')],['Time (ms)','Normalized deflection'],'If the normalized curves overlap, are the underlying capacitances necessarily equal?','The normalized curve only sees τ=C/g. The absolute response to known current additionally contains I/g, so it can distinguish these scaled parameter pairs.','Reference C=100 pF, g=10 nS, current=100 pA. First panel normalizes response amplitude; second retains absolute voltage. No noise or parameter-likelihood calculation.',p=>({'Normalized scaled':sequence(0,100).map(t=>[t,1-Math.exp(-t/10)]),'Normalized reference':sequence(0,100).map(t=>[t,1-Math.exp(-t/10)]),'Absolute scaled':sequence(0,100).map(t=>[t,10/p.parameter_scale*(1-Math.exp(-t/10))]),'Absolute reference':sequence(0,100).map(t=>[t,10*(1-Math.exp(-t/10))])}),`    capacitance = 100 * parameter_scale
    conductance = 10 * parameter_scale
    time_constant = capacitance / conductance
    normalized, reference, absolute, absolute_reference = [], [], [], []
    for step in range(201):
        time = 100 * step / 200
        scaled_shape = 1 - math.exp(-time / time_constant)
        reference_shape = 1 - math.exp(-time / 10)
        normalized.append([time, scaled_shape])
        reference.append([time, reference_shape])
        absolute.append([time, 100 / conductance * scaled_shape])
        absolute_reference.append([time, 10 * reference_shape])
    return {"Normalized scaled": normalized, "Normalized reference": reference, "Absolute scaled": absolute, "Absolute reference": absolute_reference}`,{parameter_scale:3});
defineLab(39,'Carry a parameter range into predictions',[
param('mean_tau','Central time constant (ms)',20,50,1,25,'The central scenario, not an estimate fitted here.'),param('tau_span','Time-constant half-range (ms)',0,15,1,5,'Three scenarios use central minus span, central, and central plus span.')],['Time (ms)','Voltage deflection (mV)'],'At what times are differences between the scenarios most visible?','Time constants change the transient while the fixed amplitude makes all scenarios approach 10 mV. The three lines are scenarios, not statistical confidence bounds.','V(t;τ)=10[1−exp(−t/τ)]. All three τ values are positive. No parameter distribution, data fit or 95% coverage is assumed.',p=>({'Lower τ scenario':sequence(0,150).map(t=>[t,10*(1-Math.exp(-t/(p.mean_tau-p.tau_span)))]),'Central scenario':sequence(0,150).map(t=>[t,10*(1-Math.exp(-t/p.mean_tau))]),'Higher τ scenario':sequence(0,150).map(t=>[t,10*(1-Math.exp(-t/(p.mean_tau+p.tau_span)))])}),`    lower_points, central_points, higher_points = [], [], []
    for step in range(201):
        time = 150 * step / 200
        lower_tau = mean_tau - tau_span
        higher_tau = mean_tau + tau_span
        lower_points.append([time, 10 * (1 - math.exp(-time / lower_tau))])
        central_points.append([time, 10 * (1 - math.exp(-time / mean_tau))])
        higher_points.append([time, 10 * (1 - math.exp(-time / higher_tau))])
    return {"Lower τ scenario": lower_points, "Central scenario": central_points, "Higher τ scenario": higher_points}`,{tau_span:15});
