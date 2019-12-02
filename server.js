const http = require('http');
const request = require('request');
const path = require('path');
const fs = require('fs');
const io = require('socket.io');
const tf = require('@tensorflow/tfjs');
const { fork } = require('child_process');

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
const rnn_timesteps = 70;
const max_data = 100;
var is_learning = false;
var model_trained = false;
var child;


function buildModel(timesteps, lr) {
    const input_features = 6;
    const output_features = input_features;
    const input_timesteps = timesteps;
    var rnn_model = tf.sequential();
    //var lstm_cells = [];
    //lstm_cells.push(tf.layers.lstmCell({units: 32})); 
    //rnn_model.add(tf.layers.rnn({cell: lstm_cells, inputShape: [input_timesteps, input_features], returnSequences: false}));
    rnn_model.add(tf.layers.lstm({
        units: 12, 
        inputShape: [input_timesteps, input_features],
        returnSequences: false
    }))
    rnn_model.add(tf.layers.dense({units: output_features}));
    const opt_adam = tf.train.adam(lr);
    rnn_model.compile({ optimizer: opt_adam, loss: 'meanSquaredError'});
    rnn_model.summary();
    return rnn_model;
}

function predict(rnn_model, inputs)
{
    const outps = rnn_model.predict(tf.tensor3d(inputs));
    return Array.from(outps.dataSync());
}

async function send_model(m, train_data) {
    let result = await m.save(tf.io.withSaveHandler(async modelArtifacts => modelArtifacts));
    result.weightData = Buffer.from(result.weightData).toString("base64");
    var jsonStr = JSON.stringify(result);
    
    child.send({
        model: jsonStr,
        train_data: train_data,
        epoches: 1
    });
    is_learning = true;
}

async function receive_model(jsonStr) {
    const json = JSON.parse(jsonStr);
    const weightData = new Uint8Array(Buffer.from(json.weightData, "base64")).buffer;
    rnn_model = await tf.loadLayersModel(tf.io.fromMemory(json.modelTopology, json.weightSpecs, weightData));
    is_learning = false;
    model_trained = true;
    for (var i = 0; i < max_data; i++) {
        predict_dataset[i] = dataset[i];
    }
}

async function download_data(socket) {
    var content = "";
    request('https://www.reddit.com/r/singularity/new.json?sort=new', { json: true }, (err, res, body) => {
        if (err) { return console.log(err); }
        content = body.data.children;
        socket.emit('download_data', {'data': content});
        //console.log(content);
    });
}

// Register a callback function to run when we have an individual connection
// This is run for each individual user that connects
listener.sockets.on('connection',
  function (socket) {
    console.log("We have a new client: " + socket.id);

    setInterval(function(){
        if (model_trained) {
            // real-time prediction
            while(predict_dataset.length > max_data) predict_dataset.shift();
            prediction = predict(rnn_model, 
                [predict_dataset.slice(max_data - rnn_timesteps, max_data)]);
            store_data = []
            for (var i = 0; i < 6; i++) {
                if (prediction[i] < 0) prediction[i] = 0.0;
                if (prediction[i] > 1) prediction[i] = 1.0;
                // add some randomness from input
                store_data.push(prediction[i]*0.5 + dataset[max_data-1][i]*0.5);
            }
            predict_dataset.push(store_data);
            socket.emit('prediction', {'data':prediction});
        }
    },20);

    socket.on('disconnect', function() {
        console.log("Client has disconnected");
      });

    socket.on('request', function() {
        console.log("Download some data...");
        download_data(socket);
    });

    // receive face_data every frame
    socket.on('face_data', function(data) {
        //console.log("Get data ", data);
        if (dataset.length < max_data) {
            dataset.push(data.data);
            predict_dataset.push(data.data);
        }
        else {
            if (!rnn_model) {
                rnn_model = buildModel(rnn_timesteps, 0.001);
                child = fork('train.js');

                send_model(rnn_model, dataset);
                is_learning = true;

                child.on('message', (msg) => {
                    //console.log("main process receives data: ", msg);
                    receive_model(msg.model);
                })
            }
            dataset.shift();
            dataset.push(data.data);
            if (!is_learning) {
                send_model(rnn_model, dataset);
            }
        }

    });
  }
);