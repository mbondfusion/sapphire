/**
 * Static class methods for handling creation of standard HTML elements
 */
class SapphireElements {

  /**
   * Create an HTML element for the specific selector
   *
   * @param {string} tag The HTML element to create (i.e., <input/>)
   * @param {string} id The "id" attribute of the HTML element
   * @param {string} name The "name" attribute of the HTML element
   * @returns The created element
   */
  static createElement(tag, id, name = null) {
    const element = $(tag).attr('id', id);
    if (name !== null) element.attr('name', name);

    return element;
  }

  /**
   * Create a button element
   *
   * @param {string} id The "id" attribute of the button
   * @param {string} name The "name" attribute of the button
   * @param {string} value The "value" attribute of the button
   * @param {string} type The "type" attribute of the button (default: "button")
   * @param {Array} classList A list of classes to add to the button
   * @returns The created button element
   */
  static button(id, name, value, type = 'button', classList) {
    const element = SapphireElements.createElement('<input/>', id, name)
      .attr('value', value)
      .attr('type', type);

    if (classList !== undefined && typeof classList === 'array') {
      classList.forEach(x => element.addClass(x));
    }
    return element;
  }

  /**
   * Create a checkbox element
   *
   * @param {string} id The "id" attribute of the checkbox
   * @param {string} name The "name" attribute of the checkbox
   * @param {Array} classList A list of classes to add to the checkbox
   * @returns The created checkbox element
   */
  static checkbox(id, name, classList) {
    const element = SapphireElements.createElement('<input/>', id, name)
      .attr('type', 'checkbox');

    if (classList !== undefined && typeof classList === 'array') {
      classList.forEach(x => element.addClass(x));
    }
    return element;
  }

  /**
   * Create the dialog
   *
   * @param {string} id The "id" attribute of the dialog
   * @param {string} title The text in the "title" of the dialog
   * @param {Array} classList A list of classes to add to the dialog
   * @returns The created dialog element
   */
  static dialog(id, title, classList) {
    // Create the title and content elements
    const titleElement = SapphireElements.title(`${id}__title`, title);
    const content = SapphireElements.createElement('<div/>', `${id}__content`)
      .addClass('sapphire-dialog__content');
    const element = SapphireElements.createElement('<dialog/>', id)
      .addClass('sapphire-dialog')
      .append(titleElement)
      .append(content);

    // Add any additional classes
    if (classList !== undefined && typeof classList === 'array') {
      classList.forEach(x => element.addClass(x));
    }

    // Make an accessor for the content element (to add further content, etc.)
    element.content = content;
    return element;
  }

  /**
   * Create the dialog title (centered)
   *
   * @param {string} id The "id" attribute of the title
   * @param {string} text The text value of the title
   * @param {Array} classList An optional list of additional classes
   * @returns The create dialog title element
   */
  static title(id, text, classList) {
    const element = SapphireElements.createElement(`<div>${text}</div>`, id)
      .addClass('sapphire-dialog__title');

    if (classList !== undefined && typeof classList === 'array') {
      classList.forEach(x => element.addClass(x));
    }

    return element;
  }
}

/**
 * The Sapphire Utilities class
 */
class SapphireUtils {

  constructor() {}

  /**
   * Return the group Id from the current location path or null
   */
  get currentGroupId() {
    if (!this.isGroupDetailsPage) return null;

    const pathParts = this.currentPath.split('/');
    return pathParts[pathParts.length - 1];
  }

  /**
   * Return the current location path
   */
  get currentPath() {
    return window.location.pathname;
  }

  /**
   * Return true/false if the current location is an Okta Admin console
   */
  get isAdminPage() {
    return window.location.hostname.match("-admin") !== null;
  }

  /**
   * Return true/false if the current location is on a Group details page
   */
  get isGroupDetailsPage() {
    return (
      this.isAdminPage &&
      this.currentPath.match('/admin/group/') !== null
    );
  }

  /**
   * Return true/false if the current location is on the Groups page
   */
  get isGroupPage() {
    return (
      this.isAdminPage &&
      this.currentPath.match('/admin/groups') !== null
    );
  }

  /**
   * Wait for the specified selector to appear in the DOM and
   * execute the callback with the retrieved element(s)
   *
   * @param {string} selector
   * @param {function} callback
   * @param {any} maxTimes
   */
  waitForElement(selector, callback, maxTimes = false) {
    // Attempt to retrieve the element(s) by provided selector
    const result = $(selector);

    if (result.length) {
        // Process callback with retrieved elements
        callback(result);
    } else {
        if (maxTimes === false || maxTimes > 0) {
            (maxTimes !== false) && maxTimes--;

            // Element not found, wait 500ms to check again
            setTimeout(() => {
                waitForElement(selector, callback);
            }, 500);
        }
    }
  }
}

/**
 * The Sapphire page controller parent class
 */
class PageController extends SapphireUtils {
  #overlay = null;
  #overlayVisibleFlag = false;
  #overlayAnim = null;
  #menu = null;
  #menuHotkeyState = null;
  #menuOpenFlag = false;
  #menuAnim = null;

  // Retrieve the Sapphire icon
  sapphireIcon48 = chrome.runtime.getURL("assets/Sapphire48.png");

  constructor() {
    super();

    this.#overlay = $('<div class="sapphire-overlay"/>')
      .attr('id', 'sapphire-overlay');

    // Attach the overlay to the page body
    this.#overlay.appendTo(document.body);

    this.createMenu();

    // Setup the GSAP animation timelines
    this.setupGSAPTimelines();

    // Setup hotkey bindings
    this.setupHotkeyBindings();
  }

  /**
   * Add a menu item to the current menu
   *
   * @param {Object} item The menu item to add to the current page menu
   * @param {Object} controller The page controller Object (execution context)
   *
   * The menu item object should contain the following keys:
   *   title - The text to display on the menu
   *   value - A value that is sent along with the event to the action handler
   *   action - A method to invoke when the menu item is clicked
   *            Should take the value argument: (value)
   *
   *  The menu item action handler is responsible for hiding the overlay.
   */
  addMenuItem(item, controller) {
    const menuItem = $(`<li>${item.title}</li>`)
      .addClass('sapphire-menu__item')
      .attr('value', item.value)
      .click((event) => {
        // Hide the menu and keep the page overlay
        this.hideMenu(true, () => {
          // Run the menu action handler
          if (item.action !== undefined && typeof item.action === 'function') {
            item.action.apply(controller, [item.value]);
          } else {
            console.error(`Invalid action for item: ${item.value}, returning`);
            this.hideOverlay();
          }
        });

        // Prevent default action(s)
        event.stopPropagation();
        event.preventDefault();
      });

    this.#menu.append(menuItem);
  }

  /**
   * Clear all menu items (empty the menu)
   */
  clearMenu() {
    this.#menu.empty();
  }

  /**
   * Create the Sapphire menu
   */
  createMenu() {
    // Create the Sapphire menu
    this.#menu = $('<ul />')
      .addClass('sapphire-menu__menu');
    const logo = $('<img />')
      .attr('id', 'sapphire-menu__logo')
      .attr('name', 'sapphire-menu__logo')
      .attr('title', 'Sapphire Menu Logo')
      .attr('src', this.sapphireIcon48)
      .addClass('sapphire-menu__logo');
    const menuContainer = $('<div />')
      .attr('id', 'sapphire-menu')
      .addClass('sapphire-menu')
      .append(logo)
      .append(this.#menu);
    this.#overlay.append(menuContainer);

    // Map the overlay hiding "click" event
    this.#overlay.click((event) => {
      // Throw away click events that propagate from child elements
      if (event.target.id !== 'sapphire-overlay') return;

      // Hide the menu and overlay
      this.hideMenu();

      // Prevent default on triggered action
      event.stopPropagation();
      event.preventDefault();
    });
  }

  /**
   * Return the current menu state
   */
  get isMenuOpen() {
    return this.#menuOpenFlag;
  }

  /**
   * Return the current overlay visible state
   */
  get isOverlayVisible() {
    return this.#overlayVisibleFlag;
  }

  /**
   * Process the menu hotkey trigger
   */
  processMenuHotkey() {
    if (this.#menuHotkeyState !== null) {
      // Menu hotkey already pressed once
      clearTimeout(this.#menuHotkeyState);
      this.#menuHotkeyState = null;

      if (!this.isMenuOpen) this.showMenu();
    } else {
      // Wait for second menu hotkey trigger
      this.#menuHotkeyState = setTimeout(() => {
        this.#menuHotkeyState = null;
      }, 500);
    }
  }

  /**
   * Setup the GSAP animation timelines
   */
  setupGSAPTimelines() {
    // Setup the GSAP animation timelines
    this.#overlayAnim = gsap.timeline(
      {
        defaults: {duration: 0.1},
        paused: true,
        onComplete: () => this.#overlayVisibleFlag = true,
        onReverseComplete: () => this.#overlayVisibleFlag = false
      }
    ).to('.sapphire-overlay', {opacity: 1, autoAlpha: 1});

    this.#menuAnim = gsap.timeline(
      {
        defaults: {duration: 0.1},
        paused: true,
        onComplete: () => this.#menuOpenFlag = true,
        onReverseComplete: () => this.#menuOpenFlag = false
      }
    ).to('.sapphire-menu', {opacity: 1, width: 80, height: 80, autoAlpha: 1})
      .to('.sapphire-menu__logo',
        {opacity: 1, width: 48, height: 48, autoAlpha: 1},
        "<+=0.1"
      ).to('.sapphire-menu__menu',
        {opacity: 1, top: 20, autoAlpha: 1},
        "<+=0.1"
      );
  }

  /**
   * Setup hotkey binding for the Sapphire extension
   */
  setupHotkeyBindings() {
    // Setup hotkey binding for any keys (keydown only)
    hotkeys('*', {keydown: true, keyup: false}, (event, handler) => {
      // Ensure that other keys cancel the menu trigger
      if (!event.code === "ShiftLeft" && this.#menuHotkeyState !== null) {
        // console.log('Clearing menu state (keydown)...');
        clearTimeout(this.#menuHotkeyState);
        this.#menuHotkeyState = null;
      }
    });

    // Setup hotkey binding for any keys (keyup only)
    hotkeys('*', {keydown: false, keyup: true}, (event, handler) => {
      // Cancel first menu hotkey trigger if another key is pressed
      // before the second trigger
      if (!event.code === "ShiftLeft" && this.#menuHotkeyState !== null) {
        // console.log('Clearing menu state (keyup)...');
        clearTimeout(this.#menuHotkeyState);;
        this.#menuHotkeyState = null;
      }

      // Setup menu hotkey trigger
      if (event.code === "ShiftLeft" && !this.isMenuOpen) {
        this.processMenuHotkey();

        // Prevent default on triggered action
        event.preventDefault();
      }

      // Setup menu close hotkey for ESC
      if (event.key === 'Escape' && this.isMenuOpen) {
        this.hideMenu();
      }
    });
  }

  /**
   * Show the specified dialog
   *
   * @param {HTMLElement} dialog The dialog element to show
   */
  showDialog(dialog) {
    // Add the dialog to the overlay and make it visible
    this.#overlay.append(dialog);

    // Ensure the overlay is visible
    this.showOverlay(() => {
      dialog[0].showModal();

      gsap.timeline({defaults: {duration: 0.1}})
        .to(dialog[0], {opacity: 1, 'margin-top': 110, autoAlpha: 1});
    });

    // Destroy the dialog when clicking on the overlay (executed only once)
    this.#overlay.on('click', (event) => {
      // Throw away click events that propagate from child elements
      if (event.target.id !== 'sapphire-overlay') return;

      console.log(event);

      // Hide the menu with overlay callback execution when done
      this.hideMenu(false, undefined, () => dialog.remove());

      // Remove the click event (one time execution)
      this.#overlay.off(event);

      // Prevent the default actions
      event.stopPropagation();
      event.preventDefault();
    });
  }

  /**
   * Show the Sapphire menu
   */
  showMenu() {
    this.#overlayAnim.play().then(() => this.#menuAnim.play());
  }

  /**
   * Hide the Sapphire menu. Optionally hiding the page overlay.
   *
   * @param {boolean} keepOverlay Flag to keep showing the overlay
   * @param {Function} menuCB Optional callback when menu is hidden
   * @param {Function} overlayCB Optional callback when page overlay is hidden
   */
  hideMenu(keepOverlay = false, menuCB, overlayCB) {
    this.#menuAnim.reverse().then(() => {
      if (menuCB !== undefined && typeof menuCB === 'function') menuCB();

      if (!keepOverlay) this.#overlayAnim.reverse().then(() => {
        if (overlayCB !== undefined && typeof overlayCB === 'function') {
          overlayCB();
        }
      });
    });
  }

  /**
   * Show the page overlay
   *
   * @param {Function} callback An optional callback when the overlay is visible
   */
  showOverlay(callback) {
    this.#overlayAnim.play().then(() => {
      if (callback !== undefined && typeof callback === 'function') {
        callback();
      }
    });
  }

  /**
   * Hide the page overlay with optional callback function
   *
   * @param {Function} callback Optional callback function
   */
  hideOverlay(callback) {
    this.#overlayAnim.reverse().then(() => {
      if (callback !== undefined && typeof callback === 'function') {
        callback();
      }
    });
  }
}

/**
 * Class for handling the "/admin/groups" page
 */
class GroupsController extends PageController {

  menuItems = [
    {
      'title': 'Compare Groups',
      'value': 'compare-groups',
      'action': this.actionHandler
    }
  ]

  constructor() {
    super();

    // Ensure we are on a group page
    if (this.isGroupPage) {
      this.initialize();
    }
  }

  initialize() {
    // Add the group page menu items
    this.menuItems.forEach((item) => this.addMenuItem(item, this));
  }

  // Compare group memberships
  compareGroups() {
    const dialog = SapphireElements.dialog(
      'compare-groups-dialog',
      'Compare Group Memberships',
      []
    );

    const closeBtn = SapphireElements.button(
      'dialog-close', 'dialog-close', 'Close'
    ).attr('type', 'button')
      .click((event) => {
        // TODO: Move this logic to a separate "closeDialog" method

        // Animate the dialog close and remove the dialog after
        gsap.timeline({defaults: {duration: 0.1}})
          .to(dialog[0], {opacity: 0, 'margin-top': 130, autoAlpha: 0})
          .then(() => {
            this.hideOverlay(() => dialog.remove());
          });

        // Prevent defaults
        event.stopPropagation();
        event.preventDefault();
      });

    dialog.content
      .append('<span>Select groups and then compare...</span>')
      .append(closeBtn);

    this.showDialog(dialog);
  }

  // Generic action handler for GroupsController menu items
  actionHandler(value) {
    if (value === 'compare-groups') {
      this.compareGroups();
    }
  }
}

/**
 * Class for handling the "/admin/group/{groupId}" page
 */
class GroupDetailsController extends PageController {

  constructor() {
    super();

    // Ensure we are on a group details page
    if (this.isGroupDetailsPage) {
      this.initialize();
    }
  }

  initialize() {}
}

/**
 * The main Sapphire class.
 */
class Sapphire extends SapphireUtils {

  pageController = null;

  constructor() {
    super();

    // Instantiate the controller for the current page
    if (this.isGroupPage) {
      this.pageController = new GroupsController();
    } else if (this.isGroupDetailsPage) {
      this.pageController = new GroupDetailsController();
    } else {
      // Default to generic page controller
      this.pageController = new PageController();
    }
  }
}
