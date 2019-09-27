/*
Example taken from ml5js repository:
https://github.com/ml5js/ml5-examples/tree/master/p5js/PoseNet
*/

let w = 640;
let h = 480;
let video;
let poseNet;
let poses = [];
let skeletons = [];

let nose;
let eye1;
let eye2;
let tracked = false;

let testWord;
let font = 'Trebuchet MS';

class Word {
  constructor(content) {
    this.content = content;
    this.letters = [];
    for (var i = 0; i < content.length; i++) {
      let letter = new Letter(content.charAt(i));
      letter.offset.set(20*i, random(-5, 5));
      this.letters.push(letter);
    }
    this.pos = createVector(0,0);
    this.scale = 1.0;
    this.color = 255;


  }

  draw() {
    push();
    // apply transforms within push and pop pairs
    translate(this.pos.x, this.pos.y);
    scale(this.scale);
    fill(this.color);
    for (var i = 0; i < this.letters.length; i++) {
      this.letters[i].draw();
    }

    pop();
  }
}

class Letter {
  constructor(content) {
    this.content = content;
    this.offset = createVector(0,0);
    //this.scale = 1.0;

  }

  draw() {
    push();
    text(this.content, this.offset.x, this.offset.y);
    pop();
  }
}


function setup() {
  createCanvas(w, h);
  nose =  createVector(0,0);
  eye1 =  createVector(0,0);
  eye2 = createVector(0,0);
  video = createCapture(VIDEO);
  
  poseNet = ml5.poseNet(video, modelLoaded);

  poseNet.on('pose', gotPoses);

  textFont(font);

  video.hide();
  
  testWord = new Word("To gaze at a river made of time and water");
}

function draw() {
  //image(video, 0, 0, w, h);
  background(51);
  drawFace();
  //drawKeypoints();
  //drawSkeleton();
  if (tracked) {
    testWord.pos.set(nose.x, nose.y);
    testWord.draw();
  }
}

function gotPoses(results) {
  poses = results;
  if (poses.length > 0 && poses[0].pose.keypoints.length > 2) {
    tracked = true;
    let newNose = poses[0].pose.keypoints[0].position;
    let newEye1 = poses[0].pose.keypoints[1].position;
    let newEye2 = poses[0].pose.keypoints[2].position;
    let s = 0.2
    nose.x = lerp(nose.x, newNose.x, s);
    nose.y = lerp(nose.y, newNose.y, s);
    eye1.x = lerp(eye1.x, newEye1.x, s);
    eye1.y = lerp(eye1.y, newEye1.y, s);
    eye2.x = lerp(eye2.x, newEye2.x, s);
    eye2.y = lerp(eye2.y, newEye2.y, s);
    //console.log(poses[0].pose.keypoints[0]);
  }
  else {
    tracked = false;
  }
}

function drawFace() {
  ellipse(nose.x, nose.y, 10, 10);
  ellipse(eye1.x, eye1.y, 10, 10);
  ellipse(eye2.x, eye2.y, 10, 10);
}


function drawSkeleton() {
  for(let i = 0; i < poses.length; i++) {
    for(let j = 0; j < poses[i].skeleton.length; j++) {
      let partA = poses[i].skeleton[j][0];
      let partB = poses[i].skeleton[j][1];
      line(partA.position.x, partA.position.y, partB.position.x, partB.position.y);
    }
  }
}

function drawKeypoints() {
  for(let i = 0; i < poses.length; i++) {
    for(let j = 0; j < poses[i].pose.keypoints.length; j++) {
      let keypoint = poses[i].pose.keypoints[j];
      if (keypoint.score > 0.2) {
        ellipse(keypoint.position.x, keypoint.position.y, 10, 10);
      }
    }
  }
}

function modelLoaded() {
  print('model loaded'); 
}
