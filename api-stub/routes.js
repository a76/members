module.exports = function(server) {

  // Create an API namespace, so that the root does not
  // have to be repeated for each end point.
  server.namespace('/api', function() {

    // Return fixture data for '/api/posts/:id'
    server.get('/posts/:id', function(req, res) {
      var post = {
        "post": {
          "id": 1,
          "title": "Rails is omakase",
          "comments": ["1", "2"],
          "user" : "dhh"
        },

        "comments": [{
          "id": "1",
          "body": "Rails is unagi"
        }, {
          "id": "2",
          "body": "Omakase O_o"
        }]
      };

      res.send(post);
    });

    server.get('/members', function(req, res) {
      var post = {
        "members": [
          {
            id: "1",
            firstName: 'Andrei',
            lastName: 'Tarkovski'
          }, {
            id: "2",
            firstName: 'Andrei',
            lastName: 'Silchankau'
          }, {
            id: "3",
            firstName: 'Andrei',
            lastName: 'Tamelo'
          }, {
            id: "4",
            firstName: "Pavel",
            lastName: "Labovich"
          } 
        ]
      };

      res.send(post);
    })
  });
};
