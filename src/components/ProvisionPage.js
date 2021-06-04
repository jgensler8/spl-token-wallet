import { useState } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useWalletSelector } from '../utils/wallet';
import { createStyles, makeStyles, Theme } from '@material-ui/core/styles';
import FormControl from '@material-ui/core/FormControl';
import InputLabel from '@material-ui/core/InputLabel';
import MenuItem from '@material-ui/core/MenuItem';
import Select from '@material-ui/core/Select';
import Button from '@material-ui/core/Button';

type AnnotatedAccount = {
    name: string,
    key: PublicKey
}

type ProvisionResponse = {
    accounts: Array<AnnotatedAccount>
}

type ProvisionPageProps = {
    accounts: Array<string>,
    onProvision: (response: ProvisionResponse) => void
}

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    formControl: {
      margin: theme.spacing(2),
      minWidth: 500,
    },
    selectEmpty: {
      marginTop: theme.spacing(2),
      minWidth: 500,
    },
  }),
);

// AccountSelect is a dropdown of all accounts available
// onChange is called to send the selected value "up" to the parent component
function AccountSelector({ accountName, onChange }) {
    const styles = useStyles();
    const { accounts } = useWalletSelector();
    const [address, setAddress] = useState("");
    const [validationError, setValidationError] = useState(true);

    const _onChange = (e) => {
        if(e.target.value.length > 0) {
            setValidationError(false)
            setAddress(e.target.value)
            onChange(e.target.value)
        }
    }

    return <FormControl error={validationError}>
        <InputLabel id={accountName}>{accountName}</InputLabel>
        <Select
            required
            labelId={`${accountName}-label`}
            id={accountName}
            value={address}
            onChange={_onChange}
            className={styles.selectEmpty}
        >
            {
                accounts.map((account) => <MenuItem key={account.address} value={account.address.toString()}>{account.name.toString()}: {account.address.toString()}</MenuItem>)
            }
        </Select>
    </FormControl>
}

export default function ProvisionPage(props: ProvisionPageProps) {
    const styles = useStyles();
    const defaultState = {};
    props.accounts.map(accountName => defaultState[accountName] = "");
    const [accountMap, setAccountMap] = useState(defaultState);
    const [formComplete, setFormComplete] = useState(false);

    if (!props.accounts || props.accounts.length === 0) {
        return <>error: invalid accounts length</>
    }

    const onSubmit = (e) => {
        e.preventDefault();
        props.onProvision(accountMap);
    }

    const onChange = (accountName) => (accountAddress) => {
        accountMap[accountName] = accountAddress;
        setAccountMap(accountMap)
        // if all keys are set, form is complete
        for(const accountKey in accountMap) {
            if(accountMap[accountKey] === "") {
                return;
            }
        }
        setFormComplete(true)
    }

    return <form noValidate className={styles.formControl}>
        {
            props.accounts.map((accountName: string) => <AccountSelector key={accountName} accountName={accountName} onChange={onChange(accountName)} />)
        }
        <Button type="submit" onClick={onSubmit} disabled={!formComplete}>done provisioning</Button>
    </form>
}