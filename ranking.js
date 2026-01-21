// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();

// Reference to scores
const scoresRef = db.ref("scores");

// Save Score
function saveScore(name, score) {
    if (!name || !score) return;

    // Create a new entry
    const newScoreRef = scoresRef.push();
    newScoreRef.set({
        name: name,
        score: score,
        timestamp: firebase.database.ServerValue.TIMESTAMP
    }).then(() => {
        console.log("Score saved!");
        // Refresh leaderboard after saving
        fetchLeaderboard();
    }).catch((error) => {
        console.error("Error saving score: ", error);
        alert("ランキングの保存に失敗しました。");
    });
}

// Fetch Leaderboard
function fetchLeaderboard() {
    console.log("Fetching leaderboard...");
    const listEl = document.getElementById('ranking-list');
    if (!listEl) return;

    listEl.innerHTML = '<li>読み込み中...</li>';

    scoresRef.orderByChild("score").limitToLast(10).once("value")
        .then((snapshot) => {
            listEl.innerHTML = '';

            const scores = [];
            snapshot.forEach((childSnapshot) => {
                scores.push(childSnapshot.val());
            });

            // Realtime DB sorts ascending, so reverse it to get high scores first
            scores.reverse();

            if (scores.length === 0) {
                listEl.innerHTML = '<li>データがありません</li>';
                return;
            }

            let rank = 1;
            scores.forEach(data => {
                const li = document.createElement('li');
                li.innerHTML = `
                    <span class="rank">#${rank}</span>
                    <span class="name">${escapeHtml(data.name)}</span>
                    <span class="score-val">${data.score}</span>
                `;
                listEl.appendChild(li);
                rank++;
            });
        })
        .catch((error) => {
            console.error("Error fetching leaderboard: ", error);
            listEl.innerHTML = '<li>読み込みエラー</li>';
        });
}

// Helper to prevent XSS
function escapeHtml(text) {
    if (!text) return "";
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// UI Handling
// UI Handling
let rankingModal;
let rankingList;

document.addEventListener('DOMContentLoaded', () => {
    rankingModal = document.getElementById('ranking-modal');
    rankingList = document.getElementById('ranking-list');
    const closeRankingBtn = document.getElementById('close-ranking-btn');

    if (closeRankingBtn) {
        closeRankingBtn.addEventListener('click', closeRanking);
    }

    // Close when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === rankingModal) {
            closeRanking();
        }
    });

    // Make functions global/available if needed, mostly openRanking is used globally
});

function openRanking() {
    rankingModal = document.getElementById('ranking-modal'); // Ensure we have it
    if (rankingModal) {
        rankingModal.classList.remove('hidden');
        fetchLeaderboard();
    } else {
        console.error("Ranking modal not found!");
    }
}

function closeRanking() {
    rankingModal = document.getElementById('ranking-modal');
    if (rankingModal) {
        rankingModal.classList.add('hidden');
    }
}
