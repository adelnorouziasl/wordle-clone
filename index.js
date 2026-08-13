// ===== GAME STATE =====
let currentRow = 0;
let currentCol = 0;
let encryptedWord = "";
let gameOver = false;
let validWordsSet;

const board = Array.from(document.querySelectorAll("#board .row"));

// ===== MODAL =====
function showModal(message) {
    localStorage.clear();
    const overlay = document.createElement("div");
    overlay.id = "modal-overlay";

    const modal = document.createElement("div");
    modal.id = "modal";
    modal.innerHTML = `
        <p id="modal-message">${message}</p>
        <button id="modal-btn" onclick="location.reload()">Play Again</button>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
}

// ===== SAVE STATE =====
function saveState() {
    const boardState = [];
    for (let r = 0; r < 6; r++) {
        const row = [];
        for (let c = 0; c < 5; c++) {
            const box = board[r].children[c];
            row.push({
                letter: box.textContent,
                color: box.classList.contains("green") ? "green" :
                       box.classList.contains("diagonal") ? "diagonal" :
                       box.classList.contains("orange") ? "orange" :
                       box.classList.contains("gray") ? "gray" : ""
            });
        }
        boardState.push(row);
    }

    const keyState = {};
    document.querySelectorAll(".key[id]").forEach(key => {
        const color = key.classList.contains("green") ? "green" :
                      key.classList.contains("diagonal") ? "diagonal" :
                      key.classList.contains("orange") ? "orange" :
                      key.classList.contains("gray") ? "gray" : "";
        if (color) keyState[key.id.replace("key-", "")] = color;
    });

    localStorage.setItem("wg_word", encryptedWord);
    localStorage.setItem("wg_row", currentRow);
    localStorage.setItem("wg_col", currentCol);
    localStorage.setItem("wg_board", JSON.stringify(boardState));
    localStorage.setItem("wg_keys", JSON.stringify(keyState));
    localStorage.setItem("wg_over", gameOver);
}

// ===== LOAD STATE =====
function loadState() {
    const savedWord = localStorage.getItem("wg_word");
    if (!savedWord) return false;

    encryptedWord = savedWord;
    currentRow = parseInt(localStorage.getItem("wg_row"));
    currentCol = parseInt(localStorage.getItem("wg_col"));
    gameOver = localStorage.getItem("wg_over") === "true";

    const boardState = JSON.parse(localStorage.getItem("wg_board"));
    for (let r = 0; r < 6; r++) {
        for (let c = 0; c < 5; c++) {
            const box = board[r].children[c];
            const { letter, color } = boardState[r][c];
            box.textContent = letter;
            if (color) {
                box.classList.add(color);
                box.style.borderColor = "transparent";
            }
        }
    }

    const keyState = JSON.parse(localStorage.getItem("wg_keys"));
    for (const [letter, color] of Object.entries(keyState)) {
        const key = document.getElementById(`key-${letter}`);
        if (key && color) {
            key.classList.remove("gray", "orange", "green", "diagonal");
            key.classList.add(color);
        }
    }

    return true;
}

// ===== INIT GAME =====
function initGame() {
    validWordsSet = new Set([...ANSWER_WORDS, ...VALID_GUESSES]);

    const resumed = loadState();
    if (!resumed) {
        const rawWord = ANSWER_WORDS[Math.floor(Math.random() * ANSWER_WORDS.length)];
        encryptedWord = btoa(rawWord);
        saveState();
    }
}

initGame();

// ===== KEYBOARD COLORING =====
function colorKey(letter, colorClass) {
    const key = document.getElementById(`key-${letter}`);
    if (!key) return;

    const priority = ["gray", "orange", "diagonal", "green"];

    const current = priority.indexOf(
        key.classList.contains("green") ? "green" :
        key.classList.contains("diagonal") ? "diagonal" :
        key.classList.contains("orange") ? "orange" :
        key.classList.contains("gray") ? "gray" : "none"
    );

    const incoming = priority.indexOf(colorClass);

    if (incoming > current) {
        key.classList.remove("gray", "orange", "green", "diagonal");
        key.classList.add(colorClass);
    }
}

// ===== HANDLE ON-SCREEN KEY CLICKS =====
document.querySelectorAll(".key").forEach(key => {
    key.addEventListener("click", () => {
        const letter = (key.dataset.key || key.textContent.trim()).toUpperCase();
        if (letter === "ENTER") submitGuess();
        else if (letter === "DELETE") deleteLetter();
        else addLetter(letter);
    });
});

// ===== PHYSICAL KEYBOARD SUPPORT =====
document.addEventListener("keydown", (e) => {
    const key = e.key.toUpperCase();
    if (key === "ENTER") return submitGuess();
    if (key === "BACKSPACE" || key === "DELETE") return deleteLetter();
    if (/^[A-Z]$/.test(key)) return addLetter(key);
});

// ===== ADD LETTER =====
function addLetter(letter) {
    if (gameOver) return;
    if (currentCol < 5 && currentRow < 6) {
        const box = board[currentRow].children[currentCol];
        box.textContent = letter;
        box.classList.add("pop");
        setTimeout(() => box.classList.remove("pop"), 100);
        currentCol++;
        saveState();
    }
}

// ===== DELETE LETTER =====
function deleteLetter() {
    if (gameOver) return;
    if (currentCol > 0) {
        currentCol--;
        const box = board[currentRow].children[currentCol];
        box.textContent = "";
        box.className = "box";
        saveState();
    }
}

// ===== WIN ANIMATION =====
function triggerWinAnimation(row) {
    const boxes = board[row].children;
    for (let i = 0; i < 5; i++) {
        setTimeout(() => {
            boxes[i].classList.add("bounce");
        }, i * 100);
    }
}

// ===== STREAK TRACKING =====
function getStats() {
    return JSON.parse(localStorage.getItem("wg_stats") || JSON.stringify({
        played: 0,
        wins: 0,
        streak: 0,
        maxStreak: 0
    }));
}

function updateStats(won) {
    const stats = getStats();
    stats.played++;
    if (won) {
        stats.wins++;
        stats.streak++;
        if (stats.streak > stats.maxStreak) stats.maxStreak = stats.streak;
    } else {
        stats.streak = 0;
    }
    localStorage.setItem("wg_stats", JSON.stringify(stats));
    return stats;
}


// ===== SUBMIT GUESS =====
function submitGuess() {
    if (gameOver) return;
    if (currentCol !== 5) {
        triggerShake();
        return;
    }

    let guess = "";
    for (let i = 0; i < 5; i++) {
        guess += board[currentRow].children[i].textContent;
    }

    // ===== WORD VALIDATION =====
    if (!validWordsSet.has(guess)) {
        triggerShake();
        return;
    }

    const secretWord = atob(encryptedWord);

    // ===== FREQUENCY MAP =====
    const freq = {};
    for (let char of secretWord) {
        freq[char] = (freq[char] || 0) + 1;
    }

    const results = ["gray", "gray", "gray", "gray", "gray"];

    // ===== FIRST PASS: GREENS =====
    for (let i = 0; i < 5; i++) {
        if (guess[i] === secretWord[i]) {
            results[i] = "green";
            freq[guess[i]]--;
        }
    }

    // ===== SECOND PASS: ORANGE + GRAY =====
    for (let i = 0; i < 5; i++) {
        if (results[i] === "green") continue;
        if (freq[guess[i]] > 0) {
            results[i] = "orange";
            freq[guess[i]]--;
        }
    }

    // ===== DIAGONAL RULE =====
    for (let i = 0; i < 5; i++) {
        if (results[i] !== "green") continue;

        let greenCount = 0;
        for (let j = 0; j < 5; j++) {
            if (guess[j] === guess[i] && results[j] === "green") greenCount++;
        }

        const secretCount = secretWord.split("").filter(l => l === guess[i]).length;
        if (secretCount > greenCount) results[i] = "diagonal";
    }

    const isWin = results.every(r => r === "green");
    const isLastRow = currentRow === 5;

    // ===== APPLY ANIMATIONS AND COLORS =====
    for (let i = 0; i < 5; i++) {
        const box = board[currentRow].children[i];
        const letter = guess[i];
        const colorClass = results[i];

        setTimeout(() => {
            box.classList.add("flip");
            setTimeout(() => {
                box.classList.add(colorClass);
                box.style.borderColor = "transparent";
                colorKey(letter, colorClass);

                // Save after the last tile finishes animating
                if (i === 4) saveState();

            }, 400);
        }, i * 200);
    }

    const animationDuration = 5 * 200 + 400;

    currentRow++;
    currentCol = 0;

    if (isWin) {
    gameOver = true;
    const stats = updateStats(true);
    setTimeout(() => {
        triggerWinAnimation(currentRow - 1);
    }, animationDuration);
    setTimeout(() => showModal(`
        🎉 Nice job!<br><br>
        <div style="display:flex; justify-content:center; gap:24px; font-size:14px;">
            <div><div style="font-size:22px; font-weight:bold;">${stats.played}</div>Played</div>
            <div><div style="font-size:22px; font-weight:bold;">${stats.wins}</div>Wins</div>
            <div><div style="font-size:22px; font-weight:bold;">${stats.streak}</div>Streak</div>
            <div><div style="font-size:22px; font-weight:bold;">${stats.maxStreak}</div>Best</div>
        </div>
    `), animationDuration + 300);
} else if (isLastRow) {
    gameOver = true;
    updateStats(false);
    setTimeout(() => showModal(`The word was <strong>${secretWord}</strong>`), animationDuration + 300);
}
}

// ===== SHAKE =====
function triggerShake() {
    const row = board[currentRow];
    row.classList.add("shake");
    setTimeout(() => row.classList.remove("shake"), 400);
}