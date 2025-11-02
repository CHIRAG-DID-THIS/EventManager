import { LightningElement, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import login from '@salesforce/apex/RegistrationController.login';
import registerUser from '@salesforce/apex/RegistrationController.registerUser';
import createEventCompany from '@salesforce/apex/RegistrationController.createEventCompany';

export default class UserRegistration extends LightningElement {
    // View control
    @track isLoginView = true;
    @track isRegisterView = false;
    @track isLoading = false;

    // --- LOGIN PROPERTIES ---
    @track username = '';
    @track password = '';

    // --- REGISTRATION PROPERTIES ---
    @track isStepOne = true;
    @track isStepTwo = false;
    @track isStepThree = false;
    @track userType = '';
    @track regFirstName = '';
    @track regLastName = '';
    @track regEmail = '';
    @track contactNo = '';
    @track vendorName = '';
    @track regPassword = '';
    @track confirmPassword = '';
    @track newUserDataId = '';

    // --- COMPANY REGISTRATION PROPERTIES ---
    @track company = {};
    @track eventTypeOptions = [
        { label: 'Birthday', value: 'Birthday' }, { label: 'Corporate', value: 'Corporate' },
        { label: 'Small Gathering', value: 'Small Gathering' }, { label: 'Wedding', value: 'Wedding' },
    ];
    
    userTypeOptions = [ { label: 'Customer', value: 'Customer' }, { label: 'Vendor', value: 'Vendor' }];
    get isVendor() { return this.userType === 'Vendor'; }
    get isNextDisabled() { return !this.userType; }

    // --- VIEW NAVIGATION & INPUT ---
    navigateToRegister(event) { event.preventDefault(); this.isLoginView = false; this.isRegisterView = true; }
    navigateToLogin(event) { event.preventDefault(); this.isLoginView = true; this.isRegisterView = false; this.isStepOne = true; this.isStepTwo = false; this.isStepThree = false; }
    handleInputChange(event) { this[event.target.name] = event.target.value; }

    // --- LOGIN LOGIC ---
    handleLogin() {
        if (!this.username || !this.password) { this.showToast('Error', 'Please enter a username and password.', 'error'); return; }
        this.isLoading = true;
        login({ username: this.username, password: this.password })
            .then(result => {
                if (result && result.startsWith('login_success:')) {
                    const parts = result.split(':'); // e.g., login_success:userType:ID
                    const userType = parts[1];
                    const recordId = parts[2];
                    
                    this.showToast('Success', 'Login Successful!', 'success');

                    if (userType === 'vendor') {
                        // Vendor with existing company, navigate to dashboard
                        window.location.href = `/vendordashboard?companyId=${recordId}`;

                    } else if (userType === 'vendor_no_company') {
                        // **MODIFIED LOGIC**
                        // Vendor without company, show the company registration form (Step 3) within this component.
                        this.showToast('Action Required', 'Please complete your company profile to continue.', 'info');
                        
                        // Store the UserData Id needed for company creation
                        this.newUserDataId = recordId;
                        
                        // Switch the view to the company details form
                        this.isLoginView = false;
                        this.isRegisterView = true;
                        this.isStepOne = false;
                        this.isStepTwo = false;
                        this.isStepThree = true;

                    } else if (userType === 'customer') {
                        // Customer, navigate to a general page (e.g., home)
                        window.location.href = `/chome?userId=${recordId}`;
                    }
                } else {
                    this.showToast('Login Failed', result, 'error');
                }
            })
            .catch(error => this.showToast('Error', 'An unexpected error occurred.', 'error'))
            .finally(() => { this.isLoading = false; });
    }

    // --- REGISTRATION LOGIC ---
    handleNext() { if (this.userType) { this.isStepOne = false; this.isStepTwo = true; this.isStepThree = false; } }
    handleBack() { this.isStepOne = true; this.isStepTwo = false; this.isStepThree = false; }
    
    handleRegister() {
        if (!this.validateRegistrationInput()) return;
        this.isLoading = true;
        const firstNameForApex = this.isVendor ? this.vendorName : this.regFirstName;
        const lastNameForApex = this.isVendor ? '(Vendor)' : this.regLastName;

        registerUser({
            firstName: firstNameForApex, lastName: lastNameForApex, email: this.regEmail,
            password: this.regPassword, recordTypeName: this.userType,
            contactNo: this.contactNo, vendorName: this.vendorName
        }).then(result => {
            if (result.startsWith('vendor_success:')) {
                this.newUserDataId = result.split(':')[1];
                this.showToast('Success', 'User profile created. Please complete your company profile.', 'success');
                this.isStepOne = false; this.isStepTwo = false; this.isStepThree = true;
            } else if (result === 'success') {
                this.showToast('Success', 'Registration complete! You may now log in.', 'success');
                this.navigateToLogin(new CustomEvent('fake'));
            } else {
                this.showToast('Registration Error', result, 'error');
            }
        }).catch(error => this.showToast('System Error', error.body.message, 'error'))
          .finally(() => { this.isLoading = false; });
    }

    validateRegistrationInput() {
        if (this.regPassword !== this.confirmPassword) { this.showToast('Error', 'Passwords do not match', 'error'); return false; }
        if (this.isVendor) {
            if (!this.vendorName || !this.contactNo || !this.regEmail || !this.regPassword) { this.showToast('Error', 'Please fill in all required fields.', 'error'); return false; }
        } else {
            if (!this.regFirstName || !this.regLastName || !this.regEmail || !this.regPassword) { this.showToast('Error', 'Please fill in all required fields.', 'error'); return false; }
        }
        return true;
    }

    // --- COMPANY REGISTRATION LOGIC ---
    handleCompanyChange(event) {
        const field = event.target.dataset.field || event.target.name;
        const value = (field === 'EventType__c') ? event.detail.value.join(';') : event.target.value;
        this.company = { ...this.company, [field]: value };
    }

    handleCompanySubmit() {
        this.isLoading = true;
        this.company.Userdata__c = this.newUserDataId;
        createEventCompany({ companyRecord: this.company })
            .then(result => {
                if (result.startsWith('success:')) {
                    const companyId = result.split(':')[1];
                    this.showToast('Success', 'Company profile created! Redirecting to your dashboard.', 'success');
                    // Navigate to dashboard with the new company ID
                    window.location.href = `/vendordashboard?companyId=${companyId}`;
                } else {
                    this.showToast('Error', result, 'error');
                }
            })
            .catch(error => this.showToast('System Error', error.body.message, 'error'))
            .finally(() => { this.isLoading = false; });
    }

    showToast(title, message, variant) { this.dispatchEvent(new ShowToastEvent({ title, message, variant })); }
}