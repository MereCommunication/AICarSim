var population;
var course;
var iteration = 0;
var iterationP;
var deathClock = 51000;

function setup() {
  iterationP = createP();
  //randomSeed(10);
  createCanvas(600,600);
  course = new Course();
  course.generateCourse();
  population = new Population();
  course.trackPieces[0].show();
  console.log("Go!!");
}

function draw() {
  background(0);
  var leaderCar = population.getLeaderCar();
  camera(leaderCar.pos.x - width/2,leaderCar.pos.y - height/2,0.5);
  course.show();
  population.run();
  if(population.completion() > 0.9 || (deathClock-- <= 0)) {
    population.evaluate();
    population.selection();
    iterationP.html("Iteration " + ++iteration);
    deathClock = 1000;
  }
  
}

function Population() {
  this.cars = [];
  this.popSize = 10;
  this.matingpool = [];
  
  for(var i = 0; i < this.popSize; i++) {
    var newCar = new Car();
    newCar.addSensors(course);//relies on global
    this.cars.push(newCar);
  }
  
  this.getLeaderCar = function() {
    var leaderCar;
    var leaderScore = -1;
    for(var car of this.cars) {
      car.updateFitness();
      if (car.fitness > leaderScore) {
        leaderScore = car.fitness;
        leaderCar = car;
      }
    }
    return leaderCar;
  }
  
  this.run = function() {
    for(var car of this.cars) {
      car.update();
      car.show();
    }
  }
  
  this.completion = function() {
    var crashCount = 0;
    for(var car of this.cars) {
      if(car.isCrashed) {
        crashCount += 1;
      }
    }
    return crashCount/this.popSize;
  }
  
  this.evaluate = function() {
    var maxFit = 1;
    for(var i = 0; i < this.popSize; i++) {
      this.cars[i].updateFitness();
      if(this.cars[i].fitness > maxFit) {
        maxFit = this.cars[i].fitness;
      }
    }
    createP(maxFit);
    
    for(var i = 0; i < this.popSize; i++) {
     this.cars[i].fitness /= maxFit;
    }
    
    this.matingpool = [];
    for(var i = 0; i < this.popSize; i++) {
      var n = this.cars[i].fitness * 100;
      for(var j = 0; j<n;j++) {
        this.matingpool.push(this.cars[i]);
      }
    }
  }
  
  this.selection = function() {
    var newCars = [];
    for(var i = 0; i < this.cars.length; i++) {
      var parentA = random(this.matingpool);
      var parentB = random(this.matingpool);
      newDNA = new DNA(parentA.dna.dna, parentB.dna.dna);
      newCar = new Car(newDNA);
      newCar.addSensors(course);
      newCars.push(newCar);
    }
    this.cars = newCars;
  }
}

function Car(dna) {
  this.dimensions = createVector(10,5);
  this.angle = 0.5;
  this.pos = createVector(width/2,height/2);
  this.vel = createVector();
  this.acc = createVector();
  this.angacc = 0;
  this.sensors = [];
  if(dna) {
    this.dna = dna;
  } else {
    this.dna = new DNA();
  }
  this.isCrashed = false;
  this.fitness = 0;
  
  this.updateFitness = function() {
    this.fitness = course.getScore(this.pos);
    return this.fitness;
  }
  
  this.update = function() {
    var human = false;
    this.angacc = 0;
    this.acc = createVector(0,0);
    if(human) {
      if(keyIsDown(UP_ARROW)) {
        this.acc.x += 1*cos(this.angle);
        this.acc.y += 1*sin(this.angle);
      }
      if(keyIsDown(DOWN_ARROW)) {
        this.acc.x -= 1*cos(this.angle);
        this.acc.y -= 1*sin(this.angle);
      }
      if(keyIsDown(LEFT_ARROW)) {
        this.angacc -= 0.1;
      }
      if(keyIsDown(RIGHT_ARROW)) {
        this.angacc += 0.1;
      }
    } else {
      var inputs = this.getInputs(this.sensors,this.angle,this.vel);
      this.acc.x += inputs.acc*cos(this.angle);
      this.acc.y += inputs.acc*sin(this.angle);
      this.angacc += inputs.angacc*0.1;
    }
    
    if(!course.onCourse(this.pos)) {
      this.isCrashed = true;
      this.acc = createVector();
      this.vel = createVector();
    }
    
    if(!this.isCrashed) {
      this.vel.add(this.acc);
      this.vel.limit(2);
      this.pos.add(this.vel);
      this.angle += this.angacc;
      if(this.angle > TWO_PI) {
        this.angle -= TWO_PI;
      } else if(this.angle < 0) {
        this.angle += TWO_PI;
      }
    }
  }
  
  this.show = function() {
    push();
    noStroke();
    fill(255,150);
    translate(this.pos.x, this.pos.y);
    rotate(this.angle);
    rectMode(CENTER);
    rect(0,0,this.dimensions.x,this.dimensions.y);
    pop();
  }
  
  this.addSensors = function(course) {
    this.sensors.push(new Sensor(this, course, 0));
    this.sensors.push(new Sensor(this, course, PI/4));
    this.sensors.push(new Sensor(this, course, -PI/4));
    this.sensors.push(new Sensor(this, course, PI/2));
    this.sensors.push(new Sensor(this, course, -PI/2));
  }
  
  this.getInputs = function(sensors,angle,velocity){
    //8 inputs
    layer1 = [];
    layer1.push(1);
    for(var sensor of this.sensors) {
      layer1.push(sensor.getValue()/100);
    }
    //layer1.push(angle/TWO_PI);
    layer1.push(velocity.x/2);
    layer1.push(velocity.y/2);
    
    //7 middle
    layer2 = [];
    layer2.push(1);
    for(var l2i = 0; l2i < 6; l2i++) {
      l2Val = 0;
      for(var l1i = 0; l1i < 8; l1i++) {
        l2Val += this.dna.dna[0][l1i][l2i]*layer1[l1i];
      }
      layer2.push(l2Val);
    }
    //2 output
    layer3 = [];

    for(var l3i = 0; l3i < 2; l3i++) {
      l3Val = 0;
      for(var l2i = 0; l2i < layer2.length; l2i++) {
        l3Val += this.dna.dna[1][l2i][l3i]*layer2[l2i];
      }
      layer3.push(l3Val);
    }
    
    return {acc: layer3[0], angacc: layer3[1]};
  }
  
}

function Course() {
  this.trackLength = 70;
  this.trackPieces = [];
  
  this.generateCourse = function() {
    var lastPiece = new TrackPiece(createVector(width/2,height/2),0,createVector(100,30),1);
    this.trackPieces.push(lastPiece);
    var cushion = 10;
    for(var i = 1; i < this.trackLength; i++) {
      var dimensions = createVector(random(50,90),30);
      var angle = lastPiece.angle + random(-TWO_PI/4,TWO_PI/4);
      var pos = createVector(lastPiece.pos.x,lastPiece.pos.y);
      pos.x += ((lastPiece.dimensions.x - cushion)*cos(lastPiece.angle))/2;
      pos.x += ((dimensions.x - cushion)*cos(angle))/2;
      pos.y += ((lastPiece.dimensions.x - cushion)*sin(lastPiece.angle))/2;
      pos.y += ((dimensions.x - cushion)*sin(angle))/2;
      
      
      var newPiece = new TrackPiece(pos, angle, dimensions, i + 1);
      this.trackPieces.push(newPiece);
      lastPiece = newPiece;
    }
  }
  
  this.show = function() {
    for(var trackPiece of this.trackPieces) {
      trackPiece.show();
    }
  }
  
  this.onCourse = function(position) {
    var on = false;
    for(var i = 0; i < this.trackPieces.length; i++) {
    //for(var trackPiece of this.trackPieces) {
      if(this.trackPieces[i].onPiece(position,0)) {
        on = true;
      }
    }
    return on;
  }
  
  this.getScore = function(position) {
    var score = 0;
    for(var i = 0; i < this.trackPieces.length; i++) {
    //for(var trackPiece of this.trackPieces) {
      if(this.trackPieces[i].onPiece(position,5)) {
        score = this.trackPieces[i].score;
      }
    }
    return score;
  }
}

function TrackPiece(pos, angle, dimensions, score) {
  this.pos = pos;
  this.angle = angle;
  this.dimensions = dimensions;
  this.score = score;
  this.show = function() {
    push()
    noStroke();
    fill(255,150);
    translate(this.pos.x, this.pos.y);
    rotate(this.angle);
    rectMode(CENTER);
    rect(0,0,this.dimensions.x,this.dimensions.y);
    pop();
  }
  
  this.onPiece = function(position, extra) {
    var relativePosition = position.copy().sub(this.pos).rotate(-1*this.angle);
    if(abs(relativePosition.x) < abs(this.dimensions.x/2 + extra) && abs(relativePosition.y) < abs(this.dimensions.y/2 + extra)) {
      return true;
    } else {
      return false;
    }
  }
}

function Sensor(car,course,angleOffset) {
  this.car = car;
  this.course = course;
  this.angleOffset = angleOffset;
  this.maxRange = 100;
  
  this.getValue = function() {
    var carPos = this.car.pos.copy();
    var angle = this.car.angle + this.angleOffset;
    var testLength = 0;
    var maxFound = false;
    while(testLength < this.maxRange && !maxFound) {
      var testPoint = carPos.copy();
      testPoint.add(createVector(1,0).rotate(angle).mult(testLength*3));
      if(!this.course.onCourse(testPoint)) {
        maxFound = true;
      } else {
        testLength++;
      }
    }
    return testLength;
  }
  
}

function DNA(dna1,dna2) {
  var mutationRate = 0.5;
  
  this.dna = [];
  var layer = [];
  
  
  if(dna1 && dna2) {
    var mixedDNA = [];
    for(var i = 0; i < dna1.length; i++) {
      mixedDNA[i] = new Array();
      for(var j = 0; j < dna1[i].length; j++) {
        mixedDNA[i][j] = new Array();
        for(var k = 0; k < dna1[i][k].length; k++) {
          // var mutate = random(0,1);
          // if(mutate < mutationRate) {
          //   mixedDNA[i][j][k] = random(-1,1);
          // } else {
          //   var x = random(0,1);
          //   if(x < 0.5) {
          //     mixedDNA[i][j][k] = dna1[i][j][k];
          //   } else {
          //     mixedDNA[i][j][k] = dna2[i][j][k];
          //   }
          // }
          var mutateRoll = random(0,1);
          var x = random(0,1);
          if(x < 0.5) {
            mixedDNA[i][j][k] = dna1[i][j][k];
          } else {
            mixedDNA[i][j][k] = dna2[i][j][k];
          }
          if(mutateRoll < mutationRate) {
            mixedDNA[i][j][k] += random(-0.1,0.1);
          }
        }
      }
    }
    this.dna = mixedDNA;
    
  } else {
    for(var i = 0; i < 8; i++) {
      layer[i] = new Array();
      for(var j = 0; j < 7; j++) {
        if(dna1 && dna2) {
          var x = random(0,1);
          if(x < 0.5) {
            layer[i][j] = dna1[0][i][j];
          } else {
            layer[i][j] = dna2[0][i][j];
          }
        } else {
          layer[i][j] = random(-1,1);
        }
      }
    }
    this.dna[0] = layer;
    var layer2 = [];
    for(var k = 0; k < 7; k++) {
      layer2[k] = new Array();
      for(var m = 0; m < 2; m++) {
        if(dna1 && dna2) {
          var x = random(0,1);
          if(x < 0.5) {
            layer[k][m] = dna1[1][k][m];
          } else {
            layer[k][m] = dna2[1][k][m];
          }
        } else {
          layer2[k][m] = random(-1,1);
        }
      }
    }
    this.dna[1] = layer2;
  }
}