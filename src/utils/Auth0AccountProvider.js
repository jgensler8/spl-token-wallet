import { useAuth0 } from '@auth0/auth0-react';
import { createContext, useContext, useCallback, useEffect, useState } from 'react';
import { generateMnemonicAndSeed } from './wallet-seed';

// constant
function defaultEncryptionParams() {
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    return {
        name: "AES-GCM",
        length: 256,
        // TODO: this should be unique (or just switch to RSA)
        iv: iv,
    };
}

// get user details
async function getOrDefaultAuth0Account(domain, user, getAccessTokenSilently, key) {
    if (key === undefined) {
        return undefined;
    }
    // fetch metadata from Auth0
    const accessToken = await getAccessTokenSilently({
        audience: `https://${domain}/api/v2/`,
        scope: "read:current_user update:current_user_metadata",
    })
    const metadataResponse = await fetch(`https://${domain}/api/v2/users/${user.sub}`, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });
    const { user_metadata } = await metadataResponse.json();

    // decrypt existing metadata or construct a new one
    if (user_metadata && user_metadata.encrypted && user_metadata.encrypted.length > 0) {
        let encryption_params = defaultEncryptionParams();
        encryption_params.iv = Uint8Array.from(user_metadata.iv);
        const encrypted = Uint8Array.from(user_metadata.encrypted)
        const array = encrypted;
        const decrypted = await window.crypto.subtle.decrypt(encryption_params, key, array);
        const decoder = new TextDecoder();
        const decoded = decoder.decode(decrypted);
        const account = JSON.parse(decoded);
        console.log(account);
        return account;
    } else {
        let mnemonic_seed = await generateMnemonicAndSeed();
        let tree = {
            ...mnemonic_seed,
            names: ["default"],
        }
        return [tree];
    }
}

// set user details
async function setAuth0Account(domain, user, getAccessTokenSilently, key, newState) {
    // generate another access token
    const accessToken = await getAccessTokenSilently({
        audience: `https://${domain}/api/v2/`,
        scope: "read:current_user update:current_user_metadata",
    })

    // persist to network
    const encoder = new TextEncoder();
    const array = encoder.encode(JSON.stringify(newState));
    const encryption_params = defaultEncryptionParams();
    const encrypted = await window.crypto.subtle.encrypt(encryption_params, key, array);
    await fetch(`https://${domain}/api/v2/users/${user.sub}`, {
        method: "PATCH",
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': "application/json",
        },
        body: JSON.stringify({
            "user_metadata": {
                "iv": Array.from(encryption_params.iv),
                "encrypted": Array.from(new Uint8Array(encrypted))
            },
        })
    });
}

const Auth0AccountContext = createContext({});

// provider
export const Auth0AccountProvider = ({ children }) => {
    const [auth0Lib, setAuth0Lib] = useState(undefined)
    /*
    account: {
        mnemonic: string,
        seed: string,
        names: [string]
    }
    */
    const [account, setLocalAccount] = useState(undefined);
    const [key, setLocalKey] = useState(undefined)

    const domain = 'authwallet.us.auth0.com';

    const updateAccount = useCallback(
        (newAccount) => {
            console.log(newAccount)
            console.log(auth0Lib)
            console.log(key)
            if (setAuth0Lib !== undefined && key !== undefined) {
                let merged = {
                    ...account,
                    ...newAccount,
                }
                console.log(merged)
                // store remote
                setAuth0Account(domain, auth0Lib.user, auth0Lib.getAccessTokenSilently, key, merged)
                    .then(() => {
                        // update locally
                        setLocalAccount(merged)
                    })
            }
        },
        [domain, auth0Lib, account, key]
    );

    useEffect(() => {
        if (account === undefined && setAuth0Lib !== undefined && key !== undefined) {
            getOrDefaultAuth0Account(domain, auth0Lib.user, auth0Lib.getAccessTokenSilently, key)
                .then(account => updateAccount(account))
        }
    }, [domain, auth0Lib, account, key, updateAccount])

    const setKey = (key) => {
        setLocalKey(key)
    }

    const value = { setAuth0Lib, account, updateAccount, key, setKey };
    return (
        <Auth0AccountContext.Provider value={value}>
            {children}
        </Auth0AccountContext.Provider>
    )
}

// consumer
export const useAuth0Account = () => {
    const context = useContext(Auth0AccountContext);
    if (context === undefined) {
        throw new Error("useAuth0Account must be used within a Auth0AccoutProvider");
    }
    return context;
}