class Game {
    constructor() {
        this.score = 0;
        this.level = 1;
        this.targetSum = 0;
        this.currentSum = 0;
        this.selectedBubbles = [];
        this.bubbles = [];
        this.isDragging = false;

        this.maxHp = 100;
        this.currentHp = 100;

        // Settings
        this.bubbleCount = 35; // Maximized for full screen fun
        this.minNumber = 1;
        this.maxNumber = 9;

        // Visuals
        // this.enemyEmojis = ...; // Not needed anymore
        this.currentEnemyIndex = 0;

        // DOM Elements
        this.container = document.getElementById('bubbles-container');
        this.canvas = document.getElementById('connection-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.targetEl = document.getElementById('target-number');
        this.scoreEl = document.getElementById('score');
        this.timerEl = document.getElementById('timer');
        this.levelEl = document.getElementById('level');

        // Optional elements (might be removed in HTML)
        this.enemyVisualEl = document.getElementById('enemy-visual');
        this.enemyHpFill = document.getElementById('enemy-hp-fill');

        this.currentSumEl = document.getElementById('current-sum');
        this.selectionInfoEl = document.getElementById('selection-info');

        this.overlay = document.getElementById('overlay');
        this.startBtn = document.getElementById('start-btn');

        // Bounding Box
        this.width = this.container.clientWidth;
        this.height = this.container.clientHeight;

        // Resize
        window.addEventListener('resize', () => this.resize());
        this.resize();

        // Input
        this.bindEvents();

        // Start
        this.startBtn.addEventListener('click', () => this.startGame());

        // Timer
        this.timeLimit = 60;
        this.timerInterval = null;
        this.isRunning = false;
    }

    resize() {
        this.width = this.container.clientWidth;
        this.height = this.container.clientHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
    }

    startGame() {
        if (this.timerInterval) clearInterval(this.timerInterval);

        console.log("Starting Game...");
        this.score = 0;
        this.level = 0;
        this.timeLeft = this.timeLimit;

        // Ensure element exists
        if (!this.timerEl) this.timerEl = document.getElementById('timer');
        if (this.timerEl) this.timerEl.innerText = this.timeLeft;

        this.overlay.classList.add('hidden');

        // Start timer FIRST to ensure it runs even if logic fails
        this.timerInterval = setInterval(() => {
            this.updateTimer();
        }, 1000);

        try {
            this.nextLevel();
        } catch (e) {
            console.error("Game logic error:", e);
        }

        // Ensure loop is running if it wasn't
        if (!this.isRunning) {
            this.isRunning = true;
            this.gameLoop();
        }
    }

    updateTimer() {
        this.timeLeft--;
        // console.log("Time:", this.timeLeft);
        if (this.timerEl) this.timerEl.innerText = this.timeLeft;

        if (this.timeLeft <= 0) {
            this.gameOver();
        }
    }

    gameOver() {
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.overlay.classList.remove('hidden');
        document.getElementById('overlay-title').innerText = "TIME UP!";
        document.getElementById('overlay-msg').innerText = `SCORE: ${this.score}  (Level ${this.level})`;
        this.startBtn.innerText = "RETRY";
        this.isRunning = false; // Stop physics loop if desired, or keep it running for particles
    }

    nextLevel() {
        this.levelEl.textContent = this.level;

        // Reset bubbles
        this.bubbles = [];
        this.container.innerHTML = '';
        this.spawnBubbles(this.bubbleCount);

        this.generateNewTarget();
        this.updateUI();
    }

    updateHpBar() {
        if (!this.enemyHpFill) return;
        const pct = Math.max(0, (this.currentHp / this.maxHp) * 100);
        this.enemyHpFill.style.width = pct + '%';
    }

    spawnBubbles(count) {
        // Grid settings
        const bubbleSize = 50;
        const gap = 10;
        const cellSize = bubbleSize + gap;

        const cols = Math.floor(this.width / cellSize);
        const rows = Math.floor(this.height / cellSize);
        const offsetX = (this.width - cols * cellSize) / 2;
        const offsetY = (this.height - rows * cellSize) / 2;

        // Track occupied logical slots
        const occupied = new Set();
        this.bubbles.forEach(b => {
            // Recover logical pos if missing (from before resize or legacy)
            // This snaps existing bubbles to the nearest current grid slot to ensure consistency
            if (b.gridCol === undefined) {
                b.gridCol = Math.floor((b.x - offsetX) / cellSize);
                b.gridRow = Math.floor((b.y - offsetY) / cellSize);
            }
            occupied.add(`${b.gridCol},${b.gridRow}`);
        });

        // Generate list of FREE slots
        let freeSlots = [];
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (!occupied.has(`${c},${r}`)) {
                    freeSlots.push({ c, r });
                }
            }
        }

        // Shuffle
        for (let i = freeSlots.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [freeSlots[i], freeSlots[j]] = [freeSlots[j], freeSlots[i]];
        }

        // Spawn
        let actualCount = Math.min(count, freeSlots.length);
        for (let i = 0; i < actualCount; i++) {
            const slot = freeSlots[i];
            this.createBubble(slot.c, slot.r, offsetX, offsetY, cellSize);
        }
    }

    createBubble(c, r, offsetX, offsetY, cellSize) {
        const val = Math.floor(Math.random() * (this.maxNumber - this.minNumber + 1)) + this.minNumber;
        const radius = 25;

        // Calculate exact center position
        const x = offsetX + c * cellSize + cellSize / 2;
        const y = offsetY + r * cellSize + cellSize / 2;

        const b = {
            id: Math.random().toString(36).substr(2, 9),
            value: val,
            x: x,
            y: y,
            gridCol: c, // Store logical index
            gridRow: r,
            radius: radius,
            element: null
        };

        const el = document.createElement('div');
        el.className = 'bubble';
        el.textContent = val;
        el.dataset.id = b.id;

        // Position
        el.style.left = (b.x - b.radius) + 'px';
        el.style.top = (b.y - b.radius) + 'px';

        this.container.appendChild(el);
        b.element = el;
        this.bubbles.push(b);
    }

    generateNewTarget() {
        // Find a plausible sum
        if (this.bubbles.length < 2) {
            this.spawnBubbles(5);
        }

        const count = Math.floor(Math.random() * 3) + 2; // 2 to 4 bubbles
        let sum = 0;

        // Only retry a few times to find unique combo, else just random
        for (let attempt = 0; attempt < 5; attempt++) {
            sum = 0;
            for (let i = 0; i < count; i++) {
                const b = this.bubbles[Math.floor(Math.random() * this.bubbles.length)];
                sum += b.value;
            }
            if (sum > 0) break;
        }

        if (sum === 0) sum = 10;

        this.targetSum = sum;
        this.targetEl.innerText = this.targetSum;
        this.animateTargetPulse();
    }

    animateTargetPulse() {
        const t = this.targetEl.parentElement;
        t.style.animation = 'none';
        t.offsetHeight;
        t.style.animation = 'pulse 1.5s infinite';
    }

    bindEvents() {
        const start = (e) => {
            if (e.cancelable) e.preventDefault(); // Stop mouse emulation or scroll start
            this.inputStart(this.getPos(e));
        };
        const move = (e) => {
            // if(this.isDragging && e.cancelable) e.preventDefault(); // Stop scroll while dragging
            this.inputMove(this.getPos(e));
        };
        const end = (e) => this.inputEnd();

        this.container.addEventListener('mousedown', start, { passive: false });
        window.addEventListener('mousemove', move, { passive: false });
        window.addEventListener('mouseup', end);

        this.container.addEventListener('touchstart', (e) => start(e.touches[0]), { passive: false });
        window.addEventListener('touchmove', (e) => {
            if (this.isDragging) e.preventDefault(); // Critical: Stop scrolling
            move(e.touches[0]);
        }, { passive: false });
        window.addEventListener('touchend', end);
    }

    getPos(e) {
        if (!e) return { x: 0, y: 0 };
        const rect = this.container.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }

    inputStart(pos) {
        this.isDragging = true;
        this.selectedBubbles = [];
        this.updateSelectionState(); // Reset
        this.checkCollision(pos);
    }

    inputMove(pos) {
        if (!this.isDragging) return;
        this.checkCollision(pos);
        this.drawConnection(pos);
    }

    inputEnd() {
        if (!this.isDragging) return;
        this.isDragging = false;
        this.selectionInfoEl.classList.remove('visible');
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        if (this.currentSum === this.targetSum && this.selectedBubbles.length >= 2) {
            this.success();
        } else {
            this.fail();
        }

        this.bubbles.forEach(b => b.element.classList.remove('selected', 'correct', 'incorrect'));
        this.selectedBubbles = [];
        this.updateSelectionState();
    }

    updateSelectionState() {
        // Robust recalculation to prevent drift
        this.currentSum = this.selectedBubbles.reduce((acc, b) => acc + b.value, 0);

        if (this.selectedBubbles.length > 0) {
            this.selectionInfoEl.classList.add('visible');
            // Show equation: 1+2+3 = 6
            const equation = this.selectedBubbles.map(b => b.value).join('+');
            this.currentSumEl.innerText = `${equation} = ${this.currentSum}`;
        } else {
            this.selectionInfoEl.classList.remove('visible');
            this.currentSumEl.innerText = '';
        }
    }

    checkCollision(pos) {
        let changed = false;
        const halfSize = 25; // 50px block / 2

        for (let b of this.bubbles) {
            // AABB Collision (Square Hitbox)
            const dx = Math.abs(pos.x - b.x);
            const dy = Math.abs(pos.y - b.y);

            // Check if inside the 50x50 block
            const inside = dx < halfSize && dy < halfSize;

            // 1. Check for Backtracking (Undo)
            if (this.selectedBubbles.length >= 2) {
                const secondToLast = this.selectedBubbles[this.selectedBubbles.length - 2];
                if (b === secondToLast && inside) {
                    const popped = this.selectedBubbles.pop();
                    popped.element.classList.remove('selected');
                    changed = true;
                    break;
                }
            }

            // 2. Selection
            if (inside) {
                if (!this.selectedBubbles.includes(b)) {
                    if (this.selectedBubbles.length > 0) {
                        const last = this.selectedBubbles[this.selectedBubbles.length - 1];
                        const d2 = Math.hypot(b.x - last.x, b.y - last.y);
                        if (d2 > 300) continue;
                    }

                    this.selectedBubbles.push(b);
                    this.currentSum += b.value;
                    b.element.classList.add('selected');
                    changed = true;
                }
            }
        }

        if (changed) {
            this.updateSelectionState();
        }
    }

    drawConnection(cursorPos) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // DEBUG: Draw Hitboxes (Red Squares)
        this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
        this.ctx.lineWidth = 2;
        this.bubbles.forEach(b => {
            this.ctx.strokeRect(b.x - 25, b.y - 25, 50, 50);
        });

        if (this.selectedBubbles.length === 0) return;

        this.ctx.beginPath();
        this.ctx.lineWidth = 10;
        this.ctx.lineCap = 'square'; // Blocky lines
        this.ctx.lineJoin = 'bevel';
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)'; // White beam

        const first = this.selectedBubbles[0];
        this.ctx.moveTo(first.x, first.y);

        for (let i = 1; i < this.selectedBubbles.length; i++) {
            this.ctx.lineTo(this.selectedBubbles[i].x, this.selectedBubbles[i].y);
        }

        this.ctx.lineTo(cursorPos.x, cursorPos.y);
        this.ctx.stroke();
    }

    success() {
        const damage = this.currentSum * 10;
        this.score += damage;
        this.level++; // Increment level on every success
        this.updateUI();

        // 1. Pop Bubbles with Particles
        this.selectedBubbles.forEach(b => {
            this.createParticles(b.x, b.y, b.element.style.backgroundColor || '#00bcd4');
            b.element.classList.add('pop');
            setTimeout(() => {
                if (b.element.parentNode) b.element.parentNode.removeChild(b.element);
            }, 200);
        });

        // Screen Shake
        const gameContainer = document.getElementById('game-container');
        gameContainer.classList.remove('shake');
        void gameContainer.offsetWidth; // reflow
        gameContainer.classList.add('shake');

        this.bubbles = this.bubbles.filter(b => !this.selectedBubbles.includes(b));

        // 2. Immediate Next Target (Endless Mode)
        setTimeout(() => {
            // Always fill up to max
            const needed = this.bubbleCount - this.bubbles.length;
            if (needed > 0) {
                this.spawnBubbles(needed);
            }
            this.generateNewTarget();
        }, 300);
    }

    createParticles(x, y, color) {
        const particleCount = 8; // Fewer, larger particles (chunks)
        const blockColors = ['#7cb342', '#795548', '#9e9e9e', '#5d4037']; // Grass, Dirt, Stone, Wood

        for (let i = 0; i < particleCount; i++) {
            const el = document.createElement('div');
            el.className = 'particle';

            // Randomly pick a block color
            const randColor = blockColors[Math.floor(Math.random() * blockColors.length)];
            el.style.backgroundColor = randColor;
            el.style.boxShadow = 'none'; // Flat pixel look
            el.style.width = '10px';
            el.style.height = '10px';

            // Random direction
            const angle = Math.random() * Math.PI * 2;
            const velocity = Math.random() * 6 + 2;
            const vx = Math.cos(angle) * velocity;
            const vy = Math.sin(angle) * velocity;

            el.style.left = x + 'px';
            el.style.top = y + 'px';

            this.container.appendChild(el);

            // Animate
            let life = 1;
            const animateParticle = () => {
                life -= 0.08; // Faster decay
                if (life <= 0) {
                    el.remove();
                    return;
                }

                const curLeft = parseFloat(el.style.left);
                const curTop = parseFloat(el.style.top);
                el.style.left = (curLeft + vx) + 'px';
                el.style.top = (curTop + vy + 4) + 'px'; // Heavy gravity
                el.style.opacity = life;
                // No scale, keep pixels consistent size

                requestAnimationFrame(animateParticle);
            };
            requestAnimationFrame(animateParticle);
        }
    }

    takeDamage(amount) {
        this.currentHp -= amount;
        if (this.currentHp < 0) this.currentHp = 0;
        this.updateHpBar();

        // Visual Hit Effect (if element exists)
        if (this.enemyVisualEl) {
            this.enemyVisualEl.classList.remove('hit');
            void this.enemyVisualEl.offsetWidth; // trigger reflow
            this.enemyVisualEl.classList.add('hit');
        }

        // Show Damage Number
        this.showDamageNumber(amount);

        // Defeat Check
        if (this.currentHp <= 0) {
            this.enemyDefeated();
        }
    }

    showDamageNumber(amount) {
        const el = document.createElement('div');
        el.className = 'damage-text';
        el.innerText = `-${amount}`;

        // Center of enemy area
        const area = document.getElementById('enemy-area');
        const rect = area.getBoundingClientRect();
        el.style.left = (rect.width / 2) + 'px';
        el.style.top = (rect.height / 2) + 'px';

        area.appendChild(el);

        setTimeout(() => el.remove(), 1000);
    }

    enemyDefeated() {
        if (this.enemyVisualEl) {
            this.enemyVisualEl.classList.add('defeated');
        }

        // Delay then next level
        setTimeout(() => {
            this.nextLevel();
        }, 800);
    }

    fail() {
        // Shake effect on selected
        this.selectedBubbles.forEach(b => {
            b.element.classList.add('incorrect');
        });
        setTimeout(() => {
            this.bubbles.forEach(b => b.element.classList.remove('incorrect'));
        }, 300);
    }

    updateUI() {
        this.scoreEl.innerText = this.score;
        this.levelEl.innerText = this.level;
    }

    gameLoop() {
        this.updatePhysics();
        requestAnimationFrame(() => this.gameLoop());
    }

    updatePhysics() {
        // Floating effect disabled as per user request
        // We only need to update if we add other effects later
        /*
        for (let b of this.bubbles) {
            b.x += b.vx;
            b.y += b.vy;

            // Bounce off walls
            if (b.x - b.radius < 0) { b.x = b.radius; b.vx *= -1; }
            if (b.x + b.radius > this.width) { b.x = this.width - b.radius; b.vx *= -1; }
            if (b.y - b.radius < 0) { b.y = b.radius; b.vy *= -1; }
            if (b.y + b.radius > this.height) { b.y = this.height - b.radius; b.vy *= -1; }

            // Update DOM
            if (b.element && !b.element.classList.contains('pop')) {
                b.element.style.left = (b.x - b.radius) + 'px';
                b.element.style.top = (b.y - b.radius) + 'px';
            }
        }
        */
    }
}

// Init
window.addEventListener('DOMContentLoaded', () => {
    const game = new Game();
});
