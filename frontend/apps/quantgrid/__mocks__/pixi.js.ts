// ESM mock for pixi.js v8
import { vi } from 'vitest';

export const Assets = {
  init: vi.fn().mockResolvedValue(undefined),
  load: vi.fn().mockResolvedValue({}),
  loadBundle: vi.fn().mockResolvedValue({}),
  add: vi.fn(),
  get: vi.fn(),
};

export const Application = vi.fn().mockImplementation(() => ({
  stage: { addChild: vi.fn() },
  renderer: { resize: vi.fn(), background: { alpha: 0, color: 0 } },
  canvas: document.createElement('canvas'),
  ticker: { start: vi.fn(), stop: vi.fn(), started: false },
  render: vi.fn(),
}));

export const Container = vi.fn().mockImplementation(() => ({
  addChild: vi.fn(),
  removeChild: vi.fn(),
  removeChildren: vi.fn(),
  parent: null,
}));

// v8 Graphics API uses rect/fill/stroke instead of beginFill/drawRect/endFill
export const Graphics = vi.fn().mockImplementation(() => ({
  rect: vi.fn().mockReturnThis(),
  roundRect: vi.fn().mockReturnThis(),
  circle: vi.fn().mockReturnThis(),
  poly: vi.fn().mockReturnThis(),
  moveTo: vi.fn().mockReturnThis(),
  lineTo: vi.fn().mockReturnThis(),
  fill: vi.fn().mockReturnThis(),
  stroke: vi.fn().mockReturnThis(),
  clear: vi.fn().mockReturnThis(),
  addChild: vi.fn(),
  removeChild: vi.fn(),
}));

export const Text = vi.fn().mockImplementation(() => ({
  text: '',
  style: {},
}));

// v8 BitmapText uses object constructor
export const BitmapText = vi.fn().mockImplementation(() => ({
  text: '',
  style: { fontFamily: '', fontSize: 12 },
  x: 0,
  y: 0,
  alpha: 1,
  destroy: vi.fn(),
  parent: null,
}));

export const TextStyle = vi.fn().mockImplementation((options) => ({
  ...options,
}));

export const Sprite = vi.fn().mockImplementation(() => ({
  anchor: { set: vi.fn() },
  position: { set: vi.fn() },
  x: 0,
  y: 0,
  width: 0,
  height: 0,
  visible: true,
  parent: null,
  eventMode: 'none',
  cursor: 'default',
  on: vi.fn(),
  off: vi.fn(),
}));

Sprite.from = vi.fn().mockImplementation(() => ({
  anchor: { set: vi.fn() },
  position: { set: vi.fn() },
  x: 0,
  y: 0,
  width: 0,
  height: 0,
  visible: true,
  parent: null,
  eventMode: 'none',
  cursor: 'default',
  on: vi.fn(),
  off: vi.fn(),
}));

// v8 BitmapFont API
export const BitmapFont = {
  install: vi.fn(),
};

const PIXI = {
  Assets,
  Application,
  Container,
  Graphics,
  Text,
  BitmapText,
  TextStyle,
  Sprite,
  BitmapFont,
};

export default PIXI;
