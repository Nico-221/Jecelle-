
const gameArea = document.querySelector(".game-area");
const shootingArea = document.getElementById("shooting-area");
const bow = document.getElementById("bow");
const bowString = document.getElementById("bow-string");
const arrow = document.getElementById("arrow");
const envelope = document.getElementById("envelope");
const instruction = document.getElementById("instruction");
const letterModal = document.getElementById("letter-modal");
const closeLetter = document.getElementById("close-letter");

let isDragging = false;
let isFiring = false;
let currentAngle = -90;
let pullDistance = 0;
let pointerId = null;

const MAX_PULL = 45;

function getGameBounds() {
    return gameArea.getBoundingClientRect();
}

function getBowCenter() {
    const rect = shootingArea.getBoundingClientRect();

    return {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
    };
}

function normalizeAngle(angle) {
    return ((angle % 360) + 360) % 360;
}

function updateBow(angle, pull) {
    currentAngle = normalizeAngle(angle);
    pullDistance = Math.max(0, Math.min(MAX_PULL, pull));

    shootingArea.style.transform =
        `translateX(-50%) rotate(${currentAngle}deg)`;

    // Pull the string backward as the bow is dragged.
    const stringPull = pullDistance * 0.45;
    bowString.style.transform =
        `translateX(${stringPull}px)`;

    // Move the arrow backward with the pulled string.
    arrow.style.transform =
        `translateX(${stringPull}px)`;

    shootingArea.classList.toggle("dragging", isDragging);
}

function pointFromEvent(event) {
    return {
        x: event.clientX,
        y: event.clientY
    };
}

function startAiming(event) {
    if (isFiring || letterModal.classList.contains("show")) {
        return;
    }

    isDragging = true;
    pointerId = event.pointerId;

    shootingArea.setPointerCapture(pointerId);
    event.preventDefault();

    aimBow(event);
}

function aimBow(event) {
    if (!isDragging || event.pointerId !== pointerId) {
        return;
    }

    const center = getBowCenter();
    const point = pointFromEvent(event);

    const dx = point.x - center.x;
    const dy = point.y - center.y;

    // Full 360-degree aiming; no angle restrictions.
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);

    // Pull strength depends on how far the pointer is from the bow.
    const distance = Math.sqrt(dx * dx + dy * dy);
    const pull = Math.max(0, Math.min(MAX_PULL, distance - 35));

    updateBow(angle, pull);
}

function releaseBow(event) {
    if (!isDragging || event.pointerId !== pointerId) {
        return;
    }

    isDragging = false;
    shootingArea.classList.remove("dragging");

    try {
        shootingArea.releasePointerCapture(pointerId);
    } catch (error) {
        // Pointer capture may already have been released.
    }

    pointerId = null;

    fireArrow();
}

function getArrowStart() {
    const rect = shootingArea.getBoundingClientRect();

    return {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
    };
}

function getEnvelopeTarget() {
    const rect = envelope.getBoundingClientRect();

    return {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
    };
}

function fireArrow() {
    if (isFiring) return;

    isFiring = true;
    instruction.textContent = "A little arrow, carrying a lot of feelings. 💙";

    const start = getArrowStart();
    const target = getEnvelopeTarget();

    // Create a separate flying arrow so its animation is not affected
    // by the bow's rotation or the game's layout.
    const flyingArrow = document.createElement("div");
    flyingArrow.className = "arrow flying-arrow";

    flyingArrow.innerHTML = `
        <div class="arrow-shaft"></div>
        <div class="arrow-head"></div>
        <div class="arrow-tail"></div>
    `;

    document.body.appendChild(flyingArrow);

    const radians = currentAngle * Math.PI / 180;
    const startX = start.x - 8;
    const startY = start.y;

    // Aim in the selected direction first.
    const distance = Math.hypot(
        target.x - startX,
        target.y - startY
    );

    // Keep the chosen direction, but ensure the arrow reaches the envelope.
    // The final portion curves toward the envelope so every shot succeeds.
    const directionX = Math.cos(radians);
    const directionY = Math.sin(radians);

    const midX = startX + directionX * Math.min(distance * 0.55, 180);
    const midY = startY + directionY * Math.min(distance * 0.55, 180);

    flyingArrow.style.cssText = `
        position: fixed;
        left: ${startX}px;
        top: ${startY}px;
        width: 100px;
        height: 12px;
        z-index: 9999;
        pointer-events: none;
        transform-origin: 8px center;
    `;

    const firstAngle = currentAngle;

    // Animate from the bow toward the envelope.
    const animation = flyingArrow.animate([
        {
            left: `${startX}px`,
            top: `${startY}px`,
            transform: `rotate(${firstAngle}deg) scale(1)`
        },
        {
            left: `${midX}px`,
            top: `${midY}px`,
            transform: `rotate(${firstAngle}deg) scale(1.05)`,
            offset: 0.45
        },
        {
            left: `${target.x - 45}px`,
            top: `${target.y - 6}px`,
            transform: `rotate(${Math.atan2(target.y - midY, target.x - midX) * 180 / Math.PI}deg) scale(0.8)`
        }
    ], {
        duration: 900,
        easing: "cubic-bezier(0.22, 0.61, 0.36, 1)",
        fill: "forwards"
    });

    animation.onfinish = () => {
        flyingArrow.remove();

        envelope.classList.add("open");
        instruction.textContent = "You hit the envelope! Open your letter. 💌";

        setTimeout(() => {
            letterModal.classList.add("show");
            letterModal.setAttribute("aria-hidden", "false");
        }, 450);

        bowString.style.transform = "translateX(0)";
        arrow.style.transform = "translateX(0)";
    };
}

function resetGame() {
    letterModal.classList.remove("show");
    letterModal.setAttribute("aria-hidden", "true");

    envelope.classList.remove("open");
    instruction.textContent =
        "Drag the bow to aim, then release to send your letter. 🏹";

    isDragging = false;
    isFiring = false;
    pointerId = null;
    pullDistance = 0;
    currentAngle = -90;

    updateBow(-90, 0);
}

shootingArea.addEventListener("pointerdown", startAiming);
shootingArea.addEventListener("pointermove", aimBow);
shootingArea.addEventListener("pointerup", releaseBow);

shootingArea.addEventListener("pointercancel", () => {
    if (isDragging) {
        isDragging = false;
        pointerId = null;
        updateBow(currentAngle, 0);
    }
});

closeLetter.addEventListener("click", resetGame);

letterModal.addEventListener("click", (event) => {
    if (event.target === letterModal) {
        resetGame();
    }
});

// Start the bow pointing upward.
updateBow(-90, 0);
