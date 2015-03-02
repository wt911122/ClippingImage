(function($){
	var $that,
		$canvas,
		$option              = [],
		context,
		CanvasWidth,
		CanvasHeight,
		image                = new Image(),
		$showFocus           = [],
		imageData,
		offscreenCanvas      = document.createElement('canvas'),
		offscreenContext     = offscreenCanvas.getContext('2d'),
		offscreenCanvasBackup =  document.createElement('canvas'),
		offscreenContextBackup = offscreenCanvas.getContext('2d'),
		rubberRect           = {}, 
		rubberCircle         = {},
		mousedown            = {},
		mouseup              = {},
		dragging             = false,
		editing              = false,
		ARC_STYLE            = 'lightgray',
		ARC_LINEWIDTH        = 3.0,
		DEFAULT_RADIUS       = 100,
		CONTROL_POINT_RADIUS = 5,
		CONTROL_SHAPE_POINT_STYLE = "yellow";

	function isIntheRubber(){
		context.beginPath();
		createRubberPath();
		return context.isPointInPath(mousedown.x, mousedown.y);
	}

	function isIntheControlPoint(){
		context.beginPath();
		createControlPointPath();
		return context.isPointInPath(mousedown.x, mousedown.y);
	}
	

	function createRubberPath(opt, dir){
		context.arc(rubberCircle.x, rubberCircle.y, rubberCircle.radius + (opt?opt:0), 0, Math.PI*2, dir||false);
	}

	function createControlPointPath(opt){
		context.arc(rubberRect.x + rubberRect.width - ARC_LINEWIDTH - CONTROL_POINT_RADIUS, 
					rubberRect.y + ARC_LINEWIDTH + CONTROL_POINT_RADIUS, 
					CONTROL_POINT_RADIUS + (opt?opt:0), 
					0, Math.PI*2, false);
	}

	function BlackAndWhite(){
		var imageData = context.getImageData(0,0,context.canvas.width, context.canvas.height),
			data = imageData.data;

		for(var i=0; i < data.length - 4; i+=4){
			average = (data[i] + data[i+1] + data[i+2]) / 3;
			data[i] = average;
			data[i+1] = average;
			data[i+2] = average;
		}
		context.putImageData(imageData, 0, 0)
	}

	function deployDefaultArc(){
		rubberCircle = {x: CanvasWidth / 2,
						y: CanvasHeight / 2,
						radius: DEFAULT_RADIUS}
	}

	function deployRubberRect(){
		rubberRect = {x: rubberCircle.x - rubberCircle.radius,
					  y: rubberCircle.y - rubberCircle.radius,
					  width: rubberCircle.radius * 2}
	}

	function update(loc){
		rubberCircle.x = loc.x + mousedown.offsetX;
		rubberCircle.y = loc.y + mousedown.offsetY;
		deployRubberRect();
	}

	function editUpdate(loc){
		rubberCircle.radius = Math.abs(loc.x - rubberCircle.x);
		deployRubberRect();
		$showFocus.forEach(function(focus){
			focus.ratio = focus.radius*2 / rubberRect.width;
		})
	}

	function drawClipingArc(){
		imageData = context.getImageData(rubberRect.x, 
										 rubberRect.y, 
										 rubberRect.width, 
										 rubberRect.width)
		drawArc();
	}

	function drawArc(){
		context.save();
		context.beginPath();
		context.strokeStyle = ARC_STYLE;
		context.lineWidth = ARC_LINEWIDTH;
		createRubberPath(-ARC_LINEWIDTH);
		context.stroke();
		context.restore();
	}

	function drawArcControlPoint(){
		context.save();
		context.beginPath();
		createControlPointPath();
		context.fillStyle = CONTROL_SHAPE_POINT_STYLE;
		context.fill();
		context.restore();
	}

	function drawBackGround(){
		context.clearRect(0, 0, CanvasWidth, CanvasHeight)
		context.drawImage(image, 0, 0, CanvasWidth, CanvasHeight);
	}

	function drawFocus(){
		$showFocus.forEach(function(focus){
			var context = focus.context;
			context.clearRect(0, 0, focus.radius*2, focus.radius*2);
			context.save();
			context.beginPath();
			context.arc(focus.radius, focus.radius, focus.radius, 0, Math.PI*2, false);
			context.clip();
			context.drawImage($canvas, rubberRect.x + ARC_LINEWIDTH, rubberRect.y + ARC_LINEWIDTH,
							rubberRect.width -  ARC_LINEWIDTH*2, rubberRect.width -  ARC_LINEWIDTH*2,
							0, 0,
							rubberRect.width * focus.ratio,
							rubberRect.width * focus.ratio);
			context.restore();
		})
	}

	function windowToCanvas(x, y){
		var bbox = $canvas.getBoundingClientRect();
		return {x: x - bbox.left - (bbox.width - $canvas.width)/2,
				y: y - bbox.top - (bbox.height - $canvas.height)/2};
	}

	function appendCanvas(){
		$canvas = $("<canvas width='"+ CanvasWidth +"px' height='"+ CanvasHeight +"px'>")[0];
		context = $canvas.getContext('2d');
		$that.append($canvas);
	}

	function erase(){
		if(imageData != null){
			context.putImageData(imageData, rubberRect.x, rubberRect.y);
		}
	}

	function drawCover(){
		drawBackGround();
		offscreenContext.save();
		offscreenContext.clearRect(0, 0, CanvasWidth, CanvasHeight);
		offscreenContext.beginPath();
		offscreenContext.arc(rubberCircle.x, rubberCircle.y, rubberCircle.radius - ARC_LINEWIDTH, 0, Math.PI*2, false);
		offscreenContext.clip();
		offscreenContext.drawImage(image, 0, 0, CanvasWidth, CanvasHeight);

		BlackAndWhite();
		context.drawImage(offscreenCanvas, 0, 0, CanvasWidth, CanvasHeight);
		offscreenContext.restore();		
		drawArc();
	}

	function addCanvasListener(){
		$canvas.onmousedown = function(e){
			e.preventDefault();
			mousedown = windowToCanvas(e.clientX, e.clientY);
			if (isIntheRubber()) {
				dragging = true;
				mousedown.offsetX = rubberCircle.x - mousedown.x;
				mousedown.offsetY = rubberCircle.y - mousedown.y;
			}
			if (isIntheControlPoint()) {
				editing = true;
			}
		};

		$canvas.onmousemove = function(e){
			e.preventDefault();
			if (dragging) {
				if (!$option.cover){
					erase();
				}
				update(windowToCanvas(e.clientX, e.clientY));
				if ($option.cover) drawCover();
				else drawClipingArc();

				drawArcControlPoint();
				drawFocus();
				
			}

			if (editing) {
				if (!$option.cover){
					erase();
				}
				editUpdate(windowToCanvas(e.clientX, e.clientY));

				if ($option.cover) drawCover();
				else drawClipingArc();

				drawArcControlPoint();
				drawFocus();
			}
		};

		$canvas.onmouseup = function(e){
			e.preventDefault();
			dragging = false;
			editing = false;
		};

		$canvas.addEventListener('dragenter', function(e){
			e.preventDefault();
			e.dataTransfer.effectAllowed = 'copy';
		}, false);

		$canvas.addEventListener('dragover', function(e){
			e.preventDefault();
		}, false);

		window.requestFileSystem = 
					window.requestFileSystem || window.webkitRequestFileSystem;

		$canvas.addEventListener('drop', function(e){
			e.preventDefault();
			var file = e.dataTransfer.files[0];

			console.log(file)
			window.requestFileSystem(
				window.TEMPORARY, 
				5*1024*1024, 
				function(fs){
					console.log(fs)
					fs.root.getFile(file.name, 
									{create: true}, 
									function(fileEntry){
										fileEntry.createWriter(function(writer){
											writer.write(file);
										});
										console.log( fileEntry.toURL())
										image.src = fileEntry.toURL();
									}, 
									errorHandler
								)
				}, 
				function(e){
					console.log(e.code);
				});
		}, false);
	}

	function errorHandler(err){ 
		var msg = 'An error occured: '; 
		switch (err.code) { 
			case FileError.NOT_FOUND_ERR: 
				msg += 'File or directory not found'; 
			break; 
			case FileError.NOT_READABLE_ERR: 
				msg += 'File or directory not readable'; 
			break; 
			case FileError.PATH_EXISTS_ERR: 
				msg += 'File or directory already exists'; 
			break; 
			case FileError.TYPE_MISMATCH_ERR: 
				msg += 'Invalid filetype'; 
			break; 
			default: 
				msg += 'Unknown Error'; 
			break; 
		}
	}; 

	function createCanvasElement(wrapper){
		var width = parseFloat($(wrapper).css('width').trim());
		return $("<canvas width='"+width+"' height='"+width+"'>").text('Canvas not support').appendTo($(wrapper))[0];
	}

	function hasCanvas(wrapper){
		return $(wrapper).find('canvas')[0]
	}



	$.fn.ImageClipping = function(initialSrc, option){
		$that = $(this);
		$option = option;
		if ($that.length > 1) {
			throw new Error("Can't handle more than one element");
		}
		CanvasWidth = parseInt($that.css('width').trim());
		CanvasHeight = parseInt($that.css('height').trim());
		offscreenCanvas.width = CanvasWidth;
		offscreenCanvas.height = CanvasHeight;
		appendCanvas();
		image.src = initialSrc;
		image.onload = function(){
			$showFocus = [];
			if (!rubberRect.width) {
				deployDefaultArc();
				deployRubberRect();
			};
			if ($option.cover) drawCover();
			else drawBackGround();

			drawClipingArc();
			drawArcControlPoint();
			addCanvasListener();
			
			$that.find('.showLogo').each(function(){
				var canvas = hasCanvas(this) || createCanvasElement(this),
					context =  canvas.getContext('2d'),
					width = parseFloat($(this).css('width').trim()),
					x = width / 2,
					y = width / 2,
					ratio = width / rubberRect.width;

				$showFocus.push({
					context:context,
					radius:width/2,
					ratio:ratio
				})
				
			})
			drawFocus();
		}
		return $that
	}

	$.fn.setImageClippingOpt = function(option){
		$option = option;
		image.onload.call(this)
	}
})(jQuery)