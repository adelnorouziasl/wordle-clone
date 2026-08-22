// ===== GAME STATE =====
let currentRow = 0;
let currentCol = 0;
let encryptedWord = "";
let gameOver = false;
let validWordsSet;

const board = Array.from(document.querySelectorAll("#board .row"));


// ===== DARK MODE =====
const darkModeToggle = document.getElementById("dark-mode-toggle");

// Check memory to see if they were already in dark mode
if (localStorage.getItem("wordGameTheme") === "dark") {
    document.body.classList.add("dark-mode");
}

// Toggle it when clicked
darkModeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");
    
    // Save their preference to local storage
    if (document.body.classList.contains("dark-mode")) {
        localStorage.setItem("wordGameTheme", "dark");
    } else {
        localStorage.setItem("wordGameTheme", "light");
    }
    
    // Remove focus from the button so pressing Enter doesn't trigger it again
    darkModeToggle.blur();
});

// ===== TOAST NOTIFICATIONS =====
function showToast(message) {
    const toastContainer = document.getElementById("toast-container");
    const toast = document.createElement("div");
    toast.classList.add("toast");
    toast.textContent = message;

    toastContainer.appendChild(toast);

    // Fade out after 1.5 seconds
    setTimeout(() => {
        toast.classList.add("fade-out");
    }, 1500);

    // Completely remove from HTML after 1.8 seconds
    setTimeout(() => {
        toast.remove();
    }, 1800);
}

// ===== MODAL =====
// ===== SHOW MODAL (GAME OVER SCREEN) =====
function showModal(message) {
    // Create the blurred background
    const overlay = document.createElement("div");
    overlay.id = "modal-overlay";

    // Create the main box
    const modal = document.createElement("div");
    modal.id = "modal";

    // Create the message text
    const text = document.createElement("div");
    text.id = "modal-message";
    text.innerHTML = message;

    // Create the Play Again button
    const btn = document.createElement("button");
    btn.id = "modal-btn";
    btn.textContent = "Play Again";

    // When clicked, reload the page cleanly
    // When clicked, reload the page cleanly
    btn.addEventListener("click", () => {
        // Nuke ONLY the active game data, keep stats and theme safe!
        localStorage.removeItem("wg_word");
        localStorage.removeItem("wg_row");
        localStorage.removeItem("wg_col");
        localStorage.removeItem("wg_board");
        localStorage.removeItem("wg_keys");
        localStorage.removeItem("wg_over");
        
        // Reload the page to a perfectly blank board
        window.location.reload();
    });

    // Put it all together and inject into the HTML
    modal.appendChild(text);
    modal.appendChild(btn);
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
    // 1. Check if they typed 5 letters
    if (currentCol < 5) {
        showToast("Not enough letters");
        const row = document.querySelectorAll(".row")[currentRow];
        row.classList.remove("shake");
        void row.offsetWidth; // Trigger reflow so animation restarts
        row.classList.add("shake");
        return;
    }

    // 2. Build the word from the board
    let guess = "";
    const rowBoxes = document.querySelectorAll(".row")[currentRow].querySelectorAll(".box");
    for (let i = 0; i < 5; i++) {
        guess += rowBoxes[i].textContent;
    }

    // 3. Check if it's a real word in our dictionary Set
    if (!validWordsSet.has(guess)) {
        showToast("Not in word list");
        const row = document.querySelectorAll(".row")[currentRow];
        row.classList.remove("shake");
        void row.offsetWidth; 
        row.classList.add("shake");
        return;
    }

    // 4. Setup logic for checking the guess
    const secretWord = atob(encryptedWord);
    let guessArray = guess.split("");
    let secretArray = secretWord.split("");
    let boxColors = ["gray", "gray", "gray", "gray", "gray"];
    
    // Count how many of each letter exist in the secret word
    let secretLetterCounts = {};
    for (let letter of secretArray) {
        secretLetterCounts[letter] = (secretLetterCounts[letter] || 0) + 1;
    }

    // 5. PASS 1: Find all exact matches (Greens)
    for (let i = 0; i < 5; i++) {
        if (guessArray[i] === secretArray[i]) {
            boxColors[i] = "green";
            secretLetterCounts[guessArray[i]] -= 1;
        }
    }

    // 6. PASS 2: Find Yellows & trigger Custom Diagonal Mechanic
    for (let i = 0; i < 5; i++) {
        let letter = guessArray[i];

        if (boxColors[i] === "green") {
            // CUSTOM MECHANIC: It's green, but are there MORE of this letter hidden?
            if (secretLetterCounts[letter] > 0) {
                boxColors[i] = "diagonal"; // Turns half-green/half-yellow!
                secretLetterCounts[letter] -= 1; 
            }
        } else if (secretLetterCounts[letter] > 0) {
            // Letter is in the word, but wrong spot
            boxColors[i] = "orange"; 
            secretLetterCounts[letter] -= 1;
        }
    }

    // 7. Apply 3D Flips and Colors (Staggered Animations)
    for (let i = 0; i < 5; i++) {
        setTimeout(() => {
            let box = rowBoxes[i];
            box.classList.add("flip");
            box.classList.add(boxColors[i]);

            // Update Keyboard Colors (Never downgrade a color)
            let key = document.getElementById("key-" + guessArray[i]);
            if (key) {
                if (boxColors[i] === "diagonal") {
                    key.className = "key diagonal"; // Highest priority
                } else if (boxColors[i] === "green" && !key.classList.contains("diagonal")) {
                    key.className = "key green";
                } else if (boxColors[i] === "orange" && !key.classList.contains("green") && !key.classList.contains("diagonal")) {
                    key.className = "key orange";
                } else if (boxColors[i] === "gray" && !key.classList.contains("green") && !key.classList.contains("orange") && !key.classList.contains("diagonal")) {
                    key.className = "key gray";
                }
            }
        }, i * 300); // 300ms delay between each letter flipping
    }

    // 8. Check for Win/Loss (Wait for animations to finish!)
    const isWin = (guess === secretWord);
    const isLastRow = (currentRow === 5);
    
    const animationDuration = 1600; 

    // We merged your stats UI directly into the animation timeout!
    setTimeout(() => {
        if (isWin) {
            gameOver = true;
            localStorage.removeItem("wg_word"); // Wipe memory on win
            const stats = updateStats(true);           // Update stats before showing
            triggerWinAnimation(currentRow-1);           // Pop the win animation

            showModal(`
                🎉 Nice job!<br><br>
                <div style="display:flex; justify-content:center; gap:24px; font-size:14px;">
                    <div><div style="font-size:22px; font-weight:bold;">${stats.played}</div>Played</div>
                    <div><div style="font-size:22px; font-weight:bold;">${stats.wins}</div>Wins</div>
                    <div><div style="font-size:22px; font-weight:bold;">${stats.streak}</div>Streak</div>
                    <div><div style="font-size:22px; font-weight:bold;">${stats.maxStreak}</div>Best</div>
                </div>
            `); 
        } else if (isLastRow) {
            gameOver = true;
            localStorage.removeItem("wg_word");
            updateStats(false);
            showModal(`The word was <strong>${secretWord}</strong>`);
        }
    }, animationDuration + 100);

    // 9. Move to next row
    currentRow++;
    currentCol = 0;
}

// ===== SHAKE =====
function triggerShake() {
    const row = board[currentRow];
    row.classList.add("shake");
    setTimeout(() => row.classList.remove("shake"), 400);
}