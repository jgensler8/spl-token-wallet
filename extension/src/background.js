const responseHandlers = new Map();
let unlockedMnemonic = '';

function launchPopup(message, sender, sendResponse) {
  const searchParams = new URLSearchParams();
  searchParams.set('origin', sender.origin);
  searchParams.set('network', message.data.params.network);
  searchParams.set('request', JSON.stringify(message.data));

  // TODO consolidate popup dimensions
  chrome.windows.getLastFocused((focusedWindow) => {
    chrome.windows.create({
      url: 'index.html#' + searchParams.toString(),
      type: 'popup',
      width: 375,
      height: 600,
      top: focusedWindow.top,
      left: focusedWindow.left + (focusedWindow.width - 375),
      setSelfAsOpener: true,
      focused: true,
    });
  });

  responseHandlers.set(message.data.id, sendResponse);
}

function handleConnect(message, sender, sendResponse) {
  console.log("connect")
  chrome.storage.local.get('connectedWallets', (result) => {
    const connectedWallet = (result.connectedWallets || {})[sender.origin];
    if (!connectedWallet) {
      launchPopup(message, sender, sendResponse);
    } else {
      sendResponse({
        method: 'connected',
        params: {
          publicKey: connectedWallet.publicKey,
          autoApprove: connectedWallet.autoApprove,
        },
        id: message.data.id,
      });
    }
  });
}

function handleDisconnect(message, sender, sendResponse) {
  chrome.storage.local.get('connectedWallets', (result) => {
    delete result.connectedWallets[sender.origin];
    chrome.storage.local.set(
      { connectedWallets: result.connectedWallets },
      () => sendResponse({ method: 'disconnected', id: message.data.id }),
    );
  });
}

function handleConnectProvision(message, sender, sendResponse) {
  console.log("handling connectProvision")
  console.log(message)
  console.log(sender)
  launchPopup(message, sender, sendResponse)
  // sendResponse({
  //   method: 'connect_provisioned',
  //   id: message.data.id,
  //   params: {
  //     accounts: ["hk1234", "vsd234"]
  //   }
  // })
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("onMesSAGE")
  if (message.channel === 'shallot_contentscript_background_channel') {
    if (message.data.method === 'connect') {
      handleConnect(message, sender, sendResponse);
    } else if (message.data.method === 'disconnect') {
      handleDisconnect(message, sender, sendResponse);
    } else if (message.data.method === 'connectProvision') {
      handleConnectProvision(message, sender, sendResponse);
    } else {
      launchPopup(message, sender, sendResponse);
    }
    // keeps response channel open
    return true;
  } else if (message.channel === 'shallot_extension_background_channel') {
    console.log("shallot_extension_background_channel")
    console.log(message);
    const responseHandler = responseHandlers.get(message.data.id);
    responseHandlers.delete(message.data.id);
    responseHandler(message.data);
  } else if (message.channel === 'shallot_extension_mnemonic_channel') {
    if (message.method === 'set') {
      unlockedMnemonic = message.data;
    } else if (message.method === 'get') {
      sendResponse(unlockedMnemonic);
    }
  }
});
