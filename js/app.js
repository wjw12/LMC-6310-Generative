const w = window.innerWidth;//640;
const h = window.innerHeight;//480;
const downSample = 3.0;
let video;
let poseNet;
let poses = [];
let skeletons = [];

const generateInterval = 1;
const letterInterval = 15;
const lineInterval = 50;
const smooth = 0.08;
let lookingAt = 0;
let volatility = 0;
let time = 0.0;
let generateTime = 0.0;
let nose;
let eye1;
let eye2;
let tracked = false;
let debug = true;
let mouseInput = true;

let font = 'Trebuchet MS';

let poemSentences = [['And', 'remember', 'Time', 'is', 'another', 'river'],
        ['To know', 'we', 'stray', 'like', 'a river'],
        ['and our', 'faces', 'vanish', 'like', 'water']
    ]
let sentenceIndex = 0;
let wordIndex = 0;
let floatingWords = [];
let leavingWords = [];
let currentOffsetX = 0; // for word generation
let currentOffsetY = 0;
const maxFloatingWords = 10;
const captureWordDist = 50;

let paragraph;

class Paragraph {
  constructor() {
    this.nRows = 5;
    this.nCols = 8;
    this.currentLine = 0;
    this.position = createVector(0, 0);

    // 2D array
    this.words = new Array(this.nRows);
    for (var i = 0; i < this.nRows; i++) {
      this.words[i] = [];
    }
  }

  draw() {
    push();
    //translate(this.position.x, this.position.y);
    //applyMatrix(-1, 0, 0, 1, 0, 0);
    applyMatrix(-1, 0, 0, 1, w, 0);
    translate(this.position.x, this.position.y);
    //text("paragraph is here", 0, 0);

    for (var i = 0; i < this.nRows; i++) {
      for (var j = 0; j < this.words[i].length; j++) {
        if (!this.words[i][j].isEmpty) {
          this.words[i][j].draw();
        }
      }
    }

    pop();

  }

  updateWords() {
    for (var i = 0; i < this.words.length; i++) {
      for (var j = 0; j < this.words[i].length; j++) {
        //update targets
        let w = this.words[i][j];
        w.target.set(this.position.x + w.offset.x, this.position.y + w.offset.y);

        //update word positions
        w.update();
      }
    }
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
    this.alpha = 255;

    this.isFloating = true;
    this.isLeaving = false;
    this.position = createVector(0,0);
    this.target = createVector(0,0);
    this.velocity = createVector(0,0);
    this.lineNumber = 0;

  }

  update(dt) {
    let dist = p5.Vector.dist(this.position, this.target);
    if (this.isFloating) {
      if (this.scale > 2) {
        this.scale -= dt;
        this.alpha = Math.min(this.alpha + 30 * dt, 200);
      }

      if (tracked) {
        let v = Math.min(0.1 * dist, 50);
        let dir = p5.Vector.sub(this.target, this.position).normalize();
        dir.mult(v);
        this.velocity.set(dir.x, dir.y);
        dir.mult(dt);
        this.position.add(dir);
      }
    }
    else { // captured by paragraph
      if (this.scale > 1) {
        this.scale -= dt * 0.3;
      }
      if (this.alpha < 255) {
        this.alpha += dt * 5;
      }

      if (tracked) {
        let worldPos = p5.Vector.add(this.position, paragraph.position);
        let dir = p5.Vector.sub(this.target, worldPos).normalize();
        dir.mult(Math.min(0.01*dist, 0.1));
        dir.add(p5.Vector.mult(this.velocity, -0.03));
        dir.mult(dt);
        this.velocity.add(dir);
        this.position.add(p5.Vector.mult(this.velocity, dt));
      }
    }
  }

  draw() {
    push();
    // apply transforms within push and pop pairs
    //applyMatrix(-1, 0, 0, 1, w, 0);
    //translate(this.offset.x * downSample, this.offset.y * downSample);
    if (this.isFloating) { 
      applyMatrix(-1, 0, 0, 1, w, 0);
      let r1 = noise(time + this.offset.x * 5);
      let r2 = noise(time + this.offset.y * 10);
      //translate((this.offset.x + 0.5*this.xLength + r1 * 10) * this.scale, 
      //  (this.offset.y + r2 * 10) * this.scale);
      translate(this.position.x, this.position.y);
      scale((1.0 + r1 * r2) * this.scale);
      
    }
    else {// TODO
      //let chaotic = lookingAt;
      let chaotic = 0;
      let t = time * chaotic * 0.01;
      let r1 = noise(t + this.offset.x);
      let r2 = noise(t + this.offset.y);
      //translate((this.offset.x + 0.5*this.xLength + r1 * 10) * this.scale, 
      // (this.offset.y + r2 * 10) * this.scale);
      translate(this.position.x, this.position.y);
      scale((1.0 + r1 * r2 * Math.min(Math.abs(chaotic*0.2), 10)) * this.scale);

    }

    fill(255,255,255, this.alpha);
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
    chaotic = 0;

    let t = millis() / 1000 * chaotic;
    let r = noise(t + this.offset.x);
    translate(this.offset.x + r * chaotic * 5, this.offset.y + r * chaotic * 5);
    //scale(1.0 + r*Math.max(this.chaotic / 5, 3));

    //let randomX = random((-1) * lookingAt, lookingAt)
    //let randomY = random((-1) * lookingAt, lookingAt)
    let range = Math.min(volatility*volatility*0.02, 100);
    let randomX = random(-range*0.3, range*0.3) * 0;
    let randomY = random(-range, range) * 0;
    text(this.content, randomX, randomY);
    pop();
  }
}


function generateWord() {
  if (sentenceIndex >= poemSentences.length) {return;}
  if (wordIndex >= poemSentences[sentenceIndex].length) {
    sentenceIndex++;
    wordIndex = 0;
    currentOffsetX = -15 * Math.random() * letterInterval;
    currentOffsetY += lineInterval;
  }
  if (sentenceIndex >= poemSentences.length) {return;}
  if (floatingWords.length > maxFloatingWords) {return;}

  let randomX = random(100, w-100);
  let randomY = random(100, h-100);

  console.log("generate at", randomX, randomY);

  let word = new Word(poemSentences[sentenceIndex][wordIndex]);
  word.position.set(randomX, randomY);
  word.alpha = 1;
  word.scale = 5;
  word.lineNumber = sentenceIndex;
  word.offset.set(currentOffsetX, currentOffsetY);
  floatingWords.push(word);

  currentOffsetX += (word.content.length+2) * letterInterval + Math.random()*3;
  wordIndex++;
}

function updateWords(dt) {
  // update paragraph words
  paragraph.updateWords();

  // update floating words
  for (var i = 0; i < floatingWords.length; i++) {
    let word = floatingWords[i];
    word.target.set(word.offset.x + paragraph.position.x, word.offset.y + paragraph.position.y);
    word.update(dt);

    // capture the words if very close
    if (p5.Vector.dist(word.position, word.target) < captureWordDist) {
      let idx = word.lineNumber - paragraph.currentLine;
      paragraph.words[idx].push(word);
      floatingWords.splice(i, 1); // remove from array
      word.isFloating = false;
      // word position becomes relative position to paragraph
      word.position.set(word.position.x - paragraph.position.x, word.position.y - paragraph.position.y);
      console.log("captured word ", word);
    }
  }
  
}

// ---------------- SETUP ----------------------
function setup() {
  createCanvas(w, h);
  nose =  createVector(0,0);
  eye1 =  createVector(0,0);
  eye2 = createVector(0,0);
  if (!mouseInput) {
    video = createCapture(VIDEO);
    video.size(w / downSample, h / downSample);
    
    poseNet = ml5.poseNet(video, modelLoaded);

    //poseNet.on('pose', gotPoses);
    poseNet.on('pose', degreeTurned);

    video.hide();
  }

  textFont(font);


  paragraph = new Paragraph();
  
}

// ----------------- DRAW ----------------------
function draw() {
  background(31);
  applyMatrix(-1, 0, 0, 1, w, 0);
  //image(video, 0, 0, w, h);
  if (debug) {
   drawFace();
  }
  if (mouseInput) {
    mouseMoved();
  }
  let newTime = millis() / 1000.0;
  let deltaTime = newTime - time;
  time = newTime;
  if (tracked) {

    generateTime += deltaTime;
    if (generateTime > generateInterval) {
      generateWord();
      generateTime = 0;
    }
  }

  updateWords(deltaTime);

  paragraph.position.set(nose.x * downSample, nose.y * downSample);
  paragraph.draw();
  for (var i = 0; i < floatingWords.length; i++) {
    floatingWords[i].draw();
  }

  if (debug) {
    applyMatrix(-1, 0, 0, 1, w, 0);
    fill(255);
    text("Lookingat "+str(lookingAt), 15, 15);
    text("Volatility "+str(volatility), 15, 50);
    text("Paragraph Position " + str(paragraph.position.x) + ", " + str(paragraph.position.y), 15, 100);
  }
}

function mouseMoved() {
  let x = mouseX / downSample;
  let y = mouseY / downSample;
  nose.x = lerp(nose.x, x, smooth);
  nose.y = lerp(nose.y, y, smooth);
  volatility = Math.abs(x - nose.x) + Math.abs(y - nose.y);
  tracked = true;
  lookingAt = 1.0;
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


function modelLoaded() {
  print('model loaded'); 
}
