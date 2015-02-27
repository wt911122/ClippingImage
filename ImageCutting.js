(function($){
	var $that,
		$canvas,
		context,
		CanvasWidth,
		CanvasHeight,
		image                = new Image(),
		$showFocus           = [],
		imageData,
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
		//CONTROL_LOCATION_POINT_STYLE = "yellow",
		CONTROL_SHAPE_POINT_STYLE = "yellow";

	function CanvasCuttingEdge(){

	}

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
	

	function createRubberPath(opt){
		context.arc(rubberCircle.x, rubberCircle.y, rubberCircle.radius + (opt?opt:0), 0, Math.PI*2, false);
	}

	function createControlPointPath(opt){
		context.arc(rubberRect.x + rubberRect.width - ARC_LINEWIDTH - CONTROL_POINT_RADIUS, 
					rubberRect.y + ARC_LINEWIDTH + CONTROL_POINT_RADIUS, 
					CONTROL_POINT_RADIUS + (opt?opt:0), 
					0, Math.PI*2, false);
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
		context.drawImage(image, 0, 0, CanvasWidth, CanvasHeight);
	}

	function drawFocus(){
		$showFocus.forEach(function(focus){

			var context = focus.context;
			context.clearRect(0, 0, focus.radius*2, focus.radius*2)
			context.beginPath();
			context.arc(focus.radius, focus.radius, focus.radius, 0, Math.PI*2, false);
			context.clip();
			context.drawImage($canvas, rubberRect.x + ARC_LINEWIDTH, rubberRect.y + ARC_LINEWIDTH,
							rubberRect.width -  ARC_LINEWIDTH*2, rubberRect.width -  ARC_LINEWIDTH*2,
							0, 0,
							rubberRect.width * focus.ratio,
							rubberRect.width * focus.ratio);
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
				erase();
				update(windowToCanvas(e.clientX, e.clientY));
				drawClipingArc();
				drawArcControlPoint();
				drawFocus();
			}

			if (editing) {
				erase();
				editUpdate(windowToCanvas(e.clientX, e.clientY));
				drawClipingArc();
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
		if ($that.length > 1) {
			throw new Error("Can't handle more than one element");
		}
		console.log($that.css('width'))
		CanvasWidth = parseInt($that.css('width').trim());
		CanvasHeight = parseInt($that.css('height').trim());
		
		appendCanvas();
		image.src = initialSrc;
		image.onload = function(){
			$showFocus = [];
			if (!rubberRect.width) {
				deployDefaultArc();
				deployRubberRect();
			};
			
			drawBackGround();
			drawClipingArc();
			drawArcControlPoint();
			addCanvasListener();
			
			$that.find('.showLogo').each(function(){
				//var context = $('<canvas width="'+ $(this).css('width').trim() +'" height="'+  $(this).css('width').trim() +'">').appendTo($(this))[0].getContext('2d'),
				var canvas = hasCanvas(this) || createCanvasElement(this),
					context =  canvas.getContext('2d'),
					width = parseFloat($(this).css('width').trim()),
					x = width / 2,
					y = width / 2,
					ratio = width / rubberRect.width;

				$showFocus.push({
					context:context,
					radius:width/2,
					ratio:ratio,
				})
				
			})
			drawFocus();
		}
		return $that
	}
})(jQuery)