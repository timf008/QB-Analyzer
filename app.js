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
// Fetch QB Data (Direct Fetch Only)
// ---------------------------------------------
async function loadQB(playerName, season, isCompare = false) {
    const spinner = document.getElementById(isCompare ? "spinner2" : "spinner1");
    spinner.style.display = "inline-block";

    try {
        const url = `https://qb-analyzer-backend.onrender.com/run_qb?qb=${encodeURIComponent(playerName)}&season=${season}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.error) {
            alert(data.error);
            spinner.style.display = "none";
            return null;
        }

        spinner.style.display = "none";
        return {
            raw_name: data.qb_name || playerName,
            ...data
        };

    } catch (err) {
        console.error(err);
        alert("Error loading QB data.");
        spinner.style.display = "none";
        return null;
    }
}

// ---------------------------------------------
// Update UI With QB Data (5-Metric Version)
// ---------------------------------------------
function updateQBUI(data) {
    if (!data) return;

    // -------------------------
    // Raw stats
    // -------------------------
    updateText("raw-comp", data.comp_pct.toFixed(1));
    updateText("raw-tdpct", data.td_pct.toFixed(2));
    updateText("raw-intpct", data.int_pct.toFixed(2));
    updateText("raw-sackpct", data.sack_pct.toFixed(2));
    updateText("raw-epa", data.epa_per_play.toFixed(3));

    // -------------------------
    // Scores
    // -------------------------
    updateText("score-comp", data.comp_score.toFixed(1));
    updateText("score-tdpct", data.td_score.toFixed(1));
    updateText("score-intpct", data.int_score.toFixed(1));
    updateText("score-sackpct", data.sack_score.toFixed(1));
    updateText("score-epa", data.epa_score.toFixed(1));

    // -------------------------
    // Batteries
    // -------------------------
    setBattery("battery-comp", data.comp_score);
    setBattery("battery-tdpct", data.td_score);
    setBattery("battery-intpct", data.int_score);
    setBattery("battery-sackpct", data.sack_score);
    setBattery("battery-epa", data.epa_score);

    // -------------------------
    // Overall Score + Tier
    // -------------------------
    updateText("overallScore", data.qb_score.toFixed(1));

    const tierClass = getTierClass(data.qb_tier);
    document.getElementById("overallTier").innerHTML = `
        <span class="tier-badge ${tierClass}">
            ${data.qb_tier}
        </span>
    `;

    setBattery("battery-overall", data.qb_score);

    // -------------------------
    // Scouting Note
    // -------------------------
    const note = generateScoutingNote(data);
    updateText("scoutingNote", note);
}


// ---------------------------------------------
// Scouting Note Generator (5-Metric Version)
// ---------------------------------------------
function generateScoutingNote(d) {
    if (!d) return "--";

    const strengths = [];
    const weaknesses = [];

    // -------------------------
    // Strengths
    // -------------------------
    if (d.comp_score >= 7.5) strengths.push("accurate passer");
    if (d.td_score >= 7.5) strengths.push("strong scoring production");
    if (d.int_score >= 7.5) strengths.push("protects the football");
    if (d.sack_score >= 7.5) strengths.push("avoids negative plays");
    if (d.epa_score >= 7.5) strengths.push("high-impact playmaker");

    // -------------------------
    // Weaknesses
    // -------------------------
    if (d.comp_score <= 4) weaknesses.push("accuracy inconsistency");
    if (d.td_score <= 4) weaknesses.push("low scoring output");
    if (d.int_score <= 4) weaknesses.push("turnover concerns");
    if (d.sack_score <= 4) weaknesses.push("pressure vulnerability");
    if (d.epa_score <= 4) weaknesses.push("low EPA impact");

    // -------------------------
    // Balanced profile
    // -------------------------
    if (strengths.length === 0 && weaknesses.length === 0)
        return "Balanced profile with no extreme strengths or weaknesses.";

    // -------------------------
    // Build final note
    // -------------------------
    let note = "";

    if (strengths.length > 0)
        note += "Strengths: " + strengths.join(", ") + ". ";

    if (weaknesses.length > 0)
        note += "Needs improvement: " + weaknesses.join(", ") + ".";

    return note;
}

// ---------------------------------------------
// Compare Modal (5-Metric Version)
// ---------------------------------------------
function openCompareModal(qb1, qb2, name1, name2, season1, season2) {
    const modal = document.getElementById("compareModal");
    const body = document.getElementById("compareBody");

    // Use real names
    document.getElementById("compareName1").textContent = `${name1} (${season1})`;
    document.getElementById("compareName2").textContent = `${name2} (${season2})`;

    // Metrics where lower is better
    const lowerIsBetter = new Set(["INT%", "Sack %"]);

    // Your new 5-metric comparison rows
    const rows = [
        ["Completion %", qb1.comp_pct, qb2.comp_pct],
        ["TD%", qb1.td_pct, qb2.td_pct],
        ["INT%", qb1.int_pct, qb2.int_pct],
        ["Sack %", qb1.sack_pct, qb2.sack_pct],
        ["EPA/Play", qb1.epa_per_play, qb2.epa_per_play],
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
// Load Button
// ---------------------------------------------
document.getElementById("loadBtn").addEventListener("click", async () => {
    const name = document.getElementById("playerName").value.trim();
    const season = parseInt(document.getElementById("seasonSelect").value);

    if (!name) {
        alert("Enter a QB name.");
        return;
    }

    const data = await loadQB(name, season);

    if (!data || data.error) {
        alert(data?.error || "QB not found.");
        return;
    }

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
// Compare Button
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

    const data1 = await loadQB(qb1, season1, true);
    const data2 = await loadQB(qb2, season2, true);

    if (!data1 || !data2) {
        alert("Could not load one or both QBs.");
        return;
    }

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
// QB Trend (This Season vs Last Season)
// ---------------------------------------------
async function openQBTrend() {
    const name = document.getElementById("playerName").value.trim();
    const season = parseInt(document.getElementById("seasonSelect").value);

    if (!name) {
        alert("Enter a QB name first.");
        return;
    }

    const prevSeason = season - 1;

    const current = await loadQB(name, season, false);
    const previous = await loadQB(name, prevSeason, false);

    if (!current || !previous) {
        alert("Trend unavailable — missing previous season data.");
        return;
    }

    const rows = [
        ["Completion %", current.comp_pct, previous.comp_pct],
        ["TD%", current.td_pct, previous.td_pct],
        ["INT%", current.int_pct, previous.int_pct],
        ["Sack %", current.sack_pct, previous.sack_pct],
        ["EPA/Play", current.epa_per_play, previous.epa_per_play]
    ];

    const body = document.getElementById("trendBody");
    body.innerHTML = "";

    rows.forEach(([label, cur, prev]) => {
        let arrow = "→";
        if (cur > prev) arrow = "↑";
        else if (cur < prev) arrow = "↓";

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${label}</td>
            <td>${prev?.toFixed(2) ?? "—"}</td>
            <td>${cur?.toFixed(2) ?? "—"}</td>
            <td class="trend-arrow">${arrow}</td>
        `;
        body.appendChild(tr);
    });

    document.getElementById("trendTitle").textContent =
        `${name} — ${season} vs ${prevSeason}`;

    document.getElementById("trendModal").style.display = "flex";
}

// Close button
document.getElementById("trendClose").onclick = () =>
    document.getElementById("trendModal").style.display = "none";

document.getElementById("trendBtn").addEventListener("click", openQBTrend);



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
