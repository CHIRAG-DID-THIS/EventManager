import { LightningElement, api, track, wire } from 'lwc';
import { createRecord } from 'lightning/uiRecordApi';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import USER_ID from '@salesforce/user/Id';
import { CurrentPageReference } from 'lightning/navigation'; 

// --- Step 1: EventComapny__c Field Imports (Note: Object name has typo) ---
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

// --- Step 2: Venue__c & Planner_Venue__c Field Imports (Using confirmed field names) ---
import VENUE_OBJECT from '@salesforce/schema/Venue__c';
import VENUE_NAME_FIELD from '@salesforce/schema/Venue__c.Name';
import VENUE_LOCATION_FIELD from '@salesforce/schema/Venue__c.Location__c'; 
import VENUE_DESCRIPTION_FIELD from '@salesforce/schema/Venue__c.Descriptions__c'; 

import PLANNER_VENUE_OBJECT from '@salesforce/schema/Planner_Venue__c';
// Note: EventComapny__c field name has typo in actual Salesforce object
import PV_PLANNER_FIELD from '@salesforce/schema/Planner_Venue__c.EventComapny__c'; 
import PV_VENUE_FIELD from '@salesforce/schema/Planner_Venue__c.Venue__c'; 

// ... (Rest of the class code remains the same)
// Dummy Data for Step 3 (Dependent Picklist) - NO CHANGE
const SERVICE_DEPENDENCY_MAP = {
    'Catering': [
        { label: 'Veg', value: 'Veg' },
        { label: 'Non-Veg', value: 'Non-Veg' }
    ],
    'Photography': [
        { label: 'Stills', value: 'Stills' },
        { label: 'Video', value: 'Video' }
    ],
    'Decorations': [
        { label: 'Floral', value: 'Floral' },
        { label: 'Lighting', value: 'Lighting' }
    ]
};

export default class VendorRegistrationForm extends LightningElement {
    // Stage Management
    @track currentStep = 1;
    @track eventCompanyRecordId;
    @track companyName;
    @track linkedVenues; 
    
    // Step 3 Service State
    @track serviceTypeOptions = [
        { label: 'Catering', value: 'Catering' },
        { label: 'Photography', value: 'Photography' },
        { label: 'Decorations', value: 'Decorations' }
    ];
    @track subServiceOptions = [];
    @track isSubServiceDisabled = true;
    @track selectedServiceType;
    @track selectedSubService;

    // Page reference to get URL parameters
    @track currentPageReference;
    @track userDataId; // UserData__c record ID from URL parameter

    // Wire method to get current page reference
    @wire(CurrentPageReference)
    getPageReference(pageRef) {
        this.currentPageReference = pageRef;
        if (pageRef && pageRef.state && pageRef.state.userId) {
            this.userDataId = pageRef.state.userId;
        }
    }

    // Alternative method to get userDataId from URL parameters
    connectedCallback() {
        // Get userId (which is actually userDataId) from URL parameters if available
        const urlParams = new URLSearchParams(window.location.search);
        const userIdParam = urlParams.get('userId');
        console.log('URL search params:', window.location.search);
        console.log('Extracted userId parameter:', userIdParam);
        if (userIdParam) {
            this.userDataId = userIdParam;
            console.log('Set userDataId to:', this.userDataId);
        } else {
            console.log('No userId parameter found in URL');
        }
    } 

    // --- Field Arrays for lightning-record-form (Step 1) ---
    eventCompanyFields = [
        COMPANY_NAME_FIELD, REG_NO_FIELD, EVENT_TYPE_FIELD, PHONE_FIELD, UNAVAILABLE_FIELD, 
        CITY_FIELD, BANKING_FIELD, ADDRESS_FIELD, ABOUT_FIELD, 
    ];

    // --- Field Arrays for lightning-record-form (Step 2: New Venue) ---
    // !!! IMPORTANT: Update the array to use the new corrected imports !!!
    venueFields = [
        VENUE_NAME_FIELD, VENUE_LOCATION_FIELD, VENUE_DESCRIPTION_FIELD // Corrected fields
    ];
    
    // ... (rest of the class implementation is the same as the last response) ...

    // --- Step Navigation Control ---
    get isStepOne() { return this.currentStep === 1; }
    get isStepTwo() { return this.currentStep === 2; }
    get isStepThree() { return this.currentStep === 3; }

    get stepOneClass() { return this.currentStep === 1 ? 'step-active slds-text-heading_medium' : 'slds-text-heading_small'; }
    get stepTwoClass() { return this.currentStep === 2 ? 'step-active slds-text-heading_medium' : 'slds-text-heading_small'; }
    get stepThreeClass() { return this.currentStep === 3 ? 'step-active slds-text-heading_medium' : 'slds-text-heading_small'; }

    // --- Step 1 Handlers (Company Details) ---
    handleCompanySubmit(event) {
        event.preventDefault(); 
        const fields = event.detail.fields;
        
        // Debug logging to identify the issue
        console.log('userDataId from URL:', this.userDataId);
        console.log('USER_ID fallback:', USER_ID);
        console.log('Final userDataId being used:', this.userDataId || USER_ID);
        
        // Validate userDataId format (should be 18-character Salesforce ID)
        const finalUserId = this.userDataId || USER_ID;
        if (!finalUserId || finalUserId.length !== 18) {
            console.error('Invalid UserData ID format:', finalUserId);
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error',
                    message: 'Invalid User Data ID. Please try registering again.',
                    variant: 'error'
                })
            );
            return;
        }
        
        // Additional debugging for the entity ID issue
        console.log('Entity ID being assigned to Userdata__c field:', finalUserId);
        console.log('Entity ID prefix (first 3 chars):', finalUserId.substring(0, 3));
        console.log('USER_DATA_FIELD.fieldApiName:', USER_DATA_FIELD.fieldApiName);
        console.log('All fields being submitted:', JSON.stringify(fields));
        
        // Use userDataId if available, otherwise fall back to current user ID
        fields[USER_DATA_FIELD.fieldApiName] = finalUserId; 
        console.log('Final fields with Userdata__c:', JSON.stringify(fields));
        this.template.querySelector('lightning-record-form').submit(fields);
    }
    
    handleCompanySuccess(event) {
        this.eventCompanyRecordId = event.detail.id;
        if (event.detail.fields[COMPANY_NAME_FIELD.fieldApiName]) {
            this.companyName = event.detail.fields[COMPANY_NAME_FIELD.fieldApiName].value;
        } else {
            this.companyName = 'New Event Company';
        }
        
        this.dispatchEvent(
            new ShowToastEvent({
                title: 'Success',
                message: 'Company Details Saved. Moving to Venue Setup.',
                variant: 'success'
            })
        );
        this.currentStep = 2; 
    }

    // --- Step 2 Handlers (Venue Details & Junction Object) ---
    saveNewVenue() {
        const venueForm = this.template.querySelector('#newVenueForm');
        if (venueForm) {
            venueForm.submit();
        }
    }

    handleNewVenueSuccess(event) {
        const newVenueId = event.detail.id;
        
        this.dispatchEvent(
            new ShowToastEvent({
                title: 'Success',
                message: 'Venue Created. Now Linking to Company...',
                variant: 'info'
            })
        );
        
        // Junction Object Creation (Planner_Venue__c) using LDS: createRecord
        const fields = {};
        fields[PV_PLANNER_FIELD.fieldApiName] = this.eventCompanyRecordId;
        fields[PV_VENUE_FIELD.fieldApiName] = newVenueId;
        
        const recordInput = { apiName: PLANNER_VENUE_OBJECT.objectApiName, fields };

        createRecord(recordInput)
            .then(() => {
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Success',
                        message: 'Venue Linked Successfully! Add another or proceed.',
                        variant: 'success'
                    })
                );
                this.template.querySelector('#newVenueForm').reset();
            })
            .catch(error => {
                this.handleError(error);
            });
    }

    // --- Step 3 Dependent Picklist Handlers (Dummy Data) ---
    handleServiceTypeChange(event) {
        this.selectedServiceType = event.detail.value;
        this.subServiceOptions = SERVICE_DEPENDENCY_MAP[this.selectedServiceType] || [];
        this.isSubServiceDisabled = this.subServiceOptions.length === 0;
        this.selectedSubService = null; 
    }

    handleSubServiceChange(event) {
        this.selectedSubService = event.detail.value;
    }

    // --- Navigation Handlers ---
    goToStepOne() { this.currentStep = 1; }
    
    goToStepTwo() {
        if (!this.eventCompanyRecordId) {
             this.dispatchEvent(new ShowToastEvent({title: 'Error', message: 'Please complete Step 1 first.', variant: 'error'}));
             return;
        }
        this.currentStep = 2;
    }

    goToStepThree() {
        if (!this.eventCompanyRecordId) {
            this.dispatchEvent(new ShowToastEvent({title: 'Error', message: 'Company record not found.', variant: 'error'}));
            return;
        }
        this.currentStep = 3;
    }
    
    // --- Step 3 Handler (Final Submission) ---
    handleSubmit() {
        this.dispatchEvent(
            new ShowToastEvent({
                title: 'Complete',
                message: 'Vendor Registration Submitted!',
                variant: 'success'
            })
        );
    }

    // --- Generic Error Handler ---
    handleError(error) {
        console.error('Full Error Object:', error);
        console.error('Error Message:', error.body?.message || error.message);
        console.error('Error Details:', error.body?.output?.errors || error.body?.fieldErrors);
        
        let errorMessage = 'An error occurred. Check console for details.';
        let errorTitle = 'Error creating record';
        
        // Check for specific access rights error
        if (error.body?.message && error.body.message.includes('insufficient access rights')) {
            errorTitle = 'Access Rights Error';
            errorMessage = error.body.message;
            
            // Extract entity ID from error message if present
            const entityIdMatch = error.body.message.match(/entity:\s*([a-zA-Z0-9]{15,18})/);
            if (entityIdMatch) {
                const entityId = entityIdMatch[1];
                console.error('Problematic Entity ID:', entityId);
                console.error('Entity ID prefix:', entityId.substring(0, 3));
                console.error('Current userDataId:', this.userDataId);
                console.error('Current USER_ID:', USER_ID);
                
                errorMessage += `\n\nDebugging Info:\n- Entity ID: ${entityId}\n- Expected UserData ID: ${this.userDataId || USER_ID}`;
            }
        }
        
        this.dispatchEvent(
            new ShowToastEvent({
                title: errorTitle,
                message: errorMessage,
                variant: 'error'
            })
        );
    }
}