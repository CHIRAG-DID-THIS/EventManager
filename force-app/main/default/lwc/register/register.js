import { LightningElement, track } from 'lwc';
import registerUser from '@salesforce/apex/AuthController.registerUser';

export default class Register extends LightningElement {
    @track userType = 'User';
    @track firstName = '';
    @track lastName = '';
    @track email = '';
    @track contactNo = '';
    @track password = '';
    @track vendorName = '';

    get userTypeOptions() {
        return [
            { label: 'User', value: 'User' },
            { label: 'Vendor', value: 'Vendor' }
        ];
    }

    get isVendor() {
        return this.userType === 'Vendor';
    }

    handleUserTypeChange(event) {
        this.userType = event.detail.value;
    }

    handleChange(event) {
        const field = event.target.dataset.id;
        this[field] = event.target.value;
    }

    handleRegister() {
        registerUser({
            userType: this.userType,
            firstName: this.firstName,
            lastName: this.lastName,
            email: this.email,
            contactNo: this.contactNo,
            // password: this.password,
            vendorName: this.vendorName
        })
        .then(result => {
            alert('Registration successful!');
        })
        .catch(error => {
            console.error(error);
            alert('Error during registration');
        });
    }
}