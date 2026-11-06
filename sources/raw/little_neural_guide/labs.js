/* Numerical teaching labs. Each Python model is checked against its browser counterpart. */
const labs=[];
const sequence=(start,end,count=201)=>Array.from({length:count},(_,i)=>start+(end-start)*i/(count-1));
const sigmoid=value=>1/(1+Math.exp(-value));
function defineLab(index,title,parameters,axes,predict,explain,assumptions,compute,python,preset){labs[index]={title,parameters,axes,predict,explain,assumptions,compute,python,preset}}
const param=(name,label,min,max,step,value,help)=>({name,label,min,max,step,value,help});
defineLab(0,'Charge a passive membrane',[
param('capacitance','Capacitance C (pF)',50,400,10,100,'A larger charge store changes voltage more slowly.'),param('leak','Leak conductance gL (nS)',2,30,1,10,'Larger leak pulls voltage back toward rest more strongly.'),param('input_current','Input current (pA)',0,200,5,100,'Positive current enters the cell.')],['Time (ms)','Voltage (mV)'],'If you double capacitance, does the final voltage change or only the approach?','With leak fixed, capacitance changes the time constant C/gL. The final deflection is input/leak.','Passive single compartment; rest = −65 mV; constant step input; no spikes or active gates.',p=>({'Voltage':sequence(0,150).map(t=>[t,-65+p.input_current/p.leak*(1-Math.exp(-t*p.leak/p.capacitance))])}),`    points = []
    resting_voltage = -65.0
    time_constant = capacitance / leak  # ms
    for step in range(201):
        time = 150.0 * step / 200
        voltage = resting_voltage + (input_current / leak) * (1 - math.exp(-time / time_constant))
        points.append([time, voltage])
    return {"Voltage": points}`,{capacitance:200});
defineLab(1,'Move the driving force',[
param('conductance','Open conductance g (nS)',0,20,0.5,5,'This changes the slope of the current–voltage line.'),param('reversal','Reversal potential E (mV)',-100,60,5,-75,'Current crosses zero here.')],['Voltage (mV)','Outward current (pA)'],'Will changing conductance move the zero-current voltage?','Conductance changes the slope. Reversal shifts the zero crossing. If conductance is zero, current is zero at every voltage.','Fixed open conductance; no gate dynamics. Positive current is outward.',p=>({'Current':sequence(-100,60).map(v=>[v,p.conductance*(v-p.reversal)])}),`    points = []
    for step in range(201):
        voltage = -100 + 160 * step / 200
        current = conductance * (voltage - reversal)
        points.append([voltage, current])
    return {"Current": points}`,{conductance:10});
defineLab(2,'Watch a gate approach its target',[
param('initial_gate','Initial gate m₀',0,1,0.05,0.1,'Gate states range from zero to one.'),param('target_gate','Target m∞',0,1,0.05,0.8,'The target is held fixed, as if voltage were clamped.'),param('gate_tau','Gate time constant τ (ms)',0.5,15,0.5,2,'A larger time constant means slower relaxation.')],['Time (ms)','Gate state m'],'Does a slower gate settle at a different target?','The time constant changes speed. The target determines where the gate settles. At one time constant, about 37% of the starting difference remains.','Fixed-voltage gate relaxation, not the full coupled HH model.',p=>({'Gate state':sequence(0,50).map(t=>[t,p.target_gate+(p.initial_gate-p.target_gate)*Math.exp(-t/p.gate_tau)])}),`    points = []
    for step in range(201):
        time = 50.0 * step / 200
        gate = target_gate + (initial_gate - target_gate) * math.exp(-time / gate_tau)
        points.append([time, gate])
    return {"Gate state": points}`,{gate_tau:8});
defineLab(3,'Compare instantaneous current budgets',[
param('h_conductance','Fixed open h-like conductance',0,5,0.1,0.8,'mS/cm². This is a fixed conductance, not an HCN gating model.'),param('k_conductance','Fixed open K-like conductance',0,5,0.1,2,'mS/cm². Potassium reversal is held at −90 mV.'),param('input_current','Input current density',0,20,0.5,3,'µA/cm²; inward-positive input.')],['Voltage (mV)','Instantaneous dV/dt (mV/ms)'],'Can adding an inward current change the sign of the voltage slope?','Adding a conductance changes the net current at a given voltage. The zero crossing is an instantaneous balance for these fixed conductances.','Leak = 1 mS/cm², EL = −65 mV, Eh = −30 mV, C = 1 µF/cm². Gates and axial current omitted.',p=>({'Voltage slope':sequence(-90,-30).map(v=>[v,p.input_current-(v+65)-p.k_conductance*(v+90)-p.h_conductance*(v+30)])}),`    points = []
    for step in range(201):
        voltage = -90 + 60 * step / 200
        leak_current = voltage + 65
        potassium_current = k_conductance * (voltage + 90)
        h_current = h_conductance * (voltage + 30)
        slope = input_current - leak_current - potassium_current - h_current
        points.append([voltage, slope])
    return {"Voltage slope": points}`,{h_conductance:3});
defineLab(4,'Same voltage, different internal state',[
param('initial_recovery','Initial recovery w₀',-1,2,0.1,0,'A hidden state can change the future despite the same initial voltage.'),param('input_drive','Input I',0,1.5,0.05,0.5,'Dimensionless constant drive.')],['Time (model units)','State (dimensionless)'],'If initial voltage stays fixed but recovery changes, will the trajectories match?','Both variables evolve together. A voltage-like trace alone is only one view of the model state.','FitzHugh–Nagumo-style toy: dv/dt=v−v³/3−w+I; dw/dt=(v+0.7−0.8w)/12.5. Euler dt=0.02; not CA1.',p=>{let v=0,w=p.initial_recovery,a=[],b=[];for(let k=0;k<=5000;k++){if(k%10===0){a.push([k*.02,v]);b.push([k*.02,w])}let dv=v-v**3/3-w+p.input_drive,dw=(v+.7-.8*w)/12.5;v+=.02*dv;w+=.02*dw}return {'Voltage-like v':a,'Recovery w':b}},`    voltage, recovery = 0.0, initial_recovery
    voltage_points, recovery_points = [], []
    time_step = 0.02
    for step in range(5001):
        if step % 10 == 0:
            voltage_points.append([step * time_step, voltage])
            recovery_points.append([step * time_step, recovery])
        voltage_slope = voltage - voltage**3 / 3 - recovery + input_drive
        recovery_slope = (voltage + 0.7 - 0.8 * recovery) / 12.5
        voltage += time_step * voltage_slope
        recovery += time_step * recovery_slope
    return {"Voltage-like v": voltage_points, "Recovery w": recovery_points}`,{initial_recovery:1});
defineLab(5,'Move the nullclines',[
param('input_drive','Input I',-1,1.5,0.05,0.5,'Moves the voltage nullcline vertically.'),param('recovery_offset','Recovery offset a',0,1.5,0.05,0.7,'Moves the recovery nullcline.'),param('recovery_scale','Recovery coefficient b',0.3,2,0.05,0.8,'Changes the recovery-nullcline slope.')],['Voltage-like v','Recovery w'],'Do intersections alone tell you which fixed points are stable?','The cubic marks dv/dt=0; the straight line marks dw/dt=0. Their intersections are candidate fixed points, not a stability verdict.','Same dimensionless two-state toy as the preceding lesson. This plot shows nullclines, not trajectories.',p=>({'v-nullcline':sequence(-2.5,2.5).map(v=>[v,v-v**3/3+p.input_drive]),'w-nullcline':sequence(-2.5,2.5).map(v=>[v,(v+p.recovery_offset)/p.recovery_scale])}),`    voltage_nullcline, recovery_nullcline = [], []
    for step in range(201):
        voltage = -2.5 + 5 * step / 200
        voltage_nullcline.append([voltage, voltage - voltage**3 / 3 + input_drive])
        recovery_nullcline.append([voltage, (voltage + recovery_offset) / recovery_scale])
    return {"v-nullcline": voltage_nullcline, "w-nullcline": recovery_nullcline}`,{input_drive:0});
defineLab(6,'Perturb a fixed point',[
param('growth_rate','Growth rate λ',-0.3,0.3,0.02,-0.2,'Negative shrinks; positive grows in this linear example.'),param('initial_deviation','Initial disturbance δ₀',0.01,0.3,0.01,0.1,'Keep disturbances small when interpreting a local approximation.')],['Time (model units)','Deviation δ'],'What happens when growth rate crosses zero?','A negative growth rate restores the state. A positive rate amplifies deviations. At zero the linear model leaves the deviation unchanged; nonlinear terms would decide more.','Scalar linearization only: dδ/dt=λδ. Large deviations may leave the valid local regime.',p=>({'Deviation':sequence(0,10).map(t=>[t,p.initial_deviation*Math.exp(p.growth_rate*t)])}),`    points = []
    for step in range(201):
        time = 10 * step / 200
        deviation = initial_deviation * math.exp(growth_rate * time)
        points.append([time, deviation])
    return {"Deviation": points}`,{growth_rate:0.2});
defineLab(7,'From passive filtering to a resonance peak',[
param('capacitance','Capacitance C (pF)',50,400,10,200,'Sets the capacitive part of admittance.'),param('slow_conductance','Restorative conductance gS (nS)',0,40,1,0,'A delayed restorative response can suppress slow signals.'),param('slow_tau','Restorative time constant (ms)',20,300,10,100,'Sets how quickly the restorative process responds.')],['Frequency (Hz)','Impedance magnitude (MΩ)'],'Starting from gS=0, can a slow restorative response create a peak?','The passive curve falls with frequency. The restorative toy can suppress low frequencies while capacitance suppresses high frequencies, producing an intermediate peak. A peak is not guaranteed for every parameter choice.','Linear small-signal toy, not a fitted Ih or M-current model. Y=gL+iωC+gS/(1+iωτS), Z=1/Y; gL=10 nS; ω=2πf; convert ms to seconds. |Z|=1000/|Y| in MΩ.',p=>{const response=(f,g)=>{const omega=2*Math.PI*f,q=omega*p.slow_tau/1000,re=10+g/(1+q*q),im=omega*p.capacitance/1000-g*q/(1+q*q);return 1000/Math.hypot(re,im)};return {'Restorative toy':sequence(.1,30).map(f=>[f,response(f,p.slow_conductance)]),'Passive reference':sequence(.1,30).map(f=>[f,response(f,0)])}},`    active_points, passive_points = [], []
    for step in range(201):
        frequency = 0.1 + 29.9 * step / 200
        omega = 2 * math.pi * frequency
        for conductance, points in [(slow_conductance, active_points), (0, passive_points)]:
            delay_factor = omega * slow_tau / 1000
            real_part = 10 + conductance / (1 + delay_factor**2)
            imaginary_part = omega * capacitance / 1000 - conductance * delay_factor / (1 + delay_factor**2)
            impedance = 1000 / math.hypot(real_part, imaginary_part)
            points.append([frequency, impedance])
    return {"Restorative toy": active_points, "Passive reference": passive_points}`,{slow_conductance:20});
defineLab(8,'Couple two cell voltages',[
param('gap_conductance','Gap conductance (nS)',0,10,0.5,2,'Sets coupling strength.'),param('cell_one_voltage','Cell 1 voltage (mV)',-90,-40,1,-65,'Current entering cell 1 vanishes when cell 2 matches this voltage.')],['Cell 2 voltage (mV)','Current into cell 1 (pA)'],'Which cell gains current when cell 2 is more positive?','The gap-junction current follows the voltage difference. This convention counts current INTO cell 1 as positive.','Simple non-rectifying electrical connection; voltages held fixed; no chemical transmitter model.',p=>({'Into cell 1':sequence(-90,-40).map(v=>[v,p.gap_conductance*(v-p.cell_one_voltage)])}),`    points = []
    for step in range(201):
        cell_two_voltage = -90 + 50 * step / 200
        current_into_one = gap_conductance * (cell_two_voltage - cell_one_voltage)
        points.append([cell_two_voltage, current_into_one])
    return {"Into cell 1": points}`,{gap_conductance:5});
defineLab(9,'See shunting reduce a voltage response',[
param('leak','Leak conductance (nS)',2,30,1,10,'The starting conductance of the passive membrane.'),param('synaptic_conductance','Added synaptic conductance (nS)',0,40,1,10,'Adds conductance and lowers resistance.')],['Additional input (pA)','Steady ΔV (mV)'],'At matched added input, does more conductance make the deflection bigger or smaller?','The added current encounters a lower resistance, so its steady voltage effect is smaller. Compare the response slopes.','Passive steady deflections around the same baseline: ΔV=ΔI/(gL+gsyn). Active currents and baseline shifts are excluded.',p=>({'With added conductance':sequence(0,200).map(I=>[I,I/(p.leak+p.synaptic_conductance)]),'Leak only':sequence(0,200).map(I=>[I,I/p.leak])}),`    shunted_points, reference_points = [], []
    for step in range(201):
        added_input = 200 * step / 200
        shunted_points.append([added_input, added_input / (leak + synaptic_conductance)])
        reference_points.append([added_input, added_input / leak])
    return {"With added conductance": shunted_points, "Leak only": reference_points}`,{synaptic_conductance:30});
defineLab(10,'Change the gap between synaptic events',[
param('decay_tau','Decay time τ (ms)',2,40,1,10,'Longer decay leaves more conductance before the next event.'),param('event_gap','Time between events (ms)',0,80,1,20,'The second event begins after this delay.'),param('peak','Each conductance jump (nS)',1,10,0.5,5,'Each event adds the same instantaneous jump.')],['Time (ms)','Conductance (nS)'],'Will closely spaced events overlap more?','The first event decays while the second adds a new jump. This is conductance overlap; the voltage response also depends on driving force and membrane dynamics.','Two exponential conductance events, linear summation, no rise time or dendritic transfer.',p=>({'Combined conductance':sequence(0,120,601).map(t=>[t,p.peak*Math.exp(-t/p.decay_tau)+(t>=p.event_gap?p.peak*Math.exp(-(t-p.event_gap)/p.decay_tau):0)])}),`    points = []
    for step in range(601):
        time = 120 * step / 600
        conductance = peak * math.exp(-time / decay_tau)
        if time >= event_gap:
            conductance += peak * math.exp(-(time - event_gap) / decay_tau)
        points.append([time, conductance])
    return {"Combined conductance": points}`,{event_gap:3});
defineLab(11,'Read an excitatory population’s slope',[
param('excitatory_state','Current E activity',0,1,0.05,0.2,'Hold E fixed while inspecting the derivative.'),param('inhibitory_weight','Inhibitory strength wEI',0,8,0.25,3,'Positive magnitude; inhibition is subtracted.'),param('external_drive','External drive P',-2,2,0.1,0.5,'Adds to the E input.')],['Inhibitory activity I','dE/dt (model units)'],'Does stronger inhibition always lower E’s instantaneous slope in this equation?','The minus sign makes inhibitory input lower the sigmoid target. This is a slice through the vector field, not the circuit’s time course.','τE=1, wEE=2; sigmoid response; E held fixed. A full circuit also needs an I equation.',p=>({'E slope':sequence(0,1).map(I=>[I,-p.excitatory_state+sigmoid(2*p.excitatory_state-p.inhibitory_weight*I+p.external_drive)])}),`    points = []
    for step in range(201):
        inhibitory_state = step / 200
        net_drive = 2 * excitatory_state - inhibitory_weight * inhibitory_state + external_drive
        target_activity = 1 / (1 + math.exp(-net_drive))
        slope = -excitatory_state + target_activity
        points.append([inhibitory_state, slope])
    return {"E slope": points}`,{inhibitory_weight:6});
defineLab(12,'Make a leaky neuron fire',[
param('input_current','Input current (nA)',0,0.4,0.01,0.2,'Above enough sustained input, voltage reaches threshold.'),param('membrane_tau','Membrane time constant (ms)',5,50,1,20,'Controls integration speed.'),param('threshold','Spike threshold (mV)',-60,-40,1,-50,'Crossing this value records a spike and resets voltage.')],['Time (ms)','Voltage (mV)'],'Can a small sustained input settle below threshold forever?','Below-threshold input produces a steady subthreshold voltage. Higher drive produces threshold crossings followed by reset. The graph records a threshold crossing, not an action-potential shape.','LIF with rest/reset −65 mV, R=100 MΩ, Euler dt=0.1 ms. No refractory period, active currents or dendrites.',p=>{let v=-65,points=[],events=[];for(let k=0;k<=5000;k++){if(k%2===0)points.push([k*.1,v]);if(k===5000)break;v+=.1*(-65-v+100*p.input_current)/p.membrane_tau;if(v>=p.threshold){events.push([(k+1)*.1,p.threshold]);v=-65}}return {'Voltage':points,'Spike events':events}},`    voltage = -65.0
    voltage_points, spike_events = [], []
    time_step = 0.1
    for step in range(5001):
        if step % 2 == 0:
            voltage_points.append([step * time_step, voltage])
        if step == 5000:
            break
        voltage += time_step * (-65 - voltage + 100 * input_current) / membrane_tau
        if voltage >= threshold:
            spike_events.append([(step + 1) * time_step, threshold])
            voltage = -65.0  # reset after recording the event
    return {"Voltage": voltage_points, "Spike events": spike_events}`,{input_current:0.1});
defineLab(13,'Follow signals through a delayed chain',[
param('connection_delay','Delay per connection (ms)',1,15,1,2,'Each transmission adds this much time.'),param('middle_connection','Middle connection present (0 or 1)',0,1,1,1,'Removing it prevents downstream arrivals.')],['Time (ms)','Receiving cell index'],'If the middle edge is removed, which arrivals disappear?','A spike is scheduled at cell 0 at 10 ms. Each assumed transmission takes one delay. Missing the middle connection stops the illustrative propagation chain.','Scheduled events along 0→1→2→0. This assumes each received event triggers the next transmission; it does not simulate membrane thresholds.',p=>{let points=[[10+p.connection_delay,1]];if(p.middle_connection){points.push([10+2*p.connection_delay,2],[10+3*p.connection_delay,0])}return {'Arrivals':points}},`    arrivals = [[10 + connection_delay, 1]]
    if middle_connection == 1:
        arrivals.append([10 + 2 * connection_delay, 2])
        arrivals.append([10 + 3 * connection_delay, 0])
    return {"Arrivals": arrivals}`,{middle_connection:0});
defineLab(14,'Evolve an E/I rate circuit',[
param('excitatory_weight','E feedback wEE',0,8,0.25,2,'More feedback increases recurrent E drive.'),param('inhibitory_weight','I-to-E weight wEI',0,8,0.25,3,'Inhibitory strength enters with a minus sign.'),param('inhibitory_tau','I time constant (model units)',0.5,8,0.5,2,'Controls inhibitory response speed.')],['Time (model units)','Population activity'],'Will changing inhibition’s speed alter only the final state, or also the transient?','Track both populations through time. Feedback strengths and time scales influence settling and transients; oscillations are not guaranteed.','Wilson–Cowan-style toy: dE/dt=−E+S(wEE E−wEI I+0.5); dI/dt=[−I+S(3E−I−0.5)]/τI. Euler dt=0.01.',p=>{let E=.1,I=.1,a=[],b=[];for(let k=0;k<=5000;k++){if(k%10===0){a.push([k*.01,E]);b.push([k*.01,I])}let dE=-E+sigmoid(p.excitatory_weight*E-p.inhibitory_weight*I+.5),dI=(-I+sigmoid(3*E-I-.5))/p.inhibitory_tau;E+=.01*dE;I+=.01*dI}return {'E activity':a,'I activity':b}},`    excitatory, inhibitory = 0.1, 0.1
    excitatory_points, inhibitory_points = [], []
    time_step = 0.01
    for step in range(5001):
        if step % 10 == 0:
            excitatory_points.append([step * time_step, excitatory])
            inhibitory_points.append([step * time_step, inhibitory])
        excitatory_drive = excitatory_weight * excitatory - inhibitory_weight * inhibitory + 0.5
        inhibitory_drive = 3 * excitatory - inhibitory - 0.5
        excitatory_target = 1 / (1 + math.exp(-excitatory_drive))
        inhibitory_target = 1 / (1 + math.exp(-inhibitory_drive))
        excitatory_slope = -excitatory + excitatory_target
        inhibitory_slope = (-inhibitory + inhibitory_target) / inhibitory_tau
        excitatory += time_step * excitatory_slope
        inhibitory += time_step * inhibitory_slope
    return {"E activity": excitatory_points, "I activity": inhibitory_points}`,{inhibitory_tau:6});
defineLab(15,'Keep the same mean, change the timing',[
param('spread','Spread of spike times (s)',0,0.8,0.05,0,'Zero aligns all cells at one moment.'),param('cell_count','Number of cells',4,30,1,10,'Every cell emits exactly one spike in a one-second trial.')],['Time (s)','Cell index'],'Can spike timing change while the whole-trial mean rate stays exactly the same?','Every cell emits one spike, so the one-second per-neuron rate stays at 1 Hz. Spreading the events changes synchrony, not the whole-trial average.','Deterministic spike raster, not a simulated network. Each dot is one spike. Cell indices start at zero.',p=>({'Spike raster':Array.from({length:p.cell_count},(_,i)=>[.5+p.spread*(i/(p.cell_count-1)-.5),i])}),`    events = []
    for cell_index in range(int(cell_count)):
        spike_time = 0.5 + spread * (cell_index / (cell_count - 1) - 0.5)
        events.append([spike_time, cell_index])
    return {"Spike raster": events}`,{spread:.8});
defineLab(16,'Choose a population-rate time window',[
param('cell_count','Number of cells',2,40,1,10,'Each cell has five deterministic spikes in one second.'),param('bin_width','Bin width (s)',0.02,0.25,0.01,0.1,'Short windows reveal timing but can fluctuate more.')],['Time-bin center (s)','Population rate (Hz/cell)'],'What happens to the rate fluctuations if you use shorter bins?','Rates count spikes per cell per unit time. A shorter window changes the temporal summary even though the spike trains stay fixed for a chosen cell count.','Synthetic deterministic spikes, five per cell. Last partial bin is normalized by its actual duration.',p=>{let events=[];for(let c=0;c<p.cell_count;c++)for(let k=0;k<5;k++)events.push((k+.1+.8*c/p.cell_count)/5);let points=[];for(let b=0;b<Math.ceil(1/p.bin_width);b++){let lo=b*p.bin_width,hi=Math.min(1,(b+1)*p.bin_width);if(hi-lo<1e-10)continue;let count=events.filter(t=>t>=lo&&t<hi).length;points.push([(lo+hi)/2,count/(p.cell_count*(hi-lo))])}return {'Binned rate':points}},`    spike_times = []
    for cell in range(int(cell_count)):
        for spike in range(5):
            spike_times.append((spike + 0.1 + 0.8 * cell / cell_count) / 5)
    rate_points = []
    for bin_index in range(math.ceil(1 / bin_width)):
        left = bin_index * bin_width
        right = min(1.0, (bin_index + 1) * bin_width)
        if right - left < 1e-10:
            continue
        count = sum(left <= time < right for time in spike_times)
        rate = count / (cell_count * (right - left))
        rate_points.append([(left + right) / 2, rate])
    return {"Binned rate": rate_points}`,{bin_width:.02});
defineLab(17,'Shift and steepen an input–output curve',[
param('threshold','Threshold θ',-4,4,0.25,0,'The input giving a response of one-half.'),param('slope','Gain slope',0.25,3,0.25,1,'Controls how sharply the response transitions.')],['Input x (arbitrary units)','Normalized response'],'Does increasing the threshold move the curve left or right?','Threshold shifts the curve; slope changes its sharpness. A fitted gain curve should use the input conditions relevant to your model.','Teaching sigmoid F(x)=1/[1+exp(−slope·(x−θ))]. It is not a measured CA1 firing-rate curve.',p=>({'Gain curve':sequence(-6,6).map(x=>[x,sigmoid(p.slope*(x-p.threshold))])}),`    points = []
    for step in range(201):
        model_input = -6 + 12 * step / 200
        response = 1 / (1 + math.exp(-slope * (model_input - threshold)))
        points.append([model_input, response])
    return {"Gain curve": points}`,{threshold:2});
defineLab(18,'Find where feedback agrees with itself',[
param('coupling','Recurrent coupling J',0,8,0.25,2,'A larger value steepens feedback.'),param('external_drive','External input Iext',-5,2,0.25,-1,'Shifts the response function.'),param('initial_rate','Starting rate r₀',0.01,0.99,0.01,0.1,'Can affect the outcome when multiple stable states exist.')],['Assumed rate r','Predicted rate F(Jr + Iext)'],'Do all intersections with the identity line have to be stable?','Intersections with y=r are self-consistent candidates. The time-course panel shows which state this initial condition approaches under dr/dt=−r+F(Jr+Iext).','Scalar sigmoid rate model, normalized units; Euler dt=0.01. An equilibrium residual is not a complete stability proof.',p=>{let r=p.initial_rate,h=[];for(let k=0;k<=10000;k++){if(k%25===0)h.push([k*.01,r]);r+=.01*(-r+sigmoid(p.coupling*r+p.external_drive))}return {'Feedback curve':sequence(0,1).map(x=>[x,sigmoid(p.coupling*x+p.external_drive)]),'Identity y=r':sequence(0,1).map(x=>[x,x]),'Rate over time':h}},`    feedback_points, identity_points = [], []
    for step in range(201):
        assumed_rate = step / 200
        predicted_rate = 1 / (1 + math.exp(-(coupling * assumed_rate + external_drive)))
        feedback_points.append([assumed_rate, predicted_rate])
        identity_points.append([assumed_rate, assumed_rate])
    rate, history = initial_rate, []
    for step in range(10001):
        if step % 25 == 0:
            history.append([step * 0.01, rate])
        response = 1 / (1 + math.exp(-(coupling * rate + external_drive)))
        rate += 0.01 * (-rate + response)
    return {"Feedback curve": feedback_points, "Identity y=r": identity_points, "Rate over time": history}`,{coupling:6,external_drive:-3,initial_rate:.9});
defineLab(19,'Compare an average cell with average responses',[
param('threshold_spread','Threshold diversity',0,4,0.25,0,'Cells are evenly spaced around the mean threshold.'),param('mean_threshold','Mean threshold',-2,2,0.25,0,'Moves the center of the cell population.')],['Input (arbitrary units)','Normalized response'],'Does averaging thresholds before the sigmoid give the same curve?','A nonlinear response generally makes the order of averaging matter. The curves can match at a single symmetric input and still differ elsewhere.','21 equally weighted sigmoid cells; fixed common input, no recurrence. Cell diversity is illustrative.',p=>({'Population mean':sequence(-6,6).map(x=>[x,Array.from({length:21},(_,i)=>sigmoid(x-(p.mean_threshold+p.threshold_spread*(i-10)/10))).reduce((a,b)=>a+b,0)/21]),'Average-threshold cell':sequence(-6,6).map(x=>[x,sigmoid(x-p.mean_threshold)])}),`    population_points, average_cell_points = [], []
    thresholds = []
    for cell in range(21):
        thresholds.append(mean_threshold + threshold_spread * (cell - 10) / 10)
    for step in range(201):
        model_input = -6 + 12 * step / 200
        responses = []
        for threshold in thresholds:
            responses.append(1 / (1 + math.exp(-(model_input - threshold))))
        population_points.append([model_input, sum(responses) / len(responses)])
        average_response = 1 / (1 + math.exp(-(model_input - mean_threshold)))
        average_cell_points.append([model_input, average_response])
    return {"Population mean": population_points, "Average-threshold cell": average_cell_points}`,{threshold_spread:4});
defineLab(20,'Define a decision rule',[
param('decision_threshold','Decision threshold',0,1,0.05,0.5,'A feature above this threshold predicts class 1.'),param('feature_shift','Shift every feature',-0.4,0.4,0.05,0,'An irrelevant shift can change decisions.')],['Response feature','Predicted class'],'Could a change unrelated to frequency alter the readout’s answer?','A threshold rule maps a feature to a label. Changing the feature distribution can change decisions even when the intended stimulus labels are unchanged.','Fabricated feature axis and fixed threshold rule; no trained neural network or accuracy claim.',p=>({'Decision rule':sequence(0,1).map(x=>[x,x+p.feature_shift>p.decision_threshold?1:0])}),`    points = []
    for step in range(201):
        feature = step / 200
        shifted_feature = feature + feature_shift
        predicted_class = 1 if shifted_feature > decision_threshold else 0
        points.append([feature, predicted_class])
    return {"Decision rule": points}`,{feature_shift:.3});
defineLab(21,'Choose an attractor with the starting state',[
param('initial_state','Initial state x₀',-1.5,1.5,0.05,0.2,'Negative and positive starts can settle in different basins.'),param('bias','Constant bias',-0.5,0.5,0.05,0,'Tilts the toy dynamics toward one side.')],['Time (model units)','State x'],'Does a small bias change the preferred state?','The unforced system has stable states at −1 and +1 and an unstable state at zero. Bias can move or remove fixed points. Exact zero without bias stays still but is unstable.','Scalar toy dx/dt=x−x³+bias; Euler dt=0.01. It illustrates attractors, not a validated memory circuit.',p=>{let x=p.initial_state,points=[];for(let k=0;k<=2000;k++){if(k%5===0)points.push([k*.01,x]);x+=.01*(x-x**3+p.bias)}return {'State trajectory':points}},`    state = initial_state
    points = []
    for step in range(2001):
        if step % 5 == 0:
            points.append([step * 0.01, state])
        slope = state - state**3 + bias
        state += 0.01 * slope
    return {"State trajectory": points}`,{initial_state:-.2});
defineLab(22,'Change a weight through repeated experience',[
param('learning_rate','Learning rate η',0,0.1,0.005,0.05,'Controls the size of each update.'),param('pre_activity','Presynaptic activity',0,1,0.05,0.8,'Held constant across updates.'),param('post_activity','Postsynaptic activity',0,1,0.05,0.6,'If this is zero, this Hebbian update vanishes.')],['Update number','Connection weight'],'Does activity change still imply learning when the learning rate is zero?','Repeated positive coactivity increases the bounded weight. With zero learning rate or zero activity product, the weight remains fixed.','Δw=η·pre·post, clipped to [0,1]; initial weight 0.2. This is not STDP or a full biological learning mechanism.',p=>{let w=.2,points=[];for(let k=0;k<=60;k++){points.push([k,w]);w=Math.min(1,Math.max(0,w+p.learning_rate*p.pre_activity*p.post_activity))}return {'Weight':points}},`    weight = 0.2
    points = []
    for update in range(61):
        points.append([update, weight])
        change = learning_rate * pre_activity * post_activity
        weight = min(1.0, max(0.0, weight + change))
    return {"Weight": points}`,{post_activity:0});
defineLab(23,'Compare predictions with held-out labels',[
param('decision_threshold','Readout threshold',0,1,0.05,0.5,'Exploration here uses a demonstration validation set, not an untouched final test.'),param('feature_shift','Feature shift',-0.3,0.3,0.05,0,'Changes the features available to the readout.')],['Validation example index','Class label (0 or 1)'],'If you tune the threshold after inspecting these labels, can this remain an untouched final test?','The plot compares predictions with fabricated validation labels. Once you adjust the rule using these outcomes, evaluate final generalization on a separate untouched test set.','Features [0.15,0.7,0.4,0.6], labels [0,1,1,1]. Four fabricated examples are too few to support a scientific performance claim.',p=>({'Predicted labels':[.15,.7,.4,.6].map((x,i)=>[i,x+p.feature_shift>p.decision_threshold?1:0]),'Known labels':[0,1,1,1].map((y,i)=>[i,y])}),`    validation_features = [0.15, 0.7, 0.4, 0.6]
    validation_labels = [0, 1, 1, 1]
    predicted_points, known_points = [], []
    for index, feature in enumerate(validation_features):
        prediction = 1 if feature + feature_shift > decision_threshold else 0
        predicted_points.append([index, prediction])
        known_points.append([index, validation_labels[index]])
    return {"Predicted labels": predicted_points, "Known labels": known_points}`,{decision_threshold:.3});
let activeLab=null;
const labColors=['#141111','#a62962','#6f4c27'];
function labHTML(n){const l=labs[n];return `<section class="lesson-section lab" id="experiment"><p class="eyebrow">03 · Predict → change → observe</p><h2>${l.title}</h2><details class="box"><summary>The exact equation used for this plot</summary>${mathBox(plotEquationBodies[n],"Plotted model equation")}<p>${plotEquationNotes[n]||l.assumptions}</p><a href="#code">See this equation in code ↓</a></details><div class="lab-prediction"><b>Before touching the controls</b><p>${l.predict}</p></div><div class="lab-layout"><div class="lab-controls"><h3>Change one thing</h3>${l.parameters.map(p=>`<div class="control-row"><label for="lab-number-${p.name}">${p.label}</label>${biologyControlHTML(n,p)}<div class="control-pair"><input type="range" aria-label="${p.label} slider" aria-describedby="bio-${p.name}" data-lab-range="${p.name}" min="${p.min}" max="${p.max}" step="${p.step}" value="${p.value}"><input id="lab-number-${p.name}" type="number" aria-label="${p.label}" aria-describedby="bio-${p.name}" data-lab-number="${p.name}" min="${p.min}" max="${p.max}" step="${p.step}" value="${p.value}"></div><small>${p.help}<br>In the code: <code>${p.name}</code></small></div>`).join('')}<div class="lab-actions"><button class="secondary" id="lab-preset">Try a contrasting example</button><button class="secondary" id="lab-reset">Reset numbers</button><button class="secondary" id="lab-pin">Keep this as comparison</button></div><label class="compare-label"><input type="checkbox" id="lab-compare" checked> Show saved comparison</label><p id="lab-message" class="muted" role="status">Comparison starts with the default numbers; it lasts until you leave this page.</p></div><div class="lab-plots" id="lab-plots"></div></div><div class="lab-result" id="lab-result" role="status" aria-live="polite"></div><details class="box"><summary>What should I notice?</summary><p>${l.explain}</p></details><details class="box lab-assumptions"><summary>What exactly does this experiment model?</summary><p>${l.assumptions}</p><p class="muted">The plot runs here. The matching Python code below reproduces the numeric curves in a Python environment.</p>${n===7?'<a href="https://pubmed.ncbi.nlm.nih.gov/12611957/" target="_blank" rel="noopener">Academic context: Richardson, Brunel & Hakim (2003) ↗</a>':''}</details><details class="box"><summary>See a small table of plotted values</summary><div id="lab-table"></div></details></section>`}
function labCodeHTML(n){return `<section class="lesson-section" id="code"><p class="eyebrow">04 · See how the graph is calculated</p><h2>The code, one step at a time</h2><p>Every control changes a named number below. Start with the settings, then open the model when you are ready.</p><div class="code-toolbar"><span>Python 3 · standard library only</span><button class="secondary" id="lab-copy">Copy full Python script</button></div><p id="lab-copy-status" class="muted" role="status"></p><details class="box"><summary>A tiny Python reading guide</summary><dl class="python-glossary"><dt>=</dt><dd>Assign a value to a name. This differs from an equation asserting equality.</dd><dt>def simulate(...):</dt><dd>Define a reusable calculation. Names inside parentheses are its inputs.</dd><dt>for ... in range(...):</dt><dd>Repeat a step. Indented lines belong to the loop.</dd><dt>points.append([x, y])</dt><dd>Save one horizontal–vertical pair for the curve.</dd><dt>return</dt><dd>Give the result back to the code that called the function.</dd><dt>math.exp(...)</dt><dd>Calculate the exponential; ** means a power.</dd></dl></details><h3>1. Choose your numbers</h3><p class="muted">These values update as you move the controls.</p><pre><code id="lab-settings-code"></code></pre><details class="code-step"><summary>2. Open the model calculation</summary><p>Import the math tools, then define a function. A function bundles the calculation so you can run it with different settings.</p><pre><code id="lab-model-code"></code></pre></details><h3>3. Run the model and inspect the curves</h3><p class="muted">Each plotted point is a pair: [horizontal value, vertical value]. The returned dictionary names each curve.</p><pre><code id="lab-run-code"></code></pre><details class="code-step"><summary>Read the browser’s calculation (JavaScript)</summary><p>The browser uses this matching function for the live plot. Python is shown above for learning and reuse.</p><pre><code id="lab-js-code"></code></pre></details><div class="box pink"><h3>4. Explain what changed</h3><p>${topicDetails[n].exercise}</p><label for="topic-notes">Your prediction → observation → explanation</label><textarea id="topic-notes" rows="3" placeholder="I changed… I observed… My explanation is…"></textarea><p class="muted">Saved in this browser.</p></div></section>`}
function mountLab(n){const l=labs[n];activeLab={index:n,values:Object.fromEntries(l.parameters.map(p=>[p.name,p.value])),baseline:Object.fromEntries(l.parameters.map(p=>[p.name,p.value])),compare:true};updateLab()}
function pythonParts(l,values){const settings=l.parameters.map(p=>`# ${p.label}\n${p.name} = ${values[p.name]}`).join('\n\n');const names=l.parameters.map(p=>p.name);const model=`import math\n\ndef simulate(${names.join(', ')}):\n${l.python}`;const run=`# Pass your settings into the model.\ncurves = simulate(\n${names.map(x=>`    ${x}=${x},`).join('\n')}\n)\n\n# Inspect the first and last point of each nonempty curve.\nfor curve_name, points in curves.items():\n    print(curve_name)\n    if points:\n        print("  First [x, y]:", points[0])\n        print("  Last  [x, y]:", points[-1])\n    else:\n        print("  No events for these settings.")`;return {settings,model,run,full:`# IMPORT STANDARD MATH TOOLS\nimport math\n\n# 1. CHOOSE THE NUMBERS\n${settings}\n\n# 2. DEFINE THE MODEL\n${model.replace('import math\n\n','')}\n\n# 3. RUN AND INSPECT\n${run}\n`}}
function plotGroups(n,data){if(n===30)return [{names:['Voltage response'],axes:['Time (s)','Voltage deflection (mV)']},{names:['Injected current'],axes:['Time (s)','Current (pA)']}];if(n===31)return [{names:['Voltage sinusoid'],axes:['Time (s)','Voltage (mV)']},{names:['Current sinusoid'],axes:['Time (s)','Current (pA)']}];if(n===34)return [{names:['Radius over time'],axes:['Time (model units)','Radius']},{names:['State trajectory'],axes:['State x','State y']}];if(n===38)return [{names:['Normalized scaled','Normalized reference'],axes:['Time (ms)','Normalized deflection']},{names:['Absolute scaled','Absolute reference'],axes:['Time (ms)','Deflection (mV)']}];if(n===18)return [{names:['Feedback curve','Identity y=r'],axes:labs[n].axes},{names:['Rate over time'],axes:['Time (model units)','Normalized rate']}];return [{names:Object.keys(data),axes:labs[n].axes}]}
function displayNumber(x){if(!Number.isFinite(x))return '—';if(Math.abs(x)>=1000)return x.toExponential(1);return Number(x.toFixed(3)).toString()}
function isScatter(n,name){return n===13||n===15||n===23||name==='Spike events'||name==='Stable root'||name==='Unstable root'||name==='Synthetic reference'}
function chartHTML(n,group,data,reference,chartIndex){const entries=group.names.map(name=>[name,data[name]||[]]);const all=entries.flatMap(x=>x[1]);const refName=group.names[0],ref=activeLab.compare?(reference[refName]||[]):[];const domain=[...all,...ref].filter(p=>Number.isFinite(p[0])&&Number.isFinite(p[1]));let minX=Math.min(...domain.map(p=>p[0])),maxX=Math.max(...domain.map(p=>p[0])),minY=Math.min(...domain.map(p=>p[1])),maxY=Math.max(...domain.map(p=>p[1]));if(n===13){minX=0;maxX=60;minY=-.3;maxY=2.3}if(n===15){minX=0;maxX=1}if(n===23){minX=-.2;maxX=3.2;minY=-.2;maxY=1.2}if(!Number.isFinite(minX)){minX=0;maxX=1;minY=0;maxY=1}if(maxX===minX)maxX=minX+1;if(maxY===minY){minY-=.5;maxY+=.5}let pad=(maxY-minY)*.08;minY-=pad;maxY+=pad;if(n===32||(n===34&&group.names[0]==='State trajectory')){const xmid=(minX+maxX)/2,ymid=(minY+maxY)/2,ys=Math.max(maxY-minY,(maxX-minX)*205/465);minY=ymid-ys/2;maxY=ymid+ys/2;minX=xmid-ys*465/205/2;maxX=xmid+ys*465/205/2}const sx=x=>65+(x-minX)/(maxX-minX)*465,sy=y=>245-(y-minY)/(maxY-minY)*205;const path=points=>points.map((p,i)=>`${i?'L':'M'}${sx(p[0]).toFixed(2)},${sy(p[1]).toFixed(2)}`).join(' ');let markup='';for(let k=0;k<=4;k++){const x=minX+k*(maxX-minX)/4,y=minY+k*(maxY-minY)/4;markup+=`<path d="M65 ${sy(y)} H530" stroke="#ded1c5"/><text x="56" y="${sy(y)+4}" text-anchor="end">${displayNumber(y)}</text><text x="${sx(x)}" y="266" text-anchor="middle">${displayNumber(x)}</text>`}if(minY<0&&maxY>0)markup+=`<path d="M65 ${sy(0)} H530" stroke="#aaa" stroke-dasharray="3 4"/>`;if(ref.length){markup+=isScatter(n,refName)?ref.map(p=>`<circle cx="${sx(p[0])}" cy="${sy(p[1])}" r="6" fill="none" stroke="#8c7664" stroke-dasharray="2 2"/>`).join(''):`<path d="${path(ref)}" fill="none" stroke="#8c7664" stroke-width="2.5" stroke-dasharray="6 5"/>`}entries.forEach(([name,points],k)=>{const color=labColors[k%3];markup+=isScatter(n,name)?points.map(p=>`<circle cx="${sx(p[0])}" cy="${sy(p[1])}" r="4" fill="${color}" opacity=".85"/>`).join(''):`<path d="${path(points)}" fill="none" stroke="${color}" stroke-width="2.7"/>`});return `<figure class="live-chart"><svg viewBox="0 0 570 310" role="img" aria-label="${group.axes[1]} versus ${group.axes[0]}"><g font-family="system-ui" font-size="11" fill="#171313">${markup}<path d="M65 35 V245 H535" fill="none" stroke="#111"/><text x="300" y="296" text-anchor="middle" font-size="12">${group.axes[0]}</text><text x="17" y="140" transform="rotate(-90 17 140)" text-anchor="middle" font-size="12">${group.axes[1]}</text></g></svg><figcaption>${entries.map(([name],k)=>`<span><i style="background:${labColors[k%3]}"></i>${name}</span>`).join('')}${activeLab.compare?'<span><i class="comparison-key"></i>Saved comparison (first curve)</span>':''}</figcaption><label for="inspect-${chartIndex}">Inspect the horizontal axis</label><input id="inspect-${chartIndex}" type="range" min="${minX}" max="${maxX}" step="${(maxX-minX)/200}" value="${(minX+maxX)/2}" data-lab-inspect="${chartIndex}"><p class="inspect-value" id="inspect-value-${chartIndex}" role="status"></p><p class="muted">Axes rescale to include both settings. Use a saved comparison to judge shape and magnitude.</p></figure>`}
function updateLab(){const state=activeLab,l=labs[state.index];state.curves=l.compute(state.values);const reference=l.compute(state.baseline);state.groups=plotGroups(state.index,state.curves);document.getElementById('lab-plots').innerHTML=state.groups.map((g,k)=>chartHTML(state.index,g,state.curves,reference,k)).join('');state.groups.forEach((_,k)=>inspectLab(k,Number(document.getElementById('inspect-'+k).value)));const parts=pythonParts(l,state.values);document.getElementById('lab-settings-code').textContent=parts.settings;document.getElementById('lab-model-code').textContent=parts.model;document.getElementById('lab-run-code').textContent=parts.run;document.getElementById('lab-js-code').textContent=l.compute.toString();let result='';const first=Object.entries(state.curves)[0];if(state.index===7){const peak=state.curves['Restorative toy'].reduce((a,b)=>b[1]>a[1]?b:a);result=`Largest sampled response: ${displayNumber(peak[1])} MΩ at ${displayNumber(peak[0])} Hz. ${peak[0]===.1?'The maximum is at the low-frequency boundary; no resolved interior peak.':'Compare against the passive reference; the sweep samples 0.1–30 Hz.'}`}else if(state.index===12){result=`${state.curves['Spike events'].length} spike events in 500 ms (${2*state.curves['Spike events'].length} Hz).`}else if(state.index===15){result='One spike per cell over one second: mean rate remains 1 Hz per cell.'}else if(state.index===18){const last=state.curves['Rate over time'].at(-1)[1],residual=sigmoid(state.values.coupling*last+state.values.external_drive)-last;result=`Final rate: ${displayNumber(last)}. Closure residual: ${residual.toExponential(2)}. Try the contrasting preset, then change only the starting rate.`}else if(state.index===31){const data=state.curves,v=Math.max(...data['Voltage sinusoid'].map(p=>p[1]))-Math.min(...data['Voltage sinusoid'].map(p=>p[1])),I=Math.max(...data['Current sinusoid'].map(p=>p[1]))-Math.min(...data['Current sinusoid'].map(p=>p[1]));result='Sampled amplitude-ratio estimate: '+displayNumber(1000*v/I)+' MΩ. Voltage and current have separate axes; the input amplitude cancels in the ratio.'}else if(state.index===36){let error=0;for(const [t,y] of state.curves['Synthetic reference']){const predicted=state.values.fit_amplitude*(1-Math.exp(-t/state.values.fit_tau));error+=(predicted-y)**2}result='Mean squared error on the 21 synthetic samples: '+displayNumber(error/21)+' mV².'}else if(state.index===35){result='Step / time constant = '+displayNumber(state.values.integration_step/state.values.decay_time)+'. Forward Euler is stable for this equation only when this ratio lies strictly between 0 and 2.'}else if(state.index===34){result='Predicted stable radius: '+(state.values.hopf_mu>0?displayNumber(Math.sqrt(state.values.hopf_mu)):'0')+'. The second panel plots the state-space trajectory.'}else if(state.index===23){let correct=state.curves['Predicted labels'].filter((p,i)=>p[1]===state.curves['Known labels'][i][1]).length;result=`Demonstration validation accuracy: ${correct}/4 = ${correct/4}. Tuning on these examples uses validation data; keep a separate final test.`}else{const points=first[1],last=points.at(-1);result=last?`${first[0]} at the last horizontal value (${displayNumber(last[0])}): ${displayNumber(last[1])}. Use the inspection slider to read other points.`:'No events at these settings.'}document.getElementById('lab-result').textContent=result;document.getElementById('lab-table').innerHTML=`<div class="table-scroll"><table><thead><tr><th>Curve</th><th>Horizontal value</th><th>Vertical value</th></tr></thead><tbody>${Object.entries(state.curves).filter(([,pts])=>pts&&pts.length).flatMap(([name,points])=>{const selected=[0,Math.floor(points.length/2),points.length-1].filter((x,i,a)=>x>=0&&a.indexOf(x)===i);return selected.map(i=>`<tr><td>${name}</td><td>${displayNumber(points[i][0])}</td><td>${displayNumber(points[i][1])}</td></tr>`)}).join('')}</tbody></table></div>`}
function inspectLab(k,x){const state=activeLab,group=state.groups[k];document.getElementById('inspect-value-'+k).textContent=group.names.map(name=>{const points=state.curves[name];if(!points.length)return name+': no events';const nearest=points.reduce((a,b)=>Math.abs(b[0]-x)<Math.abs(a[0]-x)?b:a);return `${name}: (${displayNumber(nearest[0])}, ${displayNumber(nearest[1])})`}).join(' · ')}
function setLabNumber(name,value,snap=true){const p=labs[activeLab.index].parameters.find(x=>x.name===name);if(!p||!Number.isFinite(value))return;value=Math.max(p.min,Math.min(p.max,value));value=snap?Number((p.min+Math.round((value-p.min)/p.step)*p.step).toFixed(6)):value;activeLab.values[name]=value;document.querySelector(`[data-lab-range="${name}"]`).value=value;document.querySelector(`[data-lab-number="${name}"]`).value=value;updateLab();document.getElementById('lab-message').textContent='Updated '+p.name+' = '+value+'. The graph and Python settings now use this value.'}
document.addEventListener('input',e=>{if(e.target.dataset.labNumber&&e.target.value!==''&&!e.target.validity.badInput){const p=labs[activeLab.index].parameters.find(p=>p.name===e.target.dataset.labNumber);const v=Number(e.target.value);if(v>=p.min&&v<=p.max)setLabNumber(p.name,v,p.step===1)}if(e.target.dataset.labRange)setLabNumber(e.target.dataset.labRange,Number(e.target.value));if(e.target.dataset.labInspect!==undefined)inspectLab(+e.target.dataset.labInspect,Number(e.target.value))});document.addEventListener('change',e=>{if(e.target.dataset.labNumber)setLabNumber(e.target.dataset.labNumber,Number(e.target.value));if(e.target.id==='lab-compare'){activeLab.compare=e.target.checked;updateLab()}});
document.addEventListener('click',async e=>{if(!activeLab)return;const l=labs[activeLab.index];if(e.target.id==='lab-reset'){for(const p of l.parameters)setLabNumber(p.name,p.value);document.getElementById('lab-message').textContent='Current numbers reset; saved comparison unchanged.'}if(e.target.id==='lab-preset'){for(const [name,value] of Object.entries(l.preset))setLabNumber(name,value);document.getElementById('lab-message').textContent='Contrasting settings applied. Compare the curves and explain the difference.'}if(e.target.id==='lab-pin'){activeLab.baseline={...activeLab.values};activeLab.compare=true;document.getElementById('lab-compare').checked=true;updateLab();document.getElementById('lab-message').textContent='Comparison saved. Now change one number.'}if(e.target.id==='lab-copy'){try{await navigator.clipboard.writeText(pythonParts(l,activeLab.values).full);document.getElementById('lab-copy-status').textContent='Copied the complete script with your current numbers ✓'}catch{document.getElementById('lab-copy-status').textContent='Copy the settings, model and run sections together.'}}});
