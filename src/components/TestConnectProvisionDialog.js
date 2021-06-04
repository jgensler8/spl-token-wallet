import ProvisionPage from './ProvisionPage';
import DialogForm from './DialogForm';

export default function TestConnectProvisionDialog({ open, onClose }) {
    return (
        <DialogForm onClose={onClose} open={open} fullWidth>
            <ProvisionPage accounts={["payer", "data_account_1", "data_account_2"]} onProvision={(result) => console.log(result)}></ProvisionPage>
        </DialogForm>
    )
}
