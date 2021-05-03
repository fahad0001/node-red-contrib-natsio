module.exports = function(RED) {

  function NatsSubNode(n) {
    RED.nodes.createNode(this, n);
    var node = this;

    node.server = RED.nodes.getNode(n.server);
    node.server.setMaxListeners(node.server.getMaxListeners() + 1)
    node.sids = [];

    node.on('input', (msg) => {
      var subjects = msg.payload.subjects || [];
      if(subjects.length > 0) {
          subjects.forEach(sub => {
            node.sids.push(node.server.nc.subscribe(sub,
              {max: n.maxWanted,queue:n.queue},
              (message, replyTo, subject) => {
                node.send({payload: message, topic: subject, replyTo: replyTo});
              }
            ));
          })
          msg.payload.status = "New Subject List Updated";
          node.send(msg);
      } else {
        node.sids.push(node.server.nc.subscribe(n.subject,
          {max: n.maxWanted,queue:n.queue},
          (message, replyTo, subject) => {
            node.send({payload: message, topic: subject, replyTo: replyTo});
          }
        ));

        msg.payload.status = "Used Default Subject";
        msg.payload.subjects = n.subject
        node.send(msg);
      }
    })

    node.server.on('Status', (st) => { // (status,action)
      if (st.text == 'connected') {
        node.send("Default Subject: ", n.subject);
      }
      this.status(st)
    });


    node.on('close', () => {
      if (node.sids) {
        node.sids.forEach(sid => {
          node.server.nc.unsubscribe(sid);
        });
      }
      node.server.setMaxListeners(node.server.getMaxListeners() - 1)
    });
  }
  RED.nodes.registerType("natsio-sub",NatsSubNode);
}
