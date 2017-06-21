var c;
var ctx;
	
$(function() {
	// Load canvas
	c = $("canvas")[0];
	ctx = c.getContext("2d");
	
	// Define canvas dimensions TODO dynamic resolution
	c.width = window.innerWidth;
	c.height = window.innerHeight;
	
	loadEventListeners();
	
	render();
});

function loadEventListeners() {
	// Dragging
	var dragging = false;
	var last = [0, 0];
	var translated = [0, 0];

	// On mouse click
	c.onmousedown = function(e) {		
		var evt = e || event;
		dragging = true;
		last[0] = evt.offsetX;
		last[1] = evt.offsetY;
	}

	// On mouse move
	c.onmousemove = function(e) {
		var evt = e || event;
		if(dragging) {
			var delta = [evt.offsetX - last[0], evt.offsetY - last[1]];
			translated[0] += delta[0];
			translated[1] += delta[1];
			last[0] = evt.offsetX;
			last[1] = evt.offsetY;
		}
	}

	// On mouse release
	c.onmouseup = function(e) {
		dragging = false;
		
		if(translated[0] != 0 || translated[1] != 0) {
			//Update canvas
			translatePlotByPixels(translated[0], translated[1]);
			translated = [0, 0];
			render(); //Rerender
			
		} else {
			var pos = getMousePos(c, e);
			
			alert(getFloatsFromPixels(pos[0], pos[1]));
		}
	}
	
	//Zooming using cross-browser compatible scroll event listening
	var mousewheelevt = (/Firefox/i.test(navigator.userAgent)) ? "DOMMouseScroll" : "mousewheel"; // FF doesn't recognize mousewheel as of FF3.x
	
	if (document.attachEvent) { // if IE (and Opera depending on user setting)
		document.attachEvent("on"+mousewheelevt, function(e) { onScrollEvent(e); });
	} else if (document.addEventListener) { // WC3 browsers
		document.addEventListener(mousewheelevt, function(e) { onScrollEvent(e); }, false);
	}
	
	function onScrollEvent(e) {
		var up;
		if(e.wheelDelta != undefined) {
			up = e.wheelDelta > 0;
		} else {
			up = e.detail < 0;
		}
		
		var pos = getMousePos(c, e);
		zoomAtPixels(c, pos[0], pos[1], up ? 0.5 : -0.5);
		
		render();
	}
}

//Canvas rendering
var maxDepth = 100; // Fractal recursion depth

function render() {
	$("#plotSizeDisplay").text("["+plotX[0]+","+plotX[1]+"] x ["+plotY[0]+","+plotY[1]+"]")
	
	//Calculate exposure
	var averageWidth = (xWidth+yWidth)/2;
	
	maxDepth = 100 + (1/averageWidth); // TODO calculate expected average
	if(maxDepth > 200) {
		maxDepth = 200;
	}
	
	var imgData = ctx.createImageData(c.width, c.height);
	var data = imgData.data;
	
	for(var y = 0; y < c.height; y++) {
		for(var x = 0; x < c.width; x++) {
			var floats = getFloatsFromPixels(x, y);
			
			//Fractal
			var depth = 0;
			var fz = [0, 0];
			var fc = floats;
			
			while(fz[0]*fz[0]+fz[1]*fz[1] < 4 && depth < maxDepth) {
				depth++;
				
				var fx = fz[0];
				var fy = fz[1];
				
				fz[0] = fx*fx-fy*fy;
				fz[1] = 2*fx*fy;
				fz[0] += fc[0];
				fz[1] += fc[1];
			}
			
			//Draw
			var color = Math.floor((depth/maxDepth)*255);
			
			var index = y*c.width*4+x*4;
			data[index+0] = color;
			data[index+1] = color;
			data[index+2] = color;
			data[index+3] = 255;
		}
	}
	
	ctx.putImageData(imgData, 0, 0);
}

//Plot screen
var plotRes = [window.innerWidth, window.innerHeight]; // X and Y Resolution of plot screen
var plotX = [-2, 1]; // Lowest and highest X value of plot
var plotY = [-2, 2]; // Lowest and highest Y value of plot
var yWidth; // Distance between lowest and highest Y value
var xWidth; // Distance between lowest and highest X value
updateWidths();
var staticRatio = xWidth/yWidth; // Static screen ratio to keep things scaled properly

function getFloatsFromPixels(x, y) {
	return [(x/plotRes[0])*xWidth + plotX[0], plotY[1] - (y/plotRes[1])*yWidth]; // X = highestPlotValue - (pixel/screenWidth)*plotWidth; Y = (pixel/screenWidth)*plotWidth - lowestPlotValue; to convert from pixel on screen to plot values
}

function getPixelsFromFloats(x, y) {
	return [(x-plotX[0])/xWidth*plotRes[0], (plotY[1]-y)/yWidth*plotRes[1]]; // X = (plotValue-lowestPlotValue)/plotWidth*screenWidth; Y = (highestPlotValue-plotValue)/plotWidth*screenWidth to convert from plot values to pixel on screen
}

function updateWidths() {
	yWidth = Math.abs(plotY[0] - plotY[1]);
	xWidth = Math.abs(plotX[0] - plotX[1]);
}

function translatePlotByPixels(x, y) {
	var translate = getFloatsFromPixels(x, y);
	translate[0] -= plotX[0];
	translate[1] -= plotY[1];
	
	plotX[0] -= translate[0];
	plotX[1] -= translate[0];
	plotY[0] -= translate[1];
	plotY[1] -= translate[1];
}

function zoomAtPixels(c, x, y, multiplier) {
	var rightPercent = x / c.width;
	var bottomPercent = y / c.height;
	
	var targetPlotValue = getFloatsFromPixels(x, y);
	var deltaPlotX = [(targetPlotValue[0]-plotX[0]) * (rightPercent), (targetPlotValue[0]-plotX[1]) * (1-rightPercent)];
	var deltaPlotY = [(targetPlotValue[1]-plotY[0]) * (bottomPercent), (targetPlotValue[1]-plotY[1]) * (1-bottomPercent)];
	
	plotX[0] += deltaPlotX[0] * multiplier;
	plotX[1] += deltaPlotX[1] * multiplier;
	plotY[0] += deltaPlotY[0] * multiplier;
	
	var plotxWidth = Math.abs(plotX[0] - plotX[1]);
	plotY[1] = plotY[0] + plotxWidth * (1/staticRatio); // Extrapolate y width based on target ratio
	
	updateWidths();
}

function getMousePos(c, evt) {
    var rect = c.getBoundingClientRect();
    return [evt.clientX - rect.left, evt.clientY - rect.top];
}
