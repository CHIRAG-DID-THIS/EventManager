import { LightningElement, track, wire, api } from 'lwc';
import { createRecord } from 'lightning/uiRecordApi';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { NavigationMixin } from 'lightning/navigation';
import { CurrentPageReference } from 'lightning/navigation';

// Import Salesforce schema (Note: EventComapny__c has a typo in the actual object name)
import EVENT_COMPANY_OBJECT from '@salesforce/schema/EventComapny__c';
import COMPANY_NAME_FIELD from '@salesforce/schema/EventComapny__c.Company_Name__c';
import REG_NO_FIELD from '@salesforce/schema/EventComapny__c.CompanyRegNo__c';
import EVENT_TYPE_FIELD from '@salesforce/schema/EventComapny__c.EventType__c';
import PHONE_FIELD from '@salesforce/schema/EventComapny__c.Phone__c';
import UNAVAILABLE_FIELD from '@salesforce/schema/EventComapny__c.Unavailable__c';
import USER_DATA_FIELD from '@salesforce/schema/EventComapny__c.Userdata__c';
import CITY_FIELD from '@salesforce/schema/EventComapny__c.City__c';
import BANKING_FIELD from '@salesforce/schema/EventComapny__c.BankingInfo__c';
import ADDRESS_FIELD from '@salesforce/schema/EventComapny__c.Address__c';
import ABOUT_FIELD from '@salesforce/schema/EventComapny__c.About__c';

export default class CompanyRegistration extends NavigationMixin(LightningElement) {
    @track isLoading = false;
    @api userDataId = '';
    @track companyData = {
        companyName: '',
        regNo: '',
        eventType: '',
        phone: '',
        city: '',
        bankingInfo: '',
        address: '',
        about: ''
    };

    // Event Type Options
    eventTypeOptions = [
        { label: 'Wedding', value: 'Wedding' },
        { label: 'Corporate Event', value: 'Corporate Event' },
        { label: 'Birthday Party', value: 'Birthday Party' },
        { label: 'Anniversary', value: 'Anniversary' },
        { label: 'Small Gathering', value: 'Small Gathering' },
        { label: 'Conference', value: 'Conference' },
        { label: 'Workshop', value: 'Workshop' }
    ];

    // Wire to get current page reference for URL parameters
    @wire(CurrentPageReference)
    getStateParameters(currentPageReference) {
        if (currentPageReference) {
            this.userDataId = currentPageReference.state?.userId || null;
            console.log('UserData ID from URL:', this.userDataId);
            
            if (this.userDataId) {
                console.log('UserData ID prefix:', this.userDataId.substring(0, 3));
                // Validate that it's a proper Salesforce ID
                if (this.userDataId.length !== 18 && this.userDataId.length !== 15) {
                    console.error('Invalid UserData ID format:', this.userDataId);
                    this.showToast('Error', 'Invalid User Data ID format. Please try again.', 'error');
                }
            } else {
                console.warn('No userId parameter found in URL');
            }
        }
    }

    // Handle input changes
    handleInputChange(event) {
        const field = event.target.dataset.field;
        const value = event.target.value;
        
        this.companyData = {
            ...this.companyData,
            [field]: value
        };
        
        console.log(`Updated ${field}:`, value);
    }

    // Handle form submission
    handleSubmit(event) {
        event.preventDefault();
        
        if (!this.validateForm()) {
            return;
        }

        this.isLoading = true;
        this.createEventCompany();
    }

    // Validate form data
    validateForm() {
        // Check required fields
        if (!this.companyData.companyName) {
            this.showToast('Error', 'Company Name is required', 'error');
            return false;
        }
        
        if (!this.companyData.regNo) {
            this.showToast('Error', 'Company Registration Number is required', 'error');
            return false;
        }
        
        if (!this.companyData.phone) {
            this.showToast('Error', 'Phone number is required', 'error');
            return false;
        }
        
        if (!this.userDataId) {
            this.showToast('Error', 'User Data ID is missing. Please try again.', 'error');
            return false;
        }

        return true;
    }

    // Create EventCompany record
    createEventCompany() {
        // Validate userDataId before proceeding
        if (!this.userDataId) {
            console.error('UserDataId is missing');
            this.showToast('Error', 'User data is missing. Please try logging in again.', 'error');
            return;
        }

        const fields = {};
        
        // Map form data to Salesforce fields
        fields[COMPANY_NAME_FIELD.fieldApiName] = this.companyData.companyName;
        fields[REG_NO_FIELD.fieldApiName] = this.companyData.regNo;
        // For Multi-Select picklist, ensure the value is properly formatted
        fields[EVENT_TYPE_FIELD.fieldApiName] = this.companyData.eventType;
        fields[PHONE_FIELD.fieldApiName] = this.companyData.phone;
        fields[CITY_FIELD.fieldApiName] = this.companyData.city;
        fields[BANKING_FIELD.fieldApiName] = this.companyData.bankingInfo;
        fields[ADDRESS_FIELD.fieldApiName] = this.companyData.address;
        fields[ABOUT_FIELD.fieldApiName] = this.companyData.about;
        fields[UNAVAILABLE_FIELD.fieldApiName] = false; // Default to available
        fields[USER_DATA_FIELD.fieldApiName] = this.userDataId;

        console.log('Creating EventComapny with fields:', JSON.stringify(fields));
        console.log('UserDataId being used:', this.userDataId);
        console.log('Field API names:', {
            companyName: COMPANY_NAME_FIELD.fieldApiName,
            regNo: REG_NO_FIELD.fieldApiName,
            eventType: EVENT_TYPE_FIELD.fieldApiName,
            phone: PHONE_FIELD.fieldApiName,
            city: CITY_FIELD.fieldApiName,
            banking: BANKING_FIELD.fieldApiName,
            address: ADDRESS_FIELD.fieldApiName,
            about: ABOUT_FIELD.fieldApiName,
            unavailable: UNAVAILABLE_FIELD.fieldApiName,
            userData: USER_DATA_FIELD.fieldApiName
        });

        const recordInput = {
            apiName: EVENT_COMPANY_OBJECT.objectApiName,
            fields: fields
        };

        createRecord(recordInput)
            .then(result => {
                console.log('EventCompany created successfully:', result.id);
                this.showToast('Success', 'Company registration completed successfully!', 'success');
                
                // Reset form
                this.resetForm();
                
                // Optionally redirect to venues page or dashboard
                this.redirectToVenues(result.id);
            })
            .catch(error => {
                console.error('Error creating EventCompany:', error);
                console.error('Error details:', JSON.stringify(error));
                if (error.body && error.body.fieldErrors) {
                    console.error('Field errors:', JSON.stringify(error.body.fieldErrors));
                }
                if (error.body && error.body.pageErrors) {
                    console.error('Page errors:', JSON.stringify(error.body.pageErrors));
                }
                this.handleError(error);
            })
            .finally(() => {
                this.isLoading = false;
            });
    }

    // Reset form data
    resetForm() {
        this.companyData = {
            companyName: '',
            regNo: '',
            eventType: '',
            phone: '',
            city: '',
            bankingInfo: '',
            address: '',
            about: ''
        };
    }

    // Handle errors
    handleError(error) {
        let errorMessage = 'An error occurred while creating the company record.';
        
        if (error.body) {
            if (error.body.message) {
                errorMessage = error.body.message;
            } else if (error.body.fieldErrors) {
                const fieldErrors = Object.values(error.body.fieldErrors).flat();
                errorMessage = fieldErrors.length > 0 ? fieldErrors[0].message : errorMessage;
            } else if (error.body.pageErrors && error.body.pageErrors.length > 0) {
                errorMessage = error.body.pageErrors[0].message;
            }
        }
        
        console.error('Detailed error:', error);
        this.showToast('Error', errorMessage, 'error');
    }

    // Redirect to venues page
    redirectToVenues(companyId) {
        // Navigate to venues page with company ID
        const venuesUrl = `/s/venues?companyId=${companyId}`;
        console.log('Redirecting to:', venuesUrl);
        window.location.href = venuesUrl;
    }

    // Show toast message
    showToast(title, message, variant) {
        this.dispatchEvent(
            new ShowToastEvent({
                title: title,
                message: message,
                variant: variant
            })
        );
    }

    // Getters for template
    get isFormDisabled() {
        return this.isLoading;
    }
}