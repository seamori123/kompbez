const ALPHABET = "АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ";
const MOD = 33;

const matrixAEl = document.getElementById("matrixA");
const matrixBEl = document.getElementById("matrixB");
const messageEl = document.getElementById("message");
const statusEl = document.getElementById("status");
const detailsEl = document.getElementById("details");
const answerEl = document.getElementById("answer");

const task2KnownEl = document.getElementById("task2Known");
const task2CipherEl = document.getElementById("task2Cipher");
const task2PhraseEl = document.getElementById("task2Phrase");
const task2OutputEl = document.getElementById("task2Output");

document.getElementById("encryptBtn").addEventListener("click", () => run("encrypt"));
document.getElementById("decryptBtn").addEventListener("click", () => run("decrypt"));
document.getElementById("solveTask2Btn").addEventListener("click", solveTask2);

function mod(n, m = MOD) {
  return ((n % m) + m) % m;
}

function gcd(a, b) {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    [x, y] = [y, x % y];
  }
  return x;
}

function modInverse(a, m = MOD) {
  let t = 0;
  let newT = 1;
  let r = m;
  let newR = mod(a, m);

  while (newR !== 0) {
    const q = Math.floor(r / newR);
    [t, newT] = [newT, t - q * newT];
    [r, newR] = [newR, r - q * newR];
  }

  if (r !== 1) {
    throw new Error(`Число ${a} не имеет обратного по модулю ${m}.`);
  }

  return mod(t, m);
}

function parseMatrix(text) {
  const rows = text
    .trim()
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split(/\s+/).map((n) => Number(n)));

  if (rows.length === 0) {
    throw new Error("Матрица не должна быть пустой.");
  }

  const width = rows[0].length;
  if (width === 0) {
    throw new Error("Некорректный формат матрицы.");
  }

  for (const row of rows) {
    if (row.length !== width) {
      throw new Error("У матрицы разное число столбцов в строках.");
    }
    if (row.some((v) => Number.isNaN(v))) {
      throw new Error("Матрица содержит нечисловые значения.");
    }
  }

  return rows;
}

function invertMatrixMod(matrix) {
  const n = matrix.length;
  const aug = matrix.map((row, i) => [
    ...row.map((v) => mod(v)),
    ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
  ]);

  for (let col = 0; col < n; col += 1) {
    let pivot = -1;
    for (let row = col; row < n; row += 1) {
      if (gcd(aug[row][col], MOD) === 1) {
        pivot = row;
        break;
      }
    }

    if (pivot === -1) {
      throw new Error("Матрица A необратима по модулю 33.");
    }

    if (pivot !== col) {
      [aug[col], aug[pivot]] = [aug[pivot], aug[col]];
    }

    const invPivot = modInverse(aug[col][col]);
    for (let j = 0; j < 2 * n; j += 1) {
      aug[col][j] = mod(aug[col][j] * invPivot);
    }

    for (let row = 0; row < n; row += 1) {
      if (row === col) {
        continue;
      }
      const factor = aug[row][col];
      if (factor === 0) {
        continue;
      }
      for (let j = 0; j < 2 * n; j += 1) {
        aug[row][j] = mod(aug[row][j] - factor * aug[col][j]);
      }
    }
  }

  return aug.map((row) => row.slice(n));
}

function vectorToLetters(vec) {
  return vec.map((x) => ALPHABET[mod(x)]).join("");
}

function lettersToNumbers(text) {
  const prepared = text.toUpperCase();
  const clean = [...prepared].filter((ch) => ALPHABET.includes(ch));
  return {
    nums: clean.map((ch) => ALPHABET.indexOf(ch)),
    removedCount: prepared.length - clean.length,
  };
}

function chunk(array, size) {
  const out = [];
  for (let i = 0; i < array.length; i += size) {
    out.push(array.slice(i, i + size));
  }
  return out;
}

function columnMultiplicationDetails(matrix, vector, title) {
  const lines = [title];
  const result = [];

  matrix.forEach((row, rowIndex) => {
    const terms = row.map((a, i) => `${a}·${vector[i]}=${a * vector[i]}`);
    const sum = row.reduce((acc, a, i) => acc + a * vector[i], 0);
    const reduced = mod(sum);
    lines.push(`  c${rowIndex + 1} = (${terms.join(" + ")}) = ${sum} ≡ ${reduced} (mod 33)`);
    result.push(reduced);
  });

  return { lines, result };
}

function run(mode) {
  try {
    const A = parseMatrix(matrixAEl.value);
    const B = parseMatrix(matrixBEl.value);

    if (A.length !== A[0].length) {
      throw new Error("Матрица A должна быть квадратной.");
    }

    if (B.length !== A.length || B[0].length !== 1) {
      throw new Error("Матрица B должна быть размером n×1, где n — размерность A.");
    }

    const blockSize = A.length;
    const bVec = B.map((row) => mod(row[0]));

    const parsed = lettersToNumbers(messageEl.value);
    if (parsed.nums.length === 0) {
      throw new Error("Введите хотя бы одну букву русского алфавита.");
    }

    const working = [...parsed.nums];
    let padAdded = 0;
    while (working.length % blockSize !== 0) {
      working.push(ALPHABET.indexOf("Х"));
      padAdded += 1;
    }

    const blocks = chunk(working, blockSize);
    const details = [];
    const outNums = [];

    if (mode === "encrypt") {
      details.push("Шифрование: C = A·P + B (mod 33)");
      details.push("Каждый блок считаем как вектор-СТОЛБЕЦ P и получаем столбец C.\n");
      blocks.forEach((pBlock, i) => {
        details.push(`Блок ${i + 1}`);
        details.push(`P (столбец) = [${pBlock.join("; ")}] = ${vectorToLetters(pBlock)}`);

        const ap = columnMultiplicationDetails(A, pBlock, "A·P:");
        details.push(...ap.lines);

        const cBlock = ap.result.map((v, idx) => mod(v + bVec[idx]));
        details.push("Добавляем B поэлементно:");
        cBlock.forEach((v, idx) => {
          details.push(`  c${idx + 1} = ${ap.result[idx]} + ${bVec[idx]} = ${ap.result[idx] + bVec[idx]} ≡ ${v} (mod 33)`);
        });
        details.push(`Итог C (столбец) = [${cBlock.join("; ")}] = ${vectorToLetters(cBlock)}\n`);

        outNums.push(...cBlock);
      });
    } else {
      const Ainv = invertMatrixMod(A);
      details.push("Расшифрование: P = A⁻¹·(C - B) (mod 33)");
      details.push("Каждый блок считаем как вектор-СТОЛБЕЦ C и получаем столбец P.\n");
      details.push("A⁻¹ (mod 33):");
      Ainv.forEach((row) => details.push(`  ${row.join(" ")}`));
      details.push("");

      blocks.forEach((cBlock, i) => {
        details.push(`Блок ${i + 1}`);
        details.push(`C (столбец) = [${cBlock.join("; ")}] = ${vectorToLetters(cBlock)}`);

        const cMinusB = cBlock.map((v, idx) => mod(v - bVec[idx]));
        details.push("Считаем C - B поэлементно:");
        cMinusB.forEach((v, idx) => {
          details.push(`  d${idx + 1} = ${cBlock[idx]} - ${bVec[idx]} = ${cBlock[idx] - bVec[idx]} ≡ ${v} (mod 33)`);
        });

        const p = columnMultiplicationDetails(Ainv, cMinusB, "P = A⁻¹·(C-B):");
        details.push(...p.lines);
        details.push(`Итог P (столбец) = [${p.result.join("; ")}] = ${vectorToLetters(p.result)}\n`);

        outNums.push(...p.result);
      });
    }

    const answer = vectorToLetters(outNums);
    const cleanInfo = parsed.removedCount > 0 ? `Удалено неалфавитных символов: ${parsed.removedCount}.` : "";
    const padInfo = padAdded > 0 ? ` Добавлено символов заполнения Х: ${padAdded}.` : "";

    statusEl.textContent = "Готово";
    statusEl.className = "status ok";
    detailsEl.textContent = `${cleanInfo}${padInfo}\n\n${details.join("\n")}`.trim();
    answerEl.textContent = `Ответ: ${answer}`;
  } catch (err) {
    statusEl.textContent = `Ошибка: ${err.message}`;
    statusEl.className = "status error";
    detailsEl.textContent = "";
    answerEl.textContent = "";
  }
}

function parseKnownAssignments(text) {
  const map = new Map();
  const regex = /a([1-4])([1-4])\s*=\s*(\d+)/gi;
  let match = regex.exec(text);

  while (match) {
    const row = Number(match[1]) - 1;
    const col = Number(match[2]) - 1;
    const value = Number(match[3]);

    if (value < 1 || value > 16) {
      throw new Error(`Значение a${row + 1}${col + 1}=${value} вне диапазона 1..16.`);
    }

    map.set(`${row},${col}`, value);
    match = regex.exec(text);
  }

  if (map.size === 0) {
    throw new Error("Не удалось прочитать известные элементы. Пример: a12=3, a21=5");
  }

  return map;
}

function solveTask2() {
  try {
    const known = parseKnownAssignments(task2KnownEl.value);
    const targetCipher = task2CipherEl.value.trim().toUpperCase();
    const phrase = task2PhraseEl.value.trim().toUpperCase();

    if (targetCipher.length !== 16) {
      throw new Error("Шифртекст Y должен содержать ровно 16 символов.");
    }

    if (phrase.length === 0) {
      throw new Error("Введите текст для шифрования во 2 задании.");
    }

    const cells = [];
    for (let r = 0; r < 4; r += 1) {
      for (let c = 0; c < 4; c += 1) {
        cells.push([r, c]);
      }
    }

    const rowGroups = Array.from({ length: 4 }, (_, r) => Array.from({ length: 4 }, (_, c) => `${r},${c}`));
    const colGroups = Array.from({ length: 4 }, (_, c) => Array.from({ length: 4 }, (_, r) => `${r},${c}`));
    const diagGroups = [
      Array.from({ length: 4 }, (_, i) => `${i},${i}`),
      Array.from({ length: 4 }, (_, i) => `${i},${3 - i}`),
    ];
    const groups = [...rowGroups, ...colGroups, ...diagGroups];

    const assignment = new Map(known);
    const usedValues = [...known.values()];
    if (new Set(usedValues).size !== usedValues.length) {
      throw new Error("Среди известных переменных есть повторяющиеся значения, ключ невозможен.");
    }

    const used = new Set(usedValues);
    const allNumbers = Array.from({ length: 16 }, (_, i) => i + 1);
    const unknownKeys = cells
      .map(([r, c]) => `${r},${c}`)
      .filter((key) => !assignment.has(key));

    const groupsPerKey = new Map();
    cells.forEach(([r, c]) => {
      const key = `${r},${c}`;
      groupsPerKey.set(key, groups.filter((g) => g.includes(key)));
    });

    function groupFeasible(group) {
      const values = group.map((key) => assignment.get(key));
      const knownValues = values.filter((v) => v !== undefined);
      const unknownCount = values.length - knownValues.length;
      const knownSum = knownValues.reduce((a, b) => a + b, 0);

      if (unknownCount === 0) {
        return knownSum === 34;
      }

      const remaining = allNumbers.filter((n) => !used.has(n));
      if (remaining.length < unknownCount) {
        return false;
      }

      const sorted = [...remaining].sort((a, b) => a - b);
      const minPossible = knownSum + sorted.slice(0, unknownCount).reduce((a, b) => a + b, 0);
      const maxPossible = knownSum + sorted.slice(-unknownCount).reduce((a, b) => a + b, 0);

      return minPossible <= 34 && 34 <= maxPossible;
    }

    const solutions = [];

    function backtrack() {
      if (assignment.size === 16) {
        const matrix = Array.from({ length: 4 }, () => Array(4).fill(0));
        assignment.forEach((value, key) => {
          const [r, c] = key.split(",").map(Number);
          matrix[r][c] = value;
        });
        solutions.push(matrix);
        return;
      }

      const remainingKeys = unknownKeys.filter((key) => !assignment.has(key));
      let bestKey = remainingKeys[0];
      let bestDomain = [];

      remainingKeys.forEach((key, idx) => {
        const domain = [];
        const candidates = allNumbers.filter((n) => !used.has(n));
        candidates.forEach((candidate) => {
          assignment.set(key, candidate);
          used.add(candidate);
          const ok = groupsPerKey.get(key).every(groupFeasible);
          used.delete(candidate);
          assignment.delete(key);
          if (ok) {
            domain.push(candidate);
          }
        });

        if (idx === 0 || domain.length < bestDomain.length) {
          bestKey = key;
          bestDomain = domain;
        }
      });

      bestDomain.forEach((candidate) => {
        assignment.set(bestKey, candidate);
        used.add(candidate);

        if (groups.every(groupFeasible)) {
          backtrack();
        }

        used.delete(candidate);
        assignment.delete(bestKey);
      });
    }

    function positionsByNumber(matrix) {
      const map = new Map();
      for (let r = 0; r < 4; r += 1) {
        for (let c = 0; c < 4; c += 1) {
          map.set(matrix[r][c], [r, c]);
        }
      }
      return map;
    }

    function decryptPermutation(cipher, matrix) {
      const pos = positionsByNumber(matrix);
      const grid = Array.from({ length: 4 }, () => Array(4).fill(""));
      [...cipher].forEach((ch, i) => {
        const [r, c] = pos.get(i + 1);
        grid[r][c] = ch;
      });
      return grid.flat().join("");
    }

    function encryptPermutation(plain, matrix) {
      const text = plain.length === 16 ? plain : `${plain}${"Х".repeat(16 - plain.length)}`;
      const grid = Array.from({ length: 4 }, () => Array(4).fill(""));
      [...text].forEach((ch, i) => {
        grid[Math.floor(i / 4)][i % 4] = ch;
      });
      const pos = positionsByNumber(matrix);
      const out = [];
      for (let n = 1; n <= 16; n += 1) {
        const [r, c] = pos.get(n);
        out.push(grid[r][c]);
      }
      return out.join("");
    }

    if (!groups.every(groupFeasible)) {
      throw new Error("С указанными известными элементами магический квадрат невозможен.");
    }

    backtrack();

    const knownList = [...known.entries()]
      .map(([key, value]) => {
        const [r, c] = key.split(",").map(Number);
        return `a${r + 1}${c + 1}=${value}`;
      })
      .join(", ");

    const lines = [];
    lines.push(`Использованы переменные: ${knownList}`);
    lines.push(`Y = ${targetCipher}`);
    lines.push(`Текст для шифрования: ${phrase}`);
    lines.push("");
    lines.push(`Найдено ключей (магических квадратов): ${solutions.length}`);
    lines.push("Тип шифрования: блочная табличная перестановка по магическому квадрату 4×4.");
    lines.push("");

    if (solutions.length === 0) {
      lines.push("Решений нет для указанных переменных.");
    }

    solutions.forEach((matrix, idx) => {
      const decrypted = decryptPermutation(targetCipher, matrix);
      const encrypted = encryptPermutation(phrase, matrix);

      lines.push(`Ключ ${idx + 1}:`);
      matrix.forEach((row) => lines.push(`  ${row.join(" ")}`));
      lines.push(`Расшифрование Y: ${decrypted}`);
      lines.push(`Зашифрование «${phrase}» (дополнение до 16 при необходимости): ${encrypted}`);
      lines.push("");
    });

    task2OutputEl.textContent = lines.join("\n");
  } catch (err) {
    task2OutputEl.textContent = `Ошибка: ${err.message}`;
  }
}

matrixAEl.value = "2 5\n1 3";
matrixBEl.value = "7\n11";
task2KnownEl.value = "a12=3, a21=5, a24=8, a33=7, a32=6";
task2CipherEl.value = "ZDUQBSSOEIASNIAA";
task2PhraseEl.value = "КАРАБАСБАРАБАСА";
