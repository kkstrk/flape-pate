// canvas
let canvas;
let ctx;

// animation frames
const fps = 60;
let raf;
let prevFrame = 0;

// sprites
const images = {};

const cave = {
	x: 0,
	ceiling: { height: 16 + 32, padding: 16 },
	floor: { height: 32 + 32, padding: 32 },
	init() {
		this.x = 0;
	},
	draw() {
		ctx.beginPath();
		ctx.rect(0, 0, canvas.width, this.ceiling.padding);
		ctx.rect(0, canvas.height - this.floor.padding, canvas.width, this.floor.padding); 
		ctx.fillStyle = '#352940';
		ctx.fill();
		ctx.closePath();

		let x = this.x;
		while (x < canvas.width) {
			ctx.drawImage(
				images.ceiling,
				x,
				this.ceiling.padding,
				images.ceiling.width,
				images.ceiling.height
			);
			ctx.drawImage(
				images.floor,
				x,
				canvas.height - this.floor.padding - images.floor.height,
				images.floor.width,
				images.floor.height
			);
			x += images.ceiling.width;
		}
	},
};

const pillars = {
	current: 0,
	visible: [],
	vx: 4,
	heightMin: 96,
	heightMax: 0,
	width: 83, // images.ceilingPillar images.floorPillar height property value
	gap: { x: 256, y: 192 },
	init() {
		this.current = 0;
		this.visible = [{ x: canvas.width, height: Math.floor(canvas.height * 0.33) }];
		this.heightMax = canvas.height - cave.floor.height - pillars.gap.y - this.heightMin;
	},
	draw() {
		this.visible.forEach(({ x, height }) => {
			// ctx.drawImage(
			// 	images.pillarGap,
			// 	x - images.pillarGap.width/2 + this.width/2 ,
			// 	cave.ceiling.height + height - 14,
			// 	images.pillarGap.width,
			// 	this.gap.y - 24 ,
			// );

			if (height >= images.ceilingPillar.height) {
				ctx.drawImage(
					images.ceilingPillar,
					x,
					cave.ceiling.height,
					this.width,
					height,
				);
			} else {
				ctx.drawImage(
					images.ceilingPillar,
					0,
					images.ceilingPillar.height - height,
					images.ceilingPillar.width,
					height,
					x,
					cave.ceiling.height,
					this.width,
					height,
				);
			}

			const bottomHeight = canvas.height - height - this.gap.y - cave.floor.height;
			if (bottomHeight >= images.floorPillar.height) {
				ctx.drawImage(
					images.floorPillar,
					x,
					height + this.gap.y,
					this.width,
					bottomHeight,
				);
			} else {
				ctx.drawImage(
					images.floorPillar,
					0,
					0,
					images.floorPillar.width,
					bottomHeight,
					x,
					height + this.gap.y,
					this.width,
					bottomHeight,
				);
			}
		});

		this.visible.forEach(({ x: rockX }) => {
			const x = rockX - images.ceilingMound.width / 2 + this.width / 2;
			ctx.drawImage(
				images.ceilingMound,
				x,
				cave.ceiling.height,
				images.ceilingMound.width,
				images.ceilingMound.height
			);
			ctx.drawImage(
				images.floorMound,
				x,
				canvas.height - cave.floor.height - images.floorMound.height,
				images.floorMound.width,
				images.floorMound.height
			);
		});
	},
};

const pate = {
	x: 0,
	y: 0,
	vy: 0,
	height: 32,
	width: 37,
	yMax: 0,
	yMin: 0,
	init() {
		this.x = Math.floor(canvas.width * 0.33);
		this.y = Math.floor(canvas.height / 2);
		this.vy = 0;
		this.spriteN = 0;
		this.frame = 0;
		this.yMax = canvas.height - cave.floor.height - pate.height;
		this.yMin = cave.ceiling.height;
	},
	draw() {
		ctx.drawImage(
			images.pate,
			0,
			this.spriteN * (this.height + 9),
			this.width,
			this.height,
			this.x,
			this.y,
			this.width,
			this.height,
		);
		this.frame = (this.frame + 1) % 6;
		if (this.frame % 6 == 0) {
			this.spriteN = (this.spriteN + 1) % 4;
		}
	},
};

const draw = () => {
	raf = requestAnimationFrame(draw);

	let now = Math.round(fps * Date.now() / 1000);
	if (now === prevFrame) return;
	prevFrame = now;

	ctx.clearRect(0, 0, canvas.width, canvas.height);
	cave.draw();
	pillars.draw();
	pate.draw();

	// collided with ceiling or floor
	if (pate.y <= pate.yMin || pate.y >= pate.yMax) {
		cancelAnimationFrame(raf);
		postMessage({ over: true });
		return;
	}

	// collided with rock
	const currentRock = pillars.visible.at(pillars.current);
	if (pate.x + pate.width >= currentRock.x && (
		// collided with top rock
		pate.y <= cave.ceiling.height + currentRock.height
		// collided with bottom rock
		|| pate.y + pate.height >= currentRock.height + pillars.gap.y
	)) {
		cancelAnimationFrame(raf);
		postMessage({ over: true });
		return;
	}

	// animate fly/fall
	pate.vy += 0.3; // fall velocity
	pate.y = Math.min(pate.y + pate.vy, pate.yMax);

	// animate cave
	if (cave.x % images.ceiling.width === 0) {
		cave.x = -pillars.vx;
	} else {
		cave.x -= pillars.vx;
	}

	// animate pillars
	pillars.visible.forEach((rock) => {
		rock.x -= pillars.vx;
	});

	// remove pillars that are no longer visible
	if (pillars.visible.at(0).x + pillars.width + 32 < 0) { // 32 for mounds
		pillars.visible.shift();
		pillars.current -= 1;
	}

	// add pillars that will become visible
	const lastPillar = pillars.visible.at(-1);
	if (lastPillar.x + pillars.width < canvas.width) {
		const minHeight = Math.max(lastPillar.height - 320, pillars.heightMin);
		const maxHeight = Math.min(lastPillar.height + 608, pillars.heightMax);

		pillars.visible.push({
			x: lastPillar.x + pillars.width + pillars.gap.x,
			height: Math.floor(Math.random() * (maxHeight - minHeight) + minHeight)
		});
	}

	// update score
	if (pate.x > pillars.visible.at(pillars.current).x + pillars.width) {
		pillars.current += 1;
		postMessage({ updateScore: true });
	}
};

const loadImage = async (key, url) => {
	const blob = await fetch(url).then(response => response.blob());
	images[key] = await createImageBitmap(blob);
};

self.onmessage = async ({ data }) => {
	if (data.canvas) {
		canvas = data.canvas;
		ctx = canvas.getContext('2d');

		// load cave images
		await Promise.all([
			loadImage('floor', '/sprites/floor.png'),
			loadImage('ceiling', '/sprites/ceiling.png'),
		]);
		cave.draw();

		// load rest images
		await Promise.all([
			loadImage('ceilingMound', '/sprites/ceiling-mound.png'),
			loadImage('ceilingPillar', '/sprites/ceiling-pillar.png'),
			loadImage('floorMound', '/sprites/floor-mound.png'),
			loadImage('floorPillar', '/sprites/floor-pillar.png'),
			loadImage('pate', '/sprites/pate.png'),
		]);
	}

	if (data.playing) {
		cave.init();
		pillars.init();
		pate.init();

		raf = requestAnimationFrame(draw);
	}

	if (data.fly) {
		pate.vy = -6; // fly velocity
	}
};
