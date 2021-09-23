
const storageForFlows = {};

/**
* Converting NodeRed's Flows to Dojot's Flows
*
* @param {Array} flows NodeRed's Flows
*/
const castFlowsToDojot = (flows) => {
  const flowsElements = JSON.parse(JSON.stringify(storageForFlows));
  // console.log("storageForFlows", storageForFlows);
  flows.forEach((flow) => {
    if (flow.z !== undefined) {
      flowsElements[flow.z].flow.push(flow);
      return;
    }

    // just found a tab node
    if (flowsElements[flow.id] === undefined) {
      flowsElements[flow.id] = {};
      flowsElements[flow.id].flow = [];
      flowsElements[flow.id].name = flow.label;
      flowsElements[flow.id].isNew = true;
      flowsElements[flow.id].flow.push(flow);
    } else {
      flowsElements[flow.id].flow.push(flow);
      flowsElements[flow.id].shouldBeDeleted = false;
    }
  });
  return Object.values(flowsElements);
};

/**
* Converting Dojot's Flows to NodeRed's Flows
*
* @param {Array} flows Dojot's Flows
*/
const castDojotToFlows = (flows) => {
  const myFlows = [];
  flows.forEach((flow) => {
    const flowName = flow.name;
    const flowList = JSON.parse(JSON.stringify(flow.flow));
    // if there's no nodes in the flow
    if (flowList.length === 0) return;

    flowList[0].label = flowName;
    // tab node
    storageForFlows[flowList[0].id] = {
      name: flowName,
      created: flow.created,
      enabled: flow.enabled,
      id: flow.id,
      flow: [],
      isNew: false,
      shouldBeDeleted: true,
    };

    myFlows.push(...flowList);
  });

  // console.log(myFlows);
  return myFlows;
};


module.exports = { castFlowsToDojot, castDojotToFlows };
