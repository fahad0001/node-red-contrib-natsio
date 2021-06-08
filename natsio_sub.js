module.exports = function(RED) {

  function NatsSubNode(n) {
    RED.nodes.createNode(this, n);
    var node = this;

    node.server = RED.nodes.getNode(n.server);
    node.server.setMaxListeners(node.server.getMaxListeners() + 1)
    node.sids = [];
    node.globalSubjects = [];

    node.on('input', (msg) => {
      console.log("Entry to Node on Input Event with Msg: ", msg);
      var subjects = msg.payload.subjects || [];
      subjects = subjects.reduce((acc, curr) => {
        if(!node.globalSubjects.some(sub => sub === curr)) {
          acc.push(curr);
        }
        return acc;
      }, []);

      node.globalSubjects.push(...subjects);
      msg.payload = {global: node.globalSubjects, subject: subjects, Logs: "Global: Subjects Added, msg Payload Added"};
      console.log("Testing Instance for Payload: ", msg);
      node.send(msg);
      if(subjects.length > 0) {
        subjects.forEach(sub => {
          console.log("Every Subject: ", sub)
          node.sids.push(node.server.nc.subscribe(sub,
            {max: n.maxWanted,queue: n.queue}, 
            (message, replyTo, subject) => {
              console.log("Final: ", message, " Topic: ", subject);
              node.send({payload: message, topic: subject, replyTo: replyTo});
            }
          ));
        });
      }
      else if(node.globalSubjects.length <= 0) {
          node.sids.push(node.server.nc.subscribe(n.subject,
            {max: n.maxWanted,queue:n.queue},
            (message, replyTo, subject) => {
              node.send({payload: message, topic: subject, replyTo: replyTo});
            }
          ));

          msg.payload.status = "Default Subject List";
          msg.payload.subjects = n.subject
          node.send(msg);
      }
    })

    node.server.on('Status', (st) => { // (status,action)
      if (st.text == 'connected') {
        node.send("Initialized");
      }
      this.status(st)
    });


    node.on('close', () => {
      if (node.sids) {
        node.sids.forEach(sid => {
          node.server.nc.unsubscribe(sid);
        });
        node.send({payload: node.sids, topic: subject, replyTo: replyTo});
      }
    });
  }
  RED.nodes.registerType("natsio-sub",NatsSubNode);
}
