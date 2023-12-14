// overlay/DeferredRequest.ts
var defaultRequestTimeout = 1e4;
var DeferredRequest = class _DeferredRequest {
  constructor(type, params) {
    this.type = type;
    this.params = params;
    this.requestId = _DeferredRequest.generateRequestId();
    this._isReplied = false;
    this.promise = Promise.race([
      new Promise((resolve) => {
        this.resolve = resolve;
      }),
      new Promise((_, reject) => {
        setTimeout(() => {
          reject(
            `[ChatOverlay] Request ${type} failed. Timeout ${
              this.params?.timeout || defaultRequestTimeout
            }`
          );
        }, this.params?.timeout || defaultRequestTimeout);
      }),
    ]);
  }
  match(type, requestId) {
    return this.type + '/RESPONSE' === type && this.requestId === requestId;
  }
  reply(payload) {
    if (this.isReplied) return;
    this._isReplied = true;
    this.resolve(payload);
  }
  toPostMessage() {
    return {
      type: this.type,
      payload: this.params?.payload,
      requestId: this.requestId,
    };
  }
  get isReplied() {
    return this._isReplied;
  }
  static generateRequestId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
      /[xy]/g,
      function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 3) | 8;
        return v.toString(16);
      }
    );
  }
};

// overlay/Task.ts
var Task = class {
  constructor() {
    this.isResolved = false;
    this.promise = new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });
  }
  complete() {
    if (this.isResolved) return;
    this.isResolved = true;
    this.resolve(true);
  }
  fail(reason = 'Task failed') {
    if (this.isResolved) return;
    this.reject(reason);
  }
  ready() {
    return this.promise;
  }
};

// overlay/styleUtils.ts
function setStyles(htmlElement, styles) {
  for (const key in styles) {
    const value = styles[key];
    if (!value) continue;
    htmlElement.style[key] = value;
  }
}

// overlay/ChatOverlay.ts
var ChatOverlay = class {
  /**
   * Creates a ChatOverlay
   * @param root {HTMLElement | string} reference or selector to parent container where the iframe should be placed
   * @param options {ChatOverlayOptions} overlay options (incl. domain, hostDomain, theme, modelId, etc.)
   */
  constructor(root, options) {
    /**
     * Callback to post message event, contains mapping event to this.requests, mapping event to this.subscriptions
     * If event.data.type === '@DIAL_OVERLAY/READY' means that DIAL ready to receive message -> this.iframeInteraction.complete()
     * @param event {MessageEvent} post message event
     */
    this.process = (event) => {
      if (event.data.type === '@DIAL_OVERLAY/READY') {
        this.iframeInteraction.complete();
        return;
      }
      if (!event.data?.type) return;
      if (!event.data?.requestId) {
        this.processEvent(event.data.type, event.data?.payload);
        return;
      }
      for (const request of this.requests) {
        if (request.match(event.data.type, event.data.requestId)) {
          request.reply(event.data?.payload);
          break;
        }
      }
      this.requests = this.requests.filter((request) => !request.isReplied);
    };
    this.options = options;
    this.root = this.getRoot(root);
    this.requests = [];
    this.subscriptions = [];
    this.iframeInteraction = new Task();
    this.iframe = this.initIframe();
    this.loader = this.initLoader(
      options?.loaderStyles || {},
      options?.loaderClass
    );
    this.root.appendChild(this.loader);
    this.root.appendChild(this.iframe);
    setStyles(this.root, { position: 'relative' });
    this.setOverlayOptions(options);
    window.addEventListener('message', this.process);
  }
  /**
   * Creates iframe add set initial options to it
   * @returns {HTMLIFrameElement} reference to iframe element
   */
  initIframe() {
    const iframe = document.createElement('iframe');
    iframe.src = this.options.domain;
    iframe.allow = 'clipboard-write';
    iframe.sandbox.add('allow-same-origin');
    iframe.sandbox.add('allow-scripts');
    iframe.sandbox.add('allow-modals');
    iframe.sandbox.add('allow-forms');
    iframe.sandbox.add('allow-popups');
    iframe.sandbox.add('allow-popups-to-escape-sandbox');
    iframe.style.height = '100%';
    iframe.style.width = '100%';
    iframe.style.border = 'none';
    return iframe;
  }
  /**
   * Creates loader and add styles
   * @returns {HTMLElement} reference to loader element
   */
  initLoader(styles, className) {
    const loader = document.createElement('div');
    loader.innerHTML = 'Loading...';
    if (className) {
      loader.className = className;
    }
    setStyles(loader, {
      position: 'absolute',
      background: 'white',
      left: '0',
      right: '0',
      top: '0',
      bottom: '0',
      zIndex: '2',
      ...styles,
    });
    return loader;
  }
  /**
   * Shows loader
   */
  showLoader() {
    setStyles(this.loader, {
      display: 'block',
    });
  }
  /**
   * Hides loader
   */
  hideLoader() {
    setStyles(this.loader, {
      display: 'none',
    });
  }
  /**
   * Displays if iframe ready to interact
   * @returns {Promise<boolean>} if the promise resolved -> iframe ready to interact
   */
  async ready() {
    return this.iframeInteraction.ready();
  }
  /**
   * If user provides reference to container ? returns the container : query the selector and return reference to container
   * @param {HTMLElement | string} root reference to parent container or selector where iframe should be placed
   * @returns {HTMLElement} reference to container where iframe would be placed
   */
  getRoot(root) {
    if (typeof root === 'string') {
      const element = document.querySelector(root);
      if (!element) {
        throw new Error(
          `[ChatOverlay] There is no element with selector ${root} to append iframe`
        );
      }
      return element;
    }
    return root;
  }
  /**
   * Allows iframe to be in fullscreen mode
   */
  allowFullscreen() {
    this.iframe.allowFullscreen = true;
  }
  /**
   * Opens iframe in fullscreen mode
   */
  openFullscreen() {
    if (!this.iframe.requestFullscreen) {
      throw new Error(
        '[ChatOverlay] Fullscreen is not allowed. Allow it first'
      );
    }
    this.iframe.requestFullscreen();
  }
  /**
   * Going through all event callbacks and call it if eventType is the same as in subscription
   * @param eventType {string} Name of event that DIAL send
   * @param payload {unknown} Payload of event
   */
  processEvent(eventType, payload) {
    for (const subscription of this.subscriptions) {
      if (subscription.eventType === eventType) {
        subscription.callback(payload);
      }
    }
  }
  /**
   * Creates DeferredRequests, put into the this.requests
   * We don't put something into the this.requests until `this.ready()`
   * @param type Request name
   * @param payload Request payload
   * @returns {Promise<unknown>} Return promise with response payload when resolved
   */
  async send(type, payload) {
    await this.iframeInteraction.ready();
    if (!this.iframe.contentWindow) {
      throw new Error(
        '[ChatOverlay] There is no content window to send requests'
      );
    }
    const request = new DeferredRequest(type, {
      payload,
      timeout: this.options?.requestTimeout,
    });
    this.requests.push(request);
    this.iframe.contentWindow.postMessage(request.toPostMessage(), '*');
    return request.promise;
  }
  /**
   * Add callback with eventType to this.subscriptions
   * @param eventType Event type
   * @param callback Callback which should associated to the event type
   * @returns {() => void} Callback which removes event callback from the this.requests
   */
  subscribe(eventType, callback) {
    this.subscriptions.push({ eventType, callback });
    return () => {
      this.subscriptions = this.subscriptions.filter(
        (sub) => sub.callback !== callback
      );
    };
  }
  /**
   * Get messages from first selected conversation
   */
  async getMessages() {
    const messages = await this.send('@DIAL_OVERLAY/GET_MESSAGES');
    return messages;
  }
  /**
   * Send message into the first selected conversation
   * @param content {string} text of message that should be sent to the chat
   */
  async sendMessage(content) {
    await this.send('@DIAL_OVERLAY/SEND_MESSAGE', { content });
  }
  /**
   * Set systemPrompt into the first selected conversation
   * @param systemPrompt {string} text content of system prompt
   */
  async setSystemPrompt(systemPrompt) {
    await this.send('@DIAL_OVERLAY/SET_SYSTEM_PROMPT', { systemPrompt });
  }
  /**
   * Send to DIAL overlay options (modelId, hostDomain, etc.)
   * @param options {ChatOverlayOptions} Options that should be set into the DIAL
   */
  async setOverlayOptions(options) {
    this.showLoader();
    await this.send('@DIAL_OVERLAY/SET_OVERLAY_OPTIONS', options);
    this.hideLoader();
  }
  /**
   * Destroys ChatOverlay
   */
  destroy() {
    window.removeEventListener('message', this.process);
    this.iframeInteraction.fail('Chat Overlay destroyed');
    this.root.removeChild(this.iframe);
  }
};

// overlay/ChatOverlayManager.ts
var getPosition = () => {
  return {
    'left-bottom': {
      top: 'initial',
      bottom: '20px',
      left: '20px',
      right: 'initial',
      transform: `translate(-${window.innerWidth * 2}px, ${
        window.innerHeight * 2
      }px)`,
    },
    'left-top': {
      top: '20px',
      bottom: 'initial',
      left: '20px',
      right: 'initial',
      transform: `translate(-${window.innerWidth * 2}px, -${
        window.innerHeight * 2
      }px)`,
    },
    'right-top': {
      top: '20px',
      bottom: 'initial',
      left: 'initial',
      right: '20px',
      transform: `translate(${window.innerWidth * 2}px, -${
        window.innerHeight * 2
      }px)`,
    },
    'right-bottom': {
      top: 'initial',
      bottom: '20px',
      left: 'initial',
      right: '20px',
      transform: `translate(${window.innerWidth * 2}px, ${
        window.innerHeight * 2
      }px)`,
    },
  };
};
var defaultOverlayPlacementOptions = {
  width: '540px',
  height: '540px',
  zIndex: '5',
};
var ChatOverlayManager = class {
  /**
   * Creates a ChatOverlayManager
   */
  constructor() {
    this.overlays = [];
  }
  /**
   * Creates HTML Container and put ChatOverlay to it, saves to this.overlays
   * Received same options as ChatOverlay, but contains 'id' and settings how to place this overlay
   * @param options {ChatOverlayFullOptions} ChatOverlayOptions with `id` and settings how to place this overlay
   */
  createOverlay(options) {
    const container = document.createElement('div');
    const overlay = new ChatOverlay(container, options);
    if (options.allowFullscreen) {
      overlay.allowFullscreen();
    }
    this.overlays.push({ container, overlay, options, isHidden: false });
    document.body.appendChild(container);
    this.updateOverlay(options.id);
  }
  /**
   * Destroys overlay with specified id and removes from this.overlays
   * @param id {string} id of overlay that should be deleted
   */
  removeOverlay(id) {
    const { overlay, container } = this.getOverlay(id);
    overlay.destroy();
    this.overlays = this.overlays.filter(({ options }) => options.id !== id);
    document.body.removeChild(container);
  }
  /**
   * Shows overlay with specified id
   * @param id {string} id of overlay that should be shown
   */
  showOverlay(id) {
    const overlay = this.getOverlay(id);
    overlay.isHidden = false;
    overlay.container.style.display = 'block';
  }
  /**
   * Hides overlay with specified id
   * @param id {string} id of overlay that should be hidden
   */
  hideOverlay(id) {
    const overlay = this.getOverlay(id);
    overlay.isHidden = true;
    overlay.container.style.display = 'none';
  }
  /**
   * Checks the current viewport and updates position, styles if needed
   * @param id {string} id of overlay that should be updated
   */
  updateOverlay(id) {
    const { container, options, isHidden } = this.getOverlay(id);
    const mobileHeight = `${window.innerHeight}px`;
    const isMobileView = this.isMobileView();
    const position = getPosition()[options.position ?? 'right-bottom'];
    setStyles(container, {
      transition: 'transform 0.5s ease',
      position: 'fixed',
      top: isMobileView ? '0' : position.top,
      bottom: isMobileView ? '0' : position.bottom,
      left: isMobileView ? '0' : position.left,
      right: isMobileView ? '0' : position.right,
      transform: !isHidden
        ? container.style.transform
        : `scale(0.5) ${position.transform}`,
      zIndex: options.zIndex || defaultOverlayPlacementOptions.zIndex,
      width: isMobileView
        ? '100vw'
        : options.width || defaultOverlayPlacementOptions.width,
      height: isMobileView
        ? mobileHeight
        : options.height || defaultOverlayPlacementOptions.height,
    });
  }
  setSystemPrompt(id, systemPrompt) {
    const { overlay } = this.getOverlay(id);
    return overlay.setSystemPrompt(systemPrompt);
  }
  async getMessages(id) {
    const { overlay } = this.getOverlay(id);
    return overlay.getMessages();
  }
  async sendMessage(id, content) {
    const { overlay } = this.getOverlay(id);
    return overlay.sendMessage(content);
  }
  async setOverlayOptions(id, options) {
    const { overlay } = this.getOverlay(id);
    return overlay.setOverlayOptions(options);
  }
  subscribe(id, eventType, callback) {
    const { overlay } = this.getOverlay(id);
    return overlay.subscribe(eventType, callback);
  }
  /**
   * Get reference to overlay from this.overlay with specified id
   * Throws exception if there is no such overlay with specified id
   * @param id {string} id of overlay that should be returned
   * @returns {Overlay} reference to overlay with specified id
   */
  getOverlay(id) {
    const overlay = this.overlays.find(({ options }) => options.id === id);
    if (!overlay) throw new Error(`There is no overlay with ${id}`);
    return overlay;
  }
  /**
   * Checks that window has mobile view
   * @returns {boolean} Returns true if window has mobile view
   */
  isMobileView() {
    return (
      (window.matchMedia('(orientation:landscape)').matches &&
        window.matchMedia('(max-height: 550px)').matches) ||
      (window.matchMedia('(orientation:portrait)').matches &&
        window.matchMedia('(max-width: 550px)').matches)
    );
  }
};
export { ChatOverlay, ChatOverlayManager };
