
const w = window.innerWidth;//640;
const h = window.innerHeight;//480;

const debug = true;

const downSample = 3.0;
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
let ratio;


let words = [];
//let font = 'Lucida Console';
let font = 'Monospace';
//let font;

let isDeleted = false;
let gazeTimer = 0.0;
let idleTimer = 0.0;
let dt = 0.05;

////////////////////////////////////////
// background setting
////////////////////////////////////////
const textWidth = 11;
const textHeight = 17;
let nRows, nCols;
let charArray;

let testString = "Stop Me if You've Heard This One: A Robot & a Team of Irish Scientists Walk Into a Senior Living Home - The Robot That Could Change the Senior Care Industry. AI could bridge the widening gap between the number of older Americans in need of care & number of professionals to care for them. Fei-Fei Li, expert in Computer Science: AI is hyped up and very far away from having consciousness Long TL;DR. Still, if you're in a philosophical mood, humor me. Where is our identity and why aren't we looking for it The singularity won't be a problem for long... because it will solve it's own problems";
let offset = 0;
let charsPerLine = 20;


////////////////////////////////////////
////////////////////////////////////////

// drawing trajectory (test)
// reference: http://perfectionkills.com/exploring-canvas-drawing-techniques/
let drawLines = true;
var ele;
var ctx;
var isDrawing, points = [ ];
var points2 = [];
var dataset = [];
var data_idx = 0;
const maxPoints = 1000;

var socket = io.connect();

let randomizer = new Math.seedrandom(0);

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
    this.hide = false;
    this.scale = 1.0;
    this.color = 255;


  }

  draw() {
    if (this.hide) return;
    push();
    // apply transforms within push and pop pairs
    //applyMatrix(-1, 0, 0, 1, w, 0);
    scale(this.scale);
    translate(this.pos.x, this.pos.y);
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

function preload() {
  //font = loadFont("https://storage.googleapis.com/jiewen.wang/singularity/RobotoMono-Medium.ttf");
}


function setup() {
  createCanvas(w, h);

  // html5 context
  ele = document.getElementById('defaultCanvas0');
  ctx = ele.getContext('2d');
  ctx.lineWidth = 1;
  ctx.lineJoin = ctx.lineCap = 'round';

  textFont(font);

  frameRate(60);
  nose =  createVector(0,0);
  eye1 =  createVector(0,0);
  eye2 = createVector(0,0);
  video = createCapture(VIDEO);
  video.size(w / downSample, h / downSample);
  
  poseNet = ml5.poseNet(video, modelLoaded);

  poseNet.on('pose', gotPoses);
  poseNet.on('pose', degreeTurned);


  video.hide();
  
  words.push(new Word("A robot may not injure a human being"));
  words.push(new Word("A robot must obey orders given it by human beings"));
  words.push(new Word("A robot must protect its own existence"));

  textSize(12);
  nCols = Math.floor(w * 1.5 / textWidth);
  nRows = Math.floor(h * 1.5 / textHeight);
  
  charArray = new Uint8Array([
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,	// Char 000 (.)
    0x7E, 0x81, 0xA5, 0x81, 0xBD, 0x99, 0x81, 0x7E,	// Char 001 (.)
    0x7E, 0xFF, 0xDB, 0xFF, 0xC3, 0xE7, 0xFF, 0x7E,	// Char 002 (.)
    0x6C, 0xFE, 0xFE, 0xFE, 0x7C, 0x38, 0x10, 0x00,	// Char 003 (.)
    0x10, 0x38, 0x7C, 0xFE, 0x7C, 0x38, 0x10, 0x00,	// Char 004 (.)
    0x38, 0x7C, 0x38, 0xFE, 0xFE, 0x7C, 0x38, 0x7C,	// Char 005 (.)
    0x10, 0x10, 0x38, 0x7C, 0xFE, 0x7C, 0x38, 0x7C,	// Char 006 (.)
    0x00, 0x00, 0x18, 0x3C, 0x3C, 0x18, 0x00, 0x00,	// Char 007 (.)
    0xFF, 0xFF, 0xE7, 0xC3, 0xC3, 0xE7, 0xFF, 0xFF,	// Char 008 (.)
    0x00, 0x3C, 0x66, 0x42, 0x42, 0x66, 0x3C, 0x00,	// Char 009 (.)
    0xFF, 0xC3, 0x99, 0xBD, 0xBD, 0x99, 0xC3, 0xFF,	// Char 010 (.)
    0x0F, 0x07, 0x0F, 0x7D, 0xCC, 0xCC, 0xCC, 0x78,	// Char 011 (.)
    0x3C, 0x66, 0x66, 0x66, 0x3C, 0x18, 0x7E, 0x18,	// Char 012 (.)
    0x3F, 0x33, 0x3F, 0x30, 0x30, 0x70, 0xF0, 0xE0,	// Char 013 (.)
    0x7F, 0x63, 0x7F, 0x63, 0x63, 0x67, 0xE6, 0xC0,	// Char 014 (.)
    0x99, 0x5A, 0x3C, 0xE7, 0xE7, 0x3C, 0x5A, 0x99,	// Char 015 (.)
    0x80, 0xE0, 0xF8, 0xFE, 0xF8, 0xE0, 0x80, 0x00,	// Char 016 (.)
    0x02, 0x0E, 0x3E, 0xFE, 0x3E, 0x0E, 0x02, 0x00,	// Char 017 (.)
    0x18, 0x3C, 0x7E, 0x18, 0x18, 0x7E, 0x3C, 0x18,	// Char 018 (.)
    0x66, 0x66, 0x66, 0x66, 0x66, 0x00, 0x66, 0x00,	// Char 019 (.)
    0x7F, 0xDB, 0xDB, 0x7B, 0x1B, 0x1B, 0x1B, 0x00,	// Char 020 (.)
    0x3C, 0x66, 0x38, 0x6C, 0x6C, 0x38, 0xCC, 0x78,	// Char 021 (.)
    0x00, 0x00, 0x00, 0x00, 0x7E, 0x7E, 0x7E, 0x00,	// Char 022 (.)
    0x18, 0x3C, 0x7E, 0x18, 0x7E, 0x3C, 0x18, 0xFF,	// Char 023 (.)
    0x18, 0x3C, 0x7E, 0x18, 0x18, 0x18, 0x18, 0x00,	// Char 024 (.)
    0x18, 0x18, 0x18, 0x18, 0x7E, 0x3C, 0x18, 0x00,	// Char 025 (.)
    0x00, 0x18, 0x0C, 0xFE, 0x0C, 0x18, 0x00, 0x00,	// Char 026 (.)
    0x00, 0x30, 0x60, 0xFE, 0x60, 0x30, 0x00, 0x00,	// Char 027 (.)
    0x00, 0x00, 0xC0, 0xC0, 0xC0, 0xFE, 0x00, 0x00,	// Char 028 (.)
    0x00, 0x24, 0x66, 0xFF, 0x66, 0x24, 0x00, 0x00,	// Char 029 (.)
    0x00, 0x18, 0x3C, 0x7E, 0xFF, 0xFF, 0x00, 0x00,	// Char 030 (.)
    0x00, 0xFF, 0xFF, 0x7E, 0x3C, 0x18, 0x00, 0x00,	// Char 031 (.)
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,	// Char 032 ( )
    0x30, 0x78, 0x78, 0x30, 0x30, 0x00, 0x30, 0x00,	// Char 033 (!)
    0x6C, 0x6C, 0x6C, 0x00, 0x00, 0x00, 0x00, 0x00,	// Char 034 (")
    0x6C, 0x6C, 0xFE, 0x6C, 0xFE, 0x6C, 0x6C, 0x00,	// Char 035 (#)
    0x30, 0x7C, 0xC0, 0x78, 0x0C, 0xF8, 0x30, 0x00,	// Char 036 ($)
    0x00, 0xC6, 0xCC, 0x18, 0x30, 0x66, 0xC6, 0x00,	// Char 037 (%)
    0x38, 0x6C, 0x38, 0x76, 0xDC, 0xCC, 0x76, 0x00,	// Char 038 (&)
    0x60, 0x60, 0xC0, 0x00, 0x00, 0x00, 0x00, 0x00,	// Char 039 (')
    0x18, 0x30, 0x60, 0x60, 0x60, 0x30, 0x18, 0x00,	// Char 040 (()
    0x60, 0x30, 0x18, 0x18, 0x18, 0x30, 0x60, 0x00,	// Char 041 ())
    0x00, 0x66, 0x3C, 0xFF, 0x3C, 0x66, 0x00, 0x00,	// Char 042 (*)
    0x00, 0x30, 0x30, 0xFC, 0x30, 0x30, 0x00, 0x00,	// Char 043 (+)
    0x00, 0x00, 0x00, 0x00, 0x00, 0x30, 0x30, 0x60,	// Char 044 (,)
    0x00, 0x00, 0x00, 0xFC, 0x00, 0x00, 0x00, 0x00,	// Char 045 (-)
    0x00, 0x00, 0x00, 0x00, 0x00, 0x30, 0x30, 0x00,	// Char 046 (.)
    0x06, 0x0C, 0x18, 0x30, 0x60, 0xC0, 0x80, 0x00,	// Char 047 (/)
    0x7C, 0xC6, 0xCE, 0xDE, 0xF6, 0xE6, 0x7C, 0x00,	// Char 048 (0)
    0x30, 0x70, 0x30, 0x30, 0x30, 0x30, 0x30, 0x00,	// Char 049 (1)
    0x78, 0xCC, 0x0C, 0x38, 0x60, 0xC0, 0xFC, 0x00,	// Char 050 (2)
    0x78, 0xCC, 0x0C, 0x38, 0x0C, 0xCC, 0x78, 0x00,	// Char 051 (3)
    0x1C, 0x3C, 0x6C, 0xCC, 0xFE, 0x0C, 0x0C, 0x00,	// Char 052 (4)
    0xFC, 0xC0, 0xF8, 0x0C, 0x0C, 0xCC, 0x78, 0x00,	// Char 053 (5)
    0x38, 0x60, 0xC0, 0xF8, 0xCC, 0xCC, 0x78, 0x00,	// Char 054 (6)
    0xFC, 0x0C, 0x0C, 0x18, 0x30, 0x30, 0x30, 0x00,	// Char 055 (7)
    0x78, 0xCC, 0xCC, 0x78, 0xCC, 0xCC, 0x78, 0x00,	// Char 056 (8)
    0x78, 0xCC, 0xCC, 0x7C, 0x0C, 0x18, 0x70, 0x00,	// Char 057 (9)
    0x00, 0x30, 0x30, 0x00, 0x00, 0x30, 0x30, 0x00,	// Char 058 (:)
    0x00, 0x30, 0x30, 0x00, 0x00, 0x30, 0x30, 0x60,	// Char 059 (;)
    0x18, 0x30, 0x60, 0xC0, 0x60, 0x30, 0x18, 0x00,	// Char 060 (<)
    0x00, 0x00, 0xFC, 0x00, 0x00, 0xFC, 0x00, 0x00,	// Char 061 (=)
    0x60, 0x30, 0x18, 0x0C, 0x18, 0x30, 0x60, 0x00,	// Char 062 (>)
    0x78, 0xCC, 0x0C, 0x18, 0x30, 0x00, 0x30, 0x00,	// Char 063 (?)
    0x7C, 0xC6, 0xDE, 0xDE, 0xDE, 0xC0, 0x78, 0x00,	// Char 064 (@)
    0x18, 0x3C, 0x66, 0x66, 0x7E, 0x66, 0x66, 0x00,	// Char 065 (A)
    0x7C, 0x66, 0x66, 0x7C, 0x66, 0x66, 0x7C, 0x00,	// Char 066 (B)
    0x3C, 0x66, 0xC0, 0xC0, 0xC0, 0x66, 0x3C, 0x00,	// Char 067 (C)
    0x78, 0x6C, 0x66, 0x66, 0x66, 0x6C, 0x78, 0x00,	// Char 068 (D)
    0x7E, 0x60, 0x60, 0x78, 0x60, 0x60, 0x7E, 0x00,	// Char 069 (E)
    0x7E, 0x60, 0x60, 0x78, 0x60, 0x60, 0x60, 0x00,	// Char 070 (F)
    0x3C, 0x66, 0xC0, 0xC0, 0xCE, 0x66, 0x3E, 0x00,	// Char 071 (G)
    0x66, 0x66, 0x66, 0x7E, 0x66, 0x66, 0x66, 0x00,	// Char 072 (H)
    0x18, 0x18, 0x18, 0x18, 0x18, 0x18, 0x18, 0x00,	// Char 073 (I)
    0x06, 0x06, 0x06, 0x06, 0x66, 0x66, 0x3C, 0x00,	// Char 074 (J)
    0x66, 0x66, 0x6C, 0x78, 0x6C, 0x66, 0x66, 0x00,	// Char 075 (K)
    0x60, 0x60, 0x60, 0x60, 0x60, 0x60, 0x7E, 0x00,	// Char 076 (L)
    0xC6, 0xEE, 0xFE, 0xFE, 0xD6, 0xC6, 0xC6, 0x00,	// Char 077 (M)
    0xC6, 0xE6, 0xF6, 0xDE, 0xCE, 0xC6, 0xC6, 0x00,	// Char 078 (N)
    0x3C, 0x66, 0x66, 0x66, 0x66, 0x66, 0x3C, 0x00,	// Char 079 (O)
    0x7C, 0x66, 0x66, 0x7C, 0x60, 0x60, 0x60, 0x00,	// Char 080 (P)
    0x3C, 0x66, 0x66, 0x66, 0x6E, 0x3C, 0x0E, 0x00,	// Char 081 (Q)
    0x7C, 0x66, 0x66, 0x7C, 0x6C, 0x66, 0x66, 0x00,	// Char 082 (R)
    0x3C, 0x66, 0x70, 0x38, 0x0E, 0x66, 0x3C, 0x00,	// Char 083 (S)
    0x7E, 0x18, 0x18, 0x18, 0x18, 0x18, 0x18, 0x00,	// Char 084 (T)
    0x66, 0x66, 0x66, 0x66, 0x66, 0x66, 0x3E, 0x00,	// Char 085 (U)
    0x66, 0x66, 0x66, 0x66, 0x66, 0x3C, 0x18, 0x00,	// Char 086 (V)
    0xC6, 0xC6, 0xC6, 0xD6, 0xFE, 0xEE, 0xC6, 0x00,	// Char 087 (W)
    0x66, 0x66, 0x3C, 0x18, 0x3C, 0x66, 0x66, 0x00,	// Char 088 (X)
    0x66, 0x66, 0x66, 0x3C, 0x18, 0x18, 0x18, 0x00,	// Char 089 (Y)
    0xFE, 0x06, 0x0C, 0x18, 0x30, 0x60, 0xFE, 0x00,	// Char 090 (Z)
    0x78, 0x60, 0x60, 0x60, 0x60, 0x60, 0x78, 0x00,	// Char 091 ([)
    0xC0, 0x60, 0x30, 0x18, 0x0C, 0x06, 0x02, 0x00,	// Char 092 (\)
    0x78, 0x18, 0x18, 0x18, 0x18, 0x18, 0x78, 0x00,	// Char 093 (])
    0x10, 0x38, 0x6C, 0xC6, 0x00, 0x00, 0x00, 0x00,	// Char 094 (^)
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xFF,	// Char 095 (_)
    0x30, 0x30, 0x18, 0x00, 0x00, 0x00, 0x00, 0x00,	// Char 096 (`)
    0x00, 0x00, 0x3C, 0x06, 0x3E, 0x66, 0x3A, 0x00,	// Char 097 (a)
    0x60, 0x60, 0x60, 0x7C, 0x66, 0x66, 0x5C, 0x00,	// Char 098 (b)
    0x00, 0x00, 0x3C, 0x66, 0x60, 0x66, 0x3C, 0x00,	// Char 099 (c)
    0x06, 0x06, 0x06, 0x3E, 0x66, 0x66, 0x3A, 0x00,	// Char 100 (d)
    0x00, 0x00, 0x3C, 0x66, 0x7E, 0x60, 0x3C, 0x00,	// Char 101 (e)
    0x1C, 0x36, 0x30, 0x78, 0x30, 0x30, 0x30, 0x00,	// Char 102 (f)
    0x00, 0x00, 0x3A, 0x66, 0x66, 0x3E, 0x06, 0x3C,	// Char 103 (g)
    0x60, 0x60, 0x6C, 0x76, 0x66, 0x66, 0x66, 0x00,	// Char 104 (h)
    0x18, 0x00, 0x18, 0x18, 0x18, 0x18, 0x18, 0x00,	// Char 105 (i)
    0x0C, 0x00, 0x0C, 0x0C, 0x0C, 0xCC, 0xCC, 0x78,	// Char 106 (j)
    0x60, 0x60, 0x66, 0x6C, 0x78, 0x6C, 0x66, 0x00,	// Char 107 (k)
    0x18, 0x18, 0x18, 0x18, 0x18, 0x18, 0x18, 0x00,	// Char 108 (l)
    0x00, 0x00, 0xC6, 0xEE, 0xFE, 0xD6, 0xC6, 0x00,	// Char 109 (m)
    0x00, 0x00, 0x7C, 0x66, 0x66, 0x66, 0x66, 0x00,	// Char 110 (n)
    0x00, 0x00, 0x3C, 0x66, 0x66, 0x66, 0x3C, 0x00,	// Char 111 (o)
    0x00, 0x00, 0x5C, 0x66, 0x66, 0x7C, 0x60, 0x60,	// Char 112 (p)
    0x00, 0x00, 0x3A, 0x66, 0x66, 0x3E, 0x06, 0x06,	// Char 113 (q)
    0x00, 0x00, 0x5C, 0x76, 0x60, 0x60, 0x60, 0x00,	// Char 114 (r)
    0x00, 0x00, 0x3E, 0x60, 0x3C, 0x06, 0x7C, 0x00,	// Char 115 (s)
    0x30, 0x30, 0x7C, 0x30, 0x30, 0x34, 0x18, 0x00,	// Char 116 (t)
    0x00, 0x00, 0x66, 0x66, 0x66, 0x66, 0x3A, 0x00,	// Char 117 (u)
    0x00, 0x00, 0x66, 0x66, 0x66, 0x3C, 0x18, 0x00,	// Char 118 (v)
    0x00, 0x00, 0xC6, 0xD6, 0xFE, 0xFE, 0x6C, 0x00,	// Char 119 (w)
    0x00, 0x00, 0xC6, 0x6C, 0x38, 0x6C, 0xC6, 0x00,	// Char 120 (x)
    0x00, 0x00, 0x66, 0x66, 0x66, 0x3E, 0x06, 0x3C,	// Char 121 (y)
    0x00, 0x00, 0x7E, 0x0C, 0x18, 0x30, 0x7E, 0x00,	// Char 122 (z)
    0x1C, 0x30, 0x30, 0xE0, 0x30, 0x30, 0x1C, 0x00,	// Char 123 ({)
    0x18, 0x18, 0x18, 0x00, 0x18, 0x18, 0x18, 0x00,	// Char 124 (|)
    0xE0, 0x30, 0x30, 0x1C, 0x30, 0x30, 0xE0, 0x00,	// Char 125 (})
    0x76, 0xDC, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,	// Char 126 (~)
    0x00, 0x10, 0x38, 0x6C, 0xC6, 0xC6, 0xFE, 0x00,	// Char 127 (.)
    0x0E, 0x1E, 0x36, 0x66, 0x7E, 0x66, 0x66, 0x00,	// Char 128 (.)
    0x7C, 0x60, 0x60, 0x7C, 0x66, 0x66, 0x7C, 0x00,	// Char 129 (.)
    0x7C, 0x66, 0x66, 0x7C, 0x66, 0x66, 0x7C, 0x00,	// Char 130 (.)
    0x7E, 0x60, 0x60, 0x60, 0x60, 0x60, 0x60, 0x00,	// Char 131 (.)
    0x1C, 0x3C, 0x6C, 0x6C, 0x6C, 0x6C, 0xFE, 0xC6,	// Char 132 (.)
    0x7E, 0x60, 0x60, 0x7C, 0x60, 0x60, 0x7E, 0x00,	// Char 133 (.)
    0xDB, 0xDB, 0x7E, 0x3C, 0x7E, 0xDB, 0xDB, 0x00,	// Char 134 (.)
    0x3C, 0x66, 0x06, 0x1C, 0x06, 0x66, 0x3C, 0x00,	// Char 135 (.)
    0x66, 0x66, 0x6E, 0x7E, 0x76, 0x66, 0x66, 0x00,	// Char 136 (.)
    0x3C, 0x66, 0x6E, 0x7E, 0x76, 0x66, 0x66, 0x00,	// Char 137 (.)
    0x66, 0x6C, 0x78, 0x70, 0x78, 0x6C, 0x66, 0x00,	// Char 138 (.)
    0x0E, 0x1E, 0x36, 0x66, 0x66, 0x66, 0x66, 0x00,	// Char 139 (.)
    0xC6, 0xEE, 0xFE, 0xFE, 0xD6, 0xD6, 0xC6, 0x00,	// Char 140 (.)
    0x66, 0x66, 0x66, 0x7E, 0x66, 0x66, 0x66, 0x00,	// Char 141 (.)
    0x3C, 0x66, 0x66, 0x66, 0x66, 0x66, 0x3C, 0x00,	// Char 142 (.)
    0x7E, 0x66, 0x66, 0x66, 0x66, 0x66, 0x66, 0x00,	// Char 143 (.)
    0x7C, 0x66, 0x66, 0x66, 0x7C, 0x60, 0x60, 0x00,	// Char 144 (.)
    0x3C, 0x66, 0x60, 0x60, 0x60, 0x66, 0x3C, 0x00,	// Char 145 (.)
    0x7E, 0x18, 0x18, 0x18, 0x18, 0x18, 0x18, 0x00,	// Char 146 (.)
    0x66, 0x66, 0x66, 0x3E, 0x06, 0x66, 0x3C, 0x00,	// Char 147 (.)
    0x7E, 0xDB, 0xDB, 0xDB, 0x7E, 0x18, 0x18, 0x00,	// Char 148 (.)
    0x66, 0x66, 0x3C, 0x18, 0x3C, 0x66, 0x66, 0x00,	// Char 149 (.)
    0x66, 0x66, 0x66, 0x66, 0x66, 0x66, 0x7F, 0x03,	// Char 150 (.)
    0x66, 0x66, 0x66, 0x3E, 0x06, 0x06, 0x06, 0x00,	// Char 151 (.)
    0xDB, 0xDB, 0xDB, 0xDB, 0xDB, 0xDB, 0xFF, 0x00,	// Char 152 (.)
    0xDB, 0xDB, 0xDB, 0xDB, 0xDB, 0xDB, 0xFF, 0x03,	// Char 153 (.)
    0xE0, 0x60, 0x60, 0x7C, 0x66, 0x66, 0x7C, 0x00,	// Char 154 (.)
    0xC6, 0xC6, 0xC6, 0xF6, 0xDE, 0xDE, 0xF6, 0x00,	// Char 155 (.)
    0x60, 0x60, 0x60, 0x7C, 0x66, 0x66, 0x7C, 0x00,	// Char 156 (.)
    0x78, 0x8C, 0x06, 0x3E, 0x06, 0x8C, 0x78, 0x00,	// Char 157 (.)
    0xCE, 0xDB, 0xDB, 0xFB, 0xDB, 0xDB, 0xCE, 0x00,	// Char 158 (.)
    0x3E, 0x66, 0x66, 0x66, 0x3E, 0x36, 0x66, 0x00,	// Char 159 (.)
    0x00, 0x00, 0x3C, 0x06, 0x3E, 0x66, 0x3A, 0x00,	// Char 160 (.)
    0x00, 0x3C, 0x60, 0x3C, 0x66, 0x66, 0x3C, 0x00,	// Char 161 (.)
    0x00, 0x00, 0x7C, 0x66, 0x7C, 0x66, 0x7C, 0x00,	// Char 162 (.)
    0x00, 0x00, 0x7E, 0x60, 0x60, 0x60, 0x60, 0x00,	// Char 163 (.)
    0x00, 0x00, 0x1C, 0x3C, 0x6C, 0x6C, 0xFE, 0x82,	// Char 164 (.)
    0x00, 0x00, 0x3C, 0x66, 0x7E, 0x60, 0x3C, 0x00,	// Char 165 (.)
    0x00, 0x00, 0xDB, 0x7E, 0x3C, 0x7E, 0xDB, 0x00,	// Char 166 (.)
    0x00, 0x00, 0x3C, 0x66, 0x0C, 0x66, 0x3C, 0x00,	// Char 167 (.)
    0x00, 0x00, 0x66, 0x6E, 0x7E, 0x76, 0x66, 0x00,	// Char 168 (.)
    0x00, 0x18, 0x66, 0x6E, 0x7E, 0x76, 0x66, 0x00,	// Char 169 (.)
    0x00, 0x00, 0x66, 0x6C, 0x78, 0x6C, 0x66, 0x00,	// Char 170 (.)
    0x00, 0x00, 0x0E, 0x1E, 0x36, 0x66, 0x66, 0x00,	// Char 171 (.)
    0x00, 0x00, 0xC6, 0xFE, 0xFE, 0xD6, 0xD6, 0x00,	// Char 172 (.)
    0x00, 0x00, 0x66, 0x66, 0x7E, 0x66, 0x66, 0x00,	// Char 173 (.)
    0x00, 0x00, 0x3C, 0x66, 0x66, 0x66, 0x3C, 0x00,	// Char 174 (.)
    0x00, 0x00, 0x7E, 0x66, 0x66, 0x66, 0x66, 0x00,	// Char 175 (.)
    0x11, 0x44, 0x11, 0x44, 0x11, 0x44, 0x11, 0x44,	// Char 176 (.)
    0x55, 0xAA, 0x55, 0xAA, 0x55, 0xAA, 0x55, 0xAA,	// Char 177 (.)
    0xDD, 0x77, 0xDD, 0x77, 0xDD, 0x77, 0xDD, 0x77,	// Char 178 (.)
    0x18, 0x18, 0x18, 0x18, 0x18, 0x18, 0x18, 0x18,	// Char 179 (.)
    0x18, 0x18, 0x18, 0xF8, 0x18, 0x18, 0x18, 0x18,	// Char 180 (.)
    0x18, 0xF8, 0x18, 0xF8, 0x18, 0x18, 0x18, 0x18,	// Char 181 (.)
    0x36, 0x36, 0x36, 0xF6, 0x36, 0x36, 0x36, 0x36,	// Char 182 (.)
    0x00, 0x00, 0x00, 0xFE, 0x36, 0x36, 0x36, 0x36,	// Char 183 (.)
    0x00, 0xF8, 0x18, 0xF8, 0x18, 0x18, 0x18, 0x18,	// Char 184 (.)
    0x36, 0xF6, 0x06, 0xF6, 0x36, 0x36, 0x36, 0x36,	// Char 185 (.)
    0x36, 0x36, 0x36, 0x36, 0x36, 0x36, 0x36, 0x36,	// Char 186 (.)
    0x00, 0xFE, 0x06, 0xF6, 0x36, 0x36, 0x36, 0x36,	// Char 187 (.)
    0x36, 0xF6, 0x06, 0xFE, 0x00, 0x00, 0x00, 0x00,	// Char 188 (.)
    0x36, 0x36, 0x36, 0xFE, 0x00, 0x00, 0x00, 0x00,	// Char 189 (.)
    0x18, 0xF8, 0x18, 0xF8, 0x00, 0x00, 0x00, 0x00,	// Char 190 (.)
    0x00, 0x00, 0x00, 0xF8, 0x18, 0x18, 0x18, 0x18,	// Char 191 (.)
    0x18, 0x18, 0x18, 0x1F, 0x00, 0x00, 0x00, 0x00,	// Char 192 (.)
    0x18, 0x18, 0x18, 0xFF, 0x00, 0x00, 0x00, 0x00,	// Char 193 (.)
    0x00, 0x00, 0x00, 0xFF, 0x18, 0x18, 0x18, 0x18,	// Char 194 (.)
    0x18, 0x18, 0x18, 0x1F, 0x18, 0x18, 0x18, 0x18,	// Char 195 (.)
    0x00, 0x00, 0x00, 0xFF, 0x00, 0x00, 0x00, 0x00,	// Char 196 (.)
    0x18, 0x18, 0x18, 0xFF, 0x18, 0x18, 0x18, 0x18,	// Char 197 (.)
    0x18, 0x1F, 0x18, 0x1F, 0x18, 0x18, 0x18, 0x18,	// Char 198 (.)
    0x36, 0x36, 0x36, 0x37, 0x36, 0x36, 0x36, 0x36,	// Char 199 (.)
    0x36, 0x37, 0x30, 0x3F, 0x00, 0x00, 0x00, 0x00,	// Char 200 (.)
    0x00, 0x3F, 0x30, 0x37, 0x36, 0x36, 0x36, 0x36,	// Char 201 (.)
    0x36, 0xF7, 0x00, 0xFF, 0x00, 0x00, 0x00, 0x00,	// Char 202 (.)
    0x00, 0xFF, 0x00, 0xF7, 0x36, 0x36, 0x36, 0x36,	// Char 203 (.)
    0x36, 0x37, 0x30, 0x37, 0x36, 0x36, 0x36, 0x36,	// Char 204 (.)
    0x00, 0xFF, 0x00, 0xFF, 0x00, 0x00, 0x00, 0x00,	// Char 205 (.)
    0x36, 0xF7, 0x00, 0xF7, 0x36, 0x36, 0x36, 0x36,	// Char 206 (.)
    0x18, 0xFF, 0x00, 0xFF, 0x00, 0x00, 0x00, 0x00,	// Char 207 (.)
    0x36, 0x36, 0x36, 0xFF, 0x00, 0x00, 0x00, 0x00,	// Char 208 (.)
    0x00, 0xFF, 0x00, 0xFF, 0x18, 0x18, 0x18, 0x18,	// Char 209 (.)
    0x00, 0x00, 0x00, 0xFF, 0x36, 0x36, 0x36, 0x36,	// Char 210 (.)
    0x36, 0x36, 0x36, 0x3F, 0x00, 0x00, 0x00, 0x00,	// Char 211 (.)
    0x18, 0x1F, 0x18, 0x1F, 0x00, 0x00, 0x00, 0x00,	// Char 212 (.)
    0x00, 0x1F, 0x18, 0x1F, 0x18, 0x18, 0x18, 0x18,	// Char 213 (.)
    0x00, 0x00, 0x00, 0x3F, 0x36, 0x36, 0x36, 0x36,	// Char 214 (.)
    0x36, 0x36, 0x36, 0xFF, 0x36, 0x36, 0x36, 0x36,	// Char 215 (.)
    0x18, 0xFF, 0x18, 0xFF, 0x18, 0x18, 0x18, 0x18,	// Char 216 (.)
    0x18, 0x18, 0x18, 0xF8, 0x00, 0x00, 0x00, 0x00,	// Char 217 (.)
    0x00, 0x00, 0x00, 0x1F, 0x18, 0x18, 0x18, 0x18,	// Char 218 (.)
    0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,	// Char 219 (.)
    0x00, 0x00, 0x00, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,	// Char 220 (.)
    0xF0, 0xF0, 0xF0, 0xF0, 0xF0, 0xF0, 0xF0, 0xF0,	// Char 221 (.)
    0x0F, 0x0F, 0x0F, 0x0F, 0x0F, 0x0F, 0x0F, 0x0F,	// Char 222 (.)
    0xFF, 0xFF, 0xFF, 0x00, 0x00, 0x00, 0x00, 0x00,	// Char 223 (.)
    0x00, 0x00, 0x7C, 0x66, 0x66, 0x7C, 0x60, 0x00,	// Char 224 (.)
    0x00, 0x00, 0x3C, 0x66, 0x60, 0x66, 0x3C, 0x00,	// Char 225 (.)
    0x00, 0x00, 0x7E, 0x18, 0x18, 0x18, 0x18, 0x00,	// Char 226 (.)
    0x00, 0x00, 0x66, 0x66, 0x3E, 0x06, 0x7C, 0x00,	// Char 227 (.)
    0x00, 0x00, 0x7E, 0xDB, 0xDB, 0x7E, 0x18, 0x00,	// Char 228 (.)
    0x00, 0x00, 0x66, 0x3C, 0x18, 0x3C, 0x66, 0x00,	// Char 229 (.)
    0x00, 0x00, 0x66, 0x66, 0x66, 0x66, 0x7F, 0x03,	// Char 230 (.)
    0x00, 0x00, 0x66, 0x66, 0x3E, 0x06, 0x06, 0x00,	// Char 231 (.)
    0x00, 0x00, 0xDB, 0xDB, 0xDB, 0xDB, 0xFF, 0x00,	// Char 232 (.)
    0x00, 0x00, 0xDB, 0xDB, 0xDB, 0xDB, 0xFF, 0x03,	// Char 233 (.)
    0x00, 0x00, 0xE0, 0x60, 0x7C, 0x66, 0x7C, 0x00,	// Char 234 (.)
    0x00, 0x00, 0xC6, 0xC6, 0xF6, 0xDE, 0xF6, 0x00,	// Char 235 (.)
    0x00, 0x00, 0x60, 0x60, 0x7C, 0x66, 0x7C, 0x00,	// Char 236 (.)
    0x00, 0x00, 0x7C, 0x06, 0x3E, 0x06, 0x7C, 0x00,	// Char 237 (.)
    0x00, 0x00, 0xCE, 0xDB, 0xFB, 0xDB, 0xCE, 0x00,	// Char 238 (.)
    0x00, 0x00, 0x3E, 0x66, 0x3E, 0x36, 0x66, 0x00,	// Char 239 (.)
    0x00, 0x00, 0xFE, 0x00, 0xFE, 0x00, 0xFE, 0x00,	// Char 240 (.)
    0x10, 0x10, 0x7C, 0x10, 0x10, 0x00, 0x7C, 0x00,	// Char 241 (.)
    0x00, 0x30, 0x18, 0x0C, 0x06, 0x0C, 0x18, 0x30,	// Char 242 (.)
    0x00, 0x0C, 0x18, 0x30, 0x60, 0x30, 0x18, 0x0C,	// Char 243 (.)
    0x0E, 0x1B, 0x1B, 0x18, 0x18, 0x18, 0x18, 0x18,	// Char 244 (.)
    0x18, 0x18, 0x18, 0x18, 0x18, 0xD8, 0xD8, 0x70,	// Char 245 (.)
    0x00, 0x18, 0x18, 0x00, 0x7E, 0x00, 0x18, 0x18,	// Char 246 (.)
    0x00, 0x76, 0xDC, 0x00, 0x76, 0xDC, 0x00, 0x00,	// Char 247 (.)
    0x00, 0x38, 0x6C, 0x6C, 0x38, 0x00, 0x00, 0x00,	// Char 248 (.)
    0x00, 0x00, 0x00, 0x18, 0x18, 0x00, 0x00, 0x00,	// Char 249 (.)
    0x00, 0x00, 0x00, 0x00, 0x18, 0x00, 0x00, 0x00,	// Char 250 (.)
    0x03, 0x02, 0x06, 0x04, 0xCC, 0x68, 0x38, 0x10,	// Char 251 (.)
    0x3C, 0x42, 0x99, 0xA1, 0xA1, 0x99, 0x42, 0x3C,	// Char 252 (.)
    0x30, 0x48, 0x10, 0x20, 0x78, 0x00, 0x00, 0x00,	// Char 253 (.)
    0x00, 0x00, 0x7C, 0x7C, 0x7C, 0x7C, 0x00, 0x00,	// Char 254 (.)
    0x00, 0x00, 0x00, 0x00, 0x00, 0x42, 0x7E, 0x00	// Char 255 (.)
  ]);

  randomizer = new Math.seedrandom(0);

}

function choose(choices) {
  //var index = Math.floor(Math.random() * choices.length);
  var index = Math.floor(randomizer.quick() * choices.length);
  return choices[index];
}

function draw() {
  background(0);

  //////////////////////////////////////////
  // draw background
  //////////////////////////////////////////
  let error = false;
  if (random()<0.01) {
    error = true;
  }

  //Math.seedrandom(Math.floor(frameCount / 5));
  randomizer = new Math.seedrandom(Math.floor(frameCount / 5));

  fill(110);
  push();
  translate(-w*0.1, -h*0.1);
  //if (tracked) {
    translate(0.2*(nose.x*downSample - 0.5*w), 0.2*(nose.y*downSample - 0.5*h));
//}
  textSize(18);
  for (var i = 0; i < nRows; i++) {
    let str = "";
    for (var j = 0; j < nCols; j++) {
      //if (random() < 0.05) {
      //  c = choose(['a', '4', 'f', '$', '#', '^', 'U', 'q', ';', 'B']);//String.fromCharCode(c.charCodeAt(0) + 1);
      //}
      //let rowIdx = i % 8;
      let rowIdx = i % (error? 10: 8);
      let colIdx = j % 8;
      let strIdx = Math.floor(i / 8) * charsPerLine + Math.floor(j / 8);
      let charCode = testString.charCodeAt(offset + strIdx);
      if (charArray[8*charCode+rowIdx] & (128 >> colIdx)) {
      //if (charArray[8*charCode+rowIdx] & (error ? 160 : 128 >> colIdx)) {
        //text(choose(['B', 'm', '%', '$', '#', 'W', '@', '9', 'e', 'G']), j*textWidth, i*textHeight);
        str += choose(['B', 'm', '%', '$', '#', 'W', '@', '9', 'e', 'G']);
      }
      else{
        //text(choose(['.', ',', '/', '~', '^', '`', ':', ';', '>']), j*textWidth, i*textHeight);
        str += choose(['.', ',', '\'', '\"', '^', '`', ':', ';']);
      }
    }
    text(str, 0, i*textHeight);
  }
  pop();

  if (random() < 0.03) {
    offset++;
  }
  //////////////////////////////////////////
  //////////////////////////////////////////


  //////////////////////////////////////////
  // draw forground texts
  //////////////////////////////////////////
  textSize(12);
  applyMatrix(-1, 0, 0, 1, w, 0);
  fill(255);
//  image(video, 0, 0, w, h);
  drawFace();
  //drawKeypoints();
  //drawSkeleton();
  //if (tracked) {
    let x = w * 0.5 + 0.1*(nose.x*downSample - 0.5*w) + 280; // screen coordinates
    let y = h * 0.5 + 0.1*(nose.y*downSample - 0.5*h) - 100;
    words[0].pos.set(x, y - 50);
    words[1].pos.set(x, y);
    words[2].pos.set(x, y+50);
    for (var i = 0; i < 3; i++) {
      words[i].draw();
    }
  //}

  

  //////////////////////////////////////////
  // update timers
  //////////////////////////////////////////

  let dateObj = new Date();
  //console.log("seconds " + dateObj.getSeconds());
  let gazeTime = dateObj.getSeconds();

  if (Math.abs(lookingAt) > 70) {
    gazeTimer += 1;
  }
  else {
    gazeTimer = 0;
  }

  //console.log(gazeTimer);
  if (gazeTimer > 10) {
    isDeleted = true;
    words[0].hide = true;
    words[1].hide = true;
    //console.log("hide!!!!");
  }

  if (isDeleted) {
    idleTimer += 1;
    if (idleTimer > 100 && gazeTimer > 10) {
      isDeleted = false;
      words[0].hide = false;
      words[1].hide = false;
      //console.log("show!!!!");
    }
  }
  else {
    idleTimer = 0;
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


socket.on('prediction', function(prediction) {
  console.log("Receive prediction", prediction);
  points2.push({
    x: prediction.data[2] * w, 
    y: prediction.data[3] * h, 
    l: getLookingAt(
      prediction.data[0] * w / downSample,
      prediction.data[1] * h / downSample,
      prediction.data[2] * w / downSample,
      prediction.data[3] * h / downSample,
      prediction.data[4] * w / downSample,
      prediction.data[5] * h / downSample
    )
  });
  if (points2.length > maxPoints)
    points2.shift();
});

function drawFace() {
  push();
  //applyMatrix(-1, 0, 0, 1, w, 0);
  fill(100, 100, 100, 100);
  let dist = Math.abs((eye1.x - eye2.x) * downSample);
  ellipse(nose.x * downSample, nose.y * downSample, 3*dist, 5*dist);

  if (drawLines) {
    if (tracked) { 
      points.push({ x: eye1.x * downSample, y: eye1.y * downSample, l:lookingAt });
      //points2.push({x: eye2.x * downSample, y: eye2.y * downSample, l:lookingAt });
      socket.emit('face_data', {
        'data':[
          eye1.x / w * downSample, 
          eye1.y / h * downSample,
          eye2.x / w * downSample,
          eye2.y / h * downSample,
          nose.x / w * downSample,
          nose.y / h * downSample
        ]
      })
    }
    if (points.length > maxPoints) {
      points.shift();
      //points2.shift();
    }
    let segments = 50;
    let perSegment = maxPoints / segments;
    var n = points.length - 1;

    for (var j = 0; j < segments && n >= 0; j++) {
      ctx.beginPath();
      ctx.moveTo(points[n].x, points[n].y);
      for (var i = 1; i < perSegment; i++) {
        if (n - i < 0) break;
        ctx.lineTo(points[n-i].x, points[n-i].y);
        let delta = Math.min(Math.floor(points[n-i].l), 40);
        var nearPoint = points[n-i-delta-5];
        if (nearPoint) {
          ctx.moveTo(nearPoint.x, nearPoint.y);
          ctx.lineTo(points[n-i].x, points[n-i].y);
        }
      }
      n -= perSegment;
      ctx.strokeStyle = 'rgba(255,255,255,' + str(1.0 * (segments - j) / segments) + ')';
      ctx.stroke();
    }

      // n = points.length - 1;
      // for (var j = 0; j < segments && n >= 0; j++) {
      //   ctx.beginPath();
      //   ctx.moveTo(points2[n].x, points2[n].y);
      //   for (var i = 1; i < perSegment; i++) {
      //     if (n - i < 0) break;
      //     ctx.lineTo(points2[n-i].x, points2[n-i].y);
      //     let delta = Math.min(Math.floor(points2[n-i].l), 40);
      //     var nearPoint = points2[n-i-delta-5];
      //     if (nearPoint) {
      //       ctx.moveTo(nearPoint.x, nearPoint.y);
      //       ctx.lineTo(points2[n-i].x, points2[n-i].y);
      //     }
      //   }
      //   n -= perSegment;
      //   ctx.strokeStyle = 'rgba(255,255,255,' + str(1.0 * (segments - j) / segments) + ')';
      //   ctx.stroke();
      // }

      
    n = points2.length - 1;
    //if(Math.random() < 0.1) console.log(points2);
    for (var j = 0; j < segments && n >= 0; j++) {
      ctx.beginPath();
      ctx.moveTo(points2[n].x, points2[n].y);
      for (var i = 1; i < perSegment; i++) {
        if (n - i < 0) break;
        ctx.lineTo(points2[n-i].x, points2[n-i].y);
        let delta = Math.min(Math.floor(points2[n-i].l), 40);
        var nearPoint = points2[n-i-delta-5];
        if (nearPoint) {
          ctx.moveTo(nearPoint.x, nearPoint.y);
          ctx.lineTo(points2[n-i].x, points2[n-i].y);
        }
      }
      n -= perSegment;
      ctx.strokeStyle = 'rgba(255,255,255,' + str(1.0 * (segments - j) / segments) + ')';
      ctx.stroke();
    }
  }
    
    

  if (debug) {
    fill(255);
    ellipse(eye1.x * downSample, eye1.y * downSample, 10, 10);
    ellipse(eye2.x * downSample, eye2.y * downSample, 10, 10);
    ellipse(nose.x * downSample, nose.y * downSample, 10, 10);
    applyMatrix(-1, 0, 0, 1, w, 0);
    text(str(lookingAt), 50, 50);
  }

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

function getLookingAt(eye1x, eye1y, eye2x, eye2y, nosex, nosey) {
  let tempEyeDist = Math.abs(eye1x - eye2x);
  let tempNostDist1 = Math.sqrt(eye1x*nosex + eye1y*nosey );
  let tempNostDist2 = Math.sqrt(eye2x*nosex + eye2y*nosey );

  let result = 1/Math.abs(tempNostDist1 - tempNostDist2) * 100;


  let a = 20;
  result = Math.max(Math.pow(result, 2) - a, 0.1);
  if (result < 2*a) {
    result *= pow(result / (a*2), 1.5);
  }
  return result;
}

function degreeTurned(results){
  poses = results;

  if (poses.length > 0 && poses[0].pose.keypoints.length > 2) {
    if (tracked) {
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
    }

    

    // eyeDist = Math.abs(eye1.x - eye2.x);
    // noseDist1 = Math.sqrt(Math.pow(eye1.x - nose.x, 2) + Math.pow(eye1.y - nose.y, 2))
    // noseDist2 = Math.sqrt(Math.pow(eye2.x - nose.x, 2) + Math.pow(eye2.y - nose.y, 2))

    // ratio = noseDist1 / noseDist2;
    // if (ratio < 1) ratio = 1.0 / ratio;



    lookingAt = getLookingAt(eye1.x, eye1.y, eye2.x, eye2.y, nose.x, nose.y);
    //lookingAt = (1/Math.abs(tempNostDist1 - tempNostDist2))*10;
   // lookingAt = Math.pow(10, tempLookingAt);

    //eyeDist = tempEyeDist;
    //noseDist1 = tempNostDist1;
    //noseDist2 = tempNostDist2; 

      }
  else {
    lookingAt = 0;
  }

}