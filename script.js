const result = document.querySelector("#result");
const history = document.querySelector("#history");
const soundToggle = document.querySelector("#soundToggle");
const angleModeButton = document.querySelector("#angleMode");
const keys = document.querySelectorAll(".key");

let expression = "";
let lastAnswer = 0;
let lastHistory = "";
let soundEnabled = true;
let angleMode = "DEG";
let audioContext;

const binaryOperators = {
  "+": { precedence: 2, associativity: "left", args: 2, fn: (a, b) => a + b },
  "-": { precedence: 2, associativity: "left", args: 2, fn: (a, b) => a - b },
  "*": { precedence: 3, associativity: "left", args: 2, fn: (a, b) => a * b },
  "/": { precedence: 3, associativity: "left", args: 2, fn: (a, b) => a / b },
  "mod": { precedence: 3, associativity: "left", args: 2, fn: (a, b) => a % b },
  "^": { precedence: 5, associativity: "right", args: 2, fn: (a, b) => a ** b },
};

const unaryOperators = {
  "NEG": { precedence: 4, associativity: "right", args: 1, fn: (a) => -a },
  "!": { precedence: 6, associativity: "left", args: 1, postfix: true, fn: factorial },
  "%": { precedence: 6, associativity: "left", args: 1, postfix: true, fn: (a) => a / 100 },
};

const functions = {
  sin: (value) => Math.sin(toRadians(value)),
  cos: (value) => Math.cos(toRadians(value)),
  tan: (value) => Math.tan(toRadians(value)),
  asin: (value) => fromRadians(Math.asin(value)),
  acos: (value) => fromRadians(Math.acos(value)),
  atan: (value) => fromRadians(Math.atan(value)),
  sqrt: (value) => Math.sqrt(value),
  log: (value) => Math.log10(value),
  ln: (value) => Math.log(value),
  exp: (value) => Math.exp(value),
  abs: (value) => Math.abs(value),
};

function getAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }

  return audioContext;
}

function playClick() {
  if (!soundEnabled) return;

  const ctx = getAudioContext();
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(620, ctx.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(280, ctx.currentTime + 0.06);

  gain.gain.setValueAtTime(0.001, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start();
  oscillator.stop(ctx.currentTime + 0.08);
}

function toRadians(value) {
  return angleMode === "DEG" ? value * Math.PI / 180 : value;
}

function fromRadians(value) {
  return angleMode === "DEG" ? value * 180 / Math.PI : value;
}

function factorial(value) {
  if (!Number.isInteger(value) || value < 0 || value > 170) {
    throw new Error("Factorial supports whole numbers from 0 to 170");
  }

  let total = 1;
  for (let index = 2; index <= value; index += 1) {
    total *= index;
  }
  return total;
}

function formatExpression(value) {
  return value
    .replaceAll("asin(", "asin(")
    .replaceAll("acos(", "acos(")
    .replaceAll("atan(", "atan(")
    .replaceAll("sqrt(", "sqrt(")
    .replaceAll("*", "x")
    .replaceAll("pi", "pi");
}

function formatNumber(value) {
  if (Math.abs(value) >= 1e12 || (Math.abs(value) > 0 && Math.abs(value) < 1e-8)) {
    return value.toExponential(8).replace(/\.?0+e/, "e");
  }

  return String(Number(value.toPrecision(12)));
}

function updateDisplay(animate = true) {
  result.textContent = expression ? formatExpression(expression) : "0";
  history.textContent = lastHistory;

  if (!animate) return;

  result.classList.remove("pop");
  requestAnimationFrame(() => {
    result.classList.add("pop");
    setTimeout(() => result.classList.remove("pop"), 170);
  });
}

function appendValue(value) {
  const last = expression.at(-1);

  if (value === "." && currentNumber().includes(".")) return;
  if (["+", "*", "/", "^"].includes(value) && ["+", "-", "*", "/", "^"].includes(last)) {
    expression = expression.slice(0, -1) + value;
  } else if (value === "mod" && /mod$/.test(expression)) {
    return;
  } else {
    expression += value;
  }

  updateDisplay();
}

function currentNumber() {
  const parts = expression.split(/[+\-*/^()%!]|mod/);
  return parts.at(-1) || "";
}

function clearCalculator() {
  expression = "";
  lastHistory = "";
  updateDisplay();
}

function deleteLast() {
  const functionMatch = expression.match(/(asin\(|acos\(|atan\(|sqrt\(|sin\(|cos\(|tan\(|log\(|ln\(|exp\(|abs\(|mod|Ans|pi)$/);
  expression = functionMatch
    ? expression.slice(0, -functionMatch[0].length)
    : expression.slice(0, -1);
  updateDisplay();
}

function negateExpression() {
  if (!expression) {
    expression = "-";
  } else {
    expression = `-(${expression})`;
  }
  updateDisplay();
}

function calculate() {
  if (!expression) return;

  try {
    const answer = evaluateExpression(expression);

    if (!Number.isFinite(answer)) {
      throw new Error("Invalid result");
    }

    lastAnswer = answer;
    lastHistory = `${formatExpression(expression)} =`;
    expression = formatNumber(answer);
    updateDisplay();
  } catch (error) {
    result.textContent = "Error";
    history.textContent = error.message || "Try another calculation";
    result.classList.add("pop");
    setTimeout(() => result.classList.remove("pop"), 240);
  }
}

function tokenize(input) {
  const tokens = [];
  let index = 0;

  while (index < input.length) {
    const char = input[index];

    if (char === " ") {
      index += 1;
      continue;
    }

    if (/\d|\./.test(char)) {
      let number = char;
      index += 1;
      while (index < input.length && /[\d.]/.test(input[index])) {
        number += input[index];
        index += 1;
      }
      tokens.push({ type: "number", value: Number(number) });
      continue;
    }

    if (/[a-zA-Z]/.test(char)) {
      let name = char;
      index += 1;
      while (index < input.length && /[a-zA-Z]/.test(input[index])) {
        name += input[index];
        index += 1;
      }
      tokens.push(wordToken(name));
      continue;
    }

    if (char === "(") tokens.push({ type: "leftParen", value: char });
    else if (char === ")") tokens.push({ type: "rightParen", value: char });
    else if ("+-*/^!%".includes(char)) tokens.push({ type: "operator", value: char });
    else throw new Error(`Unknown symbol: ${char}`);

    index += 1;
  }

  return addImplicitMultiplication(markUnary(tokens));
}

function wordToken(name) {
  if (name === "pi") return { type: "number", value: Math.PI };
  if (name === "e") return { type: "number", value: Math.E };
  if (name === "Ans") return { type: "number", value: lastAnswer };
  if (name === "mod") return { type: "operator", value: "mod" };
  if (functions[name]) return { type: "function", value: name };
  throw new Error(`Unknown function: ${name}`);
}

function markUnary(tokens) {
  return tokens.map((token, index) => {
    if (token.type !== "operator" || token.value !== "-") return token;

    const previous = tokens[index - 1];
    const isUnary = !previous
      || previous.type === "operator"
      || previous.type === "leftParen"
      || previous.type === "function";

    return isUnary ? { type: "operator", value: "NEG" } : token;
  });
}

function addImplicitMultiplication(tokens) {
  const output = [];

  tokens.forEach((token, index) => {
    const previous = output.at(-1);
    if (previous && canEndValue(previous) && canStartValue(token) && !(previous.type === "function")) {
      output.push({ type: "operator", value: "*" });
    }
    output.push(token);
  });

  return output;
}

function canEndValue(token) {
  return token.type === "number"
    || token.type === "rightParen"
    || ["!", "%"].includes(token.value);
}

function canStartValue(token) {
  return token.type === "number"
    || token.type === "leftParen"
    || token.type === "function";
}

function evaluateExpression(input) {
  const tokens = tokenize(input);
  const output = [];
  const stack = [];

  tokens.forEach((token) => {
    if (token.type === "number") {
      output.push(token);
      return;
    }

    if (token.type === "function") {
      stack.push(token);
      return;
    }

    if (token.type === "operator") {
      const current = getOperator(token.value);

      if (current.postfix) {
        output.push(token);
        return;
      }

      while (stack.length) {
        const top = stack.at(-1);
        if (top.type === "leftParen") break;

        const topOperator = top.type === "operator" ? getOperator(top.value) : { precedence: 7 };
        const shouldPop = current.associativity === "left"
          ? current.precedence <= topOperator.precedence
          : current.precedence < topOperator.precedence;

        if (!shouldPop) break;
        output.push(stack.pop());
      }

      stack.push(token);
      return;
    }

    if (token.type === "leftParen") {
      stack.push(token);
      return;
    }

    if (token.type === "rightParen") {
      while (stack.length && stack.at(-1).type !== "leftParen") {
        output.push(stack.pop());
      }

      if (!stack.length) throw new Error("Mismatched parentheses");
      stack.pop();

      if (stack.at(-1)?.type === "function") {
        output.push(stack.pop());
      }
    }
  });

  while (stack.length) {
    const token = stack.pop();
    if (token.type === "leftParen" || token.type === "rightParen") {
      throw new Error("Mismatched parentheses");
    }
    output.push(token);
  }

  return solveRpn(output);
}

function getOperator(value) {
  const operator = binaryOperators[value] || unaryOperators[value];
  if (!operator) throw new Error(`Unknown operator: ${value}`);
  return operator;
}

function solveRpn(tokens) {
  const stack = [];

  tokens.forEach((token) => {
    if (token.type === "number") {
      stack.push(token.value);
      return;
    }

    if (token.type === "function") {
      if (!stack.length) throw new Error("Missing function input");
      stack.push(functions[token.value](stack.pop()));
      return;
    }

    const operator = getOperator(token.value);

    if (operator.args === 1) {
      if (!stack.length) throw new Error("Missing operator input");
      stack.push(operator.fn(stack.pop()));
      return;
    }

    if (stack.length < 2) throw new Error("Missing operator input");
    const b = stack.pop();
    const a = stack.pop();
    stack.push(operator.fn(a, b));
  });

  if (stack.length !== 1) throw new Error("Invalid expression");
  return stack[0];
}

function handleAction(button) {
  playClick();

  const action = button.dataset.action;
  const value = button.dataset.value;

  if (action === "clear") clearCalculator();
  if (action === "delete") deleteLast();
  if (action === "calculate") calculate();
  if (action === "negate") negateExpression();
  if (value) appendValue(value);
}

keys.forEach((key) => {
  key.addEventListener("pointermove", (event) => {
    const rect = key.getBoundingClientRect();
    key.style.setProperty("--x", `${event.clientX - rect.left}px`);
    key.style.setProperty("--y", `${event.clientY - rect.top}px`);
  });

  key.addEventListener("click", () => handleAction(key));
});

soundToggle.addEventListener("click", () => {
  soundEnabled = !soundEnabled;
  soundToggle.classList.toggle("is-on", soundEnabled);
  soundToggle.setAttribute("aria-pressed", String(soundEnabled));
  if (soundEnabled) playClick();
});

angleModeButton.addEventListener("click", () => {
  playClick();
  angleMode = angleMode === "DEG" ? "RAD" : "DEG";
  angleModeButton.textContent = angleMode;
});

window.addEventListener("keydown", (event) => {
  const keyMap = {
    Enter: "calculate",
    "=": "calculate",
    Backspace: "delete",
    Escape: "clear",
  };

  const action = keyMap[event.key];
  const value = /^[0-9+\-*/^().%!/]$/.test(event.key) ? event.key : "";

  if (!action && !value) return;
  event.preventDefault();

  const button = action
    ? document.querySelector(`[data-action="${action}"]`)
    : document.querySelector(`[data-value="${CSS.escape(value)}"]`);

  if (button) {
    button.classList.add("is-pressed");
    setTimeout(() => button.classList.remove("is-pressed"), 130);
  }

  if (action === "calculate") calculate();
  else if (action === "delete") deleteLast();
  else if (action === "clear") clearCalculator();
  else appendValue(value);

  playClick();
});

updateDisplay(false);
