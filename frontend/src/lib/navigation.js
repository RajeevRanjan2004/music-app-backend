const STACK_KEY = "musicfy.navigation.stack";
const MAX_STACK_LENGTH = 50;

function getHistoryIndex() {
  if (typeof window === "undefined") {
    return 0;
  }

  return Number(window.history.state?.idx || 0);
}

function toPath(locationOrPath) {
  if (typeof locationOrPath === "string") {
    return locationOrPath;
  }

  return `${locationOrPath.pathname || ""}${locationOrPath.search || ""}${locationOrPath.hash || ""}`;
}

function readStack() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const parsed = JSON.parse(sessionStorage.getItem(STACK_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}

function writeStack(stack) {
  if (typeof window === "undefined") {
    return;
  }

  const trimmedStack = stack.slice(-MAX_STACK_LENGTH);
  sessionStorage.setItem(STACK_KEY, JSON.stringify(trimmedStack));
}

function dedupeTrailingDuplicates(stack) {
  if (stack.length < 2) {
    return stack;
  }

  if (stack[stack.length - 1] === stack[stack.length - 2]) {
    return stack.slice(0, -1);
  }

  return stack;
}

export function syncNavigationStack(location, navigationType) {
  const currentPath = toPath(location);
  const stack = readStack();

  if (!stack.length) {
    writeStack([currentPath]);
    return;
  }

  if (navigationType === "POP") {
    const existingIndex = stack.lastIndexOf(currentPath);

    if (existingIndex >= 0) {
      writeStack(stack.slice(0, existingIndex + 1));
      return;
    }
  }

  if (navigationType === "REPLACE") {
    const nextStack = [...stack];
    nextStack[nextStack.length - 1] = currentPath;
    writeStack(dedupeTrailingDuplicates(nextStack));
    return;
  }

  if (stack[stack.length - 1] !== currentPath) {
    writeStack([...stack, currentPath]);
  }
}

export function browserCanNavigateBack() {
  return getHistoryIndex() > 0;
}

export function canNavigateBack() {
  return browserCanNavigateBack() || readStack().length > 1;
}

export function consumeNavigationBackTarget(currentLocation) {
  const currentPath = toPath(currentLocation);
  const stack = readStack();

  if (!stack.length) {
    return null;
  }

  let normalizedStack = [...stack];
  const currentIndex = normalizedStack.lastIndexOf(currentPath);

  if (currentIndex >= 0) {
    normalizedStack = normalizedStack.slice(0, currentIndex + 1);
  }

  if (normalizedStack.length < 2) {
    return null;
  }

  normalizedStack.pop();
  const previousPath = normalizedStack[normalizedStack.length - 1];
  writeStack(normalizedStack);
  return previousPath;
}
