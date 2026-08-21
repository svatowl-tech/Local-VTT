export interface ParsedDiceTerm {
  count: number;
  sides: number;
  keepHighest?: number;
  keepLowest?: number;
  isExploding: boolean;
  isSubtraction: boolean;
}

export interface DiceRollResult {
  total: number;
  rolls: number[];
  modifier: number;
  isCrit: boolean;
  isFumble: boolean;
  breakdown: string;
  formatted: string;
}

export interface DiceDistributionResult {
  expression: string;
  iterations: number;
  min: number;
  max: number;
  average: number;
  standardDeviation: number;
  critPercentage: number;
  histogram: Record<number, number>;
}

/**
 * Fast AST Dice Expression Parser
 * Handles notations like "4d6kh3 + 2d8! - 2 + 1d20"
 */
export function parseDiceExpression(expression: string): {
  terms: ParsedDiceTerm[];
  modifier: number;
} {
  const clean = expression.replace(/\s+/g, '').toLowerCase();
  const terms: ParsedDiceTerm[] = [];
  let modifier = 0;

  let currentToken = '';
  let isSub = false;

  const flushToken = (token: string, sub: boolean) => {
    if (!token) return;

    if (token.includes('d')) {
      const parts = token.split('d');
      const count = Math.max(1, Math.min(100, parseInt(parts[0], 10) || 1));
      const rest = parts[1] || '6';

      let sides = 6;
      let keepH: number | undefined;
      let keepL: number | undefined;
      const exploding = rest.includes('!');

      const cleanRest = rest.replace(/!/g, '');

      if (cleanRest.includes('kh')) {
        const khParts = cleanRest.split('kh');
        sides = parseInt(khParts[0], 10) || 6;
        keepH = parseInt(khParts[1], 10) || undefined;
      } else if (cleanRest.includes('kl')) {
        const klParts = cleanRest.split('kl');
        sides = parseInt(klParts[0], 10) || 6;
        keepL = parseInt(klParts[1], 10) || undefined;
      } else {
        sides = parseInt(cleanRest, 10) || 6;
      }

      terms.push({
        count,
        sides: Math.max(2, Math.min(1000, sides)),
        keepHighest: keepH,
        keepLowest: keepL,
        isExploding: exploding,
        isSubtraction: sub,
      });
    } else {
      const val = parseInt(token, 10);
      if (!isNaN(val)) {
        if (sub) {
          modifier -= val;
        } else {
          modifier += val;
        }
      }
    }
  };

  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (ch === '+' || ch === '-') {
      flushToken(currentToken, isSub);
      currentToken = '';
      isSub = ch === '-';
    } else {
      currentToken += ch;
    }
  }
  flushToken(currentToken, isSub);

  return { terms, modifier };
}

function rollDie(sides: number): number {
  return Math.floor(Math.random() * sides) + 1;
}

/**
 * Evaluates a dice roll with detailed breakdown
 */
export function evaluateRoll(expression: string, extraModifier: number = 0): DiceRollResult {
  const { terms, modifier: baseModifier } = parseDiceExpression(expression);
  const totalModifier = baseModifier + extraModifier;

  const allRolls: number[] = [];
  const termsBreakdown: string[] = [];
  let runningTotal = 0;
  let isCrit = false;
  let isFumble = false;

  for (let i = 0; i < terms.length; i++) {
    const term = terms[i];
    const rawRolls: number[] = [];

    for (let c = 0; c < term.count; c++) {
      let r = rollDie(term.sides);
      rawRolls.push(r);

      if (term.isExploding) {
        let explosions = 0;
        while (r === term.sides && explosions < 5) {
          r = rollDie(term.sides);
          rawRolls.push(r);
          explosions++;
        }
      }
    }

    if (term.count === 1 && term.sides === 20) {
      if (rawRolls.includes(20)) isCrit = true;
      if (rawRolls.includes(1)) isFumble = true;
    }

    const sortedIndices = rawRolls.map((val, idx) => ({ val, idx })).sort((a, b) => a.val - b.val);
    const keptSet = new Array(rawRolls.length).fill(true);

    if (term.keepHighest !== undefined) {
      const dropCount = Math.max(0, rawRolls.length - term.keepHighest);
      for (let d = 0; d < dropCount; d++) {
        keptSet[sortedIndices[d].idx] = false;
      }
    } else if (term.keepLowest !== undefined) {
      const dropCount = Math.max(0, rawRolls.length - term.keepLowest);
      for (let d = sortedIndices.length - 1; d >= sortedIndices.length - dropCount; d--) {
        keptSet[sortedIndices[d].idx] = false;
      }
    }

    let termSum = 0;
    for (let r = 0; r < rawRolls.length; r++) {
      allRolls.push(rawRolls[r]);
      if (keptSet[r]) {
        termSum += rawRolls[r];
      }
    }

    if (term.isSubtraction) {
      runningTotal -= termSum;
      termsBreakdown.push(`-[${rawRolls.join(',')}]`);
    } else {
      runningTotal += termSum;
      termsBreakdown.push(`+[${rawRolls.join(',')}]`);
    }
  }

  const finalTotal = runningTotal + totalModifier;
  const modStr = totalModifier > 0 ? `+${totalModifier}` : totalModifier < 0 ? `${totalModifier}` : '';
  const formatted = `${expression} ${termsBreakdown.join(' ')}${modStr}`;

  return {
    total: finalTotal,
    rolls: allRolls,
    modifier: totalModifier,
    isCrit,
    isFumble,
    breakdown: termsBreakdown.join(' '),
    formatted,
  };
}

/**
 * Monte Carlo simulator for statistical distributions
 */
export function simulateDistribution(
  expression: string,
  iterations: number = 25000
): DiceDistributionResult {
  const { terms, modifier } = parseDiceExpression(expression);
  const runs = Math.max(100, Math.min(100000, iterations));

  const histogram: Record<number, number> = {};
  let minVal = Infinity;
  let maxVal = -Infinity;
  let totalSum = 0;
  let critCount = 0;

  for (let i = 0; i < runs; i++) {
    let simTotal = 0;

    for (let t = 0; t < terms.length; t++) {
      const term = terms[t];
      const rawRolls: number[] = [];

      for (let c = 0; c < term.count; c++) {
        rawRolls.push(rollDie(term.sides));
      }

      if (term.count === 1 && term.sides === 20 && rawRolls[0] === 20) {
        critCount++;
      }

      if (term.keepHighest !== undefined) {
        rawRolls.sort((a, b) => b - a);
        const kept = rawRolls.slice(0, term.keepHighest).reduce((acc, v) => acc + v, 0);
        simTotal += term.isSubtraction ? -kept : kept;
      } else if (term.keepLowest !== undefined) {
        rawRolls.sort((a, b) => a - b);
        const kept = rawRolls.slice(0, term.keepLowest).reduce((acc, v) => acc + v, 0);
        simTotal += term.isSubtraction ? -kept : kept;
      } else {
        const sum = rawRolls.reduce((acc, v) => acc + v, 0);
        simTotal += term.isSubtraction ? -sum : sum;
      }
    }

    const runResult = simTotal + modifier;
    if (runResult < minVal) minVal = runResult;
    if (runResult > maxVal) maxVal = runResult;
    totalSum += runResult;
    histogram[runResult] = (histogram[runResult] || 0) + 1;
  }

  const average = totalSum / runs;

  let varianceSum = 0;
  for (const key in histogram) {
    const val = Number(key);
    const count = histogram[key];
    const diff = val - average;
    varianceSum += diff * diff * count;
  }
  const standardDeviation = Math.sqrt(varianceSum / runs);
  const critPercentage = (critCount / runs) * 100;

  return {
    expression,
    iterations: runs,
    min: minVal === Infinity ? 0 : minVal,
    max: maxVal === -Infinity ? 0 : maxVal,
    average,
    standardDeviation,
    critPercentage,
    histogram,
  };
}
