import { LightningElement, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { NavigationMixin } from 'lightning/navigation';
import registerUser from '@salesforce/apex/UserDataController.registerUser';

export default class UserRegistrationCustom extends NavigationMixin(LightningElement) {
    @track userDetails = {
        firstName: '',
        lastName: '',
        email: '',
        password: ''
    };
    @track recordTypeName = 'Customer';

    handleRecordTypeChange(event) {
        this.recordTypeName = event.target.value;
    }

    handleInputChange(event) {
        const { name, value } = event.target;
        this.userDetails = { ...this.userDetails, [name]: value };
    }

    handleRegister() {
        // Basic validation
        if (!this.userDetails.email || !this.userDetails.password || !this.userDetails.firstName) {
            this.showToast('Error', 'Please fill in all required fields.', 'error');
            return;
        }

        registerUser({
            firstName: this.userDetails.firstName,
            lastName: this.userDetails.lastName,
            email: this.userDetails.email,
            password: this.userDetails.password,
            recordTypeName: this.recordTypeName
        })
        .then(result => {
            this.showToast('Success', 'Registration successful! Please login.', 'success');
            // Navigate to the login page
            this[NavigationMixin.Navigate]({
                type: 'comm__namedPage',
                attributes: {
                    name: 'SignIn' // Make sure you have a page with API Name 'Login'
                },
            });
        })
        .catch(error => {
            this.showToast('Error', error.body.message, 'error');
        });
    }

    showToast(title, message, variant) {
        const event = new ShowToastEvent({ title, message, variant });
        this.dispatchEvent(event);
    }
}