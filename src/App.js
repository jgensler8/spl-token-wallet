import React, { Suspense } from 'react';
import CssBaseline from '@material-ui/core/CssBaseline';
import useMediaQuery from '@material-ui/core/useMediaQuery';
import {
  ThemeProvider,
  unstable_createMuiStrictModeTheme as createMuiTheme,
} from '@material-ui/core/styles';
import blue from '@material-ui/core/colors/blue';
import NavigationFrame from './components/NavigationFrame';
import { ConnectionProvider } from './utils/connection';
import WalletPage from './pages/WalletPage';
import { useWallet, WalletProvider } from './utils/wallet';
import { ConnectedWalletsProvider } from './utils/connected-wallets';
import { TokenRegistryProvider } from './utils/tokens/names';
import LoadingIndicator from './components/LoadingIndicator';
import { SnackbarProvider } from 'notistack';
import PopupPage from './pages/PopupPage';
import LoginPage from './pages/LoginPage';
import ConnectionsPage from './pages/ConnectionsPage';
import { isExtension } from './utils/utils';
import { PageProvider, usePage } from './utils/page';
import { Auth0Provider } from "@auth0/auth0-react";

export default function App() {
  // TODO: add toggle for dark mode
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  const theme = React.useMemo(
    () =>
      createMuiTheme({
        palette: {
          type: prefersDarkMode ? 'dark' : 'light',
          primary: blue,
        },
        // TODO consolidate popup dimensions
        ext: '450',
      }),
    [prefersDarkMode],
  );

  // Disallow rendering inside an iframe to prevent clickjacking.
  if (window.self !== window.top) {
    return null;
  }

  let appElement = (
    <NavigationFrame>
      <Suspense fallback={<LoadingIndicator />}>
        <PageContents />
      </Suspense>
    </NavigationFrame>
  );

  if (isExtension) {
    appElement = (
      <ConnectedWalletsProvider>
        <PageProvider>{appElement}</PageProvider>
      </ConnectedWalletsProvider>
    );
  }

  return (
    <Suspense fallback={<LoadingIndicator />}>
      <Auth0Provider
        domain="authwallet.us.auth0.com"
        clientId="3RaU8zdKCzpsKApaTDvFhP6ipL80KYcC"
        redirectUri={window.location.origin + "/index.html"}
        audience="https://authwallet.us.auth0.com/api/v2/"
        scope="read:current_user update:current_user_metadata"
      >
        <ThemeProvider theme={theme}>
          <CssBaseline />

          <ConnectionProvider>
            <TokenRegistryProvider>
              <SnackbarProvider maxSnack={5} autoHideDuration={8000}>
                <WalletProvider>{appElement}</WalletProvider>
              </SnackbarProvider>
            </TokenRegistryProvider>
          </ConnectionProvider>
        </ThemeProvider>
      </Auth0Provider>
    </Suspense>
  );
}

function PageContents() {
  const wallet = useWallet();
  const [page] = usePage();
  if (!wallet) {
    return <LoginPage />;
  }
  if (window.opener) {
    return <PopupPage opener={window.opener} />;
  }
  if (page === 'wallet') {
    return <WalletPage />;
  } else if (page === 'connections') {
    return <ConnectionsPage />;
  }
}
