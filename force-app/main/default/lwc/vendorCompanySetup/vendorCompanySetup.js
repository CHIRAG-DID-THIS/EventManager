// No changes needed to this file
import { LightningElement, wire, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import isSetupComplete from '@salesforce/apex/VendorDataController.isSetupComplete';
import completeCompanySetup from '@salesforce/apex/VendorDataController.completeCompanySetup';
import { refreshApex } from '@salesforce/apex';

export default class VendorCompanySetup extends LightningElement {
    @track companyName = '';
    @track companyPhone = '';
    @track isComplete = false;
    @track isLoading = true;
    wiredSetupResult;

    @wire(isSetupComplete)
    wiredIsSetupComplete(result) {
        this.wiredSetupResult = result;
        if (result.data !== undefined) {
            this.isComplete = result.data;
            this.isLoading = false;
        } else if (result.error) {
            this.showToast('Error', 'Could not verify vendor setup status.', 'error');
            this.isLoading = false;
        }
    }
    
    handleInputChange(event) {
        const field = event.target.dataset.id;
        if (field === 'companyName') { this.companyName = event.target.value; } 
        else if (field === 'companyPhone') { this.companyPhone = event.target.value; }
    }

    handleCompleteSetup() {
        if (!this.companyName) {
            this.showToast('Validation Error', 'Company Name is required.', 'error');
            return;
        }
        this.isLoading = true;
        completeCompanySetup({ 
            companyName: this.companyName, 
            companyPhone: this.companyPhone 
        }).then(result => {
            if (result === 'success') {
                this.showToast('Success', 'Your company profile has been created!', 'success');
                return refreshApex(this.wiredSetupResult);
            } else { this.showToast('Error', result, 'error'); }
        }).catch(error => {
            this.showToast('Error', 'An unexpected error occurred: ' + error.body.message, 'error');
        }).finally(() => { this.isLoading = false; });
    }

    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }
}