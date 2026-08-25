import { parseScenarioRecipe, serializeScenarioRecipe } from './scenario_recipe.js';

export const SCENARIO_QUERY_KEY = 'scenario';
export const MAX_SCENARIO_JSON_BYTES = 8192;
export const MAX_SCENARIO_TOKEN_CHARS = Math.ceil(MAX_SCENARIO_JSON_BYTES * 4 / 3) + 4;

const BASE64URL_RE = /^[A-Za-z0-9_-]+$/;
const utf8Encoder = new TextEncoder();

export function encodeScenarioRecipe(recipeInput) {
  const canonical = serializeScenarioRecipe(recipeInput);
  const bytes = utf8Encoder.encode(canonical);
  assertPayloadSize(bytes.byteLength);
  return bytesToBase64Url(bytes);
}

export function decodeScenarioRecipeToken(tokenInput) {
  const token = String(tokenInput ?? '').trim();
  if (!token) throw new TypeError('scenario token is required');
  if (token.length > MAX_SCENARIO_TOKEN_CHARS) throw new RangeError('scenario token is too large');
  if (!BASE64URL_RE.test(token)) throw new SyntaxError('scenario token must be unpadded base64url');

  let bytes;
  try {
    bytes = base64UrlToBytes(token);
  } catch {
    throw new SyntaxError('scenario token is not valid base64url');
  }
  assertPayloadSize(bytes.byteLength);

  let json;
  try {
    json = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    throw new SyntaxError('scenario token is not valid UTF-8');
  }
  return parseScenarioRecipeText(json);
}

export function parseScenarioRecipeText(textInput) {
  const text = String(textInput ?? '');
  const bytes = utf8Encoder.encode(text);
  assertPayloadSize(bytes.byteLength);
  return parseScenarioRecipe(text);
}

export function scenarioRecipeFromSearch(searchInput) {
  const params = searchParams(searchInput);
  const token = params.get(SCENARIO_QUERY_KEY);
  return token === null ? null : decodeScenarioRecipeToken(token);
}

export function scenarioSearchWithRecipe(searchInput, recipeInput, { renderer = undefined } = {}) {
  const params = searchParams(searchInput);
  params.set(SCENARIO_QUERY_KEY, encodeScenarioRecipe(recipeInput));
  if (renderer === 'phaser') params.delete('renderer');
  else if (renderer === 'legacy') params.set('renderer', 'legacy');
  return `?${params.toString()}`;
}

export function scenarioShareUrl(locationLike, recipeInput, options = {}) {
  if (!locationLike) throw new TypeError('location is required');
  const origin = String(locationLike.origin ?? '').trim();
  const pathname = String(locationLike.pathname ?? '').trim();
  if (!origin || !pathname) throw new TypeError('location origin and pathname are required');
  const search = scenarioSearchWithRecipe(locationLike.search ?? '', recipeInput, options);
  const hash = String(locationLike.hash ?? '');
  return `${origin}${pathname}${search}${hash}`;
}

function searchParams(searchInput) {
  const value = String(searchInput ?? '');
  return new URLSearchParams(value.startsWith('?') ? value.slice(1) : value);
}

function assertPayloadSize(byteLength) {
  if (byteLength > MAX_SCENARIO_JSON_BYTES) {
    throw new RangeError(`scenario payload exceeds ${MAX_SCENARIO_JSON_BYTES} bytes`);
  }
}

function bytesToBase64Url(bytes) {
  let binary = '';
  for (let index = 0; index < bytes.length; index += 1) binary += String.fromCharCode(bytes[index]);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '');
}

function base64UrlToBytes(token) {
  const standard = token.replaceAll('-', '+').replaceAll('_', '/');
  const remainder = standard.length % 4;
  if (remainder === 1) throw new SyntaxError('invalid base64url length');
  const padded = standard + (remainder === 0 ? '' : '='.repeat(4 - remainder));
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}
