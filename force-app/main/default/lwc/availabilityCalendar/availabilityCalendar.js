import { LightningElement, api, track } from 'lwc';
import getAvailabilityForVenue from '@salesforce/apex/VendorDataController.getAvailabilityForVenue';
import saveAvailability from '@salesforce/apex/VendorDataController.saveAvailability';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class AvailabilityCalendar extends LightningElement {
    @api recordId; // Venue__c Id

    @track rows = [];
    @track startDate = '';
    @track endDate = '';

    columns = [
        { label: 'Start Date', fieldName: 'StartDate__c', type: 'date' },
        { label: 'End Date', fieldName: 'EndDate__c', type: 'date' },
        { label: 'Block Id', fieldName: 'Id', type: 'text' }
    ];

    get disableSave() {
        return !(this.startDate && this.endDate);
    }

    connectedCallback() {
        this.loadAvailability();
    }

    async loadAvailability() {
        if (!this.recordId) return;
        try {
            const data = await getAvailabilityForVenue({ venueId: this.recordId });
            this.rows = (data || []).map(d => ({ ...d }));
        } catch (e) {
            this.toastError('Failed to load availability', e);
        }
    }

    handleStartDate(event) {
        this.startDate = event.target.value;
    }

    handleEndDate(event) {
        this.endDate = event.target.value;
    }

    async saveBlock() {
        if (!this.recordId) return;
        try {
            const block = { StartDate__c: this.startDate, EndDate__c: this.endDate };
            const id = await saveAvailability({ block, venueId: this.recordId });
            this.dispatchEvent(new ShowToastEvent({ title: 'Saved', message: `Availability saved (${id})`, variant: 'success' }));
            this.startDate = ''; this.endDate = '';
            await this.loadAvailability();
        } catch (e) {
            this.toastError('Failed to save availability', e);
        }
    }

    toastError(title, error) {
        let message = 'Unknown error';
        if (error && error.body && error.body.message) {
            message = error.body.message;
        } else if (typeof error === 'string') {
            message = error;
        }
        this.dispatchEvent(new ShowToastEvent({ title, message, variant: 'error' }));
    }
}