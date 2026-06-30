// ============================================================
// QB NAME MAP — convert abbreviations to full names
// ============================================================
const QB_NAME_MAP = {
    "P.Mahomes": "Patrick Mahomes",
    "J.Burrow": "Joe Burrow",
    "C.Stroud": "C.J. Stroud",
    "J.Daniels": "Jayden Daniels",
    "S.Darnold": "Sam Darnold",
    "C.Williams": "Caleb Williams",
    "B.Mayfield": "Baker Mayfield",
    "G.Smith": "Geno Smith",
    "A.Rodgers": "Aaron Rodgers",
    "M.Stafford": "Matthew Stafford",
    "B.Nix": "Bo Nix",
    "J.Goff": "Jared Goff",
    "J.Allen": "Josh Allen",
    "J.Herbert": "Justin Herbert",
    "K.Murray": "Kyler Murray",
    "L.Jackson": "Lamar Jackson",
    "J.Hurts": "Jalen Hurts",
    "B.Purdy": "Brock Purdy",
    "K.Cousins": "Kirk Cousins",
    "J.Love": "Jordan Love",
    "T.Tagovailoa": "Tua Tagovailoa",
    "B.Young": "Bryce Young",
    "R.Wilson": "Russell Wilson",
    "D.Prescott": "Dak Prescott",
    "D.Maye":  "Drake Maye",
};

function expandAbbrev(abbrev) {
    return QB_NAME_MAP[abbrev] || abbrev;
}

// ============================================================
// Trend Button Stat Mapping
// ============================================================
const STAT_MAP = {
    "COMP": "comp_pct",
    "YPA": "ypa",
    "TD%": "td_pct",
    "INT%": "int_pct",
    "SACK%": "sack_pct",
    "ANYA": "anya",
    "EPA": "epa_per_play",
    "RATING": "rating",
    "COMP_SCORE": "comp_score",
    "YPA_SCORE": "ypa_score",
    "TD_SCORE": "td_score",
    "INT_SCORE": "int_score",
    "SACK_SCORE": "sack_score",
    "ANYA_SCORE": "anya_score",
    "EPA_SCORE": "epa_score",
    "RATING_SCORE": "rating_score",
    "OVERALL": "qb_score"
};

// ============================================================
// Trend Chart Labels
// ============================================================
const STAT_LABELS = {
    "COMP": "Completion %",
    "YPA": "Yards per Attempt",
    "TD%": "Touchdown %",
    "INT%": "Interception %",
    "SACK%": "Sack %",
    "ANYA": "Adjusted Net Yards/Attempt",
    "EPA": "EPA per Play",
    "RATING": "Passer Rating",

    // Score versions
    "COMP_SCORE": "Comp% Score",
    "YPA_SCORE": "YPA Score",
    "TD_SCORE": "TD% Score",
    "INT_SCORE": "INT% Score",
    "SACK_SCORE": "Sack% Score",
    "ANYA_SCORE": "ANY/A Score",
    "EPA_SCORE": "EPA Score",
    "RATING_SCORE": "Rating Score",

    "OVERALL": "Overall QB Score"
};


// ============================================================
// MULTI-SEASON PRELOAD CACHE
// ============================================================
const PRELOAD_SEASONS = [2025, 2024, 2023, 2022, 2021, 2020];

let PRELOADED_QB_LIST = {};
let PRELOADED_SCORES = {};
let PRELOAD_COMPLETE = {};
let CURRENT_QB = null;


// Initialize empty buckets
PRELOAD_SEASONS.forEach(season => {
    PRELOADED_QB_LIST[season] = [];
    PRELOADED_SCORES[season] = {};
    PRELOAD_COMPLETE[season] = false;
});


// ============================================================
// PRELOAD ALL SEASONS ON APP LOAD (WITH PROGRESS BAR)
// ============================================================
window.addEventListener("load", async () => {

    const container = document.getElementById("preloadContainer");
    const text = document.getElementById("preloadText");
    const bar = document.getElementById("progressFill");

    container.style.display = "flex";

    console.log("Preloading multiple seasons…");

    const totalSeasons = PRELOAD_SEASONS.length;
    let seasonIndex = 0;

    for (const season of PRELOAD_SEASONS) {
        seasonIndex++;

        text.textContent = `Loading season ${season} (${seasonIndex}/${totalSeasons})…`;
        console.log(`Preloading season ${season}…`);

        try {
            const res = await fetch(`/run_qb?mode=season&season=${season}`);
            const data = await res.json();

            if (data.error) {
                console.error(`Preload error for ${season}:`, data.error);
                continue;
            }

            // ⭐ NEW: qbList is full names directly from backend
            const qbList = Object.keys(data.qbs);

            // ⭐ You still get fullName + normName exactly like before
            PRELOADED_QB_LIST[season] = qbList.map(fullName => {
                const normName = normalizeName(fullName);
                return normName;
            });

            // ⭐ Store fullName + metrics exactly like before
            PRELOADED_SCORES[season] = {};

            qbList.forEach(fullName => {
                const normName = normalizeName(fullName);

                PRELOADED_SCORES[season][normName] = {
                    raw_name: fullName,   // you still keep this
                    ...data.qbs[fullName] // backend metrics
                };
            });

            PRELOAD_COMPLETE[season] = true;

            // Update progress bar
            const progress = (seasonIndex / totalSeasons) * 100;
            bar.style.width = `${progress}%`;

        } catch (err) {
            console.error(`Failed to preload season ${season}:`, err);
        }
    }

    console.log("All seasons preloaded.");

    text.textContent = "Complete!";
    bar.style.width = "100%";

    setTimeout(() => {
        container.style.display = "none";
    }, 500);
});




// ---------------------------------------------
// Utility Helpers
// ---------------------------------------------
function safeNumber(x) {
    return (x === null || x === undefined || isNaN(x)) ? 0 : Number(x);
}

function setBattery(id, score) {
    const el = document.getElementById(id);
    if (!el) return;

    const pct = Math.max(0, Math.min(score * 10, 100));
    let color = "#d50000"; // red

    if (score >= 8) color = "#4caf50";       // green
    else if (score >= 6) color = "#ffb400";  // yellow-orange
    else if (score >= 4) color = "#ff8c00";  // orange

    el.style.setProperty("--fillWidth", pct + "%");
    el.style.setProperty("--fillColor", color);
}

function updateText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function safeFixed(value, decimals = 1) {
    return (value != null && !isNaN(value))
        ? Number(value).toFixed(decimals)
        : "—";
}

// ---------------------------------------------
// Fetch QB Data (Preload First, Fallback Second)
// ---------------------------------------------
async function loadQB(playerName, season, isCompare = false) {
    const spinner = document.getElementById(isCompare ? "spinner2" : "spinner1");
    spinner.style.display = "inline-block";

    const normName = normalizeName(playerName);

    // ⭐ INSTANT LOAD if preloaded
    if (PRELOAD_COMPLETE[season] &&
        PRELOADED_SCORES[season][normName]) {

        console.log("Using preloaded QB:", normName);
        spinner.style.display = "none";
        return PRELOADED_SCORES[season][normName];
    }

    // ⭐ FALLBACK — single QB fetch
    try {
        const url = `/run_qb?mode=single&qb=${encodeURIComponent(playerName)}&season=${season}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.error) {
            alert(data.error);
            spinner.style.display = "none";
            return null;
        }

        // ⭐ Backend already returns full name as qb_name
        const fullName = data.qb_name || playerName;
        const norm = normalizeName(fullName);

        // ⭐ Store fallback result
        PRELOADED_SCORES[season][norm] = {
            raw_name: fullName,
            ...data
        };

        spinner.style.display = "none";
        return PRELOADED_SCORES[season][norm];

    } catch (err) {
        console.error(err);
        alert("Error loading QB data.");
        spinner.style.display = "none";
        return null;
    }
}




// ---------------------------------------------
// Lightweight QB fetch for Rank mode (Raw Name Safe)
// ---------------------------------------------
async function loadQB_raw(playerName, season) {
    try {
        const response = await fetch(`/run_qb?name=${encodeURIComponent(playerName)}&season=${season}`);
        const data = await response.json();

        if (data.error) {
            console.log("Rank skip:", playerName, data.error);
            return null;
        }

        // ⭐ Normalize only for lookup
        const normName = normalizeName(playerName);

        // ⭐ Store raw name so Rank Mode displays correctly
        return {
            raw_name: playerName,   // ⭐ critical for Rank + Compare
            ...data
        };

    } catch (err) {
        console.log("Rank error:", playerName, err);
        return null;
    }
}



// ---------------------------------------------
// Update UI With QB Data
// ---------------------------------------------
function updateQBUI(data) {
    if (!data) return;

    // Raw stats
    updateText("raw-comp", data.comp_pct.toFixed(1));
    updateText("raw-ya", data.ypa.toFixed(2));
    updateText("raw-tdpct", data.td_pct.toFixed(2));
    updateText("raw-intpct", data.int_pct.toFixed(2));
    updateText("raw-sackpct", data.sack_pct.toFixed(2));
    updateText("raw-anya", data.anya.toFixed(2));
    updateText("raw-epa", data.epa_per_play.toFixed(3));
    updateText("raw-rating", data.rating.toFixed(1));

    // Scores
    updateText("score-comp", data.comp_score.toFixed(1));
    updateText("score-ya", data.ypa_score.toFixed(1));
    updateText("score-tdpct", data.td_score.toFixed(1));
    updateText("score-intpct", data.int_score.toFixed(1));
    updateText("score-sackpct", data.sack_score.toFixed(1));
    updateText("score-anya", data.anya_score.toFixed(1));
    updateText("score-epa", data.epa_score.toFixed(1));
    updateText("score-rating", data.rating_score.toFixed(1));

    // Batteries
    setBattery("battery-comp", data.comp_score);
    setBattery("battery-ya", data.ypa_score);
    setBattery("battery-tdpct", data.td_score);
    setBattery("battery-intpct", data.int_score);
    setBattery("battery-sackpct", data.sack_score);
    setBattery("battery-anya", data.anya_score);
    setBattery("battery-epa", data.epa_score);
    setBattery("battery-rating", data.rating_score);

    // Overall
    updateText("overallScore", data.qb_score.toFixed(1));
    const tierClass = getTierClass(data.qb_tier);
document.getElementById("overallTier").innerHTML = `
    <span class="tier-badge ${tierClass}">
        ${data.qb_tier}
    </span>
`;


    setBattery("battery-overall", data.qb_score);

    // Scouting Note
    const note = generateScoutingNote(data);
    updateText("scoutingNote", note);
}

// ---------------------------------------------
// Scouting Note Generator
// ---------------------------------------------
function generateScoutingNote(d) {
    if (!d) return "--";

    const strengths = [];
    const weaknesses = [];

    if (d.comp_score >= 7.5) strengths.push("accurate passer");
    if (d.ypa_score >= 7.5) strengths.push("efficient downfield thrower");
    if (d.td_score >= 7.5) strengths.push("strong scoring production");
    if (d.int_score >= 7.5) strengths.push("protects the football");
    if (d.sack_score >= 7.5) strengths.push("avoids negative plays");
    if (d.anya_score >= 7.5) strengths.push("elite efficiency");
    if (d.epa_score >= 7.5) strengths.push("high-impact playmaker");
    if (d.rating_score >= 7.5) strengths.push("top-tier passer rating");

    if (d.comp_score <= 4) weaknesses.push("accuracy inconsistency");
    if (d.ypa_score <= 4) weaknesses.push("limited downfield efficiency");
    if (d.td_score <= 4) weaknesses.push("low scoring output");
    if (d.int_score <= 4) weaknesses.push("turnover concerns");
    if (d.sack_score <= 4) weaknesses.push("pressure vulnerability");
    if (d.anya_score <= 4) weaknesses.push("below-average efficiency");
    if (d.epa_score <= 4) weaknesses.push("low EPA impact");
    if (d.rating_score <= 4) weaknesses.push("poor passer rating");

    if (strengths.length === 0 && weaknesses.length === 0)
        return "Balanced profile with no extreme strengths or weaknesses.";

    let note = "";

    if (strengths.length > 0)
        note += "Strengths: " + strengths.join(", ") + ". ";

    if (weaknesses.length > 0)
        note += "Needs improvement: " + weaknesses.join(", ") + ".";

    return note;
}


// ---------------------------------------------
// Compare Modal (Raw Name Safe Version)
// ---------------------------------------------
function openCompareModal(qb1, qb2, name1, name2, season1, season2) {
    const modal = document.getElementById("compareModal");
    const body = document.getElementById("compareBody");

    // ⭐ Use REAL names (already passed in)
    document.getElementById("compareName1").textContent = `${name1} (${season1})`;
    document.getElementById("compareName2").textContent = `${name2} (${season2})`;

    // Define which stats are LOWER-is-better
    const lowerIsBetter = new Set(["INT%", "Sack %"]);

    const rows = [
        ["Completion %", qb1.comp_pct, qb2.comp_pct],
        ["Yards/Attempt", qb1.ypa, qb2.ypa],
        ["TD%", qb1.td_pct, qb2.td_pct],
        ["INT%", qb1.int_pct, qb2.int_pct],
        ["Sack %", qb1.sack_pct, qb2.sack_pct],
        ["ANY/A", qb1.anya, qb2.anya],
        ["EPA/Play", qb1.epa_per_play, qb2.epa_per_play],
        ["Passer Rating", qb1.rating, qb2.rating],
        ["Overall Score", qb1.qb_score, qb2.qb_score]
    ];

    body.innerHTML = "";

    rows.forEach(([label, a, b]) => {
        const tr = document.createElement("tr");

        let classA = "tie";
        let classB = "tie";

        if (a != null && b != null) {
            if (lowerIsBetter.has(label)) {
                if (a < b) { classA = "win"; classB = "lose"; }
                else if (b < a) { classA = "lose"; classB = "win"; }
            } else {
                if (a > b) { classA = "win"; classB = "lose"; }
                else if (b > a) { classA = "lose"; classB = "win"; }
            }
        }

        // ⭐ Safe formatting (prevents .toFixed crash)
        const decimals = (label === "Overall Score") ? 1 : 2;
        const valA = (a != null ? a.toFixed(decimals) : "—");
        const valB = (b != null ? b.toFixed(decimals) : "—");

        tr.innerHTML = `
            <td>${label}</td>
            <td class="${classA}">${valA}</td>
            <td class="${classB}">${valB}</td>
        `;

        body.appendChild(tr);
    });

    modal.style.display = "flex";
}


document.getElementById("compareClose").onclick = () =>
    document.getElementById("compareModal").style.display = "none";


// ---------------------------------------------
// Trend Modal
// ---------------------------------------------
document.querySelectorAll(".trend-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        const statKey = btn.dataset.stat;
        const realKey = STAT_MAP[statKey];

        document.getElementById("trendTitle").textContent =
    `${STAT_LABELS[statKey] || statKey} Trend (Last 6 Seasons)`;


        // CURRENT_QB is already normalized
        const norm = CURRENT_QB;

        const seasons = PRELOAD_SEASONS.slice(-6).reverse();
        const values = [];

        seasons.forEach(season => {
            const seasonData = PRELOADED_SCORES[season];
            if (!seasonData) return;

            const qbData = seasonData[norm];
            if (!qbData) return;

            values.push({
                season,
                value: qbData[realKey] ?? null
            });
        });

        renderTrendChart(statKey, values);
        document.getElementById("trendModal").style.display = "flex";
    });
});


document.getElementById("trendClose").onclick = () =>
    document.getElementById("trendModal").style.display = "none";

// ---------------------------------------------
// Trend Modal Chart
// ---------------------------------------------
let trendChartInstance = null;

function renderTrendChart(statKey, data) {
    const ctx = document.getElementById("trendChart").getContext("2d");
console.log("CURRENT_QB:", CURRENT_QB);
console.log("NORM:", normalizeName(CURRENT_QB));
console.log("PRELOAD KEYS:", Object.keys(PRELOADED_SCORES[2024]));

console.log("TREND DATA:", data);

    // Destroy old chart if it exists
    if (trendChartInstance) {
        trendChartInstance.destroy();
    }

    const labels = data.map(d => d.season);
    const values = data.map(d => d.value);

    trendChartInstance = new Chart(ctx, {
        type: "line",
        data: {
            labels,
            datasets: [{
                label: statKey,
                data: values,
                borderColor: "#4CAF50",
                borderWidth: 3,
                tension: 0.3,
                pointRadius: 4
            }]
        },
        options: {
            scales: {
                y: { beginAtZero: false }
            }
        }
    });
}



// ---------------------------------------------
// Load Button
// ---------------------------------------------
document.getElementById("loadBtn").addEventListener("click", async () => {
    const name = document.getElementById("playerName").value.trim();
    const season = document.getElementById("seasonSelect").value;

    if (!name) return alert("Enter a QB name.");

    const data = await loadQB(name, season, false);
console.log("loadQB returned:", data);


    CURRENT_QB = normalizeName(name);   // ⭐ FIXED

    updateQBUI(data);
});



// ---------------------------------------------
// Reset Button
// ---------------------------------------------
document.getElementById("resetBtn").addEventListener("click", () => {
    document.querySelectorAll(".metric-raw, .metric-score").forEach(el => el.textContent = "--");
    document.getElementById("overallScore").textContent = "--";
    document.getElementById("overallTier").textContent = "--";
    document.getElementById("scoutingNote").textContent = "--";

    document.querySelectorAll(".battery").forEach(b => {
        b.style.setProperty("--fillWidth", "0%");
        b.style.setProperty("--fillColor", "#d50000");
    });
});


// ---------------------------------------------
// Compare Button (6-Season Preload Mode)
// ---------------------------------------------
document.getElementById("compareBtn").addEventListener("click", async () => {
    const qb1 = document.getElementById("playerName").value.trim();
    const season1 = document.getElementById("seasonSelect").value;

    const qb2 = document.getElementById("playerName2").value.trim();
    const season2 = document.getElementById("seasonSelect2").value;

    if (!qb1 || !qb2) {
        alert("Enter both QB names before comparing.");
        return;
    }

    // ⭐ loadQB() now ALWAYS returns raw_name + full data
    const data1 = await loadQB(qb1, season1, true);
    const data2 = await loadQB(qb2, season2, true);

    if (!data1 || !data2) {
        alert("Could not load one or both QBs.");
        return;
    }

    // ⭐ Pass REAL names + seasons into modal
    openCompareModal(
        data1,
        data2,
        data1.raw_name,
        data2.raw_name,
        season1,
        season2
    );
});







// ---------------------------------------------
// Swap Button
// ---------------------------------------------
document.getElementById("swapBtn").addEventListener("click", () => {
    const n1 = document.getElementById("playerName").value;
    const n2 = document.getElementById("playerName2").value;
    const s1 = document.getElementById("seasonSelect").value;
    const s2 = document.getElementById("seasonSelect2").value;

    document.getElementById("playerName").value = n2;
    document.getElementById("playerName2").value = n1;
    document.getElementById("seasonSelect").value = s2;
    document.getElementById("seasonSelect2").value = s1;
});

function getTierClass(tier) {
    switch (tier) {
        case "Great": return "tier-great";
        case "Good": return "tier-good";
        case "Fair": return "tier-fair";
        case "Average": return "tier-average";
        case "Below Average": return "tier-belowavg";
        default: return "";
    }
}


// ---------------------------------------------
// Normalize QB names BEFORE calling R
// ---------------------------------------------
function normalizeName(name) {
    name = name.toLowerCase().trim();

    const parts = name.split(/\s+/);
    if (parts.length < 2) return name;

    const first = parts[0][0];      // first initial
    const last = parts[1];          // last name

    return first + "." + last;      // e.g. j + . + allen = j.allen
}



// ---------------------------------------------
// Display Name Helper (convert normalized → full)
// ---------------------------------------------
function displayName(normKey) {
    const parts = normKey.match(/[a-z]+/gi);
    if (!parts || parts.length < 2) return normKey;

    const first = parts[0];
    const last  = parts[parts.length - 1];

    const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

    return `${cap(first)} ${cap(last)}`;
}


// ---------------------------------------------
// Rank Button (6-Season Preload Mode)
// ---------------------------------------------
document.getElementById("rankBtn").addEventListener("click", () => {
    const season = document.getElementById("seasonSelect2").value;

    console.log("Rank season:", season);

    const spinner = document.getElementById("spinner2");
    spinner.style.display = "inline-block";

    document.getElementById("rankTitle").textContent =
        `Top QB Rankings for ${season}`;

    const body = document.getElementById("rankBody");
    body.innerHTML = "";

    // ============================================================
    // ⭐ PRELOADED RANK (INSTANT — ALWAYS USED NOW)
    // ============================================================
    if (!PRELOAD_COMPLETE[season]) {
        alert("Season data not preloaded. Something is wrong.");
        spinner.style.display = "none";
        return;
    }

    console.log("Using bulk-season preloaded Rank data.");

    const results = Object.entries(PRELOADED_SCORES[season]).map(
        ([normKey, data]) => ({
            name: data.raw_name,
            score: data.qb_score,
            tier: data.qb_tier
        })
    );

    // ⭐ Sort safely
    results.sort((a, b) => (b.score ?? -999) - (a.score ?? -999));

    // ⭐ Top 40
    const top40 = results.slice(0, 40);

    // ⭐ Render rows
    top40.forEach((qb, index) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${index + 1}</td>
            <td>${qb.name}</td>
            <td>${safeFixed(qb.score, 1)}</td>
            <td>
                <span class="tier-badge ${getTierClass(qb.tier)}">
                    ${qb.tier}
                </span>
            </td>
        `;
        body.appendChild(tr);
    });

    spinner.style.display = "none";
    document.getElementById("rankModal").style.display = "flex";
});




// ---------------------------------------------
// Rank Modal Close Button
// ---------------------------------------------
document.getElementById("rankClose").addEventListener("click", () => {
    document.getElementById("rankModal").style.display = "none";
});

// ---------------------------------------------
// Click Outside to Close
// ---------------------------------------------
window.addEventListener("click", (e) => {
    const modal = document.getElementById("rankModal");
    if (e.target === modal) {
        modal.style.display = "none";
    }
});

// ---------------------------------------------
// ESC Key to Close
// ---------------------------------------------
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
        document.getElementById("rankModal").style.display = "none";
    }
});

