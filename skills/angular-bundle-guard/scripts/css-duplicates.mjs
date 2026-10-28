import path from 'node:path';
import { rootDir } from './bundle-utils.mjs';

const BUILTIN_KEYFRAMES = new Set(['spin', 'pulse', 'ping', 'bounce']);

function hasAnimationReference(name, cleanCssList) {
  const animRegex = new RegExp(`animation(?:-name)?\\s*:[^;{}]*(?<![a-zA-Z0-9_-])${name}(?![a-zA-Z0-9_-])`);
  return cleanCssList.some((c) => animRegex.test(c));
}

export function extractAndAuditKeyframes(activeCssFiles, globalFiles) {
  const allKeyframes = [];
  const globalUtilitiesByKeyframe = new Map();
  const cleanByRel = new Map();

  for (const f of activeCssFiles) {
    const rel = path.relative(rootDir, f.file);
    const isGlobal = globalFiles.has(rel);
    const clean = f.content.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
    for (const m of clean.matchAll(/@keyframes\s+([a-zA-Z0-9_-]+)\s*\{((?:[^{}]|\{[^{}]*\})*)\}/g)) {
      const line = clean.slice(0, m.index).split('\n').length;
      allKeyframes.push({ name: m[1], relPath: `${rel}:${line}`, fileRel: rel, isGlobal, bodyLen: m[0].length });
    }
    const stripped = clean.replace(/@keyframes\s+[a-zA-Z0-9_-]+\s*\{(?:[^{}]|\{[^{}]*\})*\}/g, (m) => m.replace(/[^\n]/g, ' '));
    cleanByRel.set(rel, stripped);
    if (isGlobal) {
      for (const um of stripped.matchAll(/@utility\s+([a-zA-Z0-9_-]+)\s*\{([^{}]*)\}/g)) {
        for (const am of um[2].matchAll(/animation(?:-name)?\s*:\s*([^;{}]+)/g)) {
          am[1].split(/[\s,]+/).filter(Boolean).forEach((t) => globalUtilitiesByKeyframe.set(t, um[1]));
        }
      }
    }
  }

  const counts = new Map();
  allKeyframes.forEach((k) => counts.set(k.name, (counts.get(k.name) || 0) + 1));
  const allCleanList = [...cleanByRel.values()];
  const deadKeyframes = [];
  const validCustomKeyframes = new Set();

  for (const kf of allKeyframes) {
    const isCollision = !kf.isGlobal && BUILTIN_KEYFRAMES.has(kf.name);
    const isReferenced = hasAnimationReference(kf.name, kf.isGlobal ? allCleanList : [cleanByRel.get(kf.fileRel) || '']);
    if (isCollision || !isReferenced) {
      const reason = isCollision
        ? `Collides with Tailwind built-in animate-${kf.name}`
        : 'Unused @keyframes (never referenced by animation)';
      const action = isCollision
        ? `Delete '@keyframes ${kf.name}' and use Tailwind 'animate-${kf.name}' in .html`
        : 'Delete unused @keyframes block';
      deadKeyframes.push({
        relPath: kf.relPath,
        selector: `@keyframes ${kf.name}`,
        className: `@keyframes ${kf.name}`,
        reason,
        action,
        themeIssueAction: `<strong>${reason}:</strong> ${action}.`,
        estBytes: Math.max(90, kf.bodyLen),
        specRefs: '',
        cssApplyRefs: '',
      });
    } else if (counts.get(kf.name) === 1) {
      validCustomKeyframes.add(kf.name);
    }
  }

  return { allKeyframes, globalUtilitiesByKeyframe, deadKeyframes, validCustomKeyframes };
}

function compareTwoRulesInSameFile({ a, b, state }) {
  const shared = a.utilities.filter((u) => b.utilities.includes(u));
  if (shared.length < 5 || shared.length < Math.min(a.utilities.length, b.utilities.length) - 1) {
    return null;
  }
  const aCls = a.selector.slice(1);
  const bCls = b.selector.slice(1);
  const onlyInA = a.utilities.filter((u) => !b.utilities.includes(u));
  const onlyInB = b.utilities.filter((u) => !a.utilities.includes(u));
  if (onlyInA.length === 0 && onlyInB.length === 0) {
    return null;
  }
  const hints = [
    ...(onlyInA.length > 0 ? [`add "${onlyInA.join(' ')}" to "${aCls}" in HTML`] : []),
    `replace "${bCls}" with "${aCls}${onlyInB.length > 0 ? ` ${onlyInB.join(' ')}` : ''}" in HTML & delete ${b.selector} from CSS`,
  ];
  return {
    relPath: a.loc,
    selectors: `${a.selector}, ${b.selector}`,
    sharedCount: shared.length,
    fixCss: `${a.selector} { @apply ${shared.join(' ')}; }`,
    unsharedHint: hints.join('; '),
    htmlLocations: [aCls, bCls].map((c) => state.findFileLineRefs(c, state.siblingHtmlFiles)).filter(Boolean).join(', '),
    specRefs: [aCls, bCls].map((c) => state.findFileLineRefs(c, state.siblingSpecFiles)).filter(Boolean).join(', '),
    estBytes: shared.length * 180,
  };
}

function checkCommaSeparatedClasses({ block, state }) {
  const parts = block.selector.split(',').map((s) => s.trim());
  if (parts.length < 2 || !parts.every((p) => /^\.[a-zA-Z0-9_-]+$/.test(p))) {
    return null;
  }
  const classes = parts.map((p) => p.slice(1));
  const hasNonShortOtherRule = classes.some((cls) =>
    state.fileApplyBlocks.some(
      (other) =>
        other !== block &&
        state.extractSelectorClassNames(other.selector).includes(cls) &&
        (other.selector !== `.${cls}` || other.utilities.length > 3 || other.utilities.some((u) => u.includes('--'))),
    ),
  );
  if (hasNonShortOtherRule) {
    return null;
  }
  const [keepCls, ...dropClasses] = classes;
  return {
    relPath: block.loc,
    selectors: block.selector,
    sharedCount: block.utilities.length,
    fixCss: `.${keepCls} { @apply ${block.utilities.join(' ')}; }`,
    unsharedHint: `replace ${dropClasses.map((c) => `"${c}"`).join(', ')} with "${keepCls}" in HTML (single shared class; extra class names not needed)`,
    htmlLocations: classes.map((c) => state.findFileLineRefs(c, state.siblingHtmlFiles)).filter(Boolean).join(', '),
    specRefs: classes.map((c) => state.findFileLineRefs(c, state.siblingSpecFiles)).filter(Boolean).join(', '),
    estBytes: dropClasses.length * 45,
  };
}

export function findDuplicatesInSameFile(state) {
  const duplicates = [];
  const blocks = state.fileApplyBlocks;
  for (let i = 0; i < blocks.length; i = i + 1) {
    const multiEntry = checkCommaSeparatedClasses({ block: blocks[i], state });
    if (multiEntry) {
      duplicates.push(multiEntry);
    }
    for (let j = i + 1; j < blocks.length; j = j + 1) {
      if (blocks[i].utilities.length >= 5 && blocks[j].utilities.length >= 5) {
        const pairEntry = compareTwoRulesInSameFile({ a: blocks[i], b: blocks[j], state });
        if (pairEntry) {
          duplicates.push(pairEntry);
        }
      }
    }
  }
  return duplicates;
}

export function findIdenticalRulesAcrossFiles(remainingRules) {
  const groups = new Map();
  for (const rule of remainingRules) {
    const key = [...rule.utilities].sort().join(' ');
    const list = groups.get(key) || [];
    list.push(rule);
    groups.set(key, list);
  }
  const duplicates = [];
  for (const group of groups.values()) {
    if (group.length < 2) {
      continue;
    }
    const utils = group[0].utilities;
    const files = new Set(group.map((r) => r.relPath.split(':')[0]));
    const isSameFile = files.size === 1;
    if (!isSameFile && utils.length <= 3) {
      continue;
    }
    const [first, ...rest] = group;
    duplicates.push({
      relPath: group.map((r) => r.relPath).join(', '),
      selectors: group.map((r) => r.selector).join(', '),
      sharedCount: utils.length,
      fixCss: isSameFile
        ? `${first.selector} { @apply ${utils.join(' ')}; }`
        : `@utility <shared-name> { @apply ${utils.join(' ')}; } /* in src/styles.css */`,
      unsharedHint: isSameFile
        ? `replace ${rest.map((r) => `"${r.className}"`).join(', ')} with "${first.className}" in HTML & delete duplicate rule(s) from CSS`
        : `extract shared @utility to src/styles.css, replace ${group.map((r) => `"${r.className}"`).join(', ')} in HTML, & delete ${group.length} duplicate rules from component CSS`,
      htmlLocations: group.map((r) => r.htmlLocations).filter(Boolean).join(', '),
      specRefs: group.map((r) => r.specRefs).filter(Boolean).join(', '),
      estBytes: (group.length - 1) * Math.max(60, utils.length * 120),
    });
  }
  return duplicates;
}

export function findDuplicateKeyframesAcrossFiles(allKeyframes, globalUtilitiesByKeyframe = new Map()) {
  const groups = new Map();
  for (const kf of allKeyframes) {
    const list = groups.get(kf.name) || [];
    list.push(kf);
    groups.set(kf.name, list);
  }
  const duplicates = [];
  for (const [name, occurrences] of groups.entries()) {
    if (occurrences.length <= 1) {
      continue;
    }
    const hasGlobal = occurrences.some((o) => o.isGlobal);
    const utilName = hasGlobal ? globalUtilitiesByKeyframe.get(name) : null;
    const hint = utilName
      ? `Delete component '@keyframes ${name}' and 'animation: ${name}...' line; use global '${utilName}' utility in .html`
      : `Consolidate duplicate '@keyframes ${name}' into src/styles.css and delete component copies`;
    duplicates.push({
      relPath: occurrences.map((o) => o.relPath).join(', '),
      selectors: `@keyframes ${name}`,
      signature: utilName ? `@keyframes ${name} (${hint})` : `@keyframes ${name}`,
      sharedCount: 1,
      utilityCount: 1,
      occurrences,
      fixCss: utilName
        ? `@utility ${utilName} /* in src/styles.css */`
        : `@keyframes ${name} { ... } /* in src/styles.css */`,
      unsharedHint: hint,
      htmlLocations: '',
      specRefs: '',
      estBytes: (occurrences.length - 1) * 140,
    });
  }
  return duplicates;
}
