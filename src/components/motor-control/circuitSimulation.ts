import type { ComponentDefinition, PlacedComponent, WireConnection } from "@/types/motorControl";

type TerminalPair = [string, string];

export interface CircuitSimulationResult {
  states: Map<string, string>;
  energizedTerminals: Set<string>;
  energizedWires: Set<string>;
}

export interface OperationReadiness {
  canOperate: boolean;
  circuitDriven: boolean;
  missingTerminals: string[];
}

const nodeKey = (instanceId: string, terminalId: string) => `${instanceId}::${terminalId}`;

const circuitDrivenTypes = new Set(["contactor", "relay", "timerRelay", "motor", "indicator", "buzzer", "vfd"]);

export const getOperationReadiness = (
  instance: PlacedComponent,
  definition: ComponentDefinition,
  wires: WireConnection[],
): OperationReadiness => {
  const connected = new Set<string>();
  wires.forEach((wire) => {
    if (wire.from.instanceId === instance.instanceId) connected.add(wire.from.terminalId);
    if (wire.to.instanceId === instance.instanceId) connected.add(wire.to.terminalId);
  });
  const has = (terminal: string) => connected.has(terminal);
  const firstCompletePair = (pairs: TerminalPair[]) => pairs.find(([from, to]) => has(from) && has(to));
  const missingFrom = (terminals: string[]) => terminals.filter((terminal) => !has(terminal));

  if (circuitDrivenTypes.has(definition.type)) {
    return { canOperate: false, circuitDriven: true, missingTerminals: [] };
  }

  const exactRequirements: Record<string, string[]> = {
    fuse: ["in", "out"],
    startButton: ["13", "14"],
    stopButton: ["21", "22"],
    emergencyStop: ["21", "22"],
    sensor: ["v", "zero", "out"],
    transformer: ["l1", "l2", "x1", "x2"],
    ammeter: ["in", "out"],
  };
  const exact = exactRequirements[definition.type];
  if (exact) {
    const missingTerminals = missingFrom(exact);
    return { canOperate: missingTerminals.length === 0, circuitDriven: false, missingTerminals };
  }

  const pairRequirements: Record<string, TerminalPair[]> = {
    breaker: [["in1", "out1"], ["in2", "out2"], ["in3", "out3"]],
    overload: [["l1", "t1"], ["l2", "t2"], ["l3", "t3"], ["95", "96"]],
    terminalBlock: [["in1", "out1"], ["in2", "out2"], ["in3", "out3"], ["in4", "out4"], ["in5", "out5"]],
  };
  const pairs = pairRequirements[definition.type];
  if (pairs) {
    const complete = firstCompletePair(pairs);
    const bestPair = pairs.reduce((best, pair) => missingFrom(pair).length < missingFrom(best).length ? pair : best, pairs[0]);
    return { canOperate: Boolean(complete), circuitDriven: false, missingTerminals: complete ? [] : missingFrom(bestPair) };
  }

  const branchedRequirements: Record<string, { common: string; outputs: string[] }> = {
    selector: { common: "com", outputs: ["no", "nc"] },
    limitSwitch: { common: "com", outputs: ["no", "nc"] },
    auxContact: { common: "com", outputs: ["no", "nc"] },
    potentiometer: { common: "w", outputs: ["1", "2"] },
  };
  const branched = branchedRequirements[definition.type];
  if (branched) {
    const hasOutput = branched.outputs.some(has);
    const missingTerminals = [...(!has(branched.common) ? [branched.common] : []), ...(!hasOutput ? [branched.outputs.join("/")] : [])];
    return { canOperate: missingTerminals.length === 0, circuitDriven: false, missingTerminals };
  }

  if (["acPower", "dcPower"].includes(definition.type)) {
    const minimum = definition.type === "acPower" ? 2 : 2;
    const missingTerminals = connected.size >= minimum ? [] : definition.terminals.filter((terminal) => !has(terminal.id)).slice(0, minimum - connected.size).map((terminal) => terminal.id);
    return { canOperate: connected.size >= minimum, circuitDriven: false, missingTerminals };
  }

  return { canOperate: connected.size > 0, circuitDriven: false, missingTerminals: connected.size ? [] : definition.terminals.slice(0, 1).map((terminal) => terminal.id) };
};

const conductivePairs = (type: string, state: string): TerminalPair[] => {
  if (type === "breaker" && state === "ON") return [["in1", "out1"], ["in2", "out2"], ["in3", "out3"]];
  if (type === "fuse" && state === "NORMAL") return [["in", "out"]];
  if (type === "contactor" && state === "ENERGIZED") return [["l1", "t1"], ["l2", "t2"], ["l3", "t3"]];
  if (type === "overload" && state === "NORMAL") return [["l1", "t1"], ["l2", "t2"], ["l3", "t3"], ["95", "96"]];
  if (type === "relay") return state === "ENERGIZED" ? [["11", "14"]] : [["11", "12"]];
  if (type === "timerRelay") return state === "DONE" ? [["15", "18"]] : [["15", "16"]];
  if (type === "auxContact") return state === "ON" ? [["com", "no"]] : [["com", "nc"]];
  if (type === "startButton" && state === "PRESSED") return [["13", "14"]];
  if (type === "stopButton" && state === "RELEASED") return [["21", "22"]];
  if (type === "emergencyStop" && state === "RELEASED") return [["21", "22"]];
  if (type === "selector") return state === "MANUAL" ? [["com", "no"]] : [["com", "nc"]];
  if (type === "limitSwitch") return state === "CLOSED" ? [["com", "no"]] : [["com", "nc"]];
  if (type === "sensor" && state === "DETECTED") return [["v", "out"]];
  if (type === "vfd" && state.startsWith("RUN")) return [["r", "u"], ["s", "v"], ["t", "w"]];
  if (type === "transformer" && state !== "OFF") return [["l1", "x1"], ["l2", "x2"]];
  if (type === "ammeter") return [["in", "out"]];
  if (type === "potentiometer") {
    if (state === "HIGH") return [["2", "w"]];
    if (state === "MID") return [["1", "w"], ["2", "w"]];
    return [["1", "w"]];
  }
  if (type === "terminalBlock" && state !== "ISOLATED") {
    return [["in1", "out1"], ["in2", "out2"], ["in3", "out3"], ["in4", "out4"], ["in5", "out5"]];
  }
  return [];
};

const activationTerminals: Record<string, string[]> = {
  contactor: ["a1", "a2"],
  relay: ["a1", "a2"],
  timerRelay: ["a1", "a2"],
  motor: ["u", "v", "w"],
  indicator: ["x1", "x2"],
  buzzer: ["x1", "x2"],
  vfd: ["r", "s", "t"],
};

const inactiveState: Record<string, string> = {
  contactor: "OFF",
  relay: "OFF",
  timerRelay: "OFF",
  motor: "STOPPED",
  indicator: "OFF",
  buzzer: "OFF",
  vfd: "READY",
};

const activeState: Record<string, string> = {
  contactor: "ENERGIZED",
  relay: "ENERGIZED",
  timerRelay: "DONE",
  motor: "RUNNING",
  indicator: "ON",
  buzzer: "ON",
  vfd: "RUN 35 Hz",
};

const addEdge = (graph: Map<string, Set<string>>, from: string, to: string) => {
  if (!graph.has(from)) graph.set(from, new Set());
  if (!graph.has(to)) graph.set(to, new Set());
  graph.get(from)?.add(to);
  graph.get(to)?.add(from);
};

const propagatePotentials = (
  placed: PlacedComponent[],
  wires: WireConnection[],
  definitions: Map<string, ComponentDefinition>,
  states: Map<string, string>,
) => {
  const graph = new Map<string, Set<string>>();
  wires.forEach((wire) => addEdge(
    graph,
    nodeKey(wire.from.instanceId, wire.from.terminalId),
    nodeKey(wire.to.instanceId, wire.to.terminalId),
  ));

  placed.forEach((instance) => {
    const definition = definitions.get(instance.componentId);
    if (!definition) return;
    conductivePairs(definition.type, states.get(instance.instanceId) || instance.state).forEach(([from, to]) => {
      addEdge(graph, nodeKey(instance.instanceId, from), nodeKey(instance.instanceId, to));
    });
  });

  const potentials = new Map<string, Set<string>>();
  placed.forEach((instance) => {
    const definition = definitions.get(instance.componentId);
    if (!definition || !["acPower", "dcPower"].includes(definition.type) || states.get(instance.instanceId) === "OFF") return;
    definition.terminals.forEach((terminal) => {
      potentials.set(nodeKey(instance.instanceId, terminal.id), new Set([`${instance.instanceId}:${terminal.id}`]));
    });
  });

  const queue = Array.from(potentials.keys());
  while (queue.length) {
    const current = queue.shift();
    if (!current) continue;
    const currentPotentials = potentials.get(current) || new Set<string>();
    graph.get(current)?.forEach((next) => {
      const nextPotentials = potentials.get(next) || new Set<string>();
      const sizeBefore = nextPotentials.size;
      currentPotentials.forEach((potential) => nextPotentials.add(potential));
      potentials.set(next, nextPotentials);
      if (nextPotentials.size !== sizeBefore) queue.push(next);
    });
  }
  return potentials;
};

const hasCompleteSupply = (
  instanceId: string,
  terminals: string[],
  potentials: Map<string, Set<string>>,
) => {
  const terminalPotentials = terminals.map((terminal) => potentials.get(nodeKey(instanceId, terminal)) || new Set<string>());
  if (terminalPotentials.some((values) => values.size === 0)) return false;
  const distinct = new Set<string>();
  terminalPotentials.forEach((values) => values.forEach((value) => distinct.add(value)));
  return distinct.size >= terminals.length;
};

export const simulateCircuit = (
  placed: PlacedComponent[],
  wires: WireConnection[],
  definitions: Map<string, ComponentDefinition>,
): CircuitSimulationResult => {
  const states = new Map(placed.map((instance) => [instance.instanceId, instance.state]));
  let potentials = new Map<string, Set<string>>();

  for (let iteration = 0; iteration < 8; iteration += 1) {
    potentials = propagatePotentials(placed, wires, definitions, states);
    let changed = false;
    placed.forEach((instance) => {
      const definition = definitions.get(instance.componentId);
      if (!definition) return;
      const required = activationTerminals[definition.type];
      if (!required) return;
      const connectedTerminals = required.filter((terminal) => wires.some((wire) =>
        (wire.from.instanceId === instance.instanceId && wire.from.terminalId === terminal) ||
        (wire.to.instanceId === instance.instanceId && wire.to.terminalId === terminal),
      ));
      const terminalsToCheck = definition.type === "motor" ? connectedTerminals : required;
      const terminalsHaveWires = definition.type === "motor"
        ? connectedTerminals.length >= 2
        : connectedTerminals.length === required.length;
      if (!terminalsHaveWires) {
        const nextState = inactiveState[definition.type];
        if (nextState && states.get(instance.instanceId) !== nextState) {
          states.set(instance.instanceId, nextState);
          changed = true;
        }
        return;
      }
      const nextState = hasCompleteSupply(instance.instanceId, terminalsToCheck, potentials)
        ? activeState[definition.type]
        : inactiveState[definition.type];
      if (nextState && states.get(instance.instanceId) !== nextState) {
        states.set(instance.instanceId, nextState);
        changed = true;
      }
    });
    if (!changed) break;
  }

  potentials = propagatePotentials(placed, wires, definitions, states);
  const energizedTerminals = new Set(Array.from(potentials.entries()).filter(([, values]) => values.size > 0).map(([key]) => key));
  const energizedWires = new Set(wires.filter((wire) =>
    energizedTerminals.has(nodeKey(wire.from.instanceId, wire.from.terminalId)) ||
    energizedTerminals.has(nodeKey(wire.to.instanceId, wire.to.terminalId)),
  ).map((wire) => wire.id));

  return { states, energizedTerminals, energizedWires };
};
