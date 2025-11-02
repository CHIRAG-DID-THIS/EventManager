import { LightningElement, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { NavigationMixin } from 'lightning/navigation';
import loginUser from '@salesforce/apex/UserDataController.loginUser';

export default class UserLoginCustom extends NavigationMixin(LightningElement) {
    @track credentials = { email: '', password: '' };

    handleInputChange(event) {
        const { name, value } = event.target;
        this.credentials = { ...this.credentials, [name]: value };
    }

    handleLogin() {
        loginUser({ email: this.credentials.email, password: this.credentials.password })
            .then(result => {
                if (result) {
                    // No longer using sessionStorage
                    // We now pass the user's ID directly to the navigation function
                    if (result.RecordType.Name === 'Customer') {
                        this.navigateToPage('Home', result.Id);
                    } else if (result.RecordType.Name === 'Vendor') {
                        this.navigateToPage('VendorDashboard_c', result.Id);
                    } else {
                        this.navigateToPage('Home', null);
                    }
                } else {
                    this.showToast('Error', 'Invalid email or password.', 'error');
                }
            })
            .catch(error => {
                this.showToast('Login Error', 'An error occurred during login.', 'error');
            });
    }

    // UPDATED: This function now adds the recordId to the URL's 'state'
    navigateToPage(pageName, recordId) {
        this[NavigationMixin.Navigate]({
            type: 'comm__namedPage',
            attributes: {
                name: 'VendorDashboard_c'
            },
            state: {
                // This adds "?c__userDataId=a00..." to the end of the URL
                c__userDataId: recordId
            }
        });
    }

    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }
}