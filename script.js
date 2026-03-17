const ALPHABET = "АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ";
const MOD = 33;

const matrixAEl = document.getElementById("matrixA");
const matrixBEl = document.getElementById("matrixB");
const messageEl = document.getElementById("message");
const statusEl = document.getElementById("status");
const detailsEl = document.getElementById("details");
const answerEl = document.getElementById("answer");

document.getElementById("encryptBtn").addEventListener("click", () => run("encrypt"));
document.getElementById("decryptBtn").addEventListener("click", () => run("decrypt"));

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

function multiplyMatrixVector(matrix, vector) {
  return matrix.map((row) => mod(row.reduce((sum, v, i) => sum + v * vector[i], 0)));
}

function vectorToLetters(vec) {
  return vec.map((x) => ALPHABET[mod(x)]).join("");
}

function lettersToNumbers(text) {
  const prepared = text.toUpperCase();
  const clean = [...prepared].filter((ch) => ALPHABET.includes(ch));
  return {
    cleanText: clean.join(""),
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
      details.push("Шифрование: C = A·P + B (mod 33)\n");
      blocks.forEach((pBlock, i) => {
        const aTimesP = multiplyMatrixVector(A, pBlock);
        const cBlock = aTimesP.map((v, idx) => mod(v + bVec[idx]));
        outNums.push(...cBlock);
        details.push(
          `Блок ${i + 1}: P=${vectorToLetters(pBlock)} (${pBlock.join(", ")})\n` +
            `A·P = (${aTimesP.join(", ")}), B = (${bVec.join(", ")})\n` +
            `C = (${cBlock.join(", ")}) => ${vectorToLetters(cBlock)}\n`,
        );
      });
    } else {
      const Ainv = invertMatrixMod(A);
      details.push("Расшифрование: P = A⁻¹·(C - B) (mod 33)\n");
      blocks.forEach((cBlock, i) => {
        const cMinusB = cBlock.map((v, idx) => mod(v - bVec[idx]));
        const pBlock = multiplyMatrixVector(Ainv, cMinusB);
        outNums.push(...pBlock);
        details.push(
          `Блок ${i + 1}: C=${vectorToLetters(cBlock)} (${cBlock.join(", ")})\n` +
            `C-B = (${cMinusB.join(", ")})\n` +
            `P = (${pBlock.join(", ")}) => ${vectorToLetters(pBlock)}\n`,
        );
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

matrixAEl.value = "2 5\n1 3";
matrixBEl.value = "7\n11";
