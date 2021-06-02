window.shallot = {
  postMessage: (message) => {
    const listener = (event) => {
      if (event.detail.id === message.id) {
        window.removeEventListener('shallot_contentscript_message', listener);
        window.postMessage(event.detail);
      }
    };
    window.addEventListener('shallot_contentscript_message', listener);

    window.dispatchEvent(
      new CustomEvent('shallot_injected_script_message', { detail: message }),
    );
  },
};
