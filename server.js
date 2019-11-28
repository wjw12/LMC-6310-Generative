const http = require('http');
const path = require('path');
const fs = require('fs');
const io = require('socket.io');
const tf = require('@tensorflow/tfjs');

function handleRequest(req, res) {
  // What did we request?
  let pathname = req.url;
  
  // If blank let's ask for index.html
  if (pathname == '/') {
    pathname = '/index.html';
  }
  
  // Ok what's our file extension
  let ext = path.extname(pathname);

  // Map extension to file type
  const typeExt = {
    '.html': 'text/html',
    '.js':   'text/javascript',
    '.css':  'text/css'
  };

  // What is it?  Default to plain text
  let contentType = typeExt[ext] || 'text/plain';

  // Now read and write back the file with the appropriate content type
  fs.readFile(__dirname + pathname,
    function (err, data) {
      if (err) {
        res.writeHead(500);
        return res.end('Error loading ' + pathname);
      }
      // Dynamically setting content type
      res.writeHead(200,{ 'Content-Type': contentType });
      res.end(data);
    }
  );
}

// Create a server with the handleRequest callback
let server = http.createServer(handleRequest);
// Listen on port 8080
server.listen(8080);

console.log('Server started on port 8080');

// Listen to socket connections
var listener = io.listen(server);


var dataset = [];
var predict_dataset = []
var rnn_model = null;
var rnn_timesteps = 100;
var max_data = 300;
var is_learning = false;


function buildModel(timesteps, lr) {
    const input_features = 6;
    const output_features = input_features;
    const input_timesteps = timesteps;
    var rnn_model = tf.sequential();
    //var lstm_cells = [];
    //lstm_cells.push(tf.layers.lstmCell({units: 32})); 
    //rnn_model.add(tf.layers.rnn({cell: lstm_cells, inputShape: [input_timesteps, input_features], returnSequences: false}));
    rnn_model.add(tf.layers.lstm({
        units: 32, 
        inputShape: [input_timesteps, input_features],
        returnSequences: false
    }))
    rnn_model.add(tf.layers.dense({units: output_features}));
    const opt_adam = tf.train.adam(lr);
    rnn_model.compile({ optimizer: opt_adam, loss: 'meanSquaredError'});
    rnn_model.summary();
    return rnn_model;
}

async function beginLearning(rnn_model, dataset, epoches) {

    console.log("Begin learning " + String(epoches) + " epoches.");
    is_learning = true;
    var callback = function(epoch, log) {
        var log_str = "Epoch: " + String(epoch + 1) + " Loss: " + String(log.loss);
        console.log(log_str);
    }

    inputs = [];
    outputs = [];
    let timesteps = rnn_timesteps;
    for (var i = 0; i < dataset.length - timesteps - 1; i++) {
        inputs.push(dataset.slice(i, i+timesteps));
        outputs.push(dataset[i+timesteps]);
    }

    const xs = tf.tensor3d(inputs)
    const ys = tf.tensor2d(outputs)

    const hist = await rnn_model.fit(xs, ys,
    { batchSize: 32, epochs: epoches, callbacks: {
        onEpochEnd: async (epoch, log) => { callback(epoch, log); }}});

    is_learning = false;
    return { model: rnn_model, stats: hist };
}

function predict(rnn_model, inputs)
{
    const outps = rnn_model.predict(tf.tensor3d(inputs));
    return Array.from(outps.dataSync());
}

// Register a callback function to run when we have an individual connection
// This is run for each individual user that connects
listener.sockets.on('connection',
  function (socket) {
    console.log("We have a new client: " + socket.id);

    setInterval(function(){
        if (rnn_model) {
            // real-time prediction
            while(predict_dataset.length > max_data) predict_dataset.shift();
            prediction = predict(rnn_model, 
                [predict_dataset.slice(max_data - rnn_timesteps, max_data)]);
            for (var i = 0; i < 6; i++) {
                if (prediction[i] < 0) prediction[i] = 0.0;
                if (prediction[i] > 1) prediction[i] = 1.0;
            }
            predict_dataset.push(prediction);
            socket.emit('prediction', {'data':prediction});
        }
    },20);

    socket.on('disconnect', function() {
        console.log("Client has disconnected");
      });

    // receive face_data every frame
    socket.on('face_data', function(data) {
        console.log("Get data ", data);
        if (dataset.length < max_data) {
            dataset.push(data.data);
            predict_dataset.push(data.data);
        }
        else {
            if (!rnn_model) {
                rnn_model = buildModel(rnn_timesteps, 0.001);
                beginLearning(rnn_model, dataset, 10);
            }
            dataset.shift();
            dataset.push(data.data);
            if (!is_learning) {
                beginLearning(rnn_model, dataset, 10);
            }
        }

    });
  }
);