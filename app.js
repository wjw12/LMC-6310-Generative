let w = window.innerWidth;//640;
let h = window.innerHeight;//480;
let downSample = 3.0;
let video;
let poseNet;
let poses = [];
let skeletons = [];

let nose;
let eye1;
let eye2;
let tracked = false;

let lookingAt = 0;
let eyeDist;
let noseDist1;
let noseDist2;

let testWord;
let font = 'Trebuchet MS';

class Word {
  constructor(content) {
    this.content = content;
    this.letters = [];
    for (var i = 0; i < content.length; i++) {
      let letter = new Letter(content.charAt(i));
      letter.offset.set(15*i, random(-5, 5));
      this.letters.push(letter);
    }
    this.pos = createVector(0,0);
    this.scale = 1.0;
    this.color = 255;


  }

  draw() {
    push();
    // apply transforms within push and pop pairs
    //applyMatrix(-1, 0, 0, 1, w, 0);
    scale(this.scale);
    translate(this.pos.x * downSample, this.pos.y * downSample);
    fill(this.color);
    applyMatrix(-1, 0, 0, 1, 0, 0);
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
    this.chaotic = 1.0;
    //this.scale = 1.0;

  }

  draw() {
    push();
    let t = millis() / 1000 * this.chaotic;
    let r = noise(t + this.offset.x);
    translate(this.offset.x + r * this.chaotic * 5, this.offset.y);
    scale(1.0 + r*this.chaotic);

    let randomX = random((-1) * lookingAt, lookingAt)
    let randomY = random((-1) * lookingAt, lookingAt)

    text(this.content, randomX, randomY);
    pop();
  }
}


function setup() {
  createCanvas(w, h);
  nose =  createVector(0,0);
  eye1 =  createVector(0,0);
  eye2 = createVector(0,0);
  video = createCapture(VIDEO);
  video.size(w / downSample, h / downSample);
  
  poseNet = ml5.poseNet(video, modelLoaded);

  poseNet.on('pose', gotPoses);
  poseNet.on('pose', degreeTurned);

  textFont(font);

  video.hide();
  
  testWord = new Word("To gaze at a river made of time and water");
}

function draw() {
  background(51);
  applyMatrix(-1, 0, 0, 1, w, 0);
//  image(video, 0, 0, w, h);
  drawFace();
  //drawKeypoints();
  //drawSkeleton();
  if (tracked) {
    testWord.pos.set(300, 100);          //testWord.pos.set(nose.x, nose.y);
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
  push();
  //applyMatrix(-1, 0, 0, 1, w, 0);
  ellipse(nose.x * downSample, nose.y * downSample, 10, 10);
  ellipse(eye1.x * downSample, eye1.y * downSample, 10, 10);
  ellipse(eye2.x * downSample, eye2.y * downSample, 10, 10);
  pop();
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



function degreeTurned(results){
  poses = results;

  if (poses.length > 0 && poses[0].pose.keypoints.length > 2) {
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

    let tempEyeDist = Math.abs(eye1.x - eye2.x);
    let tempNostDist1 = Math.sqrt(eye1.x*nose.x + eye1.y*nose.y );
    let tempNostDist2 = Math.sqrt(eye2.x*nose.x + eye2.y*nose.y );


    lookingAt = 1/Math.abs(tempNostDist1 - tempNostDist2) * 100;

    lookingAt = Math.pow(lookingAt, 2) - 20;
    //lookingAt = (1/Math.abs(tempNostDist1 - tempNostDist2))*10;
   // lookingAt = Math.pow(10, tempLookingAt);

    eyeDist = tempEyeDist;
    noseDist1 = tempNostDist1;
    noseDist2 = tempNostDist2; 

      }
  else {
    lookingAt = 0;
  }

  print("Looking " +  lookingAt);
  //print("Nose2 " +  noseDist2);

}