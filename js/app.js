const w = window.innerWidth;//640;
const h = window.innerHeight;//480;
const downSample = 3.0;
let video;
let poseNet;
let poses = [];
let skeletons = [];

const generateInterval = 5;
const letterInterval = 15;
const smooth = 0.05;
let lookingAt = 0;
let volatility = 0;
let time = 0.0;
let generateTime = 0.0;
let nose;
let eye1;
let eye2;
let tracked = false;
let debug = true;

let testWord;
let testParagraph;
let font = 'Trebuchet MS';

let poemSentences = [['And', 'remember', 'Time', 'is', 'another', 'river'],
        ['To know', 'we', 'stray', 'like', 'a river'],
        ['and our', 'faces', 'vanish', 'like', 'water']
    ]
let poemIndex = 0;
let floatingSentences = [];
let fixedSentences = [];

class Paragraph {
  constructor() {
    this.nRows = 5;
    this.nCols = 8;
    this.nSentences = 0; // sentence is just a row
    this.position = createVector(0, 0);

    // 2D array
    this.words = new Array(this.nRows);
    for (var i = 0; i < this.nRows; i++) {
      this.words[i] = new Array(this.nCols);
    }

    let wordsArray = [['To', 'gaze', 'at a', 'river', 'made', 'of time', 'and water'],
        //['and', 'water', 'And', 'remember', 'Time'],
        //['is', 'another', 'river', 'To know', 'we', 'stray']
    ]

    let xCoord = 0;
    let yCoord = 0;
    let dx = 20;
    let dy = 50;
    for (var i = 0; i < this.nRows; i++) {
      xCoord = 0;
      for (var j = 0; j < this.nCols; j++) {
        if (i < wordsArray.length && j < wordsArray[i].length) {
          this.words[i][j] = new Word(wordsArray[i][j]);
          this.words[i][j].offset.set(xCoord + Math.random()*5, yCoord + Math.random()*5);
          xCoord += dx * wordsArray[i][j].length;
        }
        else {
          this.words[i][j] = new Word('');
        }
        xCoord += dx;

      }
      yCoord += dy;
    }
    
  }

  draw() {
    push();
    // apply transforms within push and pop pairs
    //applyMatrix(-1, 0, 0, 1, w, 0);
    translate(this.position.x * downSample, this.position.y * downSample);
    applyMatrix(-1, 0, 0, 1, 0, 0);

    for (var i = 0; i < this.nRows; i++) {
      for (var j = 0; j < this.nCols; j++) {
        if (!this.words[i][j].isEmpty) {
          this.words[i][j].draw();
        }
      }
    }

    pop();

  }

}

class Sentence {
  constructor(content) {
    this.content = content;
    this.words = [];
    this.position = createVector(0, 0);
    this.scale = 0.1;
    this.seed = 0;
    this.isFloating = true;

    let xCoord = 0;
    let dx = 15;
    for (var i = 0; i < content.length; i++) {
      let word = new Word(content[i]);
      word.offset.set(xCoord + Math.random()*5, Math.random()*5);
      this.words.push(word);
      xCoord += dx * content[i].length + 20;
    }

    // seed for randomness
    for (var i = 0; i < content[0].length; i++) {
      this.seed += content[0].charCodeAt(i);
    }
  }

  draw() {
    push();
    translate(this.position.x * downSample, this.position.y * downSample);
    applyMatrix(-1, 0, 0, 1, 0, 0);

    let s = this.scale * (1.0 + 0.3*Math.sin(0.5*time - this.seed));
    for (var i=0; i < this.words.length; i++) {
      this.words[i].scale = this.scale * s;
      this.words[i].draw();
    }


    pop();
  }
}


class Word {
  constructor(content) {
    this.content = content;
    this.letters = [];
    this.isEmpty = content.length < 1;
    this.xLength = letterInterval * content.length;
    for (var i = 0; i < content.length; i++) {
      let letter = new Letter(content.charAt(i));
      letter.offset.set(letterInterval*i - 0.5*this.xLength, 0);
      this.letters.push(letter);
    }

    this.offset = createVector(0,0);
    this.scale = 1.0;
    this.color = 255;
  }

  draw() {
    push();
    // apply transforms within push and pop pairs
    //applyMatrix(-1, 0, 0, 1, w, 0);
    //translate(this.offset.x * downSample, this.offset.y * downSample);
    let chaotic = lookingAt;
    let t = millis() / 1000 * chaotic * 0.01;
    let r1 = noise(t + this.offset.x);
    let r2 = noise(t + this.offset.y);
    translate((this.offset.x + 0.5*this.xLength + r1 * 10) * this.scale, 
     (this.offset.y + r2 * 10) * this.scale);
    scale((1.0 + r1 * r2 * Math.min(Math.abs(chaotic*0.2), 10)) * this.scale);

    fill(this.color);
    //applyMatrix(-1, 0, 0, 1, 0, 0);
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
    let chaotic = abs(lookingAt);

    let t = millis() / 1000 * chaotic;
    let r = noise(t + this.offset.x);
    translate(this.offset.x + r * chaotic * 5, this.offset.y + r * chaotic * 5);
    //scale(1.0 + r*Math.max(this.chaotic / 5, 3));

    //let randomX = random((-1) * lookingAt, lookingAt)
    //let randomY = random((-1) * lookingAt, lookingAt)
    let range = Math.min(volatility*volatility*0.02, 100);
    let randomX = random(-range*0.3, range*0.3);
    let randomY = random(-range, range);
    text(this.content, randomX, randomY);
    pop();
  }
}


function generateSentence() {
  if (poemIndex >= poemSentences.length) {return;}

  let randomX = random(100, w-100);
  let randomY = random(100, h-100);

  console.log("generate at", randomX, randomY);

  let sentence = new Sentence(poemSentences[poemIndex++]);
  sentence.position.set(randomX, randomY);
  floatingSentences.push(sentence);
}

function updateSentences(dt) {
  for (var i = 0; i < floatingSentences.length; i++) {
    let s = floatingSentences[i];
    let target = nose.copy();
    let dist = p5.Vector.dist(s.position, target);
    if (s.scale < 0.5) {
      s.scale += dt * 0.1;
    }


    if (tracked) {
      let v = Math.min(0.1 * dist, 50) * dt;
      let dir = target.sub(s.position).normalize();
      s.position.add(dir.mult(v));
    }
  }
  
}

// ---------------- SETUP ----------------------
function setup() {
  createCanvas(w, h);
  nose =  createVector(0,0);
  eye1 =  createVector(0,0);
  eye2 = createVector(0,0);
  video = createCapture(VIDEO);
  video.size(w / downSample, h / downSample);
  
  poseNet = ml5.poseNet(video, modelLoaded);

  //poseNet.on('pose', gotPoses);
  poseNet.on('pose', degreeTurned);

  textFont(font);

  video.hide();
  
  //testWord = new Word("To gaze at a river made of time and water");
  testParagraph = new Paragraph();
}

// ----------------- DRAW ----------------------
function draw() {
  background(51);
  applyMatrix(-1, 0, 0, 1, w, 0);
  //image(video, 0, 0, w, h);
  if (debug) {
   drawFace();
  }
  //drawKeypoints();
  //drawSkeleton();
  let newTime = millis() / 1000.0;
  let deltaTime = newTime - time;
  time = newTime;
  if (tracked) {
    //testWord.pos.set(nose.x, nose.y);
    //testWord.draw();
    testParagraph.position.set(nose.x, nose.y);
    testParagraph.draw();

    generateTime += deltaTime;
    if (generateTime > generateInterval) {
      generateSentence();
      generateTime = 0;
    }
  }

  updateSentences(deltaTime);

  for (var i = 0; i < floatingSentences.length; i++) {
    floatingSentences[i].draw();
  }

  if (debug) {
    applyMatrix(-1, 0, 0, 1, w, 0);
    fill(255);
    text(lookingAt, 15, 15);
    text(volatility, 15, 100);
  }
}

function gotPoses(results) {
  poses = results;
  if (poses.length > 0 && poses[0].pose.keypoints.length > 2) {
    tracked = true;
    let newNose = poses[0].pose.keypoints[0].position;
    let newEye1 = poses[0].pose.keypoints[1].position;
    let newEye2 = poses[0].pose.keypoints[2].position;
    let s = 0.2;
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

function degreeTurned(results){
  poses = results;

  if (poses.length > 0 && poses[0].pose.keypoints.length > 2) {
    tracked = true;
    let newNose = poses[0].pose.keypoints[0].position;
    let newEye1 = poses[0].pose.keypoints[1].position;
    let newEye2 = poses[0].pose.keypoints[2].position;
    let s = smooth;
    volatility = Math.abs(newNose.x - nose.x) + Math.abs(newNose.y - nose.y);
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
    volatility = 0;
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
