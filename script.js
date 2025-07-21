
let history = JSON.parse(localStorage.getItem('baccarat_history')) || [];
let currentRound = JSON.parse(localStorage.getItem('baccarat_current')) || [];
let patternLength = 5;

let data = JSON.parse(localStorage.getItem('baccarat_data')) || [];
let currentResult = '', big = '', small = '', cockroach = '';

function saveState() {
    localStorage.setItem('baccarat_history', JSON.stringify(history));
    localStorage.setItem('baccarat_current', JSON.stringify(currentRound));
}

function addResult(value) {
    currentResult = value;
}

function addResultText() {
    const input = document.getElementById('inputResult').value.toUpperCase().replace(/[^PBT]/g, '');
    for (let char of input) {
        if (['P', 'B', 'T'].includes(char)) {
            currentRound.push(char);
        }
    }
    document.getElementById('inputResult').value = '';
    saveState();
    displayCurrent();
    analyzeNext();
}

function setEye(type, value) {
    if (type === 'big') big = value;
    if (type === 'small') small = value;
    if (type === 'cockroach') cockroach = value;
}

function displayCurrent() {
    document.getElementById('currentResults').innerText = currentRound.join(', ');
}

function displayHistory() {
    const container = document.getElementById('historyRounds');
    container.innerHTML = '';
    history.forEach((round, index) => {
        const div = document.createElement('div');
        div.innerText = `รอบที่ ${index + 1}: ` + round.join(', ');
        container.appendChild(div);
    });
}

function toggleHistory() {
    const el = document.getElementById('history');
    el.style.display = (el.style.display === 'none') ? 'block' : 'none';
}

function setPatternLength(n) {
    patternLength = n;
    analyzeNext();
}

function analyzeNext() {
    if (currentRound.length < patternLength) {
        document.getElementById('suggestionText').innerText = 'ข้อมูลไม่พอสำหรับวิเคราะห์';
        return;
    }
    const pattern = currentRound.slice(-patternLength).join('');
    let counts = { 'P': 0, 'B': 0, 'T': 0 };
    history.forEach(round => {
        for (let i = 0; i <= round.length - patternLength - 1; i++) {
            if (round.slice(i, i + patternLength).join('') === pattern) {
                const next = round[i + patternLength];
                if (counts[next] !== undefined) counts[next]++;
            }
        }
    });
    let suggestion = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    if (suggestion[1] === 0) {
        document.getElementById('suggestionText').innerText = 'ไม่พบแพทเทิร์นนี้มาก่อน';
    } else {
        document.getElementById('suggestionText').innerText =
            `แพทเทิร์นที่ใช้วิเคราะห์: ${pattern}
แนะนำให้ลง: ${suggestion[0]} (จาก ${counts.P}P ${counts.B}B ${counts.T}T)`;
    }
}

function backupData() {
    const data = {
        baccarat_history: history,
        baccarat_current: currentRound
    };
    const blob = new Blob([JSON.stringify(data)], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'baccarat_backup.bak';
    a.click();
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            history = data.baccarat_history || [];
            currentRound = data.baccarat_current || [];
            saveState();
            displayCurrent();
            displayHistory();
            document.getElementById('suggestionText').innerText = '';
        } catch (err) {
            alert('ไฟล์ไม่ถูกต้อง');
        }
    };
    reader.readAsText(file);
}

function analyzePattern(results) {
    const recent = results.filter(r => !r.isSeparator);
    const last10 = recent.slice(-10).map(r => r.result).join('');
    if (/B{4,}/.test(last10)) return 'มังกรB';
    if (/P{4,}/.test(last10)) return 'มังกรP';
    if (/BBPPPBB|PPBBBPP/.test(last10)) return 'ไพ่ติด';
    if (last10.includes('BBPP')) return 'ไพ่คู่';
    if (last10.includes('BPPBPP')) return 'แดง1น้ำเงิน2';
    if (last10.includes('PBBPBB')) return 'น้ำเงิน1แดง2';
    if (last10.includes('BBBBPBBBPB')) return 'แดงต่อ';
    if (last10.includes('PPPBPPPPBP')) return 'น้ำเงินต่อ';
    if (last10.includes('PBPB') || last10.includes('BPBP')) return 'ปิงปอง';
    if (last10.includes('BPBPPPB')) return 'เจอแดงลงน้ำเงิน';
    if (last10.includes('PBPBBBP')) return 'เจอน้ำเงินลงแดง';
    return '-';
}

function countPatternStats(results, patternKey) {
    const match = results.filter(r => !r.isSeparator && r.patternKey === patternKey);
    const p = match.filter(m => m.result === 'P').length;
    const b = match.filter(m => m.result === 'B').length;
    return `P=${p} / B=${b}`;
}

function getAdvice(currentResult, big, small, cockroach, pattern) {
    const blueCount = [big, small, cockroach].filter(v => v === '🔵').length;
    const redCount = [big, small, cockroach].filter(v => v === '🔴').length;
    if (pattern.includes('มังกร') || pattern === 'ไพ่ติด') return `ตาม ${currentResult}`;
    if (blueCount > redCount) return `ตาม ${currentResult}`;
    return `สวน ${currentResult}`;
}

function addRow() {
    if (!currentResult) return;
    const newRow = {
        result: currentResult,
        bigEye: big,
        smallEye: small,
        cockroachEye: cockroach
    };
    newRow.patternKey = `${big},${small},${cockroach}`;
    newRow.pattern = analyzePattern(data);
    newRow.advice = getAdvice(currentResult, big, small, cockroach, newRow.pattern);
    newRow.stats = countPatternStats(data, newRow.patternKey);
    data.unshift(newRow);
    currentResult = big = small = cockroach = '';
    updateTable();
    localStorage.setItem('baccarat_data', JSON.stringify(data));
}

function addSeparator() {
    const separatorRow = { isSeparator: true };
    data.unshift(separatorRow);
    updateTable();
    localStorage.setItem('baccarat_data', JSON.stringify(data));
}

function updateTable() {
    const tbody = document.querySelector('#dataTable tbody');
    tbody.innerHTML = '';
    data.forEach((row, index) => {
        const tr = document.createElement('tr');
        if (row.isSeparator) {
            tr.innerHTML = `<td colspan="6" style="text-align:center; background:#eee;">--- เปลี่ยนห้อง ---</td>`;
        } else {
            tr.innerHTML = `
                <td>${data.length - index}</td>
                <td>${row.result}</td>
                <td>${row.bigEye || ''}${row.smallEye || ''}${row.cockroachEye || ''}</td>
                <td>${row.pattern}</td>
                <td>${row.advice}</td>
                <td>${row.stats}</td>
            `;
        }
        tbody.appendChild(tr);
    });
}

function resetData() {
    data = [];
    localStorage.removeItem('baccarat_data');
    updateTable();
}

function downloadData() {
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'baccarat_data.json';
    a.click();
}

window.onload = function () {
    displayCurrent();
    displayHistory();
    analyzeNext();
    updateTable();
};
