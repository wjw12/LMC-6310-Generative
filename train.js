const tf = require('@tensorflow/tfjs');
const rnn_timesteps = 100;
const lr = 0.001;

var is_learning = false;

async function jsonify_model(m) {
    let result = await m.save(tf.io.withSaveHandler(async modelArtifacts => modelArtifacts));
    result.weightData = Buffer.from(result.weightData).toString("base64");
    return JSON.stringify(result);
}

async function receive_msg(msg) {
    const jsonStr = msg.model;
    const json = JSON.parse(jsonStr);
    const weightData = new Uint8Array(Buffer.from(json.weightData, "base64")).buffer;
    const model = await tf.loadLayersModel(tf.io.fromMemory(json.modelTopology, json.weightSpecs, weightData));
    rnn_model = await beginLearning(model, msg.train_data, msg.epoches);
    process.send({model: await jsonify_model(rnn_model)});
}

async function beginLearning(rnn_model, dataset, epoches) {
    is_learning = true;
    console.log("Begin learning " + String(epoches) + " epoches.");

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

    const opt_adam = tf.train.adam(lr);
    rnn_model.compile({ optimizer: opt_adam, loss: 'meanSquaredError'});

    const hist = await rnn_model.fit(xs, ys,
    { batchSize: 100, epochs: epoches, callbacks: {
        onEpochEnd: async (epoch, log) => { callback(epoch, log); }}});

    is_learning = false;
    return rnn_model;
}

process.on('message', (msg) => {
    if (is_learning) return;
    //console.log("child receives msg ", msg);
    receive_msg(msg);
});